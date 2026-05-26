# URL Schema - mana.how

This document defines the URL schema for all mana.how subdomains.

## Naming Convention

- **Landing Pages**: Plural form (e.g., `calendars.mana.how`)
- **Web Apps**: Singular form (e.g., `calendar.mana.how`)
- **APIs**: Singular + `-api` suffix (e.g., `calendar-api.mana.how`)
- **Short URLs**: Redirect to Web Apps for convenience

---

## Complete URL Mapping

### Core Apps (Production)

| App | Web App | API | Status |
|-----|---------|-----|--------|
| **Calendar** | calendar.mana.how | api.mana.how/calendar | Active |
| **Clock** | clock.mana.how | api.mana.how/clock | Active |
| **Todo** | todo.mana.how | api.mana.how/todo | Active |
| **Contacts** | contacts.mana.how | api.mana.how/contacts | Active |
| **Chat** | chat.mana.how | api.mana.how/chat | Active |
| **Storage** | storage.mana.how | api.mana.how/storage | Active |
| **Quotes** | quotes.mana.how | api.mana.how/quotes | Active |
| **Food** | food.mana.how | api.mana.how/food | Active |
| **Presi** | presi.mana.how | api.mana.how/presi | Active |
| **SkillTree** | skilltree.mana.how | api.mana.how/skilltree | Active |
| **Photos** | photos.mana.how | api.mana.how/photos | Active |

### Platform Services

| Service | URL | Description |
|---------|-----|-------------|
| **Main Dashboard** | mana.how | Main landing/dashboard |
| **Auth Service** | auth.mana.how | Central authentication (mana-auth) |
| **API Gateway** | api.mana.how | Unified API gateway |
| **Media Service** | media.mana.how | Image/video processing |
| **LLM Service** | llm.mana.how | LLM abstraction layer |
| **LLM Playground** | playground.mana.how | LLM testing interface |
| **File Storage** | files.mana.how | MinIO/S3 file access |

### Automation

| Service | URL | Description |
|---------|-----|-------------|
| **N8N** | n.mana.how | Workflow automation |

### Monitoring & Admin

| Service | URL | Description |
|---------|-----|-------------|
| **Grafana** | grafana.mana.how | Metrics dashboards |


## Short URL Redirects

Convenience redirects for quick access to Web Apps:

| Short URL | Redirects To |
|-----------|--------------|
| cal.mana.how | calendar.mana.how |
| clok.mana.how | clock.mana.how |
| con.mana.how | contact.mana.how |
| pic.mana.how | picture.mana.how |
| zit.mana.how | quotes.mana.how |

---

## Hosting

### Landing Pages (Astro Static Sites)

**Platform:** Cloudflare Pages

Landing pages are deployed via Cloudflare Pages using Wrangler CLI:

```bash
# Deploy individual landing page
pnpm deploy:landing:calendar
pnpm deploy:landing:clock
pnpm deploy:landing:todo
pnpm deploy:landing:contacts
pnpm deploy:landing:chat
pnpm deploy:landing:picture
pnpm deploy:landing:quotes

# Deploy all landing pages
pnpm deploy:landing:all
```

**Cloudflare Project Names:**

| App | Cloudflare Project | Custom Domain |
|-----|-------------------|---------------|
| Calendar | calendars-landing | calendars.mana.how |
| Clock | clocks-landing | clocks.mana.how |
| Todo | todos-landing | todos.mana.how |
| Contacts | contacts-landing | contacts.mana.how |
| Chat | chats-landing | chats.mana.how |
| Picture | pictures-landing | pictures.mana.how |
| Quotes | quotess-landing | quotess.mana.how |

### Web Apps & APIs

**Platform:** Mac Mini (self-hosted) via Docker + Cloudflare Tunnel

---

## DNS Configuration

Web apps and APIs are routed via Cloudflare Tunnel to the Mac Mini. Landing pages use Cloudflare Pages.

### Cloudflare Tunnel (Web Apps & APIs)

All `*.mana.how` subdomains are routed via Cloudflare Tunnel to the Mac Mini Docker containers. No A records needed — Cloudflare manages the DNS.

### CNAME Records (Cloudflare - Landing Pages)

```
calendars.mana.how   CNAME  calendars-landing.pages.dev
clocks.mana.how      CNAME  clocks-landing.pages.dev
todos.mana.how       CNAME  todos-landing.pages.dev
contacts.mana.how    CNAME  contacts-landing.pages.dev
chats.mana.how       CNAME  chats-landing.pages.dev
pictures.mana.how    CNAME  pictures-landing.pages.dev
quotess.mana.how     CNAME  quotess-landing.pages.dev
```

### Short URL Redirects (Cloudflare Redirect Rules or CNAME)

```
cal.mana.how   → 301 redirect to calendar.mana.how
clok.mana.how  → 301 redirect to clock.mana.how
con.mana.how   → 301 redirect to contact.mana.how
pic.mana.how   → 301 redirect to picture.mana.how
zit.mana.how   → 301 redirect to quotes.mana.how
```

---

## Adding a New App

1. Create landing page in `apps/{app}/apps/landing/`
2. Add `wrangler.toml` with project name `{apps}-landing`
3. Add deploy script to root `package.json`
4. Create Cloudflare Pages project: `npx wrangler pages project create {apps}-landing`
5. Add custom domain in Cloudflare dashboard
6. Update this documentation
