# Website Builder — Smoketest

Schritt-für-Schritt-Anleitung, um den Website-Builder End-to-End zu validieren — vom Site-Anlegen über Publish bis hin zu Custom-Domains, Forms und Rollback.

**Warum nötig:** 7 Milestones (M1–M7) mit ca. 7000 Zeilen Code, alle Unit-/Type-Checks grün, aber nichts davon ist bisher durch einen echten Browser mit echtem Postgres gelaufen. Unit-Tests decken nicht ab: Dexie-v37-Upgrade aus existierender DB, Encryption-Registry-Integration, mana-sync Wire-Format, SSR-Public-Render-Pfad, Cloudflare-Cache-Header-Propagation, DNS-Resolver mit echten Records, Form-Submit-Flow über same-origin Proxy, AI-Proposal-Staging.

**Scope:** Das, was Code tun soll. Außerhalb: Cloudflare-SaaS-Hostname-Provisioning für Custom-Domain-TLS (ops-Lücke, dokumentiert in §M6 des Plans) und Target-Delivery für Form-Submissions zu `contacts`/`notify` (M4.x).

Siehe [`docs/plans/website-builder.md`](website-builder.md) für das Design, [`docs/observability/website.md`](../observability/website.md) für Metrics.

---

## Vorbereitung

### 1. Schema-Migrationen anwenden

Der Website-Builder hat **drei** SQL-Migrationen im `website.*` pg-Schema. Vor dem ersten Test anwenden:

```bash
export DATABASE_URL=postgresql://mana:devpassword@localhost:5432/mana_platform
psql "$DATABASE_URL" -f apps/api/drizzle/website/0000_init.sql
psql "$DATABASE_URL" -f apps/api/drizzle/website/0001_submissions.sql
psql "$DATABASE_URL" -f apps/api/drizzle/website/0002_custom_domains.sql
```

Verify:

```bash
psql "$DATABASE_URL" -c "\dt website.*"
```

Erwartet: `published_snapshots`, `submissions`, `custom_domains`.

### 2. Dev-Stack starten

```bash
pnpm docker:up           # postgres + redis + minio
pnpm run mana:dev        # mana-auth (3001) + mana-sync (3050) + web (5173) + api (3060)
```

Wenn irgendeiner der Services nicht hochkommt:
- `pnpm docker:logs mana-postgres` — Postgres-Probleme
- `services/mana-auth`-Konsole — JWT/Org-Fehler

### 3. Dev-User mit Founder-Tier

Custom-Domains brauchen `founder` Tier. Nutze den existierenden Dev-User oder leg einen neuen an:

```bash
pnpm setup:dev-user
```

Legt `tills95@gmail.com` / `tilljkb@gmail.com` / `rajiehq@gmail.com` alle als founder an. Passwort jeweils `Aa-123456789`.

Der Signup-Hook vergibt jedem Account automatisch einen `personal` Space — den nutzen wir.

### 4. Env-Vars optional

Für **Cloudflare-Purge** (M6 ops-Stub) optional:
```
CF_API_TOKEN=…
CF_ZONE_ID=…
```
Ohne das loggt die API nur `[website] CF onboard TODO` — alle lokalen Tests funktionieren trotzdem.

Für den **Orphan-Asset-GC-Script** (M7):
```
MANA_SERVICE_KEY=dev-service-key   # für internal /media/list
```

---

## Szenario 1 — Grundfluss (M1 + M2)

### Schritt 1: Site anlegen

1. In den Browser: `http://localhost:5173/website`
2. Klick **"+ Neue Website"** → landet auf `/website/new` (TemplatePicker)
3. Wähle Template **"Leer"** (oder "Portfolio" wenn du mehr Content willst)
4. Name: `Mein Test`, Slug wird automatisch zu `mein-test`
5. Klick **"Mit Leer starten"**

**Erwartet:**
- Redirect zu `/website/<siteId>/edit/<homePageId>`
- Drei-Pane-Editor: links Site-Meta + PageList + InsertPalette, Mitte leere Vorschau, rechts Inspector-Placeholder
- Header zeigt "Mein Test" + ⚙-Button

**Dev-Tools:**
- Application → IndexedDB → `mana` → `websites` → eine Row mit deinem Namen
- Application → IndexedDB → `mana` → `websitePages` → eine Row mit `path='/'`

### Schritt 2: Blöcke einfügen

