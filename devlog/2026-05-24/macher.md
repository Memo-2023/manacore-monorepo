---
date: 2026-05-24
day: 115
view: macher
weekday: Sonntag
commits: 1
review: auto
---
# Sonntag, 2026-05-24 — Tag 115 (Macher-Sicht)

**Stats**: 1 Commit um 02:39, +7 / -935 LoC, 1 Datei.

Ein chirurgischer Schnitt: Die Kern-Services werden aus `docker-compose.macmini.yml` entfernt (−935 Zeilen) — sie leben ab jetzt in `mana-core`. Damit hört die managarten-Compose auf, Plattform-Infrastruktur mitzuschleppen, und beschränkt sich auf die App-Stacks. Konsolidierungsschritt der Repo-Trennung mana-platform ↔ managarten.
