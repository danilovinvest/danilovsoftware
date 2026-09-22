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
use tauri::ipc::Channel;
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

/// Où en est le téléchargement, tel que la page l'affiche.
///
/// `total` est nul quand le serveur ne donne pas la taille du paquet : la page
/// montre alors une barre indéterminée plutôt qu'un pourcentage inventé.
/// `Finished` dit que les octets sont arrivés — restent la vérification de la
/// signature et l'installation, qui prennent encore quelques secondes.
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(tag = "event", rename_all = "lowercase")]
pub enum Progress {
    Downloading { downloaded: u64, total: Option<u64> },
    Finished,
}

/// Sans taille connue, on ne signale qu'un palier tous les 256 Kio.
const UNKNOWN_TOTAL_STEP: u64 = 256 * 1024;

/// Décide des étapes qui méritent un message à la page.
///
/// Le greffon rappelle à **chaque fragment** reçu, soit des milliers de fois
/// pour un paquet de quelques dizaines de mégaoctets : les relayer tous
/// saturerait le canal pour une barre qui ne bouge qu'au pour-cent. On ne
/// relaie donc qu'un changement de pour-cent, ou un palier quand la taille est
/// inconnue.
#[derive(Default)]
struct Throttle {
    downloaded: u64,
    last_sent: Option<u64>,
}

impl Throttle {
    fn chunk(&mut self, len: usize, total: Option<u64>) -> Option<Progress> {
        self.downloaded += len as u64;
        let bucket = match total {
            Some(total) if total > 0 => self.downloaded.saturating_mul(100) / total,
            _ => self.downloaded / UNKNOWN_TOTAL_STEP,
        };
        if self.last_sent == Some(bucket) {
            return None;
        }
        self.last_sent = Some(bucket);
        Some(Progress::Downloading {
            downloaded: self.downloaded,
            total,
        })
    }
}

/// Télécharge, vérifie la signature, installe, puis relance l'application.
///
/// La progression passe par un canal que la page fournit : sans elle, un
/// paquet de plusieurs dizaines de mégaoctets sur une connexion lente laissait
/// un bouton « Installation… » immobile pendant une minute, qu'on prenait pour
/// une application figée. Un message perdu (la page a été rechargée) n'arrête
/// pas l'installation : `send` échoue alors en silence.
///
/// Sous Windows l'installateur ferme lui-même l'application avant de la
/// remplacer : `restart` n'est alors jamais atteint, et c'est l'installateur
/// qui la rouvre.
pub async fn install<R: Runtime>(
    app: &AppHandle<R>,
    pending: &Pending,
    on_progress: Channel<Progress>,
) -> Result<(), String> {
    let update = pending.0.lock().expect("verrou").take();
    let Some(update) = update else {
        return Err("Aucune mise à jour n'est en attente.".into());
    };
    let mut throttle = Throttle::default();
    let finished = on_progress.clone();
    update
        .download_and_install(
            |len, total| {
                if let Some(step) = throttle.chunk(len, total) {
                    let _ = on_progress.send(step);
                }
            },
            || {
                let _ = finished.send(Progress::Finished);
            },
        )
        .await
        .map_err(|e| {
            log::error!("installation de la mise à jour impossible : {e}");
            format!("Installation impossible : {e}")
        })?;
    app.restart()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn relaie_un_message_par_pour_cent() {
        let mut throttle = Throttle::default();
        let total = Some(1000);
        let sent: Vec<Progress> = (0..1000).filter_map(|_| throttle.chunk(1, total)).collect();
        // 0 %, 1 %, … 100 % : cent un paliers, pas mille messages.
        assert_eq!(sent.len(), 101);
        assert_eq!(
            sent.last(),
            Some(&Progress::Downloading {
                downloaded: 1000,
                total
            })
        );
    }

    #[test]
    fn sans_taille_connue_relaie_par_palier() {
        let mut throttle = Throttle::default();
        let chunk = 64 * 1024;
        let sent = (0..16).filter_map(|_| throttle.chunk(chunk, None)).count();
        // 1 Mio en fragments de 64 Kio : le palier 0 puis un tous les 256 Kio.
        assert_eq!(sent, 5);
    }

    #[test]
    fn la_page_recoit_un_evenement_nomme() {
        let json = serde_json::to_value(Progress::Downloading {
            downloaded: 3,
            total: None,
        })
        .unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "event": "downloading", "downloaded": 3, "total": null })
        );
        assert_eq!(
            serde_json::to_value(Progress::Finished).unwrap(),
            serde_json::json!({ "event": "finished" })
        );
    }
}