1. InsertPalette (unten links) → klick **"Hero"** → erscheint mittig, wird selektiert
2. Inspector rechts: Titel ändern zu "Willkommen", Untertitel "Meine erste Seite"
3. Palette → **"Text"** → klick in Vorschau um zu wählen → Inspector → Content tippen, zwei Absätze mit Leerzeile zwischen
4. Palette → **"Abstand"** → Größe "Groß"

**Erwartet:**
- Live-Updates in Vorschau beim Tippen (Reaktivität via Dexie)
- Klick auf einen Block → outline indigo, Inspector zeigt die Felder dieses Blocks
- Pfeil-Buttons (↑↓) im Inspector ändern Reihenfolge
- × im Inspector-Header löscht

### Schritt 3: Publish

1. Oben PublishBar → **"Veröffentlichen"** klicken
2. Pill wechselt von "Entwurf" → "Live"
3. Link `/s/mein-test` wird geklickbar

**Erwartet:**
- POST zu `/api/v1/website/sites/<id>/publish` (DevTools → Network → 201)
- Response hat `snapshotId`, `publishedAt`, `publicUrl: '/s/mein-test'`

### Schritt 4: Public-Render

1. Link öffnen (oder `http://localhost:5173/s/mein-test` direkt)
2. **Erwartet:**
   - SSR-Render: View-Source zeigt Hero-HTML **ohne** JavaScript-Rehydrate-Marker (pure SSR)
   - Keine Navigation-Leiste (kein `navConfig.items`), nur Brand-Link
   - Network: GET `/api/v1/website/public/sites/mein-test` mit `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=86400`
   - Response-Header `Cache-Tag: site-<id>`

### Schritt 5: Editor + Draft-Ahead-Indicator

1. Zurück in den Editor
2. Hero-Titel ändern zu "Willkommen!"
3. PublishBar zeigt Pill **"Unveröffentlichte Änderungen"**
4. Öffne `/s/mein-test` in anderem Tab → **immer noch der alte Titel** (erwartet, Draft ≠ Live)
5. PublishBar → "Änderungen veröffentlichen" → Reload des Public-Tabs → neuer Titel

### Schritt 6: Rollback (M7-Polish)

1. PublishBar → **"Versionen"** klicken → Dialog mit 2 Snapshots
2. Obere Row = "Aktuell live" mit grünem Pill
3. Untere Row (erste Publish) → **"Wiederherstellen"** klicken → bestätigen
4. Dialog reload: neue aktuelle Row ist die alte
5. `/s/mein-test` reloaden → Titel ohne `!`

---

## Szenario 2 — Block-Coverage (M3)

### Image-Upload

1. Neuer Block **"Bild"** → Inspector rechts → Dropzone
2. Klicke/ziehe ein JPG oder PNG rein (< 25 MB, irgendein Testbild)
3. **Erwartet:**
   - POST an `/api/v1/media/upload` mit `app=website`
   - Response `{ id }`, URL wird automatisch in `block.props.url` geschrieben
   - Vorschau zeigt das Bild

Fehlerfälle:
- Nicht-Bild-Datei → "Bitte wähle ein Bild (PNG, JPG, WEBP, GIF)."
- Datei > 25 MB → "Datei zu groß (max 25 MB)."

### Gallery-Block

1. Block **"Galerie"** → Inspector → "+ Bilder hinzufügen" → mehrere Dateien gleichzeitig
2. Alt-Text pro Bild eintragen (Pflicht für A11y — sollte Screenreader-Crawl später nicht stören)
3. Layout/Columns/Lightbox-Toggle testen
4. **Im Editor:** Gallery zeigt alle Bilder im Grid, Klick auf ein Bild wählt nur den ganzen Block (Editor-Mode)
5. **Public (`/s/mein-test`):** mit `lightbox=true`, Klick auf Bild → Fullscreen-Overlay mit Prev/Next (‹ ›) + Escape
6. Escape/Klick außerhalb schließt

### Columns-Container

1. Block **"Spalten"** → 2 oder 3 Columns
2. Klick in eine Column-Drop-Zone ("Spalte 1")
3. Insert-Palette nochmal öffnen, einen Text-Block einfügen — landet in der Column
4. **Erwartet:** Text ist Child des Container-Blocks, `parentBlockId` in der Dexie-Row zeigt auf Columns-Block-ID, `slotKey = 'col-0'`
5. Public-Mode: responsive, < 720px stapeln sich die Columns untereinander (stackOnMobile=true Default)

