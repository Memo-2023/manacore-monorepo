---
date: 2026-05-17
day: 109
view: macher
weekday: Sonntag
commits: 8
review: auto
---
# Sonntag, 2026-05-17 — Tag 109 (Macher-Sicht)

**Stats**: 8 Commits, +106 / -185 LoC, 6 Dateien, ~54 aktive Minuten über einen langgezogenen Sonntag-Nachmittag.

Cutover-Arbeit an mehreren Fronten. Das `news`-Modul liest produktiv aus `mana-news-pool` statt aus dem alten `news-ingester`, der im selben Zug als DEPRECATED markiert wurde. Drumherum die übliche Hosting-Choreografie: `mana-auth` `CORS_ORIGINS` um `lesen.*` und `werdrobe` erweitert, `backup-databases.sh` um die neuen Postgres-Container (`lesen`, `seepuls`, `manameme`) nachgezogen, im Tunnel `manaspur` → `viadocu` umbenannt. Domain-Konsolidierung der Karten-App: `wordeck.com` + `api.wordeck.com` als Ingress, und `cards.*`/`cardecky.*` per nginx-301 auf `wordeck.com` umgeleitet — die Karten-App bekommt eine kanonische Domain, der Rest leitet dauerhaft dorthin um.
