---
title: 'Was ist der ManaScore?'
description: 'Der ManaScore ist das interne Qualitätsbewertungssystem für alle Mana Apps. Er bewertet jede App in 8 Kategorien auf einer Skala von 0-100.'
date: 2026-03-24
app: 'manacore'
author: 'Till Schneider'
tags: ['manascore', 'quality', 'methodology']
score: 100
scores:
  backend: 100
  frontend: 100
  database: 100
  testing: 100
  deployment: 100
  documentation: 100
  security: 100
  ux: 100
status: 'mature'
version: '1.0.0'
stats:
  backendModules: 0
  webRoutes: 0
  components: 0
  dbTables: 0
  testFiles: 0
  testCount: 0
  languages: 0
---

## Was ist der ManaScore?

Der **ManaScore** ist das interne Qualitätsbewertungssystem für alle Apps im Mana-Ecosystem. Er gibt einen schnellen Überblick über den Reifegrad jeder App und identifiziert Bereiche, die vor einem Production-Deployment verbessert werden müssen.

Der ManaScore ist **kein Lighthouse-Score** und **kein Performance-Benchmark**. Er bewertet die **ganzheitliche Production-Readiness** einer App — von der Code-Qualität über Security bis hin zur User Experience.

---

## Die 8 Kategorien

Jede App wird in 8 Kategorien bewertet. Der Gesamtscore ist der gewichtete Durchschnitt aller Kategorien.

### 1. Backend (Gewicht: 15%)

Bewertet die Qualität und Vollständigkeit des NestJS Backends.

| Kriterium                                              | Punkte |
| ------------------------------------------------------ | ------ |
| Module-Architektur (Trennung, Services)                | 0-15   |
| DTO-Validation (class-validator)                       | 0-15   |
| Error Handling (Exception Filter, konsistentes Format) | 0-10   |
| API-Dokumentation (Swagger/OpenAPI)                    | 0-10   |
| Health Endpoint                                        | 0-10   |
| Rate Limiting (ThrottlerGuard)                         | 0-10   |
| Auth Guards (JwtAuthGuard)                             | 0-15   |
| Credit Operations Integration                          | 0-5    |
| Metrics/Monitoring (Prometheus)                        | 0-10   |

### 2. Frontend (Gewicht: 15%)

Bewertet die Web-App (SvelteKit/Svelte 5).

| Kriterium                                       | Punkte |
| ----------------------------------------------- | ------ |
| Komponentenstruktur (Atoms/Molecules/Organisms) | 0-10   |
| State Management (Svelte 5 Runes)               | 0-10   |
| Error Handling (Error Page, Error Boundaries)   | 0-10   |
| Loading States (Skeleton Loader)                | 0-10   |
| Empty States                                    | 0-5    |
| PWA (Service Worker, Manifest, Icons)           | 0-15   |
| Offline-Support (Offline Page)                  | 0-10   |
| Context Menus (Shared ContextMenu)              | 0-5    |
| API Client (Error Handling, Retry, Timeout)     | 0-10   |
| Security Headers (CSP, X-Frame-Options)         | 0-10   |
| Meta/OG Tags (SEO)                              | 0-5    |

### 3. Database (Gewicht: 10%)

Bewertet das Datenbankschema und die ORM-Integration.

| Kriterium                                   | Punkte |
| ------------------------------------------- | ------ |
| Schema-Design (Normalisierung, Beziehungen) | 0-25   |
| Drizzle ORM Type Safety                     | 0-15   |
| Migrations (Advisory Locks, Rollback)       | 0-20   |
| Indexes (Performance)                       | 0-15   |
| JSONB für flexible Daten                    | 0-10   |
| Seed-Skripte                                | 0-15   |

### 4. Testing (Gewicht: 15%)

Bewertet die Test-Coverage und -Qualität.

| Kriterium                       | Punkte |
| ------------------------------- | ------ |
| Unit Tests (Services)           | 0-25   |
| Unit Tests (Frontend/Stores)    | 0-15   |
| E2E Tests (Playwright)          | 0-25   |
| Integration Tests (API)         | 0-15   |
| Mock Factories                  | 0-10   |
| Coverage Threshold konfiguriert | 0-10   |

### 5. Deployment (Gewicht: 10%)

