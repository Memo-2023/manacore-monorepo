---
title: 'Infrastruktur-Audit & Architektur-Verbesserungen'
description: 'Umfassende Analyse der aktuellen Mac Mini Infrastruktur mit detaillierten Verbesserungsvorschlägen für Port-Verteilung, Volumes, Dependencies und Service-Konsolidierung vor der K8s-Migration.'
date: 2026-01-31
author: 'Till Schneider'
category: 'infrastructure'
status: 'accepted'
tags:
  [
    'docker',
    'infrastructure',
    'audit',
    'ports',
    'volumes',
    'dependencies',
    'migration',
    'mac-mini',
    'architecture',
  ]
featured: true
readTime: 25
relatedBlueprints: ['001-mana-cluster-federation-architecture']
decisionDate: 2026-01-31
---

## Executive Summary

Dieses Dokument analysiert den aktuellen Zustand der Mana-Infrastruktur auf dem Mac Mini und identifiziert Verbesserungspotentiale vor der geplanten Migration zu einem selbstheilenden K8s-Cluster. Die Analyse umfasst **52 Docker-Container** plus **3 native macOS-Services**.

## Aktueller Infrastruktur-Zustand

### Service-Kategorien Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Mana Infrastructure                           │
│                      (Mac Mini M4 Pro)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ PostgreSQL  │  │    Redis    │  │    MinIO    │                  │
│  │    :5432    │  │    :6379    │  │ :9000/:9001 │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│         └────────────────┼────────────────┘                          │
│                          ▼                                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    mana-core-auth (:3001)                      │  │
│  │                 (Central Authentication)                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                          │                                           │
│         ┌────────────────┼────────────────┐                          │
│         ▼                ▼                ▼                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ API Gateway │  │ mana-search │  │  App Suite  │                  │
│  │   (:3030)   │  │   (:3021)   │  │ (10 Apps)   │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   Matrix Stack (14 Services)                   │  │
│  │    Synapse │ Element │ 10 Bots │ Custom Web Client             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 Monitoring & Tools (8 Services)                │  │
│  │  VictoriaMetrics │ Grafana │ Exporters │ Web-Analytics │ n8n           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Vollständige Service-Inventar

#### Tier 0: Infrastruktur (3 Services)

| Service       | Container     | Port(s)    | Volume        | Bemerkung                     |
| ------------- | ------------- | ---------- | ------------- | ----------------------------- |
| PostgreSQL 16 | mana-postgres | 5432       | mana-postgres | Alle DBs in einer Instanz     |
| Redis 7       | mana-redis    | 6379       | mana-redis    | Session-Cache + Pub/Sub       |
| MinIO         | mana-minio    | 9000, 9001 | mana-minio    | S3-kompatibler Object Storage |

#### Tier 1: Core Auth (1 Service)

| Service        | Container      | Port | Dependencies    | Bemerkung               |
| -------------- | -------------- | ---- | --------------- | ----------------------- |
| mana-core-auth | mana-core-auth | 3001 | postgres, redis | Better Auth + EdDSA JWT |

#### Tier 2: Gateway & Suche (3 Services)

| Service     | Container        | Port          | Dependencies                  | Bemerkung             |
| ----------- | ---------------- | ------------- | ----------------------------- | --------------------- |
| API Gateway | mana-api-gateway | 3030          | auth, search, postgres, redis | Monetarisierung       |
| SearXNG     | mana-searxng     | (intern 8080) | -                             | Meta-Suchmaschine     |
| mana-search | mana-search      | 3021          | searxng, redis                | NestJS Search Service |

#### Tier 3: App-Backends (10 Services)

| App       | Container         | Port | Datenbank | Spezial            |
| --------- | ----------------- | ---- | --------- | ------------------ |
| Chat      | chat-backend      | 3002 | chat      | Ollama-Integration |
| Presi     | presi-backend     | 3008 | presi     | -                  |
| Contacts  | contacts-backend  | 3015 | contacts  | MinIO (Fotos)      |
| Calendar  | calendar-backend  | 3016 | calendar  | -                  |
| Clock     | clock-backend     | 3017 | clock     | -                  |
| Todo      | todo-backend      | 3018 | todo      | -                  |
| Storage   | storage-backend   | 3019 | storage   | MinIO (Dateien)    |
| Food      | food-backend      | 3023 | food      | Gemini API         |
| SkillTree | skilltree-backend | 3024 | skilltree | -                  |

