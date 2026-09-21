//! L'apparence de la fenêtre, alignée sur le thème du CRM.
//!
//! Le bandeau de titre, les feux de circulation et le cadre sont dessinés par
//! le système, pas par la page : ils suivent l'apparence du poste. Quelqu'un
//! dont le Mac est en sombre et qui travaille en thème clair voyait donc un
//! bandeau noir posé sur une application blanche — deux moitiés de fenêtre qui
//! ne se ressemblent pas.
//!
//! `set_theme` dit au système quelle apparence donner à **cette** fenêtre. Ce
//! n'est pas le thème de la page : c'est ce qui entoure la page, et il n'y a
//! rien d'autre à changer pour que les deux s'accordent.
//!
//! Le choix vit dans le stockage local du navigateur — la coque ne peut pas le
//! lire — donc c'est la page qui l'annonce, et elle le fait dès son premier
//! rendu.

use tauri::{AppHandle, Manager, Runtime, Theme};

/// Aligne la fenêtre sur le thème que la page vient d'appliquer.
///
/// Sur macOS et Linux, l'apparence vaut pour toute l'application et non pour
/// la seule fenêtre — sans conséquence ici, l'application n'en a qu'une.
pub fn apply<R: Runtime>(app: &AppHandle<R>, dark: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "fenêtre « main » introuvable".to_string())?;

    let theme = if dark { Theme::Dark } else { Theme::Light };
    window
        .set_theme(Some(theme))
        .map_err(|e| format!("apparence de la fenêtre : {e}"))
}
