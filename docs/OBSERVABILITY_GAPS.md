# Observability Gaps: Was unserem Monitoring-Stack noch fehlt

> **Stand:** März 2026
> **Bezug:** Bestehendes Setup dokumentiert in [MONITORING.md](MONITORING.md) und [ERROR_TRACKING.md](ERROR_TRACKING.md)

## Übersicht: Was wir haben vs. was fehlt

| Bereich | Haben wir? | Tool | Status |
|---------|-----------|------|--------|
| Metriken (Infra + App) | Ja | VictoriaMetrics + Grafana | Produktionsreif |
| Alerting | Ja | Alertmanager + Telegram/ntfy | 70+ Regeln |
| Error Tracking (Backend) | Ja | GlitchTip | 18 Backends angebunden |
| **Distributed Tracing** | **Nein** | — | Kein Tracing |
| **Log-Aggregation** | **Nein** | — | Nur `docker logs` |
| **APM (Application Performance Monitoring)** | **Nein** | — | Kein Runtime-Profiling |

---

## 1. Distributed Tracing

### Was ist das?

Distributed Tracing verfolgt eine einzelne Benutzeranfrage über alle beteiligten Services hinweg — vom Frontend über den Backend-Service bis zur Datenbank und zurück. Jeder Schritt wird als **Span** erfasst, und alle Spans einer Anfrage bilden zusammen einen **Trace**.

### Beispiel: Was passiert ohne Tracing

Ein User öffnet den Chat und die Seite lädt langsam. Im Grafana siehst du, dass die p95-Latenz bei 3 Sekunden liegt. Aber **wo** steckt das Problem?

- Liegt es am Chat-Backend?
- An der Authentifizierung bei mana-auth?
- An einer langsamen PostgreSQL-Query?
- Am Redis-Cache, der nicht greift?
- An der Netzwerk-Latenz zwischen Containern?

Ohne Tracing ist das Debugging ein Ratespiel. Du musst `docker logs` von jedem Service einzeln durchsuchen und Timestamps manuell korrelieren.

### Was Tracing liefern würde

Ein Trace für dieselbe Anfrage zeigt dir eine Wasserfall-Ansicht:

```
[Chat-Web → Chat-Backend]  ─── 3.2s total ───────────────────────────────
  ├─ [Auth Validation]      ── 45ms ──  POST mana-auth/validate
  ├─ [Redis Cache Lookup]   ── 2ms ──   GET conversation:123
  ├─ [PostgreSQL Query]     ── 2.8s ──  SELECT * FROM messages WHERE...  ← BOTTLENECK
  │    └─ [Index Scan]      ── 2.7s ──  seq scan on messages (missing index!)
  └─ [Response Serialize]   ── 12ms ──  JSON encoding
```

Sofort sichtbar: Die PostgreSQL-Query braucht 2.8s wegen eines fehlenden Index.

### Relevanz für unser Setup

Unser Stack hat viele Service-zu-Service-Aufrufe:

```
Browser → SvelteKit Web → NestJS Backend → mana-auth (Auth-Validierung)
                                         → PostgreSQL (Daten)
                                         → Redis (Cache/Sessions)
                                         → mana-search (Suche)
                                         → mana-llm (KI-Anfragen)
                                         → MinIO (Datei-Uploads)
```

Bei 20+ Containern und mehreren Backends, die sich gegenseitig aufrufen, ist es ohne Tracing nahezu unmöglich, Performance-Probleme zu isolieren.

### Tools die in Frage kommen

| Tool | Typ | Passt zu uns? | Aufwand |
|------|-----|--------------|---------|
| **Grafana Tempo** | Self-hosted, Open Source | Sehr gut — integriert sich direkt in bestehendes Grafana | Mittel |
| **Jaeger** | Self-hosted, Open Source | Gut — eigenständige UI, bewährt | Mittel |
| **OpenTelemetry (OTel)** | SDK/Collector (kein Backend) | **Pflicht** — universeller Standard für Instrumentation | Mittel |
| SigNoz | Self-hosted, Open Source | All-in-One (Traces + Metriken + Logs) | Hoch |
| Datadog/New Relic | SaaS | Overkill und teuer für unsere Größe | Gering (aber $$$) |

**Empfehlung:** OpenTelemetry SDK in allen NestJS-Backends + Grafana Tempo als Backend. Tempo ist speziell für Grafana gebaut und braucht keinen zusätzlichen Storage — es nutzt Object Storage (MinIO haben wir bereits).

