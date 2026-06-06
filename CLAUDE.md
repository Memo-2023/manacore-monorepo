# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Monorepo Overview

pnpm workspace monorepo with two consolidated tops:

- **`apps/mana/apps/web`** — unified SvelteKit frontend serving 27+ product modules under `mana.how`. One build, one IndexedDB, one auth session, one deployment.
- **`apps/api`** (`@mana/api`) — unified Hono/Bun backend API server. Consolidates per-module compute servers; routes registered under `/api/v1/{module}/*`.

Per-product directories under `apps/{product}/` still exist for landing pages and product-specific packages, but the active web frontend and API both live in the two consolidated apps above. The only remaining mobile app is `apps/memoro/apps/mobile` (Expo SDK 55) — all other per-product mobile apps were removed on 2026-04-20.

- **Package Manager:** pnpm 9.15.0
- **Build System:** Turborepo
- **Node:** 20+
- **Primary doc:** [`apps/mana/CLAUDE.md`](apps/mana/CLAUDE.md) — module structure, data layer, encryption, routing.

### Repo layout

```
apps/
├── mana/            # Unified frontend (SvelteKit web + Astro landing)
├── api/             # Unified backend API (Hono/Bun) — @mana/api
├── memoro/apps/     # Only remaining mobile app (Expo SDK 55)
├── {product}/       # Per-product landing pages, packages
│                    # Standalone (own container, not unified): manavoxel
services/            # Backend services (Hono/Bun, Go, Python) — see list below
packages/            # Shared workspace packages (@mana/*)
docs/                # Long-form docs (deployment, hardware, postmortems, etc.)
.claude/guidelines/  # Coding conventions — read before changing code
```

### Services (`services/`)

> **Platform services live in the `mana/` repo (`mana/services/`) — that is the source of truth.** This repo's dev/test compose already builds them from `context: ../mana`. The shared platform services (`mana-auth`, `mana-sync`, `mana-credits`, `mana-events`, `mana-geocoding`, `mana-llm`, `mana-mail`, `mana-media`, `mana-mcp`, `mana-notify`, `mana-research`, `mana-stt`, `mana-tts`, …) are **not** vendored here anymore. Dead local copies were removed on 2026-06-06 (`cleanup/dead-duplicate-services`): the mana/-duplicates `mana-events`, `mana-geocoding`, `mana-mcp`, `mana-research`, `mana-sync`, plus the managarten-only services confirmed not running on any server (`mana-ai`, `mana-api-gateway`, `mana-crawler`, `mana-persona-runner`).

What still lives under `services/` in this repo:

- `mana-search` (3021) — **only the SearXNG config** (`services/mana-search/searxng/`) is still mounted by the dev/macmini compose; the Go service itself is superseded by `mana/services/mana-search`.
- `mana-landing-builder` — kept intentionally.
- DB-schema owners still pushed by `scripts/mac-mini/push-schemas.sh`: `mana-subscriptions`, `mana-analytics` (both running), `mana-user` (schema-only, owns the `usr` pgSchema, no runtime container), `news-ingester` (runtime container shut down; only its schema is maintained).
- **GPU services — verify on `mana-gpu` (LAN-only) before touching:** `mana-image-gen`, `mana-video-gen`, `mana-voice-bot`. Not running on the Mac-Mini and have no `mana/` equivalent, so they may still run on the GPU box.

Each non-trivial service has its own `CLAUDE.md`.

## Coding Guidelines

Always consult before changing code:

| Document | Purpose |
|----------|---------|
| [`.claude/GUIDELINES.md`](.claude/GUIDELINES.md) | Overview |
| [`.claude/guidelines/code-style.md`](.claude/guidelines/code-style.md) | Formatting, naming, linting |
| [`.claude/guidelines/sveltekit-web.md`](.claude/guidelines/sveltekit-web.md) | Svelte 5 runes, stores |
| [`.claude/guidelines/expo-mobile.md`](.claude/guidelines/expo-mobile.md) | React Native, NativeWind |
| [`.claude/guidelines/hono-server.md`](.claude/guidelines/hono-server.md) | Hono/Bun servers |
| [`.claude/guidelines/database.md`](.claude/guidelines/database.md) | Drizzle ORM, pgSchema |
| [`.claude/guidelines/authentication.md`](.claude/guidelines/authentication.md) | Mana Auth integration |
| [`.claude/guidelines/error-handling.md`](.claude/guidelines/error-handling.md) | Result types, error codes |
| [`.claude/guidelines/testing.md`](.claude/guidelines/testing.md) | Vitest, mock factories |
| [`.claude/guidelines/design-ux.md`](.claude/guidelines/design-ux.md) | UI patterns, a11y |
| [`.claude/guidelines/ai-tools.md`](.claude/guidelines/ai-tools.md) | Adding AI tools to a module |
| [`.claude/guidelines/visibility.md`](.claude/guidelines/visibility.md) | Adopting the visibility/privacy system per module |

