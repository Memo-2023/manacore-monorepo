---
date: 2026-05-19
day: 111
view: macher
weekday: Dienstag
commits: 7
review: auto
---
# Dienstag, 2026-05-19 — Tag 111 (Macher-Sicht)

**Stats**: 7 Commits, +125 / -29.335 LoC, 216 Dateien, ~43 aktive Minuten. 78 % der Änderungen in `apps/mana/apps/web` — weiteres Abtragen der unified-App.

Fortsetzung der Modul-Ausgliederung: music/mukke, quotes, articles (inkl. Backend-Worker, pageta trägt die Artikel jetzt allein), places/locationLogs raus aus der unified-App; CORS für mukke + manaclick nachgezogen, cards-Reste entfernt. Nebenbei zwei Hausmeister-Commits: vorbestehende `svelte-check`-Fehler repariert, die das Pre-Push-Gate blockierten, und der `scan.ts`-Header an leere SOURCES angepasst mit Verweis auf das Followup-Playbook. Kein neues Feature, gezieltes Schuldenabtragen.