### Was die Integration bedeutet

**NestJS-Backends (Instrumentation):**

```typescript
// tracing.ts — wird vor dem App-Start geladen
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  serviceName: 'chat-backend',
  traceExporter: new OTLPTraceExporter({
    url: 'http://tempo:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Automatisch: HTTP, Express, PostgreSQL, Redis, fetch
    }),
  ],
});
sdk.start();
```

Die Auto-Instrumentation fängt automatisch alle HTTP-Requests, DB-Queries und Redis-Aufrufe ab — ohne dass man jeden Endpunkt manuell annotieren muss.

**Docker-Compose Erweiterung:**

```yaml
mana-mon-tempo:
  image: grafana/tempo:latest
  container_name: mana-mon-tempo
  volumes:
    - /Volumes/ManaData/tempo:/var/tempo
  ports:
    - "4318:4318"   # OTLP HTTP
    - "3200:3200"   # Tempo Query API
```

**Aufwand-Schätzung:**
- Tempo aufsetzen: ~1h
- OTel SDK als Shared Package: ~2h
- In alle Backends integrieren: ~30min pro Backend (größtenteils Copy-Paste)
- Grafana Datasource + Dashboard: ~1h

---

## 2. Log-Aggregation

### Was ist das?

Log-Aggregation sammelt die Logs aller Container an einem zentralen Ort, macht sie durchsuchbar, filterbar und korrelierbar. Statt `docker logs mana-chat-backend | grep error` auf dem Server zu tippen, hast du ein Web-UI, in dem du über alle Services gleichzeitig suchen kannst.

### Aktueller Zustand

Unsere Logs sind aktuell:

- **Nur per SSH erreichbar** — du musst dich auf den Mac Mini verbinden
- **Pro Container isoliert** — `docker logs <container-name>`
- **Begrenzt** — max 3 Dateien à 50MB pro Container (150MB), danach weg
- **Nicht durchsuchbar** — kein Volltext-Index, kein Filtern nach Severity/Service
- **Nicht korrelierbar** — wenn Auth und Chat-Backend gleichzeitig Fehler loggen, musst du manuell Timestamps vergleichen

### Konkrete Probleme die das verursacht

**Szenario 1: Fehlersuche über Service-Grenzen**

Ein User meldet: "Ich kann keine Nachrichten senden." Du weißt nicht, ob das Problem im Chat-Backend, bei der Auth-Validierung oder in der Datenbank liegt. Aktuell:

```bash
ssh mana-server
docker logs mana-chat-backend --since 10m | grep -i error
docker logs mana-auth | grep -i error
docker logs mana-infra-postgres 2>&1 | grep -i error
# ... manuell Timestamps vergleichen
```

Mit Log-Aggregation:

```
# In Grafana/Loki UI:
{service=~"chat-backend|mana-auth|postgres"} |= "error" | last 10m
```

Ein Query, alle Services, sofort korreliert.

**Szenario 2: Logs gehen verloren**

Container-Restart → Docker rotiert Logs → ältere Logs verschwinden. Wenn ein Problem erst Stunden später gemeldet wird, sind die relevanten Logs möglicherweise schon weg.

**Szenario 3: Post-Mortem Analyse**

Nach einem Ausfall willst du nachvollziehen, was passiert ist. Ohne zentrale Logs rekonstruierst du die Timeline mühsam aus fragmentierten Container-Logs.

### Tools die in Frage kommen

| Tool | Typ | Passt zu uns? | Ressourcenverbrauch |
|------|-----|--------------|-------------------|
| **Grafana Loki** | Self-hosted, Open Source | Ideal — Grafana-nativ, label-basiert, leichtgewichtig | Gering (~256MB RAM) |
| **Promtail** | Log-Shipper für Loki | Gehört zu Loki | Gering (~50MB RAM) |
| ELK Stack (Elasticsearch + Logstash + Kibana) | Self-hosted | Überdimensioniert — Elasticsearch braucht 2-4GB RAM minimum | Hoch |
| Vector/Fluentd | Log-Shipper | Alternative zu Promtail, flexibler aber komplexer | Mittel |

