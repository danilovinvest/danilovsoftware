//! Les liens `omptcrm://`, par lesquels le navigateur rend la main.
//!
//! Deux formes, que l'API fabrique aussi (`internal/desktop`) :
//!
//! - `omptcrm://auth?code=…&state=…` — le retour d'une connexion par passkey ;
//! - `omptcrm://app/<chemin>?…` — le retour d'un raccordement Google ou
//!   Microsoft, vers l'écran d'où il est parti.
//!
//! **N'importe quelle page web peut ouvrir un tel lien**, et c'est ce qui dicte
//! les deux gardes : un retour de connexion n'est honoré que s'il répond à la
//! demande en cours (`Session::complete_browser_login`), et une navigation ne
//! mène qu'à un chemin interne de l'interface.

use tauri::{AppHandle, Emitter, Manager, Runtime};
use url::Url;

use crate::config::SCHEME;
use crate::session::Session;

pub const EVENT_SESSION_OPENED: &str = "session://opened";
pub const EVENT_SESSION_FAILED: &str = "session://failed";
pub const EVENT_NAVIGATE: &str = "app://navigate";

pub fn handle<R: Runtime>(app: &AppHandle<R>, urls: Vec<Url>) {
    for url in urls {
        if url.scheme() != SCHEME {
            continue;
        }
        match url.host_str() {
            Some("auth") => complete_login(app, &url),
            Some("app") => {
                if let Some(path) = internal_path(&url) {
                    let _ = app.emit(EVENT_NAVIGATE, path);
                    focus(app);
                }
            }
            _ => {}
        }
    }
}

fn complete_login<R: Runtime>(app: &AppHandle<R>, url: &Url) {
    let query = |name: &str| {
        url.query_pairs()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
            .unwrap_or_default()
    };
    let (code, state) = (query("code"), query("state"));
    let app = app.clone();

    tauri::async_runtime::spawn(async move {
        let session = app.state::<Session>();
        match session.complete_browser_login(&code, &state).await {
            Ok(view) => {
                let _ = app.emit(EVENT_SESSION_OPENED, view);
            }
            // Un lien arrivé sans connexion en cours n'est pas le nôtre : on
            // ne réveille pas l'écran pour le dire.
            Err(failure) if failure.code == "no_login" => return,
            Err(failure) => {
                let _ = app.emit(EVENT_SESSION_FAILED, failure);
            }
        }
        focus(&app);
    });
}

/// Le chemin de l'interface que désigne un lien `omptcrm://app/…`, ou rien.
///
/// Un chemin commençant par `//` serait lu par le routeur comme une adresse
/// externe : il est refusé, comme tout ce qui n'est pas un chemin absolu.
fn internal_path(url: &Url) -> Option<String> {
    let path = url.path();
    if !path.starts_with('/') || path.starts_with("//") {
        return None;
    }
    Some(match url.query() {
        Some(query) => format!("{path}?{query}"),
        None => path.to_string(),
    })
}

/// Ramène la fenêtre au premier plan : la personne vient du navigateur.
pub fn focus<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn path_of(raw: &str) -> Option<String> {
        internal_path(&Url::parse(raw).unwrap())
    }

    #[test]
    fn app_links_keep_path_and_query() {
        assert_eq!(
            path_of("omptcrm://app/settings/agenda?connecte=a%40b.fr").as_deref(),
            Some("/settings/agenda?connecte=a%40b.fr")
        );
        assert_eq!(
            path_of("omptcrm://app/settings/fichiers").as_deref(),
            Some("/settings/fichiers")
        );
    }

    #[test]
    fn protocol_relative_paths_are_refused() {
        assert_eq!(path_of("omptcrm://app//mechant.example/x"), None);
    }
}