#### Tier 4: Web-Frontends (11 Services)

| App            | Container      | Port | Backend-Port |
| -------------- | -------------- | ---- | ------------ |
| Mana Dashboard | mana-web       | 5173 | -            |
| Chat           | chat-web       | 3000 | 3002         |
| Presi          | presi-web      | 5178 | 3008         |
| Matrix         | matrix-web     | 5180 | 8008         |
| Contacts       | contacts-web   | 5184 | 3015         |
| Storage        | storage-web    | 5185 | 3019         |
| Calendar       | calendar-web   | 5186 | 3016         |
| Clock          | clock-web      | 5187 | 3017         |
| Todo           | todo-web       | 5188 | 3018         |
| Food           | food-web       | 5189 | 3023         |
| LLM Playground | llm-playground | 5190 | -            |
| SkillTree      | skilltree-web  | 5195 | 3024         |

#### Tier 5: Matrix Stack (14 Services)

| Service         | Container                   | Port       | Funktion                |
| --------------- | --------------------------- | ---------- | ----------------------- |
| Synapse         | mana-synapse                | 8008, 9002 | Homeserver              |
| Element Web     | mana-element                | 8087       | Standard Client         |
| Matrix Web      | mana-matrix-web             | 5180       | Custom SvelteKit Client |
| Mana Bot        | mana-matrix-mana-bot        | 3310       | Unified Gateway Bot     |
| Ollama Bot      | mana-matrix-ollama-bot      | 3311       | AI Chat                 |
| Stats Bot       | mana-matrix-stats-bot       | 3312       | Analytics               |
| Project Doc Bot | mana-matrix-project-doc-bot | 3313       | Dokumentation           |
| Todo Bot        | mana-matrix-todo-bot        | 3314       | Task Management         |
| Calendar Bot    | mana-matrix-calendar-bot    | 3315       | Termine                 |
| Food Bot        | mana-matrix-food-bot        | 3316       | Nutrition               |
| Quotes Bot      | mana-matrix-quotes-bot      | 3317       | Quotes                  |
| Clock Bot       | mana-matrix-clock-bot       | 3318       | Time Tracking           |
| TTS Bot         | mana-matrix-tts-bot         | 3033       | Text-to-Speech          |

#### Tier 6: Monitoring & Tools (8 Services)

| Service            | Container               | Port | Funktion            |
| ------------------ | ----------------------- | ---- | ------------------- |
| VictoriaMetrics    | mana-victoriametrics    | 8428 | Metriken-DB         |
| Grafana            | mana-grafana            | 3100 | Dashboards          |
| Pushgateway        | mana-pushgateway        | 9091 | Batch-Metriken      |
| Node Exporter      | mana-node-exporter      | 9100 | Host-Metriken       |
| cAdvisor           | mana-cadvisor           | 8080 | Container-Metriken  |
| Postgres Exporter  | mana-postgres-exporter  | 9187 | DB-Metriken         |
| Redis Exporter     | mana-redis-exporter     | 9121 | Cache-Metriken      |
| Web-Analytics      | mana-web-analytics      | 3200 | Web Analytics       |
| n8n                | mana-n8n                | 5678 | Workflow Automation |
| Telegram Stats Bot | mana-telegram-stats-bot | 3300 | Telegram Reports    |

#### Native macOS Services (3 Services)

| Service        | Port  | Zugriff              | Bemerkung               |
| -------------- | ----- | -------------------- | ----------------------- |
| Ollama         | 11434 | host.docker.internal | Gemma 3 4B, LLM Runtime |
| mana-image-gen | 3025  | host.docker.internal | Stable Diffusion        |
| mana-tts       | 3022  | host.docker.internal | Kokoro TTS              |
| mana-stt       | 3020  | host.docker.internal | Whisper STT             |

