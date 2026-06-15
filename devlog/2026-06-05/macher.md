---
date: 2026-06-05
day: 124
view: macher
weekday: Freitag
commits: 9
review: auto
---
# Freitag, 2026-06-05 — Tag 124 (Macher-Sicht)

**Stats**: 9 Commits, +1.384 / -11.692 LoC, 191 Dateien, ~85 aktive Minuten. 77 % der Änderung in `apps/mana/apps/web` — die Modul-Stilllegung.

Hauptarbeit: library-, wishes- und habits-Module aus managarten herausgenommen (große Lösch-Bilanz). Drumherum CI/CD-Reparatur in Serie: das `NPM_TOKEN`-Gate im validate-Job gefixt + Auto-Retry für den mana-web-Build, bun im validate-Job für `audit:encrypted-tools` installiert. Hygiene-Pässe: i18n-Baselines (hardcoded-strings, missing-key) neu generiert, die Crypto-Registry mit dem aktuellen Dexie-Schema abgeglichen, Prettier-Pass + toter `getStore` in `shared-hono` entfernt, tsup-generierter Token-Output ge-`ignore`d, ESLint-`projectService`-Root korrigiert und das Lint-Gate gezielt aufgeweicht.