**Empfehlung:** Loki + Promtail. Loki ist speziell als "Prometheus, aber für Logs" gebaut. Es indiziert nur Labels (Service-Name, Level), nicht den vollen Log-Text — dadurch extrem ressourcenschonend. Perfekt für einen Mac Mini mit begrenztem RAM.

### Was die Integration bedeutet

**Docker-Compose Erweiterung:**

```yaml
mana-mon-loki:
  image: grafana/loki:3.0.0
  container_name: mana-mon-loki
  volumes:
    - /Volumes/ManaData/loki:/loki
  ports:
    - "3100:3100"
  command: -config.file=/etc/loki/local-config.yaml

mana-mon-promtail:
  image: grafana/promtail:3.0.0
  container_name: mana-mon-promtail
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
  command: -config.file=/etc/promtail/config.yml
```

Promtail liest automatisch alle Docker-Container-Logs und schickt sie an Loki. Kein Code-Change in den Apps nötig.

**Structured Logging (optional, aber empfohlen):**

Damit Loki die Logs besser parsen kann, sollten Backends JSON statt Plain-Text loggen:

```typescript
// NestJS: JSON-Logger statt Default
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

WinstonModule.forRoot({
  transports: [
    new winston.transports.Console({
      format: winston.format.json(),
    }),
  ],
});
```

Ergebnis: `{"level":"error","message":"DB connection failed","service":"chat-backend","timestamp":"2026-03-22T10:00:00Z"}` statt `[Nest] ERROR DB connection failed`.

**Aufwand-Schätzung:**
- Loki + Promtail aufsetzen: ~1-2h
- Grafana Datasource konfigurieren: ~15min
- Log-Dashboard bauen: ~1h
- (Optional) Structured Logging in Backends: ~30min pro Backend

---

## 3. APM (Application Performance Monitoring)

### Was ist das?

APM geht über Metriken und Tracing hinaus: Es liefert **Runtime-Profiling** deiner Anwendungen. Während Metriken dir sagen "die CPU ist bei 80%" und Tracing dir zeigt "diese Query dauert 3s", sagt dir APM **warum** auf Code-Ebene:

- Welche Funktionen verbrauchen die meiste CPU-Zeit?
- Wo entstehen Memory Leaks?
- Wie verhält sich der Garbage Collector?
- Welche Datenbankverbindungen sind idle vs. aktiv?
- Wie groß ist der Event-Loop-Lag in Node.js?

### Was wir aktuell haben (und was fehlt)

**Haben wir:**
- Request-Raten, Latenz-Percentile (p50/p95/p99) via Prometheus-Metriken
- Container-Ressourcen (CPU/RAM) via cAdvisor
- PostgreSQL-Connection-Counts via postgres-exporter
- Alert bei `SlowResponseTime` (p95 > 2s)

**Fehlt uns:**
- **Code-Level Profiling** — Welche Funktion in welchem Service ist der Bottleneck?
- **Node.js Event Loop Monitoring** — Liegt die Latenz an blockierendem Code?
- **Memory Leak Detection** — Wächst der Heap eines Backends über Zeit?
- **Dependency Maps** — Automatische Visualisierung, welche Services voneinander abhängen
- **Transaction-Level Analyse** — Nicht nur "p95 ist 2s", sondern "der `/api/messages` Endpunkt hat p95 von 4s wegen N+1 Query"

### Konkretes Beispiel

Das Chat-Backend wird langsamer über die Zeit. In Grafana siehst du:

- CPU: 40% (nicht auffällig)
- RAM: 650MB → 800MB → 950MB über 3 Tage (steigend!)
- p95 Latenz: 500ms → 1.2s → 2.5s

**Ohne APM:** Du vermutest ein Memory Leak, aber wo? Du müsstest manuell Heap-Snapshots machen, den Code durchlesen, und raten.

**Mit APM:** Du siehst direkt:
- Heap wächst wegen nicht-freigegebener Event-Listener in der WebSocket-Implementierung
- Die Funktion `ChatService.getConversationHistory()` allociert bei jedem Call ein neues Array statt den Cache zu nutzen
- Der GC läuft alle 30s und pausiert den Event Loop für 200ms

### Tools die in Frage kommen

