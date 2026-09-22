//! Les deux adresses de l'application, résolues **ici** et vérifiées contre la
//! CSP avant que quoi que ce soit ne se compile.
//!
//! `config.rs` affirmait « un seul endroit les nomme » et c'était faux :
//! `tauri.conf.json` réécrit l'adresse de l'API dans `connect-src`, et la CSP
//! l'emporte sur tout. Construire avec `OMPT_API_URL` pointant ailleurs
//! donnait une application où **chaque appel API est refusé par le
//! navigateur** — sans erreur réseau, sans message, seulement une console que
//! personne n'ouvre. Le défaut ne se voyait qu'à l'usage.
//!
//! D'où le sens de la dépendance : les valeurs par défaut vivent ici, sont
//! passées au compilateur (`cargo:rustc-env`), et `config.rs` ne fait plus que
//! les lire. La CSP, elle, est relue et confrontée. Une divergence arrête la
//! compilation en nommant les deux valeurs, là où elle produisait un paquet
//! muet.
//!
//! La lecture de la politique vit dans `src/csp.rs`, inclus ici : un script de
//! construction n'est pas compilé par `cargo test`, et cette règle-là mérite
//! des tests.

use std::{env, fs};

include!("src/csp.rs");

/// L'API du CRM. `OMPT_API_URL` l'emporte, et doit alors figurer dans la CSP.
const DEFAULT_API_URL: &str = "https://testbeforeproduction.xyz";

/// Le portail, celui des pages publiques ouvertes dans le navigateur du
/// système. Il n'est jamais appelé depuis la page, donc pas dans `connect-src`.
const DEFAULT_WEB_URL: &str = "https://testbeforeproduction.xyz";

const CONFIG: &str = "tauri.conf.json";

fn main() {
    println!("cargo:rerun-if-changed={CONFIG}");
    println!("cargo:rerun-if-changed=src/csp.rs");

    let api = resolve("OMPT_API_URL", DEFAULT_API_URL);
    let web = resolve("OMPT_WEB_URL", DEFAULT_WEB_URL);

    check_connect_src(&api);

    println!("cargo:rustc-env=OMPT_API_URL={api}");
    println!("cargo:rustc-env=OMPT_WEB_URL={web}");

    tauri_build::build()
}

/// Une variable **vide vaut absente**. Une variable de dépôt GitHub qu'on a
/// déclarée sans la remplir arrive vide, et la prendre au mot bâtirait une
/// application dont l'adresse d'API est la chaîne vide.
fn resolve(name: &str, default: &str) -> String {
    println!("cargo:rerun-if-env-changed={name}");
    match env::var(name) {
        Ok(value) if !value.trim().is_empty() => value.trim().to_string(),
        _ => default.to_string(),
    }
}

/// La page ne peut appeler que ce que la CSP autorise.
///
/// C'est la politique **que Tauri embarquera** qui est vérifiée : `devCsp`
/// sous `cargo tauri dev`, `csp` partout ailleurs. `localhost` ne vit que dans
/// la première — une application livrée n'a aucune raison d'appeler une API
/// sur le poste — si bien qu'un `build` pointé sur une API locale s'arrête ici,
/// en le disant, plutôt que de produire un paquet qui la laisserait ouverte.
fn check_connect_src(api: &str) {
    let raw = fs::read_to_string(CONFIG).unwrap_or_else(|e| panic!("{CONFIG} illisible : {e}"));
    let config: Value =
        serde_json::from_str(&raw).unwrap_or_else(|e| panic!("{CONFIG} illisible : {e}"));

    let dev = tauri_build::is_dev();
    let (key, _) = policy(&config, dev);
    let connect = connect(&config, dev);
    if !connect.allows(api) {
        // Une API locale se sert par `cargo tauri dev`, jamais en l'ajoutant
        // à la politique livrée : c'est précisément ce qu'on vient d'en retirer.
        let advice = if !dev && api.contains("://localhost") {
            "Une API locale ne sert qu'en développement : lancer `cargo tauri dev`, \
             dont la politique (devCsp) l'admet."
                .to_string()
        } else {
            format!(
                "Ajouter l'adresse à app.security.{key}.connect-src dans {CONFIG}, \
                 sans quoi le navigateur refusera chaque appel à l'API en silence."
            )
        };
        panic!(
            "OMPT_API_URL vaut « {api} », que la CSP n'autorise pas.\n\
             Les appels réseau de la page sont bornés par : {}\n{advice}",
            connect.describe()
        );
    }
}
