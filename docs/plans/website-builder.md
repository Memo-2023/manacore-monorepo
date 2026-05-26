# Website Builder — Block-Tree CMS für Privat + Firma

_Started 2026-04-23._

Ein Modul `website`, mit dem Nutzer (privat) und Firmen (Space mit mehreren Mitgliedern) mehrseitige Websites bauen, live bearbeiten und unter `mana.how`-Domains veröffentlichen. Kein Drag-Drop-Canvas wie Framer/Webflow, sondern ein **Block-Baum-Editor** mit Zod-validierten Block-Typen — dieselben Svelte-Komponenten rendern im Editor, in der Live-Preview und im öffentlichen Seitenaufruf. Content aus anderen Mana-Modulen (picture, library, news, …) wird per `moduleEmbed`-Block direkt eingebettet.

Voraussetzung: **nicht live, unbegrenzte Ressourcen, keine Migrations-Kompromisse.** Zielzustand direkt, keine Legacy-Reste.

## Ziel in einem Satz

Jeder Mana-Nutzer (oder jede Firma via Space) kann eine vollständige Website mit beliebig vielen Seiten über einen Block-Baum-Editor bauen, Daten aus seinen Mana-Modulen einbetten, und unter `/s/{slug}`, später `{slug}.mana.how` oder einer Custom-Domain veröffentlichen — mit SSR-Rendering aus denselben Svelte-Komponenten, ohne separaten Astro-Build-Pfad.

## Nicht-Ziele

- **Kein Free-Form Canvas.** Keine absolute Positionierung, keine Pixel-CSS. Layout über Block-Typen, Theme-Variablen und wenige Container (`columns`, `rows`, `spacer`).
- **Kein dualer Renderer.** Keine Svelte-Komponenten **und** Astro-Komponenten für dieselben Blöcke. Der öffentliche Renderer ist SvelteKit-SSR, der Editor rendert dieselben Components.
- **Keine Admin-UI-Nutzung des bestehenden `mana-landing-builder` Services** für User-Sites. Der Service bleibt für Org-Landing-Pages (andere Code-Pfade, andere Zielgruppe). Wir beschreiben in M6 optional eine Konsolidierung.
- **Kein Plugin-System.** Block-Typen sind intern und in `packages/website-blocks` versioniert. Dritt-Blöcke erst wenn Bedarf real wird.
- **Kein Markdown-Editor-Ersatz.** RichText-Blöcke nutzen einen kuratierten Satz Tiptap-Extensions, nicht Markdown. Ein Export-zu-Markdown ist möglich, aber nicht Teil des Write-Pfades.
- **Keine E-Commerce-Primitive.** Shop, Warenkorb, Checkout: nicht Scope. Pricing-Blöcke sind Display-only.
- **Keine Versionierung auf Block-Ebene.** Sites haben `draft` und `published` als zwei konsistente Snapshots; kein per-Block-History-Browser.

## Architektur

```
┌──────────────────────────────────────────────────────────────┐
│ Editor (auth-gated, local-first)                             │
│ apps/mana/apps/web/src/routes/(app)/website/…                │
│                                                              │
│ ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐   │
│ │ Seitenbaum +  │  │ Block-Baum +  │  │ Inspector        │   │
│ │ Seite-Settings│  │ Live Preview  │  │ (Zod → Form)     │   │
│ └───────┬───────┘  └───────┬───────┘  └────────┬─────────┘   │
│         └──── Dexie (websites/pages/blocks) ───┘             │
│                          │                                   │
│                          ▼                                   │
│               encryptRecord(plaintext) → table.add()         │
│                          │                                   │
│                          ▼                                   │
│                 _pendingChanges (appId='website')            │
└──────────────────────────┬───────────────────────────────────┘
                           │ (sync engine, same pipe as every module)
                           ▼
                    mana-sync  →  Postgres (website.* schema)
                           │
                           │  read path for public visitors
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ Public renderer (no auth, SSR)                               │
│ apps/mana/apps/web/src/routes/s/[siteSlug]/[[...path]]/…     │
│                                                              │
│ +page.server.ts                                              │
│   └─ resolveSite(siteSlug, path)                             │
│       └─ reads published snapshot from Postgres (no Dexie)   │
│                          │                                   │
│                          ▼                                   │
│   +page.svelte renders <BlockRenderer mode="public" />       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Form submissions (no auth)                                   │
│ POST /api/v1/website/sites/:id/submit/:blockId               │
│   → validate against stored block schema (Zod)               │
│   → write to target module via mana-tool-registry handler    │
│   → record in websiteSubmissions for audit                   │
└──────────────────────────────────────────────────────────────┘
```

## Entscheidungen

Explizit, begründet, und als Ankerpunkt für spätere Zweifel.

### D1 — Ein Block-Typ, eine Svelte-Komponente, drei Render-Modi

Jeder Block-Typ (`hero`, `richText`, `image`, `gallery`, `form`, …) lebt als **genau eine** Svelte-Komponente in `packages/website-blocks/src/{type}/{Type}.svelte`. Die Komponente bekommt `{ block, mode }`, wobei `mode ∈ 'edit' | 'preview' | 'public'`. Im `edit`-Mode werden Inline-Editing-Controls sichtbar; im `public`-Mode reine Anzeige.

**Warum:** Ein Codepfad bedeutet: wenn der Editor eine Change rendert, sieht der Besucher später exakt dasselbe. Dual-Rendering (Svelte-Editor + Astro-Public) wie in `shared-landing-ui` heute erzeugt garantiert Drift.

**Konsequenz:** Der SvelteKit-Public-Renderer ist SSR, nicht statisch. Für Performance siehe D9 (Caching).

### D2 — Block-Schema ist SSOT für Rendering, Validierung, UI, AI-Tools

Pro Block-Typ ein Zod-Schema in `packages/website-blocks/src/{type}/schema.ts`. Das Schema ist gleichzeitig:

1. **Datenbank-Validierung** (Store schreibt, Server validiert)
2. **Inspector-Formular** (Auto-Generierung via `zod-to-form`-Utility)
3. **AI-Tool-Input** (über `mana-tool-registry`, siehe D7)
4. **Persistenz-Schema-Migrationen** (jedes Block-Schema hat `version`, Upgrader)

**Warum:** Schema und Renderer werden immer zusammen geändert. Wenn sie getrennt leben, bekommen wir stille UI-Abweichungen vom Datenmodell. Zod als eine Quelle schließt das aus.

**Block-Paket-Skizze:**
```
packages/website-blocks/src/
├── hero/
│   ├── schema.ts         # HeroBlockSchema (Zod, v1)
│   ├── Hero.svelte       # Renderer (mode-aware)
│   ├── Hero.inspector.ts # optional: custom inspector (sonst auto)
│   └── index.ts
├── richText/…
├── image/…
├── gallery/…
├── form/…
├── moduleEmbed/…
├── columns/…
├── spacer/…
├── cta/…
├── faq/…
├── registry.ts           # { type → { schema, Component, icon, category } }
└── index.ts
```