## Development Quick Start

See [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md) for the full setup.

```bash
pnpm docker:up           # PostgreSQL, Redis, MinIO
pnpm setup:env           # Generate per-app .env files from .env.development
pnpm setup:db            # Create databases + push schemas

# Start the unified Mana app (most common)
pnpm run mana:dev

# Project-specific full stack (auth + backend + web with auto DB setup)
pnpm dev:chat:full
pnpm dev:todo:full
pnpm dev:picture:full
# … one per project

# Service-only
pnpm dev:auth            # mana-auth (3001)
pnpm dev:sync            # mana-sync Go server (3050)
```

Quality:

```bash
pnpm run build
pnpm run type-check
pnpm run format
pnpm run validate:all   # turbo + pgSchema + theme + i18n + crypto — run before push
pnpm run test:coverage  # emit v8 coverage under per-package coverage/
```

`validate:all` is the local mirror of the CI `validate` job — it runs in
seconds and fails fast on any invariant check. Currently bundled:

- `validate:turbo` — no recursive `turbo run` calls in non-root packages
- `validate:pg-schema` — every Drizzle table uses `pgSchema(...)`
- `validate:theme-{variables,utilities,parity}` — token coverage across CSS variants
- `validate:i18n-parity` — every namespace mirrors DE's key-set across all 5 locales
- `validate:i18n-hardcoded` — ratcheting baseline; new German strings without `$_()` fail
- `validate:i18n-keys` — `$_('key')` calls must resolve to a defined DE key (baseline-tracked)
- `check:crypto` + `audit:encrypted-tools` — every Dexie table classified, every AI tool aware of encryption

Use it as a pre-push gate.

## Key Architecture Notes

These are the patterns that span the repo. Service-/app-specific details live in their own CLAUDE.md.

### Local-first data layer

The unified Mana app uses **one IndexedDB** (`mana`) with all 120+ collections. Module stores write directly to Dexie tables; hooks in `database.ts` track changes into `_pendingChanges` tagged by `appId`. The unified sync engine (`sync.ts`) groups by `appId` and pushes to `mana-sync` (Go, port 3050), which persists field-level LWW into PostgreSQL with RLS.

Full architecture, sprint history, threat model:
- [`apps/mana/apps/web/src/lib/data/DATA_LAYER_AUDIT.md`](apps/mana/apps/web/src/lib/data/DATA_LAYER_AUDIT.md)
- [`apps/mana/CLAUDE.md`](apps/mana/CLAUDE.md)

### At-rest encryption

Sensitive user content in 27 tables is AES-GCM-256 encrypted before hitting IndexedDB. Master key lives in `mana-auth`, KEK-wrapped (`MANA_AUTH_KEK` env, must be set in prod). Optional zero-knowledge mode via Settings → Sicherheit.

When touching sensitive fields:
1. Add the table to `apps/mana/apps/web/src/lib/data/crypto/registry.ts` with the field allowlist
2. `await encryptRecord(tableName, record)` before writes
3. `await decryptRecords(tableName, visible)` after Dexie reads, before the type converter

Default new user-typed fields to **encrypt**; default new IDs/timestamps/sort-keys to **plaintext**.

### Authentication

All servers use `@mana/shared-hono` with `authMiddleware()`. Tokens are EdDSA JWTs issued by `mana-auth` with claims `{sub, email, role, sid, tier, exp, iss, aud}`. Cross-app SSO works across `*.mana.how`. See [`.claude/guidelines/authentication.md`](.claude/guidelines/authentication.md) and `services/mana-auth/`.

**Adding an app to SSO** requires updating *all three*:
1. `PRODUCTION_TRUSTED_ORIGINS` in `services/mana-auth/src/auth/sso-origins.ts` (the SSOT — better-auth.config.ts re-exports from here)
2. `CORS_ORIGINS` for mana-auth in `docker-compose.macmini.yml`
3. Run `bun test src/auth/sso-config.spec.ts` from `services/mana-auth/` — now hard-fails on drift in either direction

### Access tiers

`guest < public < beta < alpha < founder`. Apps gate themselves via `requiredTier` in `packages/shared-branding/src/mana-apps.ts`; the JWT carries a `tier` claim; `AuthGate` enforces it client-side. Admin API at `PUT /api/v1/admin/users/:id/tier`.

### Database (PostgreSQL)

Two databases: **`mana_platform`** (all services + app server-side data, schema-isolated via `pgSchema`) and **`mana_sync`** (sync engine, write-heavy). Always use `pgSchema('name').table(...)`, never plain `pgTable()`. Adding a new schema: see [`.claude/guidelines/database.md`](.claude/guidelines/database.md).

### Object storage

MinIO (Docker, S3-compatible) in both local and prod. Console: http://localhost:9001 (`minioadmin`/`minioadmin`). Use `@mana/shared-storage` helpers. Pre-configured per-project buckets (`picture-storage`, `chat-storage`, `cards-storage`, …).