| Tool | Typ | Passt zu uns? | Aufwand |
|------|-----|--------------|---------|
| **Grafana Pyroscope** | Self-hosted, Continuous Profiling | Gut — integriert sich in Grafana, leichtgewichtig | Mittel |
| **Clinic.js** | Open Source, Node.js-spezifisch | Gut für einmalige Diagnose, nicht für Dauerbetrieb | Gering |
| **OpenTelemetry Metrics** | SDK (haben wir noch nicht) | Liefert Event-Loop-Lag, GC-Metriken etc. | Mittel |
| Datadog APM | SaaS | Sehr gut, aber $31/Host/Monat | Gering (aber $$$) |
| Elastic APM | Self-hosted | Braucht Elasticsearch (zu viel RAM) | Hoch |

**Empfehlung:** Zweistufig vorgehen:

1. **Sofort (Low-Effort):** OpenTelemetry Runtime-Metriken in NestJS-Backends aktivieren. Das liefert Event-Loop-Lag, GC-Pause-Dauer, Heap-Size etc. als Prometheus-Metriken → direkt in VictoriaMetrics + Grafana sichtbar.

2. **Später (wenn nötig):** Grafana Pyroscope für Continuous Profiling. Ermöglicht Code-Level Flame Graphs direkt in Grafana — du kannst live sehen, welche Funktionen CPU/Memory fressen.

### Was die Integration bedeutet (Stufe 1: OTel Runtime Metriken)

```typescript
// In jedem NestJS-Backend: runtime-metrics.ts
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';

const exporter = new PrometheusExporter({ port: 9464 });
const meterProvider = new MeterProvider({ readers: [exporter] });

new RuntimeNodeInstrumentation({ meterProvider });
```

Das liefert automatisch:
- `nodejs.eventloop.delay` — Event-Loop-Lag
- `nodejs.gc.duration` — GC-Pausenzeiten
- `nodejs.heap.size` — Heap-Größe über Zeit
- `process.cpu.utilization` — CPU pro Prozess

Diese Metriken werden von VictoriaMetrics gescraped (ein neuer Scrape-Job pro Backend) und können in Grafana visualisiert werden.

**Aufwand-Schätzung:**
- Stufe 1 (OTel Runtime Metriken): ~2-3h für alle Backends
- Stufe 2 (Pyroscope): ~2h Setup + 1h Grafana-Integration

---

## 4. Frontend Error Monitoring

### Was ist das?

Frontend Error Monitoring fängt Fehler ab, die im Browser des Users passieren — JavaScript-Exceptions, unhandled Promise Rejections, Netzwerk-Fehler, und Performance-Probleme. Diese Fehler sieht dein Backend nie, weil sie client-seitig auftreten.

### Aktueller Zustand

Web-Analytics ist Verein-weit entfernt (2026-05-26) — es werden **keine**
Besucher-Daten mehr erhoben (keine Seitenaufrufe, Referrer, Geräte, Länder).

Web-Analytics trackte ohnehin **nicht**:
- JavaScript-Fehler
- Netzwerk-Fehler (fehlgeschlagene API-Calls)
- Performance-Metriken (Largest Contentful Paint, Time to Interactive)
- User-Journeys die abbrechen (z.B. Registrierung startet aber wird nicht abgeschlossen)
- Crashes / White Screens

**GlitchTip** ist nur in den Backends integriert — kein einziges Frontend hat einen Error-Tracking-Client.

### Warum das relevant ist

**Szenario 1: Stille Fehler**

Ein User auf Safari iOS hat einen Fehler in der Todo-App — eine Svelte-Komponente wirft eine Exception und der Screen wird weiß. Der User schließt die App, kommt nicht wieder. Du erfährst davon nie, weil:
- Kein Error wird an ein Backend gesendet
- GlitchTip hat nur Backend-Fehler

**Szenario 2: API-Fehler aus Sicht des Users**

Das Chat-Backend gibt sporadisch 500er zurück. Im GlitchTip siehst du den Backend-Error. Aber was passiert auf der Client-Seite? Sieht der User eine Fehlermeldung? Versucht die App automatisch ein Retry? Oder hängt die UI einfach? Ohne Frontend-Monitoring weißt du das nicht.

**Szenario 3: Performance-Probleme**

Die Calendar-App lädt in deinem Netzwerk in 1.5s. Aber für einen User mit langsamer Verbindung in 8s. Ohne Real User Monitoring (RUM) mit Web Vitals siehst du nur deine eigene Erfahrung.

### Tools die in Frage kommen