### D3 — Block-Baum über `parentBlockId`, Reihenfolge über `order`

Blöcke speichern `parentBlockId` (nullable — Top-Level auf einer Seite) und `order` (double-linked via fractional indexing, kein Reindex bei Insert). Container-Blöcke (`columns`, `rows`) haben mehrere Slots; `slotKey` ist optional auf dem Child.

**Warum:** Flache Tabelle mit `parentBlockId` ist die konventionelle, gut-getestete Repräsentation eines Baums in einem CRDT-fähigen System (wir haben field-level LWW via mana-sync). Alternativen:

- *JSON-Blob für den ganzen Baum*: einfach, aber jedes Move eines Blocks schreibt den gesamten Baum. Konfliktverlust garantiert bei Co-Editing.
- *Nested Set / Path-Enumeration*: schnell für Lese-Queries, aber Writes sind teuer und Konflikte weh tun.

Flach + `parentBlockId` + fractional index = feld-weise LWW ist pro Block funktionabel, Co-Editing zweier Member am selben Block ist sicher (Timestamp entscheidet pro Feld).

### D4 — Drei Tabellen plus optional Submissions, alle space-scoped, alle plaintext

```
websites         { id, spaceId, slug, name, theme, navConfig, footerConfig,
                   publishedVersion, draftUpdatedAt, settings }
websitePages     { id, siteId, path, title, seo, order }
websiteBlocks    { id, pageId, parentBlockId, type, slotKey, props, order, schemaVersion }
websiteSubmissions { id, siteId, blockId, payload, targetModule, targetRecordId,
                     status, createdAt, ip, userAgent }
```

Alle Felder plaintext. Begründung: Site-Content ist öffentlich — es für den Autor zu verschlüsseln wäre sinnfrei, und macht SSR im Public-Path unmöglich (der Server hat keinen MK). Form-Submissions können sensible Daten enthalten; die landen nach Validierung in den Zielmodulen (z.B. `contacts`), dort sind die existenten Encryption-Regeln gültig. Der Submission-Audit-Row (`payload`) wird nach erfolgreicher Weitergabe geleert (siehe M2).

### D5 — Publish-Modell: `draft` + `published` als zwei separate Snapshots

Jedes `website` hat einen `publishedVersion` (UUID). Editor schreibt immer gegen den Draft (= die Live-Tabellenzeilen). Auf "Publish" wird ein Snapshot erzeugt: `websitePublishedSnapshots { siteId, version, blob }` — das `blob` ist ein vollständig aufgelöster, deterministisch serialisierter Baum (JSON). Der Public-Renderer liest nur dieses Blob.

**Warum:**
- Editor kann beliebig herumspielen, ohne dass Besucher halbfertige Seiten sehen.
- Rollback ist trivial: `publishedVersion` zeigt auf älteren Snapshot.
- Public-Read ist **ein** Query (`SELECT blob WHERE siteId AND version`), kein JOIN über drei Tabellen.
- Snapshots sind unveränderlich — gut cachebar (D9).

**Alternative verworfen:** "Live-Edit = sofort live". Katastrophal für Firmen-Nutzung, wo mehrere Member über Stunden editieren. Draft/Publish ist der nicht-verhandelbare Standard.

### D6 — Public-Serving über SvelteKit-Route, nicht via `mana-landing-builder`

`apps/mana/apps/web/src/routes/s/[siteSlug]/[[...path]]/+page.server.ts` lädt Site + Page + BlockTree aus Postgres und rendert SSR. `mana-landing-builder` wird **nicht** erweitert — der Service bleibt für den separaten Org-Landing-Pages-Use-Case (admin-only), in M6 wird entschieden, ob er fusioniert oder abgelöst wird.

**Warum:**
- Astro-Static-Export in `mana-landing-builder` zwingt zu dualem Rendering (D1 verletzt).
- SvelteKit-SSR mit Caching (D9) ist für Hunderttausende User-Sites schnell genug.
- Statischer Export lohnt erst bei hohem Traffic pro Site — dann pro Site opt-in, nicht default.

**Subdomain-Handling (Phase 3):** SvelteKit-Host-Handler im Hook `hooks.server.ts` erkennt `{slug}.mana.how` und rewritet intern auf `/s/{slug}/…`. Wildcard-Cert existiert bereits.

### D7 — AI-Tools via `mana-tool-registry`, nicht separat

Sobald `mana-tool-registry` (siehe `docs/plans/mana-mcp-and-personas.md` M1) steht, registriert `website` seine Tools dort: `website.create_page`, `website.add_block`, `website.update_block`, `website.reorder_blocks`, `website.publish`, `website.apply_template`. Policy-Hint pro Tool: `write` für CRUD, `destructive` für `delete_page`/`delete_site` (nicht MCP-exponiert).

**Warum:** Alle AI-Writes laufen zwingend durch denselben Tool-Layer. Kein paralleles "AI-kann-Websites-bauen"-Subsystem.

**Reihenfolge:** `mana-tool-registry` M1 muss stehen, bevor Website-AI-Tools registriert werden. Bis dahin: Editor ohne AI. Website-AI-Tools landen als Teil von M5.

### D8 — Form-Submissions schreiben über Tool-Registry-Handler, nicht direkt in Ziel-Tabellen

Ein `form`-Block hat `targetModule` (z.B. `'contacts'`) und `targetAction` (z.B. `'create_contact'`). Der Submit-Endpoint:
1. Validiert Payload gegen das im Block gespeicherte Zod-Schema
2. Speichert Audit-Row in `websiteSubmissions` (Status: `'received'`)
3. Ruft den entsprechenden Tool-Handler aus `mana-tool-registry` auf (`ctx`: site-owner user/space)
4. Updated Audit-Row mit `targetRecordId` und `'delivered'`

**Warum:** Der Tool-Registry-Handler kennt bereits Encryption, RLS, Validation des Zielmoduls. Duplizieren wäre erzwungener Legacy-Einstiegspunkt.

**Abgrenzung:** Unauthentifizierter Submit-Endpoint → Rate-Limiting via Edge (Cloudflare) und Captcha-Block-Typ (in M6, nicht M1).

### D9 — Caching: Published-Snapshot mit Cache-Tag, Invalidation bei Publish

Published-Blob wird mit `Cache-Control: public, max-age=60, s-maxage=3600, stale-while-revalidate=86400` geliefert, plus `Cache-Tag: site-{siteId}`. Bei `website.publish` → Cloudflare Purge der Tag-Gruppe.

