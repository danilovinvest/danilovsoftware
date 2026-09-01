/**
 * Script d'amorçage du thème, injecté en tête de <body>.
 *
 * Sans lui, la page se peint d'abord en clair puis bascule quand React monte —
 * un éclair blanc à chaque chargement pour qui a choisi le sombre. Le script
 * est synchrone et placé avant tout contenu : il pose la classe avant la
 * première peinture.
 *
 * Il duplique volontairement `applyPreferences` : cette poignée de lignes doit
 * tourner sans module, sans React et sans hydratation. Toute modification de
 * l'une doit être reportée sur l'autre — d'où la forme minimale, réduite à ce
 * que le premier rendu exige (le thème ; l'échelle suit au montage).
 */
export const THEME_BOOTSTRAP_SCRIPT = `
try {
  var raw = localStorage.getItem("danilov-crm.preferences");
  var prefs = raw ? JSON.parse(raw) : null;
  var choice = prefs && prefs.theme ? prefs.theme : "system";
  var dark = choice === "dark" ||
    (choice === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.classList.add("dark");
  if (prefs && prefs.scale && prefs.scale !== 100) {
    document.documentElement.style.fontSize = prefs.scale + "%";
  }
} catch (e) {}
`.trim();