**Manuelle Verify:**
```bash
# In DevTools Console:
(await db.websiteBlocks.toArray()).map(b => ({ type: b.type, parentBlockId: b.parentBlockId, slotKey: b.slotKey }))
```

Sollte mindestens eine Row zeigen mit `parentBlockId: <columns-id>` und `slotKey: 'col-0'`.

### Theme wechseln

1. Header → **⚙-Button** → SiteSettingsDialog
2. Unter "Theme" auf eines der drei Presets klicken (Classic / Modern / Warm)
3. Farb-Overrides testen: Color-Picker für Primary, Background, Foreground
4. "Speichern" → Dialog schließt
5. **Public-Reload** → neue Farben + Font angewandt (CSS-Variablen)

---

## Szenario 3 — Forms (M4)

1. Editor → Block **"Formular"** (kommt mit 3 Default-Fields: Name, E-Mail, Nachricht)
2. Inspector: Feld hinzufügen — "Telefon" Typ `tel`, optional
3. Titel und Description setzen, Submit-Label auf "Absenden" lassen
4. Site **neu publishen** (wichtig: das Form-Schema wird im Snapshot eingefroren)
5. `/s/mein-test` öffnen → Formular sichtbar

### Submit-Flow testen

1. Felder ausfüllen (required: Name + E-Mail + Nachricht)
2. Absenden → **"Danke! Wir melden uns bald."**

**Erwartet:**
- POST an `/s/mein-test/__submit/<blockId>` (same-origin SvelteKit proxy)
- Von dort Forward an `/api/v1/website/public/submit/mein-test/<blockId>`
- Response 201 mit `submissionId`

### Honeypot-Check

1. In der gleichen Form-Instanz: DevTools → Elements → finde `<input name="honeypot">` in der verborgenen `.wb-form__honeypot`-Wrapper
2. Temporär sichtbar machen (`display: block`), Wert "spam-bot" eintragen, normal absenden
3. **Erwartet:** Success-Message erscheint (act-as-success-for-bots), aber **nichts** in der Submissions-Tabelle

Verify:
```bash
psql "$DATABASE_URL" -c "SELECT created_at, payload, status FROM website.submissions ORDER BY created_at DESC LIMIT 3"
```

### Rate-Limit

1. Submit-Endpoint 11× schnell in Folge (Script / Postman / Hand-Refresh)
2. Ab der 11. Response: **429 "Rate limit überschritten"**

### Submissions-Inbox

1. Im Editor zurück zu Site → Top-Level-Submenu hat (noch) keinen Link, also URL direkt: `/website/<siteId>/submissions`
2. **Erwartet:** Deine Submissions (die echten, nicht die Bot-Spam-Try) als Liste
3. Löschen-Button funktioniert

---

## Szenario 4 — Module-Embed (M4)

### Picture-Board einbetten

Vorbereitung: in `/picture` mindestens ein Board anlegen, ein paar Bilder hochladen + auf Board ziehen, Board auf **"Öffentlich"** flippen (Board-Detail → Einstellungen).

1. Zurück im Website-Editor → Block **"Modul einbetten"**
2. Inspector → Quelle: `picture.board`, Quellen-ID: die UUID deines Public-Boards (copy aus `/picture/board/<id>`-URL)
3. Layout: "Grid", Max 12
4. **Im Editor:** Platzhalter-Text "Nicht aufgelöst. Quelle: picture.board …"
5. **Publish!** Während des Publishes wird der Embed aufgelöst:
   - DevTools → Network → POST /publish hat einen `blob.pages[0].blocks[].props.resolved.items: [...]`
6. Public-Mode: Grid mit den Board-Images

### Public-Gate verify

1. Board auf **"nicht öffentlich"** flippen
2. Site erneut publishen
3. Public-Mode: Platz mit Error-Pill "Einbettung fehlgeschlagen: Board ist nicht öffentlich …"
4. Board wieder öffentlich, erneut publishen → wieder ok

### Library-Embed (optional)

1. In `/library` 2-3 Bücher/Filme anlegen, eines favorisieren (⭐)
2. ModuleEmbed mit `library.entries`, Filter `isFavorite=true`
3. Publish → Public zeigt nur Favoriten

---

## Szenario 5 — Templates + AI (M5)

### Template-Flow

