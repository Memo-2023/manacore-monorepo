---
date: 2026-05-26
day: 117
view: macher
weekday: Dienstag
commits: 19
review: auto
---
# Dienstag, 2026-05-26 — Tag 117 (Macher-Sicht)

**Stats**: 19 Commits, +541 / -1.637 LoC, 75 Dateien, ~151 aktive Minuten — der aktivste Tag des Fensters.

Zwei Linien. Erstens die vollständige Umami-Entfernung in Wellen A–E: der Tracking-Kern (Injection, Client-Lib, Auth-Hook, Container, DB) raus, dann Script-Loader und `<Analytics />` aus 7 App-Landing-Layouts, aus Config/Admin-UI, aus Legal/Cookies/Features/Schema, aus i18n/CSP/website-blocks/infra, aus den Mac-Mini-Ops-Scripts und schließlich aus Doku und datierten Records (Token genericisiert). Konsequente Tilgung jeglicher Web-Analytics — Compliance-getrieben.

Zweitens Härtung der Server-Selbstheilung: der Watchdog wird label-getrieben und reconciled gegen `mana-core` und alle App-Stacks, env-sicher per start/restart statt `rm`+`compose-up`. Ein bitterer Fund zum Schluss: `--remove-orphans` in `build-app.sh` hatte 23 cross-app-Container mit-gelöscht — Flag entfernt. Dazu Build-Plumbing: Verdaccio-npm-Auth via BuildKit-Secret für die SvelteKit-Builds, plus `stats.mana.how`-Ingress.
