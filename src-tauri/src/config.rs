//! Où l'application trouve l'API et le web.
//!
//! **Un seul endroit les nomme**, et c'est ici : la page les reçoit par un
//! script injecté avant son premier octet (`window.__OMPT__`, voir `lib.rs`),
//! si bien que l'interface et la coque ne peuvent pas diverger. Les deux se
//! fixent à la compilation — `OMPT_API_URL=http://localhost:8080 cargo tauri
//! dev` pour travailler contre une API locale.
//!
//! Ce sont deux adresses et non une. L'API répond sur les trois hôtes du CRM,
//! mais les pages publiques — la connexion par passkey, l'invitation,
//! l'enrôlement d'une clé — vivent sur le portail : ce sont elles qu'on ouvre
//! dans le navigateur du système ou qu'on envoie à quelqu'un.

pub const API_URL: &str = match option_env!("OMPT_API_URL") {
    Some(url) => url,
    None => "https://testbeforeproduction.xyz",
};

pub const WEB_URL: &str = match option_env!("OMPT_WEB_URL") {
    Some(url) => url,
    None => "https://testbeforeproduction.xyz",
};

/// Le schéma de lien profond, déclaré dans `tauri.conf.json` et côté API
/// (`internal/desktop`). Les trois doivent rester d'accord.
pub const SCHEME: &str = "omptcrm";

/// Le script qui précède la page : la configuration, figée.
pub fn initialization_script() -> String {
    format!(
        "Object.defineProperty(window, '__OMPT__', {{ value: Object.freeze({{ apiBase: {}, webUrl: {} }}) }});",
        serde_json::to_string(API_URL).expect("chaîne sérialisable"),
        serde_json::to_string(WEB_URL).expect("chaîne sérialisable"),
    )
}
