---
date: 2026-05-20
day: 112
view: macher
weekday: Mittwoch
commits: 12
review: auto
---
# Mittwoch, 2026-05-20 — Tag 112 (Macher-Sicht)

**Stats**: 12 Commits, +457 / -237 LoC, 7 Dateien, ~88 aktive Minuten. Schwerpunkt `cloudflared-config.yml` (44 %) und `docker-compose.macmini.yml`.

Ein Domain- und Routing-Tag. Eigene Co-/Primary-Domains verdrahtet: `app.zitare.com`/`api.zitare.com` (zitare.mana.how raus), `herbatrium.com` + `seepuls.com` als Primary, `comicello.com` + www + api. Mehrere Tunnel-Fixes gegen catch-all-404: `hub.mana.how` → `mana-hub-web:3082`, kreisel- und herbatrium-Routes nachgezogen, `sync2.mana.how` ergänzt, `uload.mana.how` zugunsten von `ulo.ad`-Path-Routing entfernt. Im Web zwei Fixes an `/offline`: prerendert wieder korrekt ohne den Workbox-Bug nach einem Layout-Bypass. Compliance-Detail zum Schluss: `.npmrc` in `.gitignore` — der Verdaccio-Token soll nie in git landen.
