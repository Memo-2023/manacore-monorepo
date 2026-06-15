---
date: 2026-06-02
day: 121
view: macher
weekday: Dienstag
commits: 2
review: auto
---
# Dienstag, 2026-06-02 — Tag 121 (Macher-Sicht)

**Stats**: 2 Commits, +20 / -1 LoC, 3 Dateien, ~28 aktive Minuten.

Zwei kleine Stellschrauben. `mana-image-gen` fährt FLUX.2-klein per CPU-Offload statt das Modell resident im Speicher zu halten — schont RAM auf Kosten von etwas Latenz. Und ein husky-Fix: die git-Hooks (pre-commit/pre-push) überspringen sauber, wenn `node_modules` fehlt, statt mit Fehler abzubrechen.