### Turborepo: avoid recursive turbo calls

**CRITICAL**: Parent workspace packages (e.g. `apps/chat/package.json`) must NEVER define `type-check`, `build`, `lint`, `test`, `test:coverage`, or `check` scripts that call `turbo run <task>`. Root turbo already orchestrates those — defining them in children causes infinite recursion (10+ minute hangs, thousands of duplicate tasks). Only `dev` is OK to delegate to turbo from a parent package, since it's persistent and typically scoped.

Enforced by `pnpm run validate:turbo` (`scripts/validate-no-recursive-turbo.mjs`), wired into the CI `validate` job — a new `turbo run build` inside a non-root package.json now fails the PR.

## Shared Packages (`packages/`)

| Package | Purpose |
|---------|---------|
| `@mana/shared-auth` | Client-side auth for web/mobile |
| `@mana/shared-hono` | Hono middleware (auth, health, errors) |
| `@mana/shared-storage` | S3/MinIO helpers |
| `@mana/shared-branding` | App registry, tiers, branding |
| `@mana/shared-types` | Common TS types |
| `@mana/shared-utils` | Utility functions |
| `@mana/shared-ui` | **Svelte-5-Komponenten-Bibliothek** (Pills, Modals, Toast, Quick-Input, Skeletons …). **Heimat seit 2026-05-09: `mana/packages/shared-ui` und `npm.mana.how`** — die Kopie hier ist eingefroren bis zum Rückbau dieses Repos. Bei Änderungen in mana/ zuerst, dann erst hierher. |
| `@mana/shared-theme` | Theme config |
| `@mana/shared-i18n` | i18n |
| `@mana/shared-privacy` | Unified visibility/privacy system: `VisibilityLevel` enum + zod schema + `<VisibilityPicker>` + predicates (`canEmbedOnWebsite`, …). Plan: [`docs/plans/visibility-system.md`](docs/plans/visibility-system.md). Rollout per-module, not yet adopted anywhere. |
| `@mana/local-store` | Local-first store primitives — used by unified Mana, manavoxel, and shared-uload/-stores/-links |
| `@mana/local-llm` | Browser-local LLM inference (transformers.js + Gemma 4 E2B, WebGPU). Powers `/llm-test` and the playground module. See [`packages/local-llm/CLAUDE.md`](packages/local-llm/CLAUDE.md) for the CSP requirements and the transformers.js v4 gotchas. |
| `@mana/local-stt` | Browser-local speech-to-text (transformers.js + Whisper, WebGPU). Powers the QuickInputBar mic button. Same architecture as local-llm. See [`packages/local-stt/CLAUDE.md`](packages/local-stt/CLAUDE.md). |

## Adding Dependencies

```bash
pnpm add -D <pkg> -w                       # Workspace root (dev tools)
pnpm add <pkg> --filter @mana/web          # A specific app
pnpm add <pkg> --filter @mana/shared-utils # A shared package
```

## Environment Variables

Single source of truth: **`.env.development`** (committed). After editing, run `pnpm setup:env` to regenerate per-app `.env` files with the right prefixes (`EXPO_PUBLIC_*` for mobile, `PUBLIC_*` for SvelteKit, no prefix for Hono/Bun servers). Mapping logic in `scripts/generate-env.mjs`. Full guide: [`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md).

## Server Access

- **Production (Mac Mini):** `ssh mana-server` (Cloudflare Tunnel). See [`docs/MAC_MINI_SERVER.md`](docs/MAC_MINI_SERVER.md). Useful: `./scripts/mac-mini/status.sh`, `./scripts/mac-mini/deploy.sh`, `./scripts/mac-mini/build-app.sh <app>`.
- **GPU server (Windows, RTX 3090):** `ssh mana-gpu` (192.168.178.11, LAN only). Hosts STT/TTS/image-gen/video-gen/Ollama. See [`docs/WINDOWS_GPU_SERVER_SETUP.md`](docs/WINDOWS_GPU_SERVER_SETUP.md).

## Reference Docs

| Path | When you need it |
|------|------------------|
| [`apps/mana/CLAUDE.md`](apps/mana/CLAUDE.md) | **Default** — module pattern, routing, encryption usage |
| [`apps/mana/apps/web/src/lib/data/DATA_LAYER_AUDIT.md`](apps/mana/apps/web/src/lib/data/DATA_LAYER_AUDIT.md) | Sync engine deep-dive, encryption rollout, threat model |
| [`docs/LOCAL_DEVELOPMENT.md`](docs/LOCAL_DEVELOPMENT.md) | First-time setup, `dev:*:full` commands |
| [`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md) | All env vars |
| [`docs/DATABASE_MIGRATIONS.md`](docs/DATABASE_MIGRATIONS.md) | Migration workflow + rollback |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Production deployment |
| [`docs/PORT_SCHEMA.md`](docs/PORT_SCHEMA.md) | Which service runs on which port |
| Service-specific `CLAUDE.md` files | Service internals |