#### Auto-Update (1 Service)

| Service    | Container       | Funktion                      |
| ---------- | --------------- | ----------------------------- |
| Watchtower | mana-watchtower | Auto-Update + Telegram Notify |

---

## Identifizierte Probleme

### 1. Port-Chaos

Die aktuelle Port-Verteilung folgt keinem erkennbaren Schema:

```
AKTUELL (Chaotisch):
┌──────────────────────────────────────────────────────────────────┐
│ 3000 chat-web          │ Web Frontend im Backend-Bereich!        │
│ 3001 mana-core-auth    │ OK                                      │
│ 3002 chat-backend      │ OK                                      │
│ 3003-3007 LÜCKE        │ Verschwendet                            │
│ 3008 presi-backend     │ OK                                      │
│ 3009-3014 LÜCKE        │ Verschwendet                            │
│ 3015-3019 Backends     │ OK                                      │
│ 3020-3022 AI Services  │ OK (nativ)                              │
│ 3023-3024 Backends     │ OK                                      │
│ 3025 mana-image-gen    │ OK (nativ)                              │
│ 3026-3029 LÜCKE        │                                         │
│ 3030 api-gateway       │ OK                                      │
│ 3031-3032 LÜCKE        │                                         │
│ 3033 matrix-tts-bot    │ Bot im falschen Bereich!                │
│ 3100 grafana           │ Monitoring im Backend-Bereich!          │
│ 3200 web-analytics             │ Warum 3200?                             │
│ 3300-3301 Telegram     │ Telegram im 33xx Bereich                │
│ 3310-3318 Matrix Bots  │ OK, aber 3033 fehlt!                    │
├──────────────────────────────────────────────────────────────────┤
│ 5173-5195 Web UIs      │ Größtenteils OK, aber Lücken            │
│ 5678 n8n               │ Warum hier?                             │
├──────────────────────────────────────────────────────────────────┤
│ 8008 synapse           │ Matrix Homeserver                       │
│ 8080 cadvisor          │ Konflikt mit SearXNG intern!            │
│ 8087 element-web       │ Random?                                 │
│ 8428 victoriametrics   │ OK                                      │
├──────────────────────────────────────────────────────────────────┤
│ 9000-9001 minio        │ OK                                      │
│ 9002 synapse-metrics   │ Ausweichport wegen MinIO                │
│ 9091 pushgateway       │ OK                                      │
│ 9100 node-exporter     │ OK                                      │
│ 9121 redis-exporter    │ OK                                      │
│ 9187 postgres-exporter │ OK                                      │
└──────────────────────────────────────────────────────────────────┘
```

**Probleme:**

- `chat-web` auf Port 3000 (sollte bei 51xx sein)
- `grafana` auf 3100 (sollte bei 8xxx oder 9xxx sein)
- `matrix-tts-bot` auf 3033 (sollte bei 331x sein)
- Große Lücken verschwenden Adressraum
- Keine klare Trennung zwischen Service-Typen

### 2. Inkonsistente Container-Benennung

```
AKTUELL:
mana-postgres         ✓ Konsistent
mana-redis            ✓ Konsistent
mana-core-auth            ✗ Bindestrich-Variante
mana-api-gateway          ✗ Bindestrich-Variante
chat-backend              ✗ Kein Präfix
chat-web                  ✗ Kein Präfix
mana-matrix-mana-bot  ✓ Konsistent
mana-synapse          ✓ Konsistent
```

### 3. Nicht-optimale Dependencies

Einige Services haben übermäßige Abhängigkeiten:

```yaml
# AKTUELL: api-gateway wartet auf 4 Services
api-gateway:
  depends_on:
    mana-core-auth: # Notwendig
    mana-search: # Nur für Search-Features
    postgres: # Kann später verbinden
    redis: # Kann später verbinden
```

### 4. Duplizierte Bot-Funktionalität

Viele Matrix-Bots teilen ähnlichen Code:

