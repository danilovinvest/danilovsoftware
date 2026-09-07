#!/usr/bin/env python3
"""Génère apps/app/themes.css à partir de @radix-ui/colors.

    cd apps && python3 scripts/generate-themes.py

Le script télécharge les échelles Radix nécessaires dans un dossier temporaire,
puis écrit `app/themes.css`. Ajouter une palette = ajouter une ligne à THEMES
ici, relancer, puis ajouter l'entrée correspondante dans
`modules/settings/lib/palettes.ts` (qui ne sert qu'aux vignettes de choix).

Le fichier produit ne redéfinit que `--t-gray-*` et `--t-accent-*` : les
tonalités de statut du CRM restent fixes d'une palette à l'autre.
"""

import pathlib
import re
import textwrap
import urllib.request

RADIX = "https://unpkg.com/@radix-ui/colors@3.0.0"
CACHE = pathlib.Path(__file__).parent / ".radix-cache"
HERE = CACHE


def fetch(scale: str) -> None:
    CACHE.mkdir(exist_ok=True)
    for suffix in ("", "-dark"):
        target = CACHE / f"{scale}{suffix}.css"
        if target.exists():
            continue
        with urllib.request.urlopen(f"{RADIX}/{scale}{suffix}.css") as response:
            target.write_bytes(response.read())


def parse(scale: str, dark: bool):
    """Renvoie ({cran: hex}, {cran: p3}) pour une échelle Radix."""
    text = (HERE / f"{scale}{'-dark' if dark else ''}.css").read_text()
    marker = "@supports"
    head, _, tail = text.partition(marker)
    grab = lambda blob: {
        int(n): v.strip()
        for n, v in re.findall(rf"--{scale}-(\d+):\s*([^;]+);", blob)
    }
    return grab(head), grab(tail)

# Accent + gris apparié, selon les recommandations de Radix : chaque teinte a
# un gris « naturel » qui partage sa température.
THEMES = [
    ("ocean",    "Océan",     "cyan",    "slate"),
    ("emeraude", "Émeraude",  "jade",    "sage"),
    ("menthe",   "Menthe",    "teal",    "sage"),
    ("citron",   "Citron",    "lime",    "olive"),
    ("ambre",    "Ambre",     "amber",   "sand"),
    ("corail",   "Corail",    "orange",  "sand"),
    ("grenat",   "Grenat",    "crimson", "mauve"),
    ("violette", "Violette",  "violet",  "mauve"),
    ("magenta",  "Magenta",   "pink",    "mauve"),
]

ACCENT_STEPS = [2, 3, 5, 7, 8, 9, 11]


def ink(hex_color: str) -> str:
    """L'encre lisible sur un aplat du cran 9.

    Radix ne livre pas de valeur `contrast` en 3.0.0, et le cran 9 change de
    nature d'une teinte à l'autre : indigo est sombre, ambre et citron sont
    clairs. Du blanc écrit dessus tombe à 1,4 de contraste sur ces deux-là et
    disparaît. On tranche donc au calcul, une fois, plutôt que de le vérifier
    palette par palette à l'œil.
    """
    r, g, b = (int(hex_color.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lin = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    # Le seuil est celui où le blanc et le noir se valent (~0,18).
    return "#ffffff" if luminance < 0.4 else "#1c2024"
GRAY_STEPS = list(range(1, 13))

for _pid, _label, _accent, _gray in THEMES:
    fetch(_accent)
    fetch(_gray)
fetch("indigo")

def block(theme_id, accent, gray, dark, p3):
    # `:root` en tête : sans lui, `[data-theme=x]` et `:root` seraient à
    # égalité de spécificité et c'est l'ordre d'import qui trancherait.
    sel = (
        f':root.dark[data-theme="{theme_id}"]'
        if dark
        else f':root[data-theme="{theme_id}"]'
    )
    a_hex, a_p3 = parse(accent, dark)
    g_hex, g_p3 = parse(gray, dark)
    a = a_p3 if p3 else a_hex
    g = g_p3 if p3 else g_hex
    lines = [f"{sel} {{"]
    for n in GRAY_STEPS:
        lines.append(f"  --t-gray-{n}: {g[n]};")
    for n in ACCENT_STEPS:
        lines.append(f"  --t-accent-{n}: {a[n]};")
    # L'encre se calcule sur l'hex, jamais sur le P3 : c'est la même décision
    # dans les deux espaces, et un `color()` ne se convertit pas ici.
    lines.append(f"  --t-accent-ink: {ink(a_hex[9])};")
    lines.append("}")
    return "\n".join(lines)

out = ['''/*
 * Palettes de couleur — FICHIER GÉNÉRÉ, ne pas éditer à la main.
 *
 * Produit par le script décrit dans CLAUDE.md à partir de @radix-ui/colors.
 * Chaque palette redéfinit deux choses, et seulement deux :
 *
*   --t-gray-1..12   le gris de la palette, légèrement teinté vers l'accent
 *   --t-accent-*     la teinte d'accent (marque, focus, sélection)
 *   --t-accent-ink   l'encre lisible sur un aplat du cran 9 — calculée, parce
 *                    qu'ambre et citron sont clairs là où indigo est sombre
 *
 * Elle ne touche ni `--t-green-*`, ni `--t-red-*`, ni `--t-orange-*`, ni
 * `--t-blue-*` : une pastille « Accepté » doit rester verte quelle que soit la
 * palette, sinon le code couleur du CRM ne veut plus rien dire.
 *
 * Le gris est apparié à l'accent selon les recommandations de Radix (indigo →
 * slate, jade → sage, ambre → sand…). C'est ce qui distingue une palette d'un
 * simple changement de couleur de bouton : les surfaces elles-mêmes prennent
 * la température de la teinte.
 *
 * La palette par défaut (« Azur ») n'est pas ici : c'est celle de :root et
 * .dark dans globals.css, reprise de Twenty.
 */''']

for pid, _label, accent, gray in THEMES:
    out.append(block(pid, accent, gray, dark=False, p3=False))
for pid, _label, accent, gray in THEMES:
    out.append(block(pid, accent, gray, dark=True, p3=False))

# Affinage P3, exactement comme le fait Radix lui-même.
p3 = ["@supports (color: color(display-p3 1 1 1)) {", "  @media (color-gamut: p3) {"]
for dark in (False, True):
    for pid, _label, accent, gray in THEMES:
        p3.append(textwrap.indent(block(pid, accent, gray, dark, p3=True), "    "))
p3.append("  }")
p3.append("}")
out.append("\n".join(p3))

target = pathlib.Path(__file__).parent.parent / "app" / "themes.css"
target.write_text("\n\n".join(out) + "\n")
print("écrit :", target, target.stat().st_size, "octets")
