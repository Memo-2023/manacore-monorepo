---
date: 2026-06-12
day: 127
view: macher
weekday: Freitag
commits: 3
review: auto
---
# Freitag, 2026-06-12 — Tag 127 (Macher-Sicht)

**Stats**: 3 Commits, +15 / -1 LoC, 2 Dateien, frühe Morgenstunden.

Backup um einen Globals-Dump erweitert (Rollen/Grants der konsolidierten infra-Postgres), damit ein Restore nicht nur Daten, sondern auch die Berechtigungslandschaft zurückbringt. Sicherheitshärtung: `mana-api` läuft jetzt auf der Rolle `platform_app` statt als Superuser (Superuser-Entwöhnung). Und das `mem_limit` für `mana-api` ist dauerhaft in der Compose verankert, statt nur flüchtig zur Laufzeit gesetzt.
