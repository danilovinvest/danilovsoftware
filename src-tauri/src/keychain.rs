//! Le refresh token, dans le trousseau du système.
//!
//! **Il ne passe jamais par le JavaScript.** Sur le web, un cookie `HttpOnly`
//! le tenait hors de portée d'un script injecté ; ici c'est la coque qui le
//! garde, dans le trousseau de macOS ou le gestionnaire d'identifiants de
//! Windows, et la page ne reçoit que le jeton d'accès — quinze minutes de vie.

use keyring::{Entry, Error};

const SERVICE: &str = "fr.ompt.crm";
const ACCOUNT: &str = "refresh_token";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| format!("trousseau indisponible : {e}"))
}

/// Le jeton enregistré, ou rien s'il n'y en a pas.
pub fn load() -> Result<Option<String>, String> {
    match entry()?.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("lecture du trousseau impossible : {e}")),
    }
}

pub fn store(token: &str) -> Result<(), String> {
    entry()?
        .set_password(token)
        .map_err(|e| format!("écriture dans le trousseau impossible : {e}"))
}

/// Oublier le jeton. Une entrée déjà absente n'est pas une erreur.
pub fn forget() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("effacement du trousseau impossible : {e}")),
    }
}
