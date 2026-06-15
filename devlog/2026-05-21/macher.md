---
date: 2026-05-21
day: 113
view: macher
weekday: Donnerstag
commits: 3
review: auto
---
# Donnerstag, 2026-05-21 — Tag 113 (Macher-Sicht)

**Stats**: 3 Commits, +6.872 / -20.600 LoC, 218 Dateien, ~17 aktive Minuten. 95 % der Änderung in `packages/shared-ui/src`.

`shared-ui` auf `mana/shared-ui v1.0.0` synchronisiert — ein großer Abgleich, bei dem die tote `AppSlider`-Komponente entfiel (daher die hohe Lösch-Bilanz). Funktional dazu die `mana-me`-Write-Through-Brücke: Profil-Schreibvorgänge gehen durchgereicht an den zentralen Profil-Dienst, plus `me.mana.how`-Route im Tunnel. Zum Schluss ein A11y-Fix in `shared-ui`: `TagChip` hatte einen verschachtelten Button, `Pill` bekam ein `svelte:element` mit korrekter ARIA-`role`.