- `matrix-todo-bot` und `matrix-calendar-bot` haben ähnliche Reminder-Logik
- `matrix-food-bot` und `matrix-quotes-bot` sind Wrapper für Backends
- `matrix-mana-bot` sollte theoretisch alle anderen ersetzen

### 5. Volume-Fragmentierung

```yaml
# 20 separate Volumes, davon 10 nur für Matrix-Bots:
volumes:
  matrix_mana_bot_data:
  matrix_ollama_bot_data:
  matrix_stats_bot_data:
  matrix_project_doc_bot_data:
  matrix_calendar_bot_data:
  matrix_todo_bot_data:
  matrix_food_bot_data:
  matrix_quotes_bot_data:
  matrix_clock_bot_data:
  matrix_tts_bot_data:
```

---

## Verbesserungsvorschläge

### 1. Neues Port-Schema

Ein strukturiertes Port-Schema für bessere Übersicht:

```
NEU (Strukturiert):
┌─────────────────────────────────────────────────────────────────────┐
│                        PORT-ALLOCATION-SCHEMA                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  3000-3099: Core Services & Backends                                 │
│  ├── 3001: mana-core-auth         (Auth)                            │
│  ├── 3010: api-gateway            (Gateway)                         │
│  ├── 3020: mana-search            (Search)                          │
│  ├── 3021: mana-stt               (Speech-to-Text)                  │
│  ├── 3022: mana-tts               (Text-to-Speech)                  │
│  ├── 3025: mana-image-gen         (Image Generation)                │
│  ├── 3030: chat-backend                                             │
│  ├── 3031: todo-backend                                             │
│  ├── 3032: calendar-backend                                         │
│  ├── 3033: clock-backend                                            │
│  ├── 3034: contacts-backend                                         │
│  ├── 3035: storage-backend                                          │
│  ├── 3036: presi-backend                                            │
│  ├── 3037: food-backend                                         │
│  └── 3038: skilltree-backend                                        │
│                                                                      │
│  4000-4099: Matrix Stack                                             │
│  ├── 4000: synapse                (Homeserver)                      │
│  ├── 4001: synapse-metrics                                          │
│  ├── 4010: matrix-mana-bot        (Unified Bot)                     │
│  ├── 4011: matrix-ollama-bot      (AI Chat)                         │
│  ├── 4012: matrix-stats-bot       (Analytics)                       │
│  ├── 4013: matrix-project-doc-bot (Docs)                            │
│  ├── 4080: element-web            (Standard Client)                 │
│  └── 4090: matrix-web             (Custom Client)                   │
│                                                                      │
│  5000-5099: Web Frontends                                            │
│  ├── 5000: mana-web           (Dashboard)                       │
│  ├── 5010: chat-web                                                 │
│  ├── 5011: todo-web                                                 │
│  ├── 5012: calendar-web                                             │
│  ├── 5013: clock-web                                                │
│  ├── 5014: contacts-web                                             │
│  ├── 5015: storage-web                                              │
│  ├── 5016: presi-web                                                │
│  ├── 5017: food-web                                             │
│  ├── 5018: skilltree-web                                            │
│  └── 5090: llm-playground                                           │
│                                                                      │
│  6000-6099: Automation & Workflows                                   │
│  ├── 6000: n8n                                                      │
│  ├── 6010: telegram-stats-bot                                       │
│  └── 6011: telegram-ollama-bot                                      │
│                                                                      │
│  8000-8099: Monitoring Dashboards                                    │
│  ├── 8000: grafana                                                  │
│  ├── 8010: web-analytics                                                    │
│  └── 8080: victoriametrics-ui                                       │
│                                                                      │
│  9000-9199: Infrastructure & Exporters                               │
│  ├── 9000: minio-api                                                │
│  ├── 9001: minio-console                                            │
│  ├── 9090: victoriametrics                                          │
│  ├── 9091: pushgateway                                              │
│  ├── 9100: node-exporter                                            │
│  ├── 9121: redis-exporter                                           │
│  └── 9187: postgres-exporter                                        │
│                                                                      │
│  11000+: Native Services (macOS)                                     │
│  └── 11434: ollama                                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Konsistente Benennung

**Container-Namen:**

```
mana-{category}-{service}