Schon in Szenario 1 gemacht wenn du nicht "Leer" gewählt hast. Teste alle vier:
- **Portfolio** — 4 Seiten, inkl. Gallery + Form
- **Link-Sammlung** — 1 Seite mit 6 CTAs
- **Event** — 3 Seiten inkl. RSVP-Formular
- **Leer** — 1 leere Seite

**Erwartet:**
- Jedes Template setzt `navConfig.items` passend zu den Seiten
- Alle Blöcke haben frische UUIDs (nicht die Template-`localId`s)
- `parentBlockId`-Chains bleiben korrekt nach dem Clone

Verify mit:
```bash
# Alle Site-UUIDs sollten eindeutig sein — keine Collisions mit früheren Template-Nutzungen
```

### AI-Tool-Flow

Voraussetzung: Companion-Chat / Mission funktioniert lokal, mana-llm antwortet.

1. `/ai-missions` → neue Mission: Objective `"Erstelle mir eine Portfolio-Website für meinen Freund Alex"`
2. Run Mission → warte auf Planner-Response
3. **Erwartet:** Proposals im Proposal-Inbox (falls `AiProposalInbox` gewired ist — siehe bekannte Limits) mit:
   - `apply_website_template(templateId: 'portfolio', name: ..., slug: ...)`
   - oder einzelne `create_website` / `add_website_block` Steps
4. Approve → Website taucht in `/website` auf

**Bekannt:** Wenn `AiProposalInbox` UI noch nicht existiert (laut Plan), bleiben Proposals in `pendingProposals` Dexie-Table. Verify mit:
```javascript
// DevTools Console
(await db.pendingProposals.toArray()).filter(p => p.toolName?.startsWith('website'))
```

Foregroung-Execution (ohne Approval-UI) von `list_websites` in einem Chat klappt — das ist `defaultPolicy: 'auto'`.

---

## Szenario 6 — Subdomain-Publishing (M6)

**Lokal:** Subdomains auf `localhost` funktionieren nicht out-of-the-box — `mein-test.localhost` wird vom Browser nicht automatisch zu `localhost` aufgelöst. Drei Optionen:

**A) `/etc/hosts` Eintrag** (einfach):
```
127.0.0.1 mein-test.localhost
```
Dann: `http://mein-test.localhost:5173/` sollte deine publizierte Site laden.

**B) In Production (`mana.how`):** automatisch via Wildcard-DNS — Config ist Cloudflare-Sache.

**C) Override via SvelteKit-Test-Param** (nur Code-Check): öffne DevTools → Network → resend das Request mit custom `Host: mein-test.mana.how` Header. Response-Body sollte der HTML der Public-Seite sein.

**Erwartet:**
- `hooks.server.ts` rewritet `event.url.pathname` intern zu `/s/mein-test`
- URL im Browser bleibt auf `mein-test.mana.how` (kein 302-Redirect!)

### App-Subdomain wins

1. Versuche: Site mit Slug `todo` anzulegen → `InvalidSlugError` "reserved"
2. Auch wenn du durch die Validierung kämst: `todo.mana.how` ist in `APP_SUBDOMAINS`, Hook leitet auf `/todo` (Todo-Modul) weiter, nicht auf die Website.

---

## Szenario 7 — Custom-Domain (M6)

**Voraussetzung:** Account ist `founder` Tier. Nicht-Founder sieht "Eigene Domain" Section gar nicht oder bekommt 403 vom API.

### Domain hinzufügen

1. Editor → **⚙** → SiteSettingsDialog → ganz unten "Eigene Domain"
2. Input: `portfolio.example.com` → klick **"+ Domain"**
3. **Erwartet:**
   - Row in Liste mit Pill `pending`
   - DNS-Konfigurations-Box zeigt:
     ```
     CNAME  portfolio.example.com                 → custom.mana.how
     TXT    _mana-challenge.portfolio.example.com → <32-char-hex>
     ```
   - Click-to-Copy funktioniert auf den Werten
4. Verify in DB:
   ```bash
   psql "$DATABASE_URL" -c "SELECT hostname, status, verification_token FROM website.custom_domains"
   ```

### DNS-Verify (mit echter Domain)

Wenn du eine echte Domain zur Hand hast:

1. In deinem DNS-Provider:
   - CNAME `portfolio.example.com` → `custom.mana.how`
   - TXT `_mana-challenge.portfolio.example.com` → `<token>`
2. DNS-Propagation abwarten (`dig @1.1.1.1 TXT _mana-challenge.portfolio.example.com` sollte den Token zeigen)
3. **"Verify"** klicken
4. **Erwartet:** Pill wechselt auf `verifying` (kurz) → `verified` (grün). `verified_at` in DB gesetzt.

