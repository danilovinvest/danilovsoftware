// Lire la politique de sécurité de `tauri.conf.json`.
//
// Ce fichier ne sert qu'à `build.rs`, qui l'inclut par `include!` : un script
// de construction n'est pas compilé par `cargo test`, si bien que la logique
// qu'il porte n'est vérifiable nulle part. Elle vit donc ici, dans la
// bibliothèque, où les tests l'atteignent — et l'inclusion évite d'avoir la
// même règle écrite deux fois. Les commentaires sont en `//` et non en `//!` :
// le contenu atterrit au milieu de `build.rs`, où un commentaire de module ne
// se compile pas.
//
// **Tauri accepte trois formes pour la même politique**, vérifiées dans
// `tauri-utils` 2.9.3 (`Csp` en 2440, `CspDirectiveSources` en 2383) : la
// politique entière en une chaîne, ou un objet de directives dont chacune est
// soit une chaîne, soit un tableau. Le premier jet n'en lisait qu'une et
// annonçait « connect-src absent » sur les deux autres — une configuration
// parfaitement valide, refusée avec un message qui envoyait chercher ailleurs.

use serde_json::Value;

/// Ce que la configuration dit des appels réseau que la page peut faire.
#[derive(Debug, PartialEq, Eq)]
pub enum Connect {
    /// Aucune politique déclarée : rien ne borne la page, il n'y a rien à
    /// vérifier. Ce n'est pas la même chose qu'une liste vide, qui interdit
    /// tout.
    Unrestricted,
    /// Les sources qui s'appliquent, telles qu'elles sont écrites.
    Sources(Vec<String>),
}

impl Connect {
    /// Une source de CSP se compare **à la lettre**. `https://exemple.fr` et
    /// `https://exemple.fr/` n'y sont pas la même chose, et normaliser les
    /// deux ferait passer une adresse que le navigateur refuserait.
    pub fn allows(&self, source: &str) -> bool {
        match self {
            Connect::Unrestricted => true,
            Connect::Sources(sources) => sources.iter().any(|s| s == source),
        }
    }

    /// Ce qu'on montre quand la vérification échoue.
    pub fn describe(&self) -> String {
        match self {
            Connect::Unrestricted => "aucune CSP déclarée".to_string(),
            Connect::Sources(sources) => sources.join(" "),
        }
    }
}

/// La politique qui s'applique à cette compilation.
///
/// **`cargo tauri dev` lit `devCsp`, tout le reste lit `csp`** — c'est la règle
/// de Tauri (`tauri-codegen` 2.6.3, `context.rs` ; `tauri` 2.11.5,
/// `manager/mod.rs`), où « dev » veut dire « sans la fonction
/// `custom-protocol` » : un `cargo tauri build --debug` est donc une
/// compilation de production à cet égard. `devCsp` absente, `csp` vaut pour
/// les deux. Vérifier l'autre politique que celle que Tauri embarque ferait
/// passer, ou refuser, une adresse pour de mauvaises raisons. Le nom de la clé
/// accompagne la valeur, pour qu'un refus dise laquelle corriger.
pub fn policy(config: &Value, dev: bool) -> (&'static str, &Value) {
    let security = &config["app"]["security"];
    if dev && !security["devCsp"].is_null() {
        ("devCsp", &security["devCsp"])
    } else {
        ("csp", &security["csp"])
    }
}

/// Les sources qui bornent les appels réseau de la page.
///
/// **`default-src` sert de repli**, comme le veut la spécification : une
/// politique qui ne nomme pas `connect-src` n'autorise pas tout, elle retombe
/// sur la directive par défaut. L'ignorer aurait rendu `Unrestricted` — donc
/// un garde-fou qui laisse passer précisément la configuration la plus stricte.
pub fn connect(config: &Value, dev: bool) -> Connect {
    let (_, csp) = policy(config, dev);
    match csp {
        Value::Null => Connect::Unrestricted,
        Value::String(policy) => from_policy(policy),
        _ => match directive(&csp["connect-src"]) {
            Some(sources) => Connect::Sources(sources),
            None => match directive(&csp["default-src"]) {
                Some(sources) => Connect::Sources(sources),
                None => Connect::Unrestricted,
            },
        },
    }
}

/// Une directive de l'objet : chaîne en ligne ou tableau, les deux valides.
fn directive(value: &Value) -> Option<Vec<String>> {
    match value {
        Value::String(inline) => Some(split(inline)),
        Value::Array(list) => Some(
            list.iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect(),
        ),
        _ => None,
    }
}

