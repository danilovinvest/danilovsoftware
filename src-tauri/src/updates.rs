//! Les mises à jour de l'application.
//!
//! Les versions vivent dans les Releases du dépôt `danilovsoftware`, qui est
//! **privé** : l'application installée n'a aucun identifiant GitHub et ne peut
//! pas les lire. L'API du CRM sert donc de relais (`/v1/desktop/update/…`) —
//! elle lit la dernière release avec un jeton en lecture seule et rend son
//! `latest.json`, adresses de téléchargement réécrites vers elle-même.
//!
//! **Ce qui rend une mise à jour sûre, c'est la signature, pas le relais.**
//! Chaque paquet est signé en intégration continue par une clé que seul le
//! dépôt détient, et la coque vérifie cette signature contre la clé publique de
//! `tauri.conf.json` avant d'installer quoi que ce soit. Un relais compromis
//! pourrait refuser une mise à jour, jamais en substituer une.

use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Runtime};
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::config;

/// La mise à jour trouvée par la dernière vérification, en attente d'un clic.
#[derive(Default)]
pub struct Pending(Mutex<Option<Update>>);

/// Ce que la page affiche d'une mise à jour disponible.
#[derive(Serialize, Clone)]
pub struct Available {
    version: String,
    notes: Option<String>,
}

fn endpoint() -> Result<url::Url, String> {
    url::Url::parse(&format!(
        "{}/v1/desktop/update/latest.json",
        config::API_URL
    ))
    .map_err(|e| format!("Adresse de mise à jour invalide : {e}"))
}

/// Cherche une version plus récente ; `None` quand l'application est à jour.
///
/// Une compilation de développement ne cherche rien : elle pointe souvent vers
/// une API locale en `http`, que le greffon refuse, et proposerait de remplacer
/// le binaire qu'on est en train d'écrire par celui de la dernière release.
pub async fn check<R: Runtime>(
    app: &AppHandle<R>,
    pending: &Pending,
) -> Result<Option<Available>, String> {
    if cfg!(debug_assertions) {
        return Ok(None);
    }
    let updater = app
        .updater_builder()
        .endpoints(vec![endpoint()?])
        .and_then(|builder| builder.build())
        .map_err(|e| format!("Vérification impossible : {e}"))?;
    let found = updater
        .check()
        .await
        .map_err(|e| format!("Vérification impossible : {e}"))?;

    let available = found.as_ref().map(|update| Available {
        version: update.version.clone(),
        notes: update.body.clone(),
    });
    *pending.0.lock().expect("verrou") = found;
    Ok(available)
}

/// Télécharge, vérifie la signature, installe, puis relance l'application.
///
/// Sous Windows l'installateur ferme lui-même l'application avant de la
/// remplacer : `restart` n'est alors jamais atteint, et c'est l'installateur
/// qui la rouvre.
pub async fn install<R: Runtime>(app: &AppHandle<R>, pending: &Pending) -> Result<(), String> {
    let update = pending.0.lock().expect("verrou").take();
    let Some(update) = update else {
        return Err("Aucune mise à jour n'est en attente.".into());
    };
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| format!("Installation impossible : {e}"))?;
    app.restart()
}