### DNS-Verify (Simulation mit /etc/hosts — funktioniert NICHT)

Node's `dns.resolveTxt` nutzt System-DNS, nicht `/etc/hosts`. Der Verify-Call wird immer `ENOTFOUND` liefern für erfundene Hosts. Alternative: temporär `status` per SQL auf `verified` setzen:

```bash
psql "$DATABASE_URL" -c "UPDATE website.custom_domains SET status='verified', verified_at=now() WHERE hostname='mein-test.local'"
```

Dann: `/etc/hosts`-Eintrag, Resolver-Cache im Hook leeren (60s TTL, oder Server restart), und `http://mein-test.local:5173/` → sollte deine Site laden.

### Reserved-Hostname

1. Versuche `mana.how` oder `api.mana.how` einzutragen → 400 "Ungültiger oder reservierter Hostname"
2. Versuche `*.mana.how` (deine Subdomain-Root) → Reserved

### Invalid Tier

1. Log out, einloggen als ein Nicht-Founder-User (`public` Tier)
2. Gehe zu gleicher Site (wenn in shared space) oder eigene → SettingsDialog → "Eigene Domain"-Section
3. Add → **Erwartet:** 403 vom API, UI zeigt "Forbidden" oder ähnliche Fehlermeldung

---

## Szenario 8 — Analytics-Block (M7)

1. Editor → Block **"Analytics"** → Inspector
2. Provider **"Plausible"**, Domain `deineseite.com` (beliebiger String, real muss nicht existieren)
3. Script-URL leer lassen (nutzt `https://plausible.io/js/script.js`)
4. Im Editor sichtbar als dezente Pill 📊 Analytics: plausible (deineseite.com)
5. **Publish!**
6. Public-Mode → View-Source → finde:
   ```html
   <script defer data-domain="deineseite.com" src="https://plausible.io/js/script.js"></script>
   ```

**A11y-Check:** Analytics-Block hat `aria-hidden="true"` im Edit-Mode (Meta-Pill) und emittiert nur ein `<script>`-Tag im Public-Mode. Keine visuellen Artefakte für Screenreader.

**Privacy-Check:** Keine Cookies im `document.cookie` nach Page-Load. Plausible ist cookieless.

---

## Szenario 9 — Metrics + GC (M7)

### Metrics-Endpoint

```bash
curl -s http://localhost:3060/metrics | grep website
```

**Erwartet:** Zeilen wie:
```
mana_api_website_publish_total{service="mana-api",result="success"} 3
mana_api_website_publish_duration_seconds_bucket{...,le="0.1"} 2
mana_api_website_submissions_total{service="mana-api",result="received"} 1
mana_api_website_submissions_total{service="mana-api",result="spam"} 1
mana_api_website_host_resolve_total{service="mana-api",result="miss"} 42
mana_api_website_public_reads_total{service="mana-api",result="hit"} 17
mana_api_website_public_read_age_seconds_bucket{...,le="60"} 5
```

Je nachdem wie viel du in den Szenarien vorher gemacht hast. Counts nach jedem Publish/Submit neu checken — die Werte müssen steigen.

### Orphan-Asset-GC

```bash
MANA_SERVICE_KEY=dev-service-key bun apps/api/scripts/gc-website-assets.ts
```

**Erwartet:**
- Log: "scanning published_snapshots + submissions for media references"
- Log: "referenced mediaIds: N"
- Log: "media items in scope: M"
- Report-Datei: `/tmp/gc-website-assets-<ts>.json`

Wenn `MANA_SERVICE_KEY` nicht gesetzt: Script warnt und zeigt 0 Media-Items. Erwartet-Verhalten, kein Bug.

Zum Testen eines Orphans: uploade ein Bild über mana-media (DevTools → uploadImage direkt), setze es NICHT in einen Block. Script sollte es nach 30d Grace als Orphan listen — für den Test kannst du den `GRACE_MS`-Konstant im Script temporär auf 0 setzen.

---

## Szenario 10 — Edge-Cases + Sicherheit

### Space-Scope-Check

1. Zwei Personal-Spaces (User A + User B), beide haben eine Website mit Slug `mein-test`
2. User A's Slug `mein-test` geht live
3. User B versucht zu publishen mit gleichem Slug → **409 "Slug is already taken"**
4. User A unpublished → User B kann jetzt publishen

