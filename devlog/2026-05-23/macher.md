---
date: 2026-05-23
day: 114
view: macher
weekday: Samstag
commits: 4
review: auto
---
# Samstag, 2026-05-23 — Tag 114 (Macher-Sicht)

**Stats**: 4 Commits, +2.080 / -508 LoC, 4 Dateien. Reiner Infra-Samstag.

Drift-Bereinigung: auf dem Server entstandene, nicht-versionierte Tunnel-Routen (s3, mukke-vocal-studio, chor, diverse `app.<x>.com`) zurückgezogen, damit `cloudflared-config.yml` wieder Single Source of Truth ist. Im Backup-Script `db_user_for_container` um kreisel/mukke/viadocu ergänzt. `pnpm-lock.yaml` neu generiert, damit es zu den committeten `package.json`-Specifiern passt. MinIO-CORS um `memoro-app.mana.how` erweitert, damit die Memoro-App ihre Objekte direkt laden darf.