Beispiele:
- mana-infra-postgres
- mana-infra-redis
- mana-core-auth
- mana-api-gateway
- mana-app-chat-backend
- mana-app-chat-web
- mana-matrix-synapse
- mana-matrix-bot-mana
- mana-mon-grafana
- mana-mon-victoria
```

**Volume-Namen:**

```
mana-{service}-data

Beispiele:
- mana-postgres-data
- mana-redis-data
- mana-matrix-bots-data  (konsolidiert!)
- mana-grafana-data
```

### 3. Service-Konsolidierung

**Matrix-Bots → Unified Bot Architecture:**

```
AKTUELL: 10 separate Bot-Container
┌────────────────────────────────────────────────────────────┐
│ matrix-mana-bot      │ matrix-ollama-bot    │ ...         │
│ matrix-stats-bot     │ matrix-project-doc   │             │
│ matrix-todo-bot      │ matrix-calendar-bot  │             │
│ matrix-food-bot  │ matrix-quotes-bot    │             │
│ matrix-clock-bot     │ matrix-tts-bot       │             │
└────────────────────────────────────────────────────────────┘

NEU: 3 konsolidierte Bots
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  matrix-mana-bot (Unified)                                 │
│  ├── !mana     → AI Chat (Ollama)                         │
│  ├── !todo     → Task Management                          │
│  ├── !cal      → Calendar                                 │
│  ├── !clock    → Time Tracking                            │
│  ├── !nutri    → Nutrition                                │
│  ├── !zitat    → Quotes                                   │
│  └── !tts      → Text-to-Speech                           │
│                                                            │
│  matrix-stats-bot                                          │
│  └── Scheduled Reports (bleibt separat)                   │
│                                                            │
│  matrix-project-doc-bot                                    │
│  └── RAG + Embeddings (bleibt separat wegen DB)           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Einsparung:** 7 Container, 7 Volumes, ~700MB RAM

### 4. Optimierte Dependencies

```yaml
# NEU: Lazy Dependencies mit Retry-Logic
services:
  api-gateway:
    depends_on:
      mana-core-auth:
        condition: service_healthy # Kritisch
    environment:
      # Andere Services werden lazy verbunden
      SEARCH_URL: http://mana-search:3020
      DB_RETRY_ATTEMPTS: 5
      DB_RETRY_DELAY: 3000
```

### 5. Service-Tiers für Startup-Reihenfolge

```yaml
# docker-compose.yml mit deploy.order
services:
  postgres:
    deploy:
      order: 1

  redis:
    deploy:
      order: 1

  minio:
    deploy:
      order: 1

  mana-core-auth:
    deploy:
      order: 2

  api-gateway:
    deploy:
      order: 3

  # ... App-Backends
    deploy:
      order: 4

  # ... Web-Frontends
    deploy:
      order: 5
```

---

## Migration zu Kubernetes

### Phase 0: Docker Compose Cleanup (vor K8s)

Diese Verbesserungen sollten **vor** der K8s-Migration durchgeführt werden:

| Aufgabe                          | Priorität | Aufwand | Auswirkung          |
| -------------------------------- | --------- | ------- | ------------------- |
| Port-Schema umstellen            | Hoch      | 2h      | Alle Services       |
| Container-Namen vereinheitlichen | Mittel    | 1h      | Alle Services       |
| Matrix-Bots konsolidieren        | Hoch      | 8h      | 7 Container weniger |
| Volume-Namen vereinheitlichen    | Niedrig   | 30min   | Cleanup             |
| Dependencies optimieren          | Mittel    | 2h      | Schnellerer Start   |

### Phase 1: Headscale + K3s (nach Cleanup)

Mit dem neuen Schema ist die Migration zu Kubernetes wesentlich einfacher:

```yaml
# Kubernetes Namespace-Struktur
namespaces:
  - mana-infra # postgres, redis, minio
  - mana-core # auth, gateway, search
  - mana-apps # chat, todo, calendar, etc.
  - mana-matrix # synapse, bots, element
  - mana-monitoring # grafana, victoria, exporters
  - mana-tools # n8n, telegram-bots
```