### SSRF / Host-Header-Injection

1. DevTools → resend request mit `Host: internal-metrics.local` → Hook ruft `/resolve-host?host=internal-metrics.local` → 404 → kein Rewrite, SvelteKit sieht das als normale Route, zeigt 404

### Form-Validation an Server-Seite

1. Manuell POST zum submit-Endpoint mit einem extra Feld das nicht im Block deklariert ist:
   ```bash
   curl -X POST http://localhost:5173/s/mein-test/__submit/<blockId> \
     -H 'content-type: application/json' \
     -d '{"name":"A","email":"a@b.c","message":"hi","admin":true}'
   ```
2. **Erwartet:** 201, aber `admin` wird ignoriert (nur deklarierte Fields gehen in `payload`)
3. Verify: `SELECT payload FROM website.submissions ORDER BY created_at DESC LIMIT 1` — `admin` sollte nicht drin sein.

4. Missing required field:
   ```bash
   curl -X POST … -d '{"name":"","email":"a@b.c","message":"hi"}'
   ```
   **Erwartet:** 400 "Pflichtfeld Name fehlt"

### Dexie-v37-Upgrade aus existierender DB

1. Browser-Profile mit bestehender Mana-DB (v36 oder früher)
2. App-Reload → Dexie upgraded auto auf v37 → v41 (wenn wardrobe schon drin)
3. DevTools → Application → IndexedDB → `mana` → Version zeigt 41 (oder höher)
4. Öffne `/website` → funktioniert ohne Fehler

---

## Bekannte Limits / was NICHT getestet wird

1. **Cloudflare-SaaS-Hostname-Provisioning** — `cloudflareOnboard()` ist gestubbed. Live-TLS für Custom-Domains braucht CF-Credentials in prod-env. Details: `docs/plans/website-builder.md` §M6.
2. **Target-Delivery für Submissions** — Formular-Submissions landen in `website.submissions` (Inbox). Forwarding zu `contacts.create` oder `mana-notify` ist M4.x, braucht Server-side Tool-Handler-Infrastructure.
3. **AiProposalInbox UI** — Component existiert nicht im Repo; Proposal-Staging funktioniert, aber die Inbox-View für Website-Blocks muss jemand bauen.
4. **Multi-Member-Co-Editing** — Shared-Spaces-RLS erlaubt mehreren Members, dieselbe Site zu editieren. mana-sync field-level LWW kümmert sich um Konflikte pro Feld. Nicht im Smoke-Scope, aber architektonisch vorgesehen.
5. **Drag-Drop-Block-Reorder** — aktuell nur Pfeil-Buttons im Inspector. @dnd-kit-Integration ist Backlog.

---

## Verify-Checkliste (Kurzform)

Nach allen Szenarien solltest du folgendes beobachtet haben:

- [ ] Site erstellen + Blöcke einfügen + Live-Preview updated
- [ ] Publish → `/s/<slug>` serviert SSR-HTML
- [ ] Draft-ahead-Pill zeigt wenn Editor ≠ Live
- [ ] Rollback-Dialog restored ältere Snapshot
- [ ] Image-Upload via mana-media (25 MB Limit greift)
- [ ] Gallery-Lightbox im Public-Mode mit Escape + Pfeiltasten
- [ ] Columns-Container: Child-Blöcke haben korrekten `parentBlockId + slotKey`
- [ ] Theme-Switch propagiert CSS-Variablen in Public-Mode
- [ ] Form-Submit landet in Inbox + 429 nach 10 Submits
- [ ] Honeypot blockt Bot-Submits silent
- [ ] ModuleEmbed: Public-Flag wird enforced (private Board → Error-Pill)
- [ ] Template-Clone hat frische UUIDs + intakte parentBlockId-Chain
- [ ] AI-Tool `list_websites` im Chat liefert echte Daten
- [ ] Subdomain-Rewrite funktioniert (via /etc/hosts oder Host-Header)
- [ ] Custom-Domain Add + DNS-Verify-UI + 403 für Non-Founder
- [ ] Reserved-Hostnames werden abgelehnt
- [ ] Analytics-Block emittiert genau ein `<script>`-Tag im public-Mode
- [ ] `/metrics`-Endpoint hat Counter-Values für alle getesteten Operations
- [ ] GC-Script läuft und schreibt JSON-Report

Wenn alle Punkte grün sind, Eintrag aus `docs/optimizable/manual-test-backlog.md` löschen.
