# OMPT CRM — application de bureau

L'interface du CRM OMPT dans une application Tauri v2, pour macOS et Windows.
L'API vit dans le dépôt `crm`.

```bash
bun install
cargo tauri dev        # développement
cargo tauri build      # paquets .app/.dmg (macOS) ou .msi/.exe (Windows)
```

Prérequis : Rust stable, `cargo install tauri-cli --version "^2"`, bun.

Voir `CLAUDE.md` pour ce que l'application change par rapport au CRM web.