### Kubernetes Service-Typen

```yaml
# Mapping Docker → Kubernetes
┌────────────────────┬─────────────────────────────────┐
│ Docker Compose     │ Kubernetes                      │
├────────────────────┼─────────────────────────────────┤
│ ports: "3001:3001" │ Service (ClusterIP)             │
│ restart: always    │ Deployment + ReplicaSet         │
│ volumes:           │ PersistentVolumeClaim           │
│ depends_on:        │ initContainers + readinessProbe │
│ healthcheck:       │ livenessProbe + readinessProbe  │
│ environment:       │ ConfigMap + Secret              │
└────────────────────┴─────────────────────────────────┘
```

---

## Ressourcen-Analyse

### Aktuelle RAM-Nutzung (geschätzt)

```
┌────────────────────────────────────────────────────────────┐
│ Service-Kategorie          │ Container │ RAM (geschätzt)  │
├────────────────────────────┼───────────┼──────────────────┤
│ Infrastructure             │     3     │   ~1.5 GB        │
│ Core Services              │     4     │   ~800 MB        │
│ App Backends               │    10     │   ~2.0 GB        │
│ Web Frontends              │    11     │   ~1.1 GB        │
│ Matrix Stack               │    14     │   ~2.8 GB        │
│ Monitoring                 │     8     │   ~1.5 GB        │
├────────────────────────────┼───────────┼──────────────────┤
│ GESAMT Docker              │    50     │   ~9.7 GB        │
├────────────────────────────┼───────────┼──────────────────┤
│ Native Services (Ollama)   │     -     │   ~4.0 GB        │
│ macOS System               │     -     │   ~2.0 GB        │
├────────────────────────────┼───────────┼──────────────────┤
│ GESAMT                     │           │   ~15.7 GB       │
└────────────────────────────────────────────────────────────┘
```

### Nach Konsolidierung (geschätzt)

```
┌────────────────────────────────────────────────────────────┐
│ Service-Kategorie          │ Container │ RAM (geschätzt)  │
├────────────────────────────┼───────────┼──────────────────┤
│ Infrastructure             │     3     │   ~1.5 GB        │
│ Core Services              │     4     │   ~800 MB        │
│ App Backends               │    10     │   ~2.0 GB        │
│ Web Frontends              │    11     │   ~1.1 GB        │
│ Matrix Stack (konsolidiert)│     7     │   ~1.4 GB        │
│ Monitoring                 │     8     │   ~1.5 GB        │
├────────────────────────────┼───────────┼──────────────────┤
│ GESAMT Docker              │    43     │   ~8.3 GB        │
├────────────────────────────┼───────────┼──────────────────┤
│ EINSPARUNG                 │    -7     │   ~1.4 GB        │
└────────────────────────────────────────────────────────────┘
```

---

## Nächste Schritte

### Sofort (Phase 0)

1. **Port-Mapping-Dokument erstellen** - Diese Datei als Referenz
2. **Cloudflare Tunnel-Konfiguration anpassen** - Neue Port-Mappings
3. **Matrix-Bots konsolidieren** - Code-Merge in matrix-mana-bot

### Kurzfristig (Phase 1)

1. **docker-compose.macmini.yml refactoren** - Neue Ports + Namen
2. **Schrittweise Migration** - Ein Service nach dem anderen
3. **Health-Check-Validierung** - Alle Services testen

### Mittelfristig (Phase 2)

1. **K8s Manifests erstellen** - Basierend auf neuem Schema
2. **Helm Charts entwickeln** - Für B2B-Deployment
3. **CI/CD Pipeline anpassen** - Neue Container-Namen

---

## Referenzen

- [Blueprint 001: Cluster & Federation Architecture](/blueprints/001-mana-cluster-federation-architecture)
- [Docker Compose Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Kubernetes Port Allocation](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Matrix Synapse Deployment](https://matrix-org.github.io/synapse/latest/setup/installation.html)