**Warum:** Keine statische Build-Stufe nötig; Edge-Cache bei Cloudflare liefert millisekunden-Responses für populäre Sites. Bei Edits ist die neue Version nach Publish binnen weniger Sekunden live.

**Alternative verworfen:** Redis-Cache in der App. Doppelter Infrastruktur-Aufwand, CF macht es gratis.

### D10 — Multi-Tenant über Spaces, Editing-Permission über Membership

Ein `website` gehört zu einer `spaceId`. Jedes Mitglied des Spaces kann editieren + publishen. Rollen (editor-only, viewer-only) kommen später, wenn `space_members.role` nicht-trivial wird.

**Warum:** Wir verwenden, was es gibt. Spaces-RLS ist getestet. Ein eigenes `website_members` wäre parallele Permission-Ebene → Drift garantiert.

**Privat vs. Firma-Distinction:** Kein eigenes "ist eine Firma"-Flag. Ein Space mit einem Member = Privat, ein Space mit 2+ Membern = Firma. Die UI kann in Phase 2 auf `spaceMemberCount > 1` reagieren, um Team-Workflows zu zeigen.

### D11 — Slugs: space-scoped unique, reserved-Liste hart

`websites.slug` ist unique pro `spaceId`. Öffentliche URL in Phase 1 ist `/s/{siteSlug}` global unique (nicht space-scoped) — und deswegen gibt es *auch* eine globale Unique-Constraint auf `slug` wenn `isPublished=true`.

**Reserved slugs:** `app`, `api`, `auth`, `admin`, `settings`, `docs`, `blog`, `www`, `mail`, `dashboard`, plus alle existierenden Modulnamen. Liste in `apps/api/src/modules/website/reserved-slugs.ts`, erzwungen bei Write und in Migration gecheckt.

**Warum:** Eine Site mit `slug=api` würde die API-Route verschatten. Lieber strikt + reserviert Namen.

### D12 — Media-Assets über bestehendes `shared-uload`, kein eigenes `websiteAssets`

Bilder, Dateien, Cover: Upload über `shared-uload` → MinIO, Rückgabe der URL. Der `image`-Block speichert `{ url, altText, focalPoint }`. Cleanup: wir führen keine Reference-Counting-Tabelle in Phase 1. Bei `delete site` bleiben Assets liegen (ok, sie sind im Space-Bucket, Storage ist billig). GC-Job in M7.

**Warum:** Ein eigenes `websiteAssets` mit Reference-Counting wäre sauberer, aber ein GC-Job reicht als Aufräumer und verzögert erst mal Komplexität.

### D13 — Kein Legacy-Fork der `shared-landing-ui` Astro-Sections

Die 13 existierenden Astro-Sections (`HeroSection`, `FeatureSection`, …) werden **nicht** nach Svelte portiert oder geteilt. Wir schreiben die Block-Renderer neu. Die visuellen Patterns darf man inspirieren, aber Code teilen = duales Rendering (D1 verletzt).

**Warum:** Die Astro-Sections haben andere Constraints (Astro-Islands, build-time-data). Teilen würde beide Seiten einschränken.

**Konsequenz:** `shared-landing-ui` bleibt für Org-Landing-Pages. In M6 diskutieren wir die Konsolidierung ehrlich.

## Komponenten

### Komponente 1 — `packages/website-blocks`

Neues Workspace-Paket. Reine Svelte-Components + Zod-Schemata, keine Dexie/Netzwerk-Abhängigkeiten. Nutzbar vom Editor (Dexie-Kontext) **und** vom Public-Renderer (Postgres-Snapshot-Kontext) — beide Seiten geben `{ block, mode, children }`, der Renderer kümmert sich nicht um Datenquelle.

**Public API (Skizze):**

```ts
// packages/website-blocks/src/registry.ts
export interface BlockSpec<Props = unknown> {
  type: string;                              // 'hero', 'richText', …
  schema: ZodSchema<Props>;
  schemaVersion: number;
  Component: SvelteComponent<{
    block: Block<Props>;
    mode: 'edit' | 'preview' | 'public';
    children?: Block[];                      // nur bei Containern
    onEdit?: (patch: Partial<Props>) => void; // im edit-Mode
  }>;
  icon: string;                              // Lucide-Name
  category: 'content' | 'media' | 'layout' | 'form' | 'embed';
  defaults: Props;                           // Initialwerte beim Einfügen
  upgraders?: Record<number, (old: unknown) => Props>; // v1→v2 migrations
}

export const blockRegistry: Record<string, BlockSpec>;
```

**Block-Coverage M1:** `hero`, `richText`, `image`, `spacer`, `cta`, `columns` (2/3-spalt), `gallery`. Sieben Typen reichen für brauchbare One-Pager.

**Block-Coverage M4 expand:** `form`, `moduleEmbed`, `pricing`, `faq`, `testimonials`, `team`, `contact`, `footer`. Fünfzehn Typen decken alle 13 `shared-landing-ui`-Sections plus neuen Bedarf.

### Komponente 2 — `apps/mana/apps/web/src/lib/modules/website`

Standard-Modul-Struktur, wie jedes andere Modul im Repo:

```
apps/mana/apps/web/src/lib/modules/website/
├── types.ts                 # LocalWebsite, LocalWebsitePage, LocalWebsiteBlock
├── collections.ts           # websitesTable, websitePagesTable, websiteBlocksTable
├── queries.ts               # useSite(id), usePage(id), useBlocks(pageId), useBlockTree(pageId)
├── stores/
│   ├── sites.svelte.ts      # createSite, updateSite, deleteSite, publishSite
│   ├── pages.svelte.ts      # createPage, updatePage, deletePage, reorderPages
│   └── blocks.svelte.ts     # addBlock, updateBlock, deleteBlock, moveBlock
├── components/
│   ├── BlockRenderer.svelte        # rekursiv, nutzt blockRegistry
│   ├── BlockTreeEditor.svelte      # Seitenleiste: Baum + Insert-Palette
│   ├── BlockInspector.svelte       # rechts: Zod-schema → Formular
│   ├── InsertPalette.svelte        # "+" zwischen Blöcken
│   ├── PagePicker.svelte
│   ├── SiteSettingsDialog.svelte   # Theme, Nav, Footer, SEO-Defaults
│   ├── PublishBar.svelte           # "Unveröffentlichte Änderungen" + Publish-Button
│   └── TemplatePicker.svelte       # Starter-Templates
├── views/
│   ├── SitesListView.svelte        # alle Sites des Spaces
│   ├── SiteEditorView.svelte       # drei-Pane Editor
│   └── SiteSettingsView.svelte
├── tools.ts                 # AI-Tool-Registrierungen (aktiviert erst in M5)
├── constants.ts             # THEME_PRESETS, RESERVED_SLUGS (client-copy)
├── module.config.ts         # { appId: 'website', tables: [...] }
└── index.ts
```

