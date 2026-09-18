//! La session, tenue par la coque.
//!
//! Le JavaScript de la page ne voit jamais le refresh token : il demande une
//! session, la coque la lui rend **sans** ce jeton, qu'elle garde dans le
//! trousseau (`keychain.rs`). Les routes appelées sont celles que l'API réserve
//! à l'application, `/v1/auth/desktop/*` — le cookie de rafraîchissement n'a
//! aucun sens depuis `tauri://localhost`.
//!
//! **Un seul renouvellement à la fois.** L'API fait tourner le refresh token à
//! chaque appel et révoque toutes les sessions d'un compte quand un jeton
//! consommé revient hors de sa fenêtre de trente secondes. Le verrou de
//! `Session` sérialise donc toute opération qui lit ou écrit le jeton : deux
//! fenêtres, un minuteur et un 401 qui tombent ensemble renouvellent l'un après
//! l'autre, chacun avec le jeton que le précédent vient d'écrire.

use std::collections::HashMap;
use std::sync::Mutex as StdMutex;
use std::time::{Duration, Instant};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio::sync::Mutex;

use crate::{config, keychain};

/// La session telle que la page la reçoit : celle de l'API, moins le refresh
/// token.
#[derive(Clone, Serialize, Deserialize)]
pub struct SessionView {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: serde_json::Value,
}

#[derive(Deserialize)]
struct DesktopSession {
    #[serde(flatten)]
    view: SessionView,
    refresh_token: String,
}

/// Une erreur rendue à la page, sous la forme que `ApiError` attend.
#[derive(Debug, Clone, Serialize)]
pub struct Failure {
    pub status: u16,
    pub code: String,
    pub message: String,
    pub fields: HashMap<String, String>,
}

impl Failure {
    fn local(code: &str, message: impl Into<String>) -> Self {
        Self {
            status: 0,
            code: code.into(),
            message: message.into(),
            fields: HashMap::new(),
        }
    }

    fn unreachable() -> Self {
        Self::local("network_error", "L'API est injoignable.")
    }
}

#[derive(Deserialize)]
struct Envelope {
    error: Option<EnvelopeError>,
}

#[derive(Deserialize)]
struct EnvelopeError {
    code: Option<String>,
    message: Option<String>,
    #[serde(default)]
    fields: HashMap<String, String>,
}

/// Un parcours de connexion ouvert dans le navigateur, en attente du retour.
struct Pending {
    verifier: String,
    state: String,
    started: Instant,
}

/// Au-delà, un retour du navigateur ne correspond plus à rien : on l'écarte.
const PENDING_TTL: Duration = Duration::from_secs(10 * 60);

pub struct Session {
    http: reqwest::Client,
    lock: Mutex<()>,
    pending: StdMutex<Option<Pending>>,
}

impl Session {
    pub fn new() -> Self {
        let http = reqwest::Client::builder()
            .user_agent(concat!("OMPT CRM desktop/", env!("CARGO_PKG_VERSION")))
            .timeout(Duration::from_secs(30))
            .build()
            .expect("client HTTP");
        Self {
            http,
            lock: Mutex::new(()),
            pending: StdMutex::new(None),
        }
    }

    async fn post(&self, path: &str, body: serde_json::Value) -> Result<DesktopSession, Failure> {
        let response = self
            .http
            .post(format!("{}{}", config::API_URL, path))
            .json(&body)
            .send()
            .await
            .map_err(|_| Failure::unreachable())?;

        let status = response.status();
        if status.is_success() {
            return response
                .json::<DesktopSession>()
                .await
                .map_err(|_| Failure::local("internal_error", "Réponse de session illisible."));
        }

        let error = response.json::<Envelope>().await.ok().and_then(|e| e.error);
        Err(Failure {
            status: status.as_u16(),
            code: error
                .as_ref()
                .and_then(|e| e.code.clone())
                .unwrap_or_else(|| "internal_error".into()),
            message: error
                .as_ref()
                .and_then(|e| e.message.clone())
                .unwrap_or_else(|| "Une erreur est survenue.".into()),
            fields: error.map(|e| e.fields).unwrap_or_default(),
        })
    }

    /// Garde le nouveau refresh token et rend la session sans lui.
    ///
    /// **Un trousseau qui refuse d'écrire ne doit pas laisser l'ancien jeton
    /// derrière lui.** L'API vient de le faire tourner : il est consommé. Le
    /// présenter au prochain lancement, au-delà des trente secondes de grâce,
    /// serait lu comme un vol, et toutes les sessions du compte tomberaient —
    /// web comprises — pour un incident purement local. On ferme donc la
    /// session qu'on n'a pas pu garder, on oublie l'ancien jeton, et la
    /// personne se reconnecte : c'est le bon prix.
    async fn keep(&self, session: DesktopSession) -> Result<SessionView, Failure> {
        if let Err(message) = keychain::store(&session.refresh_token) {
            log::error!("session ouverte mais non gardée, fermée aussitôt : {message}");
            let _ = self
                .http
                .post(format!("{}/v1/auth/desktop/logout", config::API_URL))
                .json(&serde_json::json!({ "refresh_token": session.refresh_token }))
                .send()
                .await;
            let _ = keychain::forget();
            return Err(Failure::local("keychain", message));
        }
        Ok(session.view)
    }

