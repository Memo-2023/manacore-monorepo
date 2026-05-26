# ADR-003: Infrastructure Audit & Port Schema

**Status:** Accepted
**Date:** 2026-01-31
**Author:** Till Schneider
**Category:** Infrastructure

## Context

Die aktuelle Docker-Compose-Konfiguration auf dem Mac Mini hat über die Zeit 52 Container angesammelt mit chaotischer Port-Verteilung, inkonsistenter Benennung und fragmentierten Volumes. Vor der Migration zu K8s ist ein Cleanup notwendig.

## Decision

### 1. Neues Port-Schema

| Range | Kategorie | Beispiele |
|-------|-----------|-----------|
| 3000-3099 | Core Services & Backends | 3001 auth, 3010 gateway, 3030+ backends |
| 4000-4099 | Matrix Stack | 4000 synapse, 401x bots, 4080 element |
| 5000-5099 | Web Frontends | 5000 dashboard, 501x app webs |
| 6000-6099 | Automation | 6000 n8n, 601x telegram |
| 8000-8099 | Monitoring UI | 8000 grafana, 8010 web-analytics |
| 9000-9199 | Infra & Exporters | 9000 minio, 909x metrics |
| 11000+ | Native macOS | 11434 ollama |

### 2. Container-Naming

```
mana-{category}-{service}

Categories: infra, core, app, matrix, mon, auto
```

### 3. Matrix-Bot Konsolidierung

**Vorher:** 10 separate Bot-Container
**Nachher:** 3 Bots (mana-bot unified, stats-bot, project-doc-bot)

**Einsparung:** 7 Container, ~1.4GB RAM

### 4. Volume-Naming

```
mana-{service}-data
```

Matrix-Bot-Volumes werden zu einem konsolidiert: `mana-matrix-bots-data`

## Consequences

### Positive

- Klare Port-Zuordnung erleichtert Debugging
- Konsistente Namen verbessern Übersicht
- Weniger Container = weniger Ressourcenverbrauch
- Vorbereitung für K8s-Migration

### Negative

- Einmaliger Migrationsaufwand
- Cloudflare Tunnel muss angepasst werden
- Matrix-Bot Code-Merge erforderlich

## Migration Steps

1. Port-Mapping dokumentieren (erledigt)
2. Matrix-Bots konsolidieren
3. docker-compose.yml refactoren
4. Cloudflare Tunnel anpassen
5. Services schrittweise migrieren

## Full Documentation

Siehe: `apps/mana/apps/landing/src/content/blueprints/002-infrastructure-audit-improvements.md`