| Tool | Typ | Passt zu uns? | Kosten |
|------|-----|--------------|--------|
| **GlitchTip (JS SDK)** | Self-hosted (haben wir schon!) | Ideal — Backend läuft bereits, nur Frontend-SDK fehlt | Kostenlos |
| **Sentry** | SaaS oder Self-hosted | Marktführer, aber teuer in SaaS | Free Tier: 5K Events/Mo |
| **Highlight.io** | Self-hosted, Open Source | All-in-One (Errors + Sessions + Logs) | Kostenlos |
| TrackJS | SaaS | Nur JS-Errors, kein Performance | $$$  |

**Empfehlung:** GlitchTip JS SDK in allen SvelteKit-Frontends. GlitchTip ist Sentry-kompatibel — der `@sentry/svelte` oder `@sentry/browser` SDK funktioniert direkt mit unserem bestehenden GlitchTip-Server. Kein neuer Service nötig.

### Was die Integration bedeutet

**SvelteKit Frontend (hooks.client.ts):**

```typescript
// src/hooks.client.ts
import * as Sentry from '@sentry/svelte';

Sentry.init({
  dsn: 'https://key@glitchtip.mana.how/PROJECT_ID',
  environment: import.meta.env.MODE,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% der Requests tracen

  // Session Replay (optional)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5, // 50% der Error-Sessions aufzeichnen
});
```

**Svelte Error Boundary:**

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import * as Sentry from '@sentry/svelte';

  // Svelte 5: Fängt unhandled Errors in Child-Komponenten
  $effect(() => {
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(event.reason);
    });
  });
</script>
```

**Web Vitals Tracking:**

```typescript
// src/lib/vitals.ts
import { onCLS, onFID, onLCP, onTTFB } from 'web-vitals';
import * as Sentry from '@sentry/svelte';

export function trackWebVitals() {
  onLCP((metric) => Sentry.captureMessage(`LCP: ${metric.value}ms`, { level: 'info' }));
  onCLS((metric) => Sentry.captureMessage(`CLS: ${metric.value}`, { level: 'info' }));
  // ... etc
}
```

**Aufwand-Schätzung:**
- `@sentry/svelte` in ein Frontend integrieren: ~30min
- Auf alle SvelteKit-Apps ausrollen: ~30min pro App (größtenteils gleicher Code)
- Web Vitals ergänzen: ~1h
- GlitchTip-Projekte für Frontends anlegen: ~30min

---

## Zusammenfassung: Prioritäten

| Prio | Maßnahme | Aufwand | Impact |
|------|----------|---------|--------|
| **1** | **Frontend Error Monitoring** (GlitchTip JS SDK) | ~3-4h | Hoch — blinde Flecken bei Client-Fehlern schließen, nutzt bestehende Infra |
| **2** | **Log-Aggregation** (Loki + Promtail) | ~3-4h | Hoch — massiv schnelleres Debugging, kein SSH mehr nötig |
| **3** | **Distributed Tracing** (OTel + Tempo) | ~5-6h | Mittel-Hoch — unverzichtbar wenn Service-übergreifende Probleme auftreten |
| **4** | **APM / Runtime Profiling** (OTel Metriken → Pyroscope) | ~3-5h | Mittel — hilft bei Memory Leaks und Event-Loop-Problemen |

Alle vier Maßnahmen nutzen das **Grafana-Ökosystem**, das wir bereits betreiben. Kein neues Dashboard-Tool, keine neue Infrastruktur — nur Erweiterungen des bestehenden Stacks.

### Gesamtbild nach Umsetzung

```
                        ┌──────────────────────────┐
                        │     Grafana (haben wir)   │
                        │  Dashboards für alles      │
                        └─────┬───┬───┬───┬────────┘
                              │   │   │   │
              ┌───────────────┘   │   │   └───────────────┐
              ▼                   ▼   ▼                   ▼
     VictoriaMetrics          Tempo  Loki            Pyroscope
     (Metriken ✅)        (Traces)  (Logs)          (Profiling)
              ▲                   ▲   ▲                   ▲
              │                   │   │                   │
     ┌────────┴──────┐    OTel SDK  Promtail      OTel/Pyroscope
     │  Exporters    │    (in Apps)  (Docker)        Agent
     │  (haben wir)  │
     └───────────────┘

     GlitchTip (Backend-Errors ✅ + Frontend-Errors NEU)
     (kein Web-Analytics)
     Alertmanager (Alerts ✅)
```
