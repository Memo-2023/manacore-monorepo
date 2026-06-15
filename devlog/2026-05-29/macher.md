---
date: 2026-05-29
day: 118
view: macher
weekday: Freitag
commits: 4
review: auto
---
# Freitag, 2026-05-29 — Tag 118 (Macher-Sicht)

**Stats**: 4 Commits, +369 / -626 LoC, 22 Dateien, ~29 aktive Minuten, breit über die Landing-Pages verteilt.

DSGVO-Detail: Inter wird in allen Landings selbst gehostet statt über das Google-Fonts-CDN — kein Drittanfrage-Leak mehr beim Seitenaufruf. In `shared-ui` der aktive Pill jetzt voll gefüllt, Parität zu `mana shared-ui@1.3.0`. Backup-seitig wird der MinIO-Objektspeicher ins zentrale Backup aufgenommen — Datenbanken und Objekte ziehen damit am selben Strang. Zum Schluss ein Hygiene-Pin: `@types/node` workspace-weit auf 24.12.2 festgenagelt.
