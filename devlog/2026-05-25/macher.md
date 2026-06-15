---
date: 2026-05-25
day: 116
view: macher
weekday: Montag
commits: 3
review: auto
---
# Montag, 2026-05-25 — Tag 116 (Macher-Sicht)

**Stats**: 3 Commits, +116 / -2 LoC, 4 Dateien, ~29 aktive Minuten.

Drei Infra-Verbesserungen. Ein Port-Drift bei credits (3002 → 3061) entschärft. In `ensure-containers-running.sh` ein colima-VM-Liveness-Guard: erkennt, wenn die Docker-VM wedged ist, statt blind weiterzulaufen. Und Phase 1 der Off-Site-Strategie: eine Backup-Zweitkopie auf die GPU-Box, definiert in `docker-compose.gpu-box.yml` — erstmals liegt eine Sicherung physisch getrennt vom Mac Mini.
