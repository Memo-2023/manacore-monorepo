---
date: 2026-06-06
day: 125
view: macher
weekday: Samstag
commits: 5
review: auto
---
# Samstag, 2026-06-06 — Tag 125 (Macher-Sicht)

**Stats**: 5 Commits, +7.289 / -350 LoC, 48 Dateien, ~33 aktive Minuten. Großer Anteil in `apps/manavoxel/apps/web` und `apps/mana/apps/web`.

Kern des Tages: Dual-Domain-Betrieb für die Garten-Web-App. `managarten.com` per Host-Matching neben `mana.how` bedient, mit OIDC-BFF-Auth — `PUBLIC_APP_URL` + `MANA_WEB_OIDC_CLIENT_SECRET` in der Compose, damit die Session-Brücke auf beiden Domains greift. CI-seitig die CD-Change-Detection repariert und alle 8 Pakete lint-clean gemacht (Lint-Gate wieder scharf); für `mana/web` der typ-bewusste ESLint-`projectService` aus Performance-Gründen abgeschaltet. Zum Schluss in `mana-api`/analytics das lokale Default-LLM von `gemma3:4b` auf `gemma4:12b` gehoben.