    /// Renouvelle la session depuis le trousseau. `None` : pas de session.
    ///
    /// Un refus de l'API efface le jeton — il est mort, le garder ferait
    /// échouer chaque lancement. Une API injoignable, non : le poste est
    /// peut-être hors ligne, et le jeton resservira au prochain essai.
    pub async fn refresh(&self) -> Result<Option<SessionView>, Failure> {
        let _guard = self.lock.lock().await;
        let Some(token) = keychain::load().map_err(|m| Failure::local("keychain", m))? else {
            return Ok(None);
        };
        match self
            .post(
                "/v1/auth/desktop/refresh",
                serde_json::json!({ "refresh_token": token }),
            )
            .await
        {
            Ok(session) => self.keep(session).await.map(Some),
            Err(failure) if failure.status == 401 || failure.status == 403 => {
                let _ = keychain::forget();
                Ok(None)
            }
            Err(failure) => Err(failure),
        }
    }

    pub async fn login(&self, email: &str, password: &str) -> Result<SessionView, Failure> {
        let _guard = self.lock.lock().await;
        let session = self
            .post(
                "/v1/auth/desktop/login",
                serde_json::json!({ "email": email, "password": password }),
            )
            .await?;
        self.keep(session).await
    }

    /// Ferme la session côté API, puis oublie le jeton — dans cet ordre, mais
    /// l'oubli a lieu même si l'API ne répond pas : se déconnecter ne doit
    /// jamais laisser une session ouverte sur le poste.
    pub async fn logout(&self) -> Result<(), Failure> {
        let _guard = self.lock.lock().await;
        if let Ok(Some(token)) = keychain::load() {
            let _ = self
                .http
                .post(format!("{}/v1/auth/desktop/logout", config::API_URL))
                .json(&serde_json::json!({ "refresh_token": token }))
                .send()
                .await;
        }
        keychain::forget().map_err(|m| Failure::local("keychain", m))
    }

    /// Prépare une connexion dans le navigateur et rend l'adresse à ouvrir.
    ///
    /// Le secret PKCE ne quitte pas la coque : le navigateur n'en voit que le
    /// SHA-256. Un nouveau parcours remplace le précédent — cliquer deux fois
    /// ne doit pas laisser un retour valable pour la première demande.
    pub fn begin_browser_login(&self) -> String {
        let verifier = random_token();
        let state = random_token();
        let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));

        let mut url = url::Url::parse(config::WEB_URL).expect("OMPT_WEB_URL valide");
        url.set_path("/connexion-app");
        url.query_pairs_mut()
            .append_pair("challenge", &challenge)
            .append_pair("state", &state);

        *self.pending.lock().expect("verrou") = Some(Pending {
            verifier,
            state,
            started: Instant::now(),
        });
        url.into()
    }

    /// Termine la connexion au retour du navigateur (`omptcrm://auth`).
    ///
    /// L'état doit être celui du parcours en cours, et il est consommé quoi
    /// qu'il arrive : un lien rejoué, ou fabriqué par un tiers, ne trouve rien.
    pub async fn complete_browser_login(
        &self,
        code: &str,
        state: &str,
    ) -> Result<SessionView, Failure> {
        let pending = self.pending.lock().expect("verrou").take();
        let Some(pending) = pending else {
            return Err(Failure::local(
                "no_login",
                "Aucune connexion n'est en cours dans l'application.",
            ));
        };
        if pending.state != state || pending.started.elapsed() > PENDING_TTL {
            return Err(Failure::local("login_mismatch", "Ce lien de connexion ne correspond pas à la demande de l'application. Recommencez."));
        }

        let _guard = self.lock.lock().await;
        let session = self
            .post(
                "/v1/auth/desktop/exchange",
                serde_json::json!({ "code": code, "code_verifier": pending.verifier }),
            )
            .await?;
        self.keep(session).await
    }
}

/// Trente-deux octets aléatoires en base64url : 43 caractères, ce que la
/// RFC 7636 demande à un secret PKCE.
fn random_token() -> String {
    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn challenge_matches_rfc_7636_vector() {
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
        assert_eq!(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    }

    #[test]
    fn random_token_is_a_valid_verifier() {
        let token = random_token();
        assert_eq!(token.len(), 43);
        assert!(token
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'));
    }

    #[test]
    fn a_return_without_pending_login_is_refused() {
        let session = Session::new();
        let result =
            tauri::async_runtime::block_on(session.complete_browser_login("code", "state"));
        assert_eq!(result.err().map(|f| f.code), Some("no_login".into()));
    }

    #[test]
    fn a_return_with_another_state_is_refused_and_consumes_the_login() {
        let session = Session::new();
        session.begin_browser_login();
        let first = tauri::async_runtime::block_on(session.complete_browser_login("code", "autre"));
        assert_eq!(first.err().map(|f| f.code), Some("login_mismatch".into()));
        let second =
            tauri::async_runtime::block_on(session.complete_browser_login("code", "autre"));
        assert_eq!(second.err().map(|f| f.code), Some("no_login".into()));
    }
}