Bewertet die Deployment-Infrastruktur.

| Kriterium                            | Punkte |
| ------------------------------------ | ------ |
| Multi-Stage Dockerfile (Web)         | 0-20   |
| Multi-Stage Dockerfile (Backend)     | 0-20   |
| Health Checks (Docker)               | 0-15   |
| docker-compose (Production)          | 0-15   |
| Entrypoint Scripts (DB-Wait)         | 0-10   |
| Environment Variables (.env.example) | 0-10   |
| CI/CD Pipeline                       | 0-10   |

### 6. Documentation (Gewicht: 10%)

Bewertet die Projektdokumentation.

| Kriterium                               | Punkte |
| --------------------------------------- | ------ |
| CLAUDE.md (vollständig, aktuell)        | 0-30   |
| API-Endpunkte dokumentiert              | 0-20   |
| Datenbankschema dokumentiert            | 0-15   |
| Befehle dokumentiert (dev, build, test) | 0-15   |
| Environment Variables dokumentiert      | 0-10   |
| Architecture/Patterns erklärt           | 0-10   |

### 7. Security (Gewicht: 15%)

Bewertet die Sicherheitsmaßnahmen.

| Kriterium                                     | Punkte |
| --------------------------------------------- | ------ |
| Auth Guards auf allen Endpoints               | 0-20   |
| Rate Limiting                                 | 0-15   |
| CORS konfiguriert                             | 0-10   |
| Security Headers (CSP, HSTS, X-Frame-Options) | 0-15   |
| Input Validation (DTOs, Sanitization)         | 0-15   |
| Error Tracking (GlitchTip)                    | 0-10   |
| Encryption (sensible Daten)                   | 0-10   |
| Audit Logging                                 | 0-5    |

### 8. UX (Gewicht: 10%)

Bewertet die User Experience und Accessibility.

| Kriterium                        | Punkte |
| -------------------------------- | ------ |
| i18n (mindestens 5 Sprachen)     | 0-15   |
| Responsive Design                | 0-15   |
| Keyboard Navigation              | 0-10   |
| Focus Trapping (Modals)          | 0-10   |
| ARIA Labels/Roles                | 0-10   |
| Toast/Feedback System            | 0-10   |
| Loading/Skeleton States          | 0-10   |
| Dark/Light Mode                  | 0-10   |
| Help-Seite (shared-help-ui)      | 0-5    |
| Feedback-Seite (shared-feedback) | 0-5    |

---

## Erweiterte Metriken

Zusätzlich zu den 8 Kern-Kategorien erfasst der ManaScore weitere Metriken, die auf der Detail-Seite jeder App angezeigt werden.

### Score-Trend

Zeigt die Entwicklung des Gesamtscores über Zeit als Sparkline-Chart (Übersicht) oder Area-Chart (Detail). Jede Score-Änderung wird in der `history` gespeichert.

### Lighthouse Scores

Direkt von Google Lighthouse übernommene Werte in 4 Kategorien:

| Kategorie          | Beschreibung                                          |
| ------------------ | ----------------------------------------------------- |
| **Performance**    | Ladezeit, First Contentful Paint, Time to Interactive |
| **Accessibility**  | ARIA, Kontraste, Keyboard-Navigation, Screenreader    |
| **Best Practices** | HTTPS, keine Deprecated APIs, Error Logging           |
| **SEO**            | Meta Tags, Crawlbarkeit, Mobile-Friendly              |

### Dependency Health

Automatisierbar per `pnpm outdated` und `pnpm audit`:

| Metrik              | Beschreibung                                                     |
| ------------------- | ---------------------------------------------------------------- |
| **Total**           | Gesamtanzahl der Abhängigkeiten                                  |
| **Outdated**        | Pakete mit verfügbaren Updates                                   |
| **Vulnerabilities** | Aufgeschlüsselt nach Schweregrad (Critical, High, Moderate, Low) |
| **Health %**        | Anteil aktueller Pakete: `(total - outdated) / total * 100`      |

### API Conformity

Prüft 7 Konsistenz-Kriterien der Backend-API:

| Check                     | Beschreibung                                            |
| ------------------------- | ------------------------------------------------------- |
| **Konsistente Responses** | Alle Endpoints nutzen `ApiResult<T>` Format             |
| **Error Codes**           | Konsistente HTTP Status Codes (400, 401, 403, 404, 500) |
| **Pagination**            | Offset/Cursor-basierte Pagination wo nötig              |
| **Versioning**            | API-Versionierung via `/api/v1/`                        |
| **Dokumentation**         | Swagger/OpenAPI automatisch generiert                   |
| **Health Endpoint**       | `/health` Endpoint vorhanden                            |
| **Validation**            | DTO-Validation mit class-validator auf allen Inputs     |

### Analytics Maturity

Bewertet die Tiefe der Analytics-Integration pro App (Web-Analytics ist seit 2026-05-26 entfernt — diese Metrik ist historisch):

| Check                  | Beschreibung                                                               |
| ---------------------- | -------------------------------------------------------------------------- |
| **Page View Tracking** | Analytics-Script via `hooks.server.ts` injiziert (automatische Page Views) |
| **Custom Events**      | App-spezifische Events implementiert (z.B. `TodoEvents`, `ChatEvents`)     |
| **Auth Tracking**      | Login/Signup/Logout automatisch via `@mana/shared-auth` getrackt           |
| **Landing Tracking**   | Landing Page Events (CTA-Clicks, Pricing Views) via `Analytics.astro`      |
| **Public Dashboard**   | Öffentliches Dashboard auf `stats.mana.how` konfiguriert                   |

Apps mit allen 5 Checks sind **analytics-mature** — sie erfassen nicht nur Page Views, sondern auch Feature-spezifische Nutzerinteraktionen, Auth-Flows und Landing-Conversions.

### Cross-App Consistency

Misst wie konsequent eine App die shared Packages des Monorepos nutzt:

| Package                 | Typ      | Beschreibung                                                |
| ----------------------- | -------- | ----------------------------------------------------------- |
| `shared-auth`           | Core     | JWT-Authentifizierung via mana-core-auth                    |
| `shared-ui`             | Core     | Gemeinsame UI-Komponenten (Modal, ContextMenu, Toast, etc.) |
| `shared-theme`          | Core     | Theme-System (Dark/Light, Varianten)                        |
| `shared-branding`       | Core     | App-Icons, Farben, URLs                                     |
| `shared-i18n`           | Core     | Internationalisierung (Sprach-Utilities)                    |
| `shared-error-tracking` | Core     | GlitchTip Error Tracking                                    |
| `shared-help-ui`        | Core     | Hilfe-Seite mit FAQ, Features, Shortcuts                    |
| `shared-feedback-ui`    | Core     | Feedback-Seite für Nutzer-Rückmeldungen                     |
| `shared-storage`        | Optional | S3/MinIO Datei-Upload (nur wenn relevant)                   |
| `shared-llm`            | Optional | LLM-Integration (nur wenn AI-Features)                      |

---

### Ecosystem Health Score

Der **Ecosystem Health Score** ist ein eigenständiges Dashboard unter `/manascore/ecosystem`, das die **Konsistenz und Vereinheitlichung über alle Apps hinweg** misst. Während der ManaScore jede App einzeln bewertet, bewertet der Ecosystem Health Score das **Gesamtsystem**.

**Script:** `node scripts/ecosystem-audit.mjs` — scannt den gesamten Monorepo und generiert `ecosystem-health.json`.

#### 12 Metriken (gewichteter Durchschnitt = Gesamtscore)