**Routes:**
```
apps/mana/apps/web/src/routes/(app)/website/
├── +page.svelte                       # SitesListView
├── new/+page.svelte                   # Template-Picker oder Blank
└── [siteId]/
    ├── +layout.svelte                 # lädt site, stellt Context
    ├── +page.svelte                   # redirect auf /edit
    ├── edit/
    │   └── [pageId]/+page.svelte      # SiteEditorView
    ├── settings/+page.svelte          # SiteSettingsView
    └── submissions/+page.svelte       # Eingegangene Form-Submissions
```

### Komponente 3 — Public-Renderer-Routes

```
apps/mana/apps/web/src/routes/s/
└── [siteSlug]/
    ├── +layout.server.ts              # resolve site, throw 404 if unpublished
    ├── +layout.svelte                 # theme vars, nav, footer
    └── [[...path]]/
        ├── +page.server.ts            # resolve page by path, 404 if missing
        └── +page.svelte               # <BlockRenderer mode="public" />
```

**Resolver-Logik (+layout.server.ts):**
```ts
export const load = async ({ params, setHeaders }) => {
  const snapshot = await db
    .select()
    .from(publishedSnapshotsTable)
    .where(and(
      eq(publishedSnapshotsTable.slug, params.siteSlug),
      eq(publishedSnapshotsTable.isCurrent, true)
    ))
    .limit(1);
  if (!snapshot[0]) error(404);
  setHeaders({
    'cache-control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
    'cache-tag': `site-${snapshot[0].siteId}`,
  });
  return { site: snapshot[0].blob };
};
```

Snapshot-Blob-Format:
```ts
interface PublishedSnapshot {
  version: string;
  site: { id, slug, name, theme, navConfig, footerConfig, settings };
  pages: Array<{
    id, path, title, seo,
    blocks: BlockTreeNode[];  // rekursiver Baum, bereits auflösend
  }>;
  publishedAt: string;
  publishedBy: string;
}
```

### Komponente 4 — `apps/api/src/modules/website`

Backend-Routes im unified `@mana/api`:

```
apps/api/src/modules/website/
├── routes.ts                # Hono router
├── publish.ts               # POST /sites/:id/publish
├── submit.ts                # POST /sites/:id/submit/:blockId (unauth)
├── snapshots.ts             # query helpers for published snapshots
├── reserved-slugs.ts        # SSOT
└── tools.ts                 # Tool-Registry registrations (M5)
```

**Endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/v1/website/sites/:id/publish` | JWT (space-member) | Snapshot erzeugen, `publishedVersion` setzen, CF-Cache purgen |
| `POST` | `/api/v1/website/sites/:id/submit/:blockId` | None | Form-Submission annehmen, validieren, weitergeben |
| `GET` | `/api/v1/website/sites/:id/submissions` | JWT (space-member) | Submissions listen |
| `DELETE` | `/api/v1/website/sites/:id/submissions/:subId` | JWT (space-member) | Submission löschen |

Keine CRUD-Endpoints für Pages/Blocks — das läuft über den normalen Sync-Pfad (Dexie → mana-sync → Postgres) wie bei allen anderen Modulen.

### Komponente 5 — Starter-Templates

Sechs handkuratierte Templates in `apps/mana/apps/web/src/lib/modules/website/templates/`:

| Template | Zielgruppe | Seiten | Blöcke |
|----------|-----------|--------|--------|
| `portfolio` | Kreative, Freelancer | Start, Über mich, Arbeiten, Kontakt | hero + gallery + richText + form |
| `personal-linktree` | Privatnutzer, Creator | Start (Single-Page) | hero + 8× cta |
| `event` | Hochzeit, Geburtstag, Konferenz | Start, Programm, Anreise, RSVP | hero + richText + form |
| `smb-corporate` | Kleinbetrieb | Start, Leistungen, Team, Kontakt | hero + 3×columns + team + contact |
| `product-landing` | Firmen-Produktseite | Start (Single-Page, lang) | hero + features + testimonials + pricing + faq + cta |
| `blank` | Fortgeschritten | 1 leere Seite | — |

Templates sind JSON in `templates/{name}.json`: `{ site, pages[], blocks[] }`. Apply-Funktion klont mit neuen UUIDs in den Ziel-Space. Templates sind statisch im Build, nicht in DB — kein Admin-Flow zum Editieren im MVP (M6 evtl.).

### Komponente 6 — Inspector-Autoform

`components/BlockInspector.svelte` rendert Formulare aus Zod-Schemas via kleiner Utility `zodToForm(schema)` in `packages/website-blocks/src/inspector/`. Mapping:

| Zod | UI |
|-----|----|
| `z.string()` | `<input type="text">` |
| `z.string().long()` (custom brand) | `<textarea>` |
| `z.string().url()` | `<input type="url">` |
| `z.enum([...])` | `<select>` |
| `z.boolean()` | `<input type="checkbox">` |
| `z.number()` | `<input type="number">` |
| `z.object({ ... })` | Gruppen-Fieldset (rekursiv) |
| `z.array(z.object({...}))` | Liste mit Add/Remove + Drag-Reorder |
| Block-spezifisches Custom | Override via `Block.inspector.ts` |

**Warum Auto-Formular, nicht pro-Block-Handschrift:** 15 Blöcke × 8 Felder = 120 Formfelder handgeschrieben wäre Copy-Paste. Auto-Gen deckt 80%, Override-Mechanismus für Spezialfälle (Farbwähler, Icon-Picker, Module-Source-Picker).

### Komponente 7 — `moduleEmbed`-Block

Spezialblock, der Daten aus anderen Modulen zieht. Props:
```ts
{
  source: 'picture.board' | 'library.entries' | 'news.feed' | 'cards.deck' | 'library.kind';
  sourceId: string;   // board-id, deck-id, feed-id
  filter?: { kind?, tag?, limit?, order? };
  layout: 'grid' | 'list' | 'carousel';
}
```

**Source-Provider-Pattern:** Jedes Modul, das einbettbare Daten liefert, registriert einen Provider:
```ts
// apps/api/src/modules/website/embed-providers.ts
export interface EmbedProvider {
  source: string;                               // 'picture.board'
  resolve: (sourceId: string, filter: unknown, ctx: EmbedContext)
             => Promise<EmbedResult>;
}
```

Public-Renderer ruft bei Publish die Provider und inlined das Ergebnis in den Snapshot (statischer Ansatz) **oder** ruft sie pro Request (dynamischer Ansatz). **Default: statisch beim Publish**, weil einfacher zu cachen. Opt-in dynamisch pro Block (Use-Case: "Letzte 5 Artikel", tagesaktuell). Dynamisch = Cache-Tag zusätzlich `embed-{source}-{sourceId}`, Purge bei Source-Änderung.

**Permission-Check im Provider:** Provider bekommt `EmbedContext { ownerUserId, siteId, isPublic: true }`. Source-Daten werden nur inlined, wenn das Original als "public" markiert ist (pro Modul unterschiedlich: picture `board.isPublic`, library `entry.visibility='public'`, …). Ohne Public-Flag → Provider returnt leer oder wirft "needs_public".

### Komponente 8 — Policies: Tier-Gating

`packages/shared-branding/src/mana-apps.ts` bekommt einen neuen Entry:

```ts
website: {
  id: 'website',
  name: 'Website',
  description: 'Baukasten für deine Website',
  requiredTier: 'public',      // alle angemeldeten User
  url: '/website',
  // …
}
```

**Limits pro Tier (konfiguriert in `website.limits.ts`):**

| Tier | Max Sites | Max Pages/Site | Max Blocks/Page | Custom Domain |
|------|-----------|----------------|-----------------|---------------|
| `public` | 1 | 1 | 20 | ❌ |
| `beta` | 3 | 5 | 50 | ❌ |
| `alpha` | 10 | unlimited | unlimited | ❌ |
| `founder` | unlimited | unlimited | unlimited | ✅ |

Enforcement in den Stores (pre-create check via JWT-Claim). Feature-Flag-Banner im Editor, der höheres Tier bewirbt.

## Datenmodell

### Dexie-Tabellen (IndexedDB, client-side)

```ts
// database.ts — neue Version block
db.version(NEW).stores({
  // …existing…
  websites:        'id, spaceId, slug, publishedVersion, updatedAt, deletedAt',
  websitePages:    'id, siteId, path, order, updatedAt, deletedAt',
  websiteBlocks:   'id, pageId, parentBlockId, order, type, updatedAt, deletedAt',
  websiteSubmissions: 'id, siteId, blockId, createdAt, status',
});
```

### Postgres-Schemas (mana_platform, neu)

```sql
-- Schema: website.* (isoliert via pgSchema)

