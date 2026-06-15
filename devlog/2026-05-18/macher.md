---
date: 2026-05-18
day: 110
view: macher
weekday: Montag
commits: 15
review: auto
---
# Montag, 2026-05-18 — Tag 110 (Macher-Sicht)

**Stats**: 15 Commits, +743 / -318.044 LoC, 1.798 Dateien, ~137 aktive Minuten. Die riesige Lösch-Bilanz kommt vom Entkernen der unified-App.

Der Tag der großen Entflechtung. Reihenweise `chore(mana): <modul> aus unified-App entfernen` — citycorners, food, wardrobe, plants, who, memoro, news, comic, uload verlassen `apps/mana/apps/web`; jedes wandert zu einem eigenständigen Repo/Container. Parallel die Live-Schaltung zweier Nachfolger: comicello (Phase ω-0) und uload (υ-6) mit Tunnel-Routes, `mana-auth`-CORS und Backup-Cron-Mapping. `shared-uload` auf HTTP-Föderation (Option B) umgestellt — schreibt jetzt gegen `uload-api` statt in die gemeinsame Datenbank. Tunnel-Rename `lesen.*` → `pageta.*`, Backup-Cron entsprechend `lesen-postgres` → `pageta-postgres`. Architektur-Linie des Tages: ein Produkt = ein Repo = ein Container, die Sammel-App schrumpft zum Resthof.