| Metrik                | Gewicht | Was wird gemessen                                                                                                                                   |
| --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared Packages**   | 20%     | Adoption der 6 Core-Packages (`shared-auth`, `shared-ui`, `shared-theme`, `shared-branding`, `shared-i18n`, `shared-error-tracking`) über alle Apps |
| **Icon Consistency**  | 10%     | Verhältnis Phosphor-Icon-Imports vs. verbleibende inline SVGs                                                                                       |
| **i18n Coverage**     | 10%     | Apps mit `svelte-i18n` Internationalisierung                                                                                                        |
| **Style Consistency** | 10%     | Apps mit Theme-CSS-Variablen + Tailwind CSS                                                                                                         |
| **Local-First**       | 8%      | Apps mit `@mana/local-store` (Offline-fähig)                                                                                                        |
| **Error Boundaries**  | 8%      | Apps mit `+error.svelte` Error Page + Offline Page                                                                                                  |
| **TypeScript Strict** | 7%      | Apps mit `strict: true` in tsconfig                                                                                                                 |
| **Test Coverage**     | 7%      | Apps mit mindestens einem Unit- oder E2E-Test                                                                                                       |
| **Modal Consistency** | 5%      | Anteil Modals die `shared-ui Modal` nutzen vs. Custom                                                                                               |
| **Error Handling**    | 5%      | Shared `getErrorMessage()`/`withErrorHandling()` vs. inline `instanceof Error`                                                                      |
| **PWA Support**       | 5%      | Apps mit manifest.json + Service Worker                                                                                                             |
| **Maintainability**   | 5%      | Anteil Dateien unter 500 Zeilen (große Dateien = Refactoring-Bedarf)                                                                                |

#### Wie der Score berechnet wird

```
Ecosystem Health Score = Σ (Metrik × Gewicht) / Σ Gewichte
```

Jede Metrik ist ein Prozentwert (0-100%):

- **Package-basierte Metriken** (Shared Packages, Local-First, PWA): Anteil der Apps die das Package nutzen
- **Pattern-basierte Metriken** (Icons, Modals, Errors): Verhältnis shared/standard vs. custom/inline
- **Feature-basierte Metriken** (Error Boundaries, Tests, i18n): Anteil der Apps die das Feature haben
- **Code-Quality-Metriken** (Maintainability): Inverse Relation zu großen Dateien

#### Wie man den Score verbessert

| Metrik              | Aktion                                                                          |
| ------------------- | ------------------------------------------------------------------------------- |
| Shared Packages ↑   | Fehlende Core-Packages in `package.json` hinzufügen                             |
| Icon Consistency ↑  | Inline SVGs durch `@mana/shared-icons` Phosphor-Komponenten ersetzen            |
| Modal Consistency ↑ | Custom-Modals auf `<Modal>` aus `@mana/shared-ui` migrieren                     |
| Error Handling ↑    | `instanceof Error` durch shared `getErrorMessage()` Helper ersetzen             |
| Error Boundaries ↑  | `+error.svelte` in jeder App anlegen                                            |
| Test Coverage ↑     | Mindestens einen Unit-Test pro App schreiben                                    |
| PWA Support ↑       | `manifest.json` + `service-worker.ts` hinzufügen                                |
| Maintainability ↑   | Dateien >500 Zeilen refactoren (Composables extrahieren, Komponenten aufteilen) |

---

## Reifegradstufen

| Stufe          | Score  | Bedeutung                                            |
| -------------- | ------ | ---------------------------------------------------- |
| **Prototype**  | 0-25   | Proof of Concept, nicht für Nutzer gedacht           |
| **Alpha**      | 26-50  | Grundfunktionen vorhanden, aber instabil             |
| **Beta**       | 51-70  | Funktionsfähig, aber noch Lücken                     |
| **Production** | 71-85  | Stabil und deploybar, kleinere Lücken                |
| **Mature**     | 86-100 | Vollständig production-ready, best practices überall |

---

## Wie wird der ManaScore aktualisiert?

1. **Initiales Assessment** — Beim ersten Audit wird jede Kategorie einzeln bewertet
2. **Fortlaufende Updates** — Nach größeren Änderungen (z.B. i18n-Migration, Security-Fixes) wird der Score aktualisiert
3. **Änderungslog** — Jeder ManaScore enthält eine "Änderungen seit letztem Audit"-Tabelle
4. **Top-3 Empfehlungen** — Jeder Report endet mit den 3 wichtigsten nächsten Schritten

---

## Scoring-Philosophie

- **Pragmatisch, nicht perfektionistisch** — Ein Score von 85+ bedeutet "production-ready", nicht "perfekt"
- **Gewichtet nach Impact** — Security und Testing wiegen schwerer als Documentation
- **Relativ zum Ecosystem** — Scores werden im Kontext des Mana-Monorepos vergeben
- **Kein Benchmarking gegen externe Apps** — Der ManaScore vergleicht Apps nur untereinander
- **Action-orientiert** — Jeder Report enthält konkrete Empfehlungen, nicht nur Bewertungen