CREATE TABLE website.sites (
  id UUID PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES space.spaces(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  theme JSONB NOT NULL,              -- { preset, overrides }
  nav_config JSONB NOT NULL,         -- { items: [{label,pagePath}] }
  footer_config JSONB NOT NULL,
  settings JSONB NOT NULL,           -- { favicon, defaultSeo, analytics? }
  published_version UUID,            -- FK → website.published_snapshots(id)
  draft_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (space_id, slug)
);

CREATE UNIQUE INDEX sites_published_slug_idx
  ON website.sites (slug)
  WHERE published_version IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE website.pages (
  id UUID PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES website.sites(id) ON DELETE CASCADE,
  path TEXT NOT NULL,                -- '/' for home, '/about' for subpage
  title TEXT NOT NULL,
  seo JSONB NOT NULL,                -- { title, description, ogImage, noindex }
  "order" DOUBLE PRECISION NOT NULL, -- fractional index
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (site_id, path)
);

CREATE TABLE website.blocks (
  id UUID PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES website.pages(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES website.blocks(id) ON DELETE CASCADE,
  slot_key TEXT,                     -- for container-blocks
  type TEXT NOT NULL,                -- registry type id
  props JSONB NOT NULL,
  schema_version INT NOT NULL DEFAULT 1,
  "order" DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX blocks_page_parent_idx ON website.blocks (page_id, parent_block_id, "order");

CREATE TABLE website.published_snapshots (
  id UUID PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES website.sites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                -- duplicated for fast public lookup
  blob JSONB NOT NULL,               -- full snapshot
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_by UUID NOT NULL REFERENCES platform.users(id)
);
CREATE UNIQUE INDEX snapshots_current_slug_idx
  ON website.published_snapshots (slug)
  WHERE is_current = TRUE;

CREATE TABLE website.submissions (
  id UUID PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES website.sites(id) ON DELETE CASCADE,
  block_id UUID NOT NULL,            -- no FK: block could be deleted, submission stays for audit
  payload JSONB NOT NULL,            -- cleared after target-module write
  target_module TEXT NOT NULL,
  target_action TEXT NOT NULL,
  target_record_id UUID,
  status TEXT NOT NULL,              -- 'received' | 'delivered' | 'failed'
  error_message TEXT,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX submissions_site_created_idx ON website.submissions (site_id, created_at DESC);
```

### RLS

```sql
-- sites, pages, blocks: nur Space-Member lesen/schreiben
ALTER TABLE website.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY sites_space_member ON website.sites
  USING (space_id IN (SELECT space_id FROM space.memberships WHERE user_id = current_user_id()));

-- Analog für pages/blocks (JOIN über site)

-- published_snapshots: öffentlicher Read (kein Auth), Write nur durch publish-Endpoint (service-role)
ALTER TABLE website.published_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY snapshots_public_read ON website.published_snapshots
  FOR SELECT USING (is_current = TRUE);
CREATE POLICY snapshots_service_write ON website.published_snapshots
  FOR ALL TO service_role USING (TRUE);

-- submissions: nur Space-Member lesen; Write via service-role aus Submit-Endpoint
ALTER TABLE website.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY submissions_space_member_read ON website.submissions
  FOR SELECT USING (site_id IN (
    SELECT id FROM website.sites WHERE space_id IN
    (SELECT space_id FROM space.memberships WHERE user_id = current_user_id())
  ));
```

### Encryption-Registry

```ts
// apps/mana/apps/web/src/lib/data/crypto/registry.ts

websites: plaintext(['id', 'spaceId', 'slug', 'name', 'theme', 'navConfig',
                     'footerConfig', 'settings', 'publishedVersion',
                     'draftUpdatedAt', 'createdAt', 'updatedAt', 'deletedAt',
                     'userId']),
websitePages: plaintext(['id', 'siteId', 'path', 'title', 'seo', 'order',
                         'createdAt', 'updatedAt', 'deletedAt', 'userId']),
websiteBlocks: plaintext(['id', 'pageId', 'parentBlockId', 'slotKey', 'type',
                          'props', 'schemaVersion', 'order', 'createdAt',
                          'updatedAt', 'deletedAt', 'userId']),
websiteSubmissions: plaintext(['id', 'siteId', 'blockId', 'payload',
                               'targetModule', 'targetAction', 'targetRecordId',
                               'status', 'errorMessage', 'ip', 'userAgent',
                               'createdAt', 'userId']),
```

**Explizit plaintext** (nicht implizit leer), damit `pnpm run check:crypto` (die CI-Gate aus dem spaces-foundation-Sprint) den Ausschluss aktiv bestätigt.

## No-Legacy-Residues

Explizite Anti-Patterns, gegen die wir uns committen:

1. **Kein duales Rendering.** Es gibt **eine** Svelte-Komponente pro Block-Typ. Kein paralleles Astro oder React, keine "nur für Public"-Version. Wenn jemals statischer Build gewünscht ist, wird SvelteKit im prerender-Mode genutzt, nicht ein separates Build-Tool.

2. **Kein JSON-Blob-im-JSON-Blob.** Der Block-Baum ist als Zeilen in `website.blocks` gespeichert, nicht als `site.tree = {...massive nested JSON...}`. Das Published-Snapshot-Blob ist die einzige Denormalisierung und existiert nur lesbar.

3. **Keine eigene Tool-Registry für Website-AI.** Sobald `mana-tool-registry` steht, läuft alles darüber. Kein `packages/website-ai-tools` parallel zu `packages/mana-tool-registry`.

4. **Keine Direct-Writes in Zielmodule bei Form-Submissions.** Submit-Endpoint ruft Tool-Handler, niemals direkt `contactsTable.insert()`. Ein Code-Pfad.

5. **Kein shared-landing-ui-Fork.** Auch nicht "nur die Hero-Section kopieren, weil sie schon gut ist". Wir schreiben neu oder abstrahieren später bei M6-Konsolidierung.

6. **Keine Legacy-slug-Konflikte.** `reserved-slugs.ts` ist SSOT und wird in Migration-Script validiert: bei Migration werden alle existierenden `slug` gegen die Liste geprüft; fehlschlag → harter Exit. Wir haben noch nicht live, also null Konflikt erwartet.

7. **Kein "website_user_role" als Parallel-Permission-System.** Space-Membership ist die einzige Permission. Wenn feinere Rollen kommen, dann auf `space.memberships` — nicht als Duplikat in website.

8. **Kein impliziter "publish on save".** Draft und Published sind ausdrücklich getrennt. Publish ist ein expliziter User-Trigger. Kein Auto-Publish, keine "automatisch nach 5 Minuten publish"-Heuristik.

9. **Kein lokaler LiveQuery im Public-Renderer.** Der Public-Renderer nutzt ausschließlich Postgres. Dexie ist für den Editor, Ende.

10. **Keine `window.ANALYTICS.track(...)`-Einbau in Block-Renderer.** Analytics-Einbau (später M7) läuft über einen dedizierten `analytics`-Block oder via `settings.analytics` → `<script>`-Injection im Layout. Kein Pepper streuen.

11. **Keine Inline-CSS-Properties als Block-Props.** Kein `block.props.style = 'margin-top: 42px'`. Styling nur über Theme-Variables und ausgewählte Design-Tokens (`spacing: 'tight'|'normal'|'loose'`). Wenn Nutzer freies CSS braucht, ist das ein Pro-Feature in M7+.

12. **Keine Parallel-Slug-Resolution.** Eine einzige Funktion in `apps/api/src/modules/website/snapshots.ts` resolved `siteSlug → snapshot`. Nicht in SvelteKit-Hook plus Server-Route plus Cache-Layer. Ein Ort.

## Milestones

Jeder Milestone landet als klar erkennbares Commit-Set, ist standalone nützlich, typechecked, `pnpm run validate:all` grün.

### M1 — Foundation (Schema + Editor-Skelett + 3 Blöcke)

- [ ] `packages/website-blocks/` scaffold: `registry.ts`, `BlockSpec`-Typ, Inspector-Autoform-Utility
- [ ] Drei Block-Typen: `hero`, `richText`, `spacer` — Schema + Component + Tests
- [ ] Dexie-Schema-Bump: `websites`, `websitePages`, `websiteBlocks`
- [ ] Drizzle-Schema: `website.sites`, `website.pages`, `website.blocks` (ohne snapshots, submissions)
- [ ] Encryption-Registry-Einträge (plaintext) + check:crypto grün
- [ ] `apps/mana/apps/web/src/lib/modules/website/` — module.config.ts, collections, queries, stores
- [ ] Route `/(app)/website`: Sites-Liste, Create-Site-Flow, Single-Page-Editor
- [ ] Editor-UI (drei-Pane): Seiten-Liste links, Preview Mitte, Inspector rechts
- [ ] Speichern zur Dexie → mana-sync → Postgres (kein Publish, kein Public-Route)
- [ ] `apps/api/src/modules/website/routes.ts` — Health-Endpoint + Validation-Stub
- [ ] App-Registry-Eintrag in `packages/shared-branding/src/mana-apps.ts`, Tier: `public`, Limits: 1 Site, 1 Page, 20 Blöcke

**Exit criteria:** Ein Nutzer legt eine Site an, fügt Hero + RichText + Spacer ein, Änderungen synchronisieren zu Postgres, beim Reload ist alles wieder da. Kein Public-Rendering.

### M2 — Publish + Public-Renderer + Mehrseitigkeit

- [ ] Drizzle-Schema: `website.published_snapshots`
- [ ] `apps/api/src/modules/website/publish.ts` — Publish-Endpoint:
  - [ ] Baue Snapshot-Blob aus current draft
  - [ ] Insert in `published_snapshots`, setze `is_current=TRUE` (old: FALSE), setze `sites.published_version`
  - [ ] Cloudflare-Cache-Purge via API (Tag: `site-{id}`)
- [ ] `apps/mana/apps/web/src/routes/s/[siteSlug]/[[...path]]/` — Public-Render-Routen
- [ ] Cache-Header + Cache-Tag setzen
- [ ] Mehrseitigkeit: Page-Management im Editor (Add/Rename/Delete/Reorder), Nav-Config
- [ ] Limits-Enforcement in Stores (Pre-Check gegen Tier)
- [ ] `PublishBar.svelte` mit "Unveröffentlichte Änderungen"-Indikator
- [ ] Rollback-UI: letzte 10 Snapshots listen, ein Klick "auf diese Version zurück"
- [ ] Tests: Snapshot-Deterministik (zweimal publish → identisches Blob bei unverändertem Draft)

**Exit criteria:** Nutzer publisht. `https://<dev>/s/<slug>/` serviert die Site öffentlich, nicht authentifiziert. Rollback funktioniert.

### M3 — Block-Coverage-Expand (Layout + Media)

- [ ] Blöcke ergänzen: `image`, `gallery`, `cta`, `columns` (container), `faq`
- [ ] `columns`-Container: rendert Slots, Drop-Zone pro Slot im Edit-Mode
- [ ] Image-Upload via shared-uload-Integration im Inspector
- [ ] Gallery-Masonry mit Lightbox im Public-Mode
- [ ] Theme-System: `packages/website-blocks/src/themes/` — 3 Presets (classic, modern, warm)
- [ ] Theme-Preview + Farb-Customization im SiteSettingsDialog
- [ ] Tests pro Block: Schema-Validation, Component-Snapshot in allen drei Modes

**Exit criteria:** Ein Nutzer baut aus den jetzt 8 Block-Typen eine echte Landingpage, wählt ein Theme, publisht.

### M4 — Forms + moduleEmbed

- [ ] Drizzle-Schema: `website.submissions`
- [ ] `form`-Block: Field-Editor im Inspector (Name/Label/Type/Required), Target-Module-Picker
- [ ] Submit-Endpoint `POST /api/v1/website/sites/:id/submit/:blockId`:
  - [ ] Rate-Limit via Hono-Middleware (10 req/min per IP)
  - [ ] Schema-Validation gegen gespeicherten Block
  - [ ] Call zu mana-tool-registry-Handler (Start-Implementation noch vor M5)
  - [ ] Submission-Record + optionale E-Mail-Notification via mana-notify
- [ ] `moduleEmbed`-Block:
  - [ ] Source-Provider-Interface
  - [ ] Provider für `picture.board`, `library.entries`, `news.feed`
  - [ ] Im Publish-Snapshot werden Provider aufgerufen und Ergebnis inlined (statischer Ansatz)
  - [ ] Permission-Check: nur `isPublic` Content wird inlined
- [ ] Submissions-Liste im Editor (`/website/[id]/submissions`)
- [ ] Weitere Blöcke: `pricing`, `testimonials`, `team`, `contact` (konzeptuell: `form` + layout)

**Exit criteria:** Kontaktformular auf einer Site schreibt neuen `contacts`-Record beim Site-Owner. Picture-Board wird als Gallery auf der öffentlichen Seite angezeigt.

### M5 — AI-Tools + Templates

**Voraussetzung:** `mana-tool-registry` M1 aus mana-mcp-Plan hat gelandet.

- [ ] Website-Tools registrieren: `website.create_site`, `website.create_page`, `website.add_block`, `website.update_block`, `website.reorder_blocks`, `website.publish`, `website.apply_template`
- [ ] Policy-Hints: `create_site` propose, `add_block`/`update_block` propose, `publish` propose, `delete_*` destructive (nicht MCP-exponiert)
- [ ] Starter-Templates (6 Stück, siehe Komponente 5) als JSON in `templates/`
- [ ] TemplatePicker im `/website/new`-Flow
- [ ] AI-Proposal-Inbox für Website-Änderungen (`<AiProposalInbox module="website" />`)
- [ ] Integrations-Test: AI-Mission "Baue mir eine Portfolio-Seite aus meinen 3 besten Boards" produziert Proposals, User approves, Site landet in Editor

**Exit criteria:** Template-Flow + AI-Mission-Flow produziert brauchbare Sites.

### M6 — Subdomain-Publishing + Custom-Domain-Foundation

- [x] SvelteKit-Hook `hooks.server.ts`: Host-Header → rewrite `{slug}.mana.how` → `/s/{slug}/…`
- [ ] Wildcard-DNS + TLS-Check im Staging — ops-Aufgabe (Cloudflare-Config, kein Code)
- [x] Custom-Domain-Schema: `website.custom_domains { site_id, hostname, status, verification_token, verified_at }` — `tls_status` verzichten (kommt von Cloudflare-API in M6.x)
- [x] DNS-Verify-Flow: CNAME-Record auf `custom.mana.how`, TXT-Record mit Challenge (node:dns/promises)
- [ ] Cloudflare-SaaS-Hostname-Integration — API-Call ist **gestubbed**; produziert Log-Eintrag, kein realer Call. Siehe "Offene Enden unten".
- [x] Tier-Gate: Custom-Domain nur für `founder` (via `requireTier('founder')` in domains.ts)
- [x] `mana-landing-builder` Konsolidierungs-Entscheidung: **Parallel halten** (siehe unten)

**`mana-landing-builder` — Entscheidung: parallel halten**

Der Service bleibt vorerst nebenher. Gründe:

1. **Ziel-Unterschied.** `mana-landing-builder` ist ein Admin-only Tool für Org-Landing-Pages mit Cloudflare-Pages-Deploys. Der website-Builder ist ein End-User-Tool mit SSR-Rendering. Zwei klar unterschiedliche Surfaces.
2. **Rollen-Unterschied.** Org-Landings sind Admin-Branding. User-Sites sind private Portfolios, Events, Linktrees. Zwei unterschiedliche Daten-/Permission-Modelle.
3. **Lifecycle.** Der Builder ist jung + iteriert schnell; Org-Pages ändern sich selten. Sie zu fusionieren würde beide ausbremsen.
4. **Migration wäre teuer.** Org-Landings nutzen Astro-Sections mit Themes (`org-classic`, `org-warm`) die nicht 1:1 zu unseren Block-Typen passen. Migration = port jeder Section, migrate jede existierende Org.

**Revisit-Kriterium:** Wenn wir (a) Org-Landings selbst mit Block-Editor-Features wollen (Multi-Page, Forms) ODER (b) die Feature-Überlappung groß genug ist, dass doppelte Pflege schmerzt. Frühestens nach 6 Monaten Live-Daten.

**Exit criteria:** `{slug}.mana.how` funktioniert (serverseitiger Rewrite steht). Founder-User kann eigene Domain verbinden (Add + DNS-Check + Verify-Flow steht; TLS-Provisioning via CF SaaS ist die Ops-Lücke).

**Offene Enden in M6 (post-first-pass):**
- Live Cloudflare-SaaS-Hostname-API-Integration (`POST /zones/{zoneId}/custom_hostnames`) — bisher nur Log-Stub. Ops-Aufgabe + Code-Retrofit sobald `CF_API_TOKEN` + `CF_ZONE_ID` in prod-env liegen.
- DNS-Verify-Poller (Background-Check, repariert `failed` → `verified` ohne User-Klick). Dependency auf ein Job-Queue-Primitive oder Cron, landet zusammen mit M7 Observability.
- Apex-Domain-Handling: der Verify-Code akzeptiert A-Record-Fallback wenn CNAME-Lookup ENODATA liefert; bei komplexen Multi-IP-Setups kann das false-negative. Real life: für apex empfiehlt man ANAME/ALIAS, einige DNS-Provider unterstützen das nicht. Follow-up sobald der erste User daran hängt.

### M7 — Observability, GC, Analytics

- [x] Prometheus-Metrics: `mana_api_website_publish_total{result}`, `_publish_duration_seconds`, `_submissions_total{result}`, `_host_resolve_total{result}`, `_domain_verify_total{result}`, `_public_reads_total{result}`, `_public_read_age_seconds`. `/metrics`-Endpoint an apps/api root (unauth, verlässt sich auf Reverse-Proxy).
- [x] Orphan-Asset-GC: Script `apps/api/scripts/gc-website-assets.ts` — **read-only** in M7 first-pass. Walks published_snapshots + submissions for mediaId refs, compares against mana-media's app=website listing, reports orphans older than 30d. Deletion-Toggle nach 2-3 Wochen stabiler Reports.
- [ ] Per-Site-Stats im Editor (Views/Tag, Top-Seiten) — verschoben auf M7.x. Der Analytics-Block deckt die Visitor-Seite; Editor-Inline-Dashboard ist Backlog bis jemand konkret danach fragt.
- [ ] Submission-Retention: `payload` nach erfolgreicher Weitergabe nullen — M4.x Voraussetzung (Target-Delivery ist noch nicht gewired).
- [x] Dashboards in `docs/observability/website.md` — Metrics-Referenz, PromQL-Queries, Alert-Vorschläge, Grafana-Pfad.
- [x] (Bonus) Rollback-UI — Version-History-Dialog in PublishBar, M2-Exit-Kriterium „Rollback funktioniert" jetzt auch im Editor abgehakt.
- [x] (Bonus) Snapshot-Determinism-Test — vitest in `publish.test.ts` verifiziert byte-identische Outputs + Orphan-Drop.

**Exit criteria:** Betrieb ist beobachtbar (Metrics + PromQL), Storage-Wachstum ist überwacht (Scan-Script), Analytics-Opt-In steht.

## Risiken + Mitigation

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-----|--------|------------|
| Block-Schema-Migration bei Version-Bump ist schmerzhaft | Mittel | Mittel | `schemaVersion` + `upgraders`-Map pro Block, Migrations-Utility im Build zwingt forward-migration; Tests pro Upgrade |
| Published-Snapshot-Blob wird zu groß (Performance) | Mittel | Mittel | Hart-Limit auf Gesamtgröße (5MB), UI warnt bei 80%; `moduleEmbed` dynamisch als Fallback bei großen Galleries |
| Fractional Index läuft in Precision-Probleme bei häufigem Reorder | Niedrig | Mittel | Nach 1000 Reorders pro Page automatischer Rebalance-Job; Library wie `fractional-indexing` mit `jitter` |
| CF-Cache-Purge-API down → stale Inhalte | Niedrig | Niedrig | Bei Purge-Fehler: Fallback auf `max-age=60`, Nutzer sieht neue Version in ≤1min; Alert bei wiederholtem Fehler |
| Form-Spam auf Submit-Endpoint | Hoch | Mittel | Rate-Limit per IP, Honeypot-Feld pro Form, Captcha-Block-Typ in M7 |
| Reserved-Slug-Liste wird erweitert, alte Sites brechen | Niedrig (pre-launch) | Hoch (post-launch) | Pre-launch: wir haben null Konflikt. Post-launch: neue Reserved-Slugs nur mit Migration + Slug-Rewrite für Betroffene |
| moduleEmbed-Provider sharen versehentlich private Daten | Mittel | Hoch | Hart kodierter `isPublic`-Check pro Provider, Integrations-Test: Embed-Provider mit `isPublic=false` returnt null |
| Editor-Co-Editing zwei Member → Konflikte | Mittel | Niedrig | mana-sync field-level LWW löst es pro Feld; bei Baum-Konflikten (beide adden Block an gleicher Position) → fractional index bricht Tie |
| Svelte 5 Block-Components leaken Renderer-State zwischen `mode`-Wechsel | Niedrig | Niedrig | Unit-Tests pro Block mit allen drei Modes; `$effect` cleanup disziplinieren |
| AI generiert Block-Props, die Schema-Validation brechen | Mittel | Niedrig | Tool-Handler validiert vor Apply; fehlende Required-Fields → Proposal mit Warnung, User kann ergänzen |

## Offene Entscheidungen (später)

- **I18n pro Site:** Mehrsprachige Sites (DE/EN/IT)? Könnte über `pages.path` mit Locale-Prefix gemacht werden (`/de/about` vs. `/en/about`). Nicht in Scope M1–M5; Entscheidung in M6-Zeitraum mit realer Nutzer-Nachfrage.
- **Custom-Code-Blöcke:** `<script>`-Injection oder `<iframe>`-Embed wäre mächtig, aber security-relevant (XSS). Wenn, dann nur für `founder` und sandboxed. Frühestens M7.
- **Versionierung über Publish hinaus:** Full Version-History (wie Git) pro Site? Derzeit nur "letzte 10 Snapshots". Wenn Kunden fragen, ausbauen.
- **A/B-Testing:** Zwei Varianten einer Page gegen ein Traffic-Split testen. Nice-to-have, aber erst wenn Analytics steht.
- **Staging-Deploy pro Site:** Eine Staging-URL (`/s/{slug}/preview?token=…`) zum Teilen vor Publish. Könnte Hand-in-Hand mit Collaboration (Member commentiert "das Hero sieht schief aus") kommen.
- **Export:** "Export als statische HTML/CSS/JS"-Download — sinnvoll als Lock-In-Gegenmittel, nicht trivial (alle Assets + Routen + Forms). Eher nein im MVP.
- **Konsolidierung mit `mana-landing-builder`:** Entscheidung in M6 wie oben. Solange parallel, beide als bewusst getrennte Systeme dokumentieren.

## Referenzen

- [`docs/plans/spaces-foundation.md`](spaces-foundation.md) — Space-Scoping, Membership-Model
- [`docs/plans/space-scoped-data-model.md`](space-scoped-data-model.md) — space-scoped RLS-Pattern
- [`docs/plans/mana-mcp-and-personas.md`](mana-mcp-and-personas.md) — `packages/mana-tool-registry` als SSOT für AI/MCP-Tools
- [`docs/plans/library-module.md`](library-module.md) — Module-Pattern-Beispiel für diskriminierte Typen
- [`apps/mana/apps/web/src/lib/data/DATA_LAYER_AUDIT.md`](../../apps/mana/apps/web/src/lib/data/DATA_LAYER_AUDIT.md) — Sync-Engine-Deep-Dive
- [`.claude/guidelines/sveltekit-web.md`](../../.claude/guidelines/sveltekit-web.md) — Svelte 5 Runes Conventions
- [`.claude/guidelines/database.md`](../../.claude/guidelines/database.md) — pgSchema-Pattern, Drizzle

## Shipping Log

| Phase | Purpose | Commit |
| --- | --- | --- |
| M1 + M2 | Foundation (editor, 3 blocks) + publish + public renderer | folded into user's `54a12ffd5` + `89258eb45` |
| M3 | 5 more blocks, containers, upload, themes | `7a4f8894e` |
| M4 | Forms + moduleEmbed | `57be0f61b` |
| M5 | AI tools + starter templates | `13efae8cd` |
| M6 | Subdomain + custom-domain + tier gate + DNS verify + hooks-rewrite | `3eca5ac20` |
| M7 | Observability (Prom metrics, /metrics endpoint) + analytics block + orphan-asset GC script + rollback UI + determinism test + docs | (pending commit at end of M7 session) |