/// La politique entière en une chaîne : les directives y sont séparées par des
/// points-virgules, et la première est le nom de la directive.
fn from_policy(policy: &str) -> Connect {
    let mut fallback = None;
    for part in policy.split(';') {
        let mut tokens = split(part);
        if tokens.is_empty() {
            continue;
        }
        let name = tokens.remove(0).to_ascii_lowercase();
        match name.as_str() {
            "connect-src" => return Connect::Sources(tokens),
            "default-src" => fallback = Some(tokens),
            _ => {}
        }
    }
    match fallback {
        Some(sources) => Connect::Sources(sources),
        None => Connect::Unrestricted,
    }
}

fn split(raw: &str) -> Vec<String> {
    raw.split_whitespace().map(str::to_string).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn with_csp(csp: Value) -> Value {
        json!({ "app": { "security": { "csp": csp } } })
    }

    #[test]
    fn lit_une_directive_ecrite_en_ligne() {
        let config = with_csp(json!({ "connect-src": "'self' https://api.example" }));
        assert!(connect(&config, false).allows("https://api.example"));
        assert!(!connect(&config, false).allows("https://autre.example"));
    }

    #[test]
    fn lit_une_directive_ecrite_en_tableau() {
        let config = with_csp(json!({ "connect-src": ["'self'", "https://api.example"] }));
        assert!(connect(&config, false).allows("https://api.example"));
    }

    #[test]
    fn lit_la_politique_ecrite_en_une_seule_chaine() {
        let config = with_csp(json!(
            "default-src 'self'; connect-src 'self' https://api.example; img-src *"
        ));
        assert!(connect(&config, false).allows("https://api.example"));
        assert!(!connect(&config, false).allows("https://autre.example"));
    }

    // Sans connect-src, c'est default-src qui borne les appels. Rendre
    // « rien ne borne » ici laisserait passer la configuration la plus stricte.
    #[test]
    fn retombe_sur_default_src() {
        let objet = with_csp(json!({ "default-src": "'self' https://api.example" }));
        assert!(connect(&objet, false).allows("https://api.example"));
        assert!(!connect(&objet, false).allows("https://autre.example"));

        let chaine = with_csp(json!("default-src 'self'; img-src *"));
        assert!(!connect(&chaine, false).allows("https://api.example"));
    }

    #[test]
    fn une_config_sans_csp_ne_borne_rien() {
        assert_eq!(connect(&json!({}), false), Connect::Unrestricted);
        assert!(connect(&json!({}), false).allows("https://n-importe-quoi.example"));
    }

    // La comparaison est littérale : une barre oblique finale fait une autre
    // source, et le navigateur ne les confond pas davantage.
    #[test]
    fn la_comparaison_est_litterale() {
        let config = with_csp(json!({ "connect-src": "https://api.example" }));
        assert!(!connect(&config, false).allows("https://api.example/"));
        assert!(!connect(&config, false).allows("https://API.example"));
    }

    // `localhost` n'est admis qu'en développement : la politique de
    // production ne doit jamais le porter, et c'est `devCsp` qui l'ajoute.
    #[test]
    fn devcsp_ne_vaut_qu_en_developpement() {
        let config = json!({ "app": { "security": {
            "csp": { "connect-src": "'self' https://api.example" },
            "devCsp": { "connect-src": "'self' https://api.example http://localhost:8080" }
        } } });
        assert!(!connect(&config, false).allows("http://localhost:8080"));
        assert!(connect(&config, true).allows("http://localhost:8080"));
    }

    #[test]
    fn sans_devcsp_le_developpement_lit_csp() {
        let config = with_csp(json!({ "connect-src": "'self' https://api.example" }));
        assert!(connect(&config, true).allows("https://api.example"));
        assert!(!connect(&config, true).allows("http://localhost:8080"));
    }

    // La configuration réelle : la production n'ouvre ni `localhost` ni
    // toutes les images du web.
    #[test]
    fn la_configuration_livree_ne_porte_pas_localhost() {
        let config: Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).expect("tauri.conf.json");
        assert!(connect(&config, false).allows("https://testbeforeproduction.xyz"));
        assert!(!connect(&config, false).allows("http://localhost:8080"));
        assert!(connect(&config, true).allows("http://localhost:8080"));
        let img = policy(&config, false).1["img-src"]
            .as_str()
            .unwrap_or_default();
        assert!(!img.split_whitespace().any(|s| s == "https:" || s == "*"));
    }

    #[test]
    fn describe_nomme_les_sources() {
        let config = with_csp(json!({ "connect-src": ["'self'", "ipc:"] }));
        assert_eq!(connect(&config, false).describe(), "'self' ipc:");
    }
}
