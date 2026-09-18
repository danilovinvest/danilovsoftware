//! La coque de l'application : session, liens profonds, fenêtre.
//!
//! L'interface est celle du CRM web, exportée en fichiers statiques et servie
//! par la webview du système. La coque ne fait que ce que la page ne peut pas
//! faire elle-même depuis `tauri://localhost` : garder le refresh token hors du
//! JavaScript, ouvrir le navigateur du système, et reprendre la main quand il
//! la rend par `omptcrm://`, et se mettre à jour.

mod config;
mod keychain;
mod links;
mod session;
mod updates;

use tauri::{AppHandle, State, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_opener::OpenerExt;

use session::{Failure, Session, SessionView};
use updates::{Available, Pending};

#[tauri::command]
async fn session_refresh(session: State<'_, Session>) -> Result<Option<SessionView>, Failure> {
    session.refresh().await
}

#[tauri::command]
async fn session_login(
    session: State<'_, Session>,
    email: String,
    password: String,
) -> Result<SessionView, Failure> {
    session.login(&email, &password).await
}

#[tauri::command]
async fn session_logout(session: State<'_, Session>) -> Result<(), Failure> {
    session.logout().await
}

/// Ouvre la connexion par passkey dans le navigateur du système. La session
/// arrive plus tard, par l'événement `session://opened`.
#[tauri::command]
fn session_login_browser(app: AppHandle, session: State<'_, Session>) -> Result<(), Failure> {
    let url = session.begin_browser_login();
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| Failure {
            status: 0,
            code: "opener".into(),
            message: format!("Impossible d'ouvrir le navigateur : {e}"),
            fields: Default::default(),
        })
}

/// Cherche une version plus récente. La page le demande au démarrage, puis de
/// temps en temps : une application qu'on ne ferme jamais doit aussi l'apprendre.
#[tauri::command]
async fn update_check(
    app: AppHandle,
    pending: State<'_, Pending>,
) -> Result<Option<Available>, String> {
    updates::check(&app, &pending).await
}

/// Installe la version trouvée, puis relance. Toujours au clic : une relance
/// imposée ferait perdre une saisie en cours.
#[tauri::command]
async fn update_install(app: AppHandle, pending: State<'_, Pending>) -> Result<(), String> {
    updates::install(&app, &pending).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // En premier, comme l'exige le greffon : sous Windows, un lien profond lance
    // une seconde instance, qui doit rendre l'URL à la première puis s'effacer.
    // La fonction `deep-link` du greffon relaie l'URL avant ce rappel.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            links::focus(app);
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Session::new())
        .manage(Pending::default())
        .invoke_handler(tauri::generate_handler![
            session_refresh,
            session_login,
            session_logout,
            session_login_browser,
            update_check,
            update_install,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            /*
              La fenêtre est créée ici plutôt que par la configuration, pour
              recevoir la sienne avant tout script de la page : l'adresse de
              l'API n'est ainsi écrite qu'à un endroit (`config.rs`).
            */
            let window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "main")
                .cloned()
                .expect("fenêtre « main » déclarée dans tauri.conf.json");
            WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                .initialization_script(config::initialization_script())
                .build()?;

            // Un installateur déclare le schéma au système ; en développement,
            // c'est à l'application de le faire (Windows et Linux seulement).
            #[cfg(all(debug_assertions, any(windows, target_os = "linux")))]
            app.deep_link().register_all()?;

            let handle = app.handle().clone();
            app.deep_link()
                .on_open_url(move |event| links::handle(&handle, event.urls()));
            if let Some(urls) = app.deep_link().get_current()? {
                links::handle(app.handle(), urls);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
