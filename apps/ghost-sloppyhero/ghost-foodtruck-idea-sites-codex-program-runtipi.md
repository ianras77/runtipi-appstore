# Ghost + Cheshire Cat Build Program for Wrapess and SloppyHero
## RunTipi Edition

## 1) Core decision

Build this as a **RunTipi-native publishing stack**.

That means:

- Keep **Ghost** as the public publishing and monetization engine
- Keep **Cheshire Cat** as the AI drafting and research sidecar
- Use **RunTipi** as the deployment substrate for app lifecycle, reverse proxy, SSL, and persistence
- Use a **custom RunTipi app store** for the site-specific apps you need, instead of a hand-built Ubuntu + Ghost-CLI stack

This is the cleanest fit for your current environment because you are already running RunTipi and it already supports:
- custom app stores
- dynamic compose app definitions
- per-app storage
- per-app user overrides
- public exposure with HTTPS
- one-click app lifecycle management

## 2) What changes from the original plan

The original plan assumed:
- self-hosted Ghost on Ubuntu
- separate Docker sidecars for Cheshire Cat
- Node automation worker outside the platform

The updated plan assumes:
- a **custom RunTipi app store repo**
- **five RunTipi apps**
  1. `wrapess-ghost`
  2. `sloppyhero-ghost`
  3. `wrapess-cat`
  4. `sloppyhero-cat`
  5. `foodtruck-content-ops`
- optional official RunTipi app for **Ollama** if you want local models
- optional use of hosted LLM APIs instead of Ollama if you want lower ops friction

## 3) Why this is the right RunTipi pattern

RunTipi's app model is app-ID based, with each app defined by its own `config.json`, `docker-compose.json`, and app data folders. The cleanest way to run two separately managed Ghost sites and two separately managed Cat instances is to give each one its own app identity in a custom app store.

Do **not** try to force both brands into one Ghost install.
Do **not** try to let one Cat instance write for both brands.
Do **not** let the AI layer auto-publish live indexed posts.

Each brand needs:
- separate theme variant
- separate Ghost members/newsletters/tiers
- separate Cat memory and prompts
- separate editorial rules
- separate domain exposure
- separate secrets

## 4) Final system architecture

### Public apps
- `wrapess-ghost` -> exposed on `wrapess.com`
- `sloppyhero-ghost` -> exposed on `sloppyhero.com`

### Semi-private AI apps
- `wrapess-cat` -> preferably unexposed at first, or exposed only behind protection on an admin subdomain such as `cat-wrapess.yourdomain.com`
- `sloppyhero-cat` -> same pattern

### Internal automation app
- `foodtruck-content-ops`
  - no public GUI required
  - scheduler / worker only
  - writes drafts to Ghost through Admin API
  - reads briefs and source packs from Cat
  - stores editorial queue state in persistent app data

### Optional shared model app
Use one of:
- official RunTipi `Ollama - CPU`
- official RunTipi `Ollama - Nvidia`
- official RunTipi `Ollama - AMD`
- or external APIs such as OpenAI / Anthropic / Google

### Optional protection layer
If you expose the Cat admin panels, put them behind an auth gate. The safest default is to keep them private until the stack is stable.

## 5) Brand split

### Wrapess
Positioning:
- feminine-leaning
- elegant
- healthy
- Mediterranean / wrap-centered
- founder-facing
- polished and aspirational

Core promise:
A publication and membership business that helps a reader launch a profitable wrap or Mediterranean-inspired food truck concept.

### SloppyHero
Positioning:
- masculine-leaning
- bold
- nostalgic
- comfort-food and sandwich-centered
- higher energy
- more rugged founder voice

Core promise:
A publication and membership business that helps a reader launch a profitable hero / sloppy joe / comfort sandwich food truck concept.

## 6) Business model inside Ghost

Each Ghost site should operate as a content + newsletter + membership business.

### Free layer
- newsletter signup
- cornerstone startup guides
- menu concept explainers
- cost and equipment articles
- comparison posts
- selected templates or calculators as lead magnets

### Paid layer
Use Ghost memberships and paid tiers.

Recommended tiers:

#### Free Member
- weekly newsletter
- selected guides
- one lead magnet
- launch updates

#### Builder Tier
- startup cost sheets
- menu engineering tools
- editable templates
- checklists
- vendor and permit frameworks

#### Operator Tier
- all Builder assets
- premium playbooks
- bundle downloads
- deeper ops templates
- future office hours or advisory add-on if you want

### Newsletter structure
Each site should have at least two newsletters:
- main weekly founder newsletter
- periodic deep-dive / toolkit newsletter

## 7) White-hat rules that never change

This part stays exactly as strict as in the original plan.

### Never masquerade
Do not present either site as a live truck if it is not.

### AI drafts, humans publish
The Cat can:
- generate briefs
- generate outlines
- assemble source packs
- draft posts
- suggest internal links
- propose refreshes
- draft newsletter copy

The Cat cannot:
- directly publish indexed content
- invent live truck stops
- invent testimonials
- invent addresses
- invent current events
- invent actual permits or legal facts without sources
- fill the site with low-value keyword spam

### Use a gated workflow
Three content lanes:

1. **Pillar / money pages**
   - human reviewed
   - highly sourced
   - indexed
   - conversion-oriented

2. **Supporting articles**
   - AI-assisted
   - edited before publish
   - indexed after QA

3. **Idea lab / editorial stream**
   - Cat can generate continuously
   - stored as drafts / queue items / private notes
   - not auto-published

### Tight topical focus
Wrapess stays on:
- wrap truck startup
- Mediterranean portable menu systems
- packaging, throughput, catering, economics

SloppyHero stays on:
- sandwich / sloppy joe / comfort truck startup
- festival ops
- throughput
- catering
- menu economics

## 8) RunTipi repository structure Codex should build

Create **one main monorepo** that contains:
- the site code
- the content ops service
- the RunTipi app store definitions
- the deployment docs

Recommended structure:

```text
foodtruck-idea-platform/
  README.md
  docs/
    strategy/
    seo/
    editorial/
    deployment/
    runbooks/
  apps/
    publisher-service/
  packages/
    content-schemas/
    shared-config/
  themes/
    base/
    wrapess/
    sloppyhero/
  runtipi-store/
    README.md
    apps/
      wrapess-ghost/
      sloppyhero-ghost/
      wrapess-cat/
      sloppyhero-cat/
      foodtruck-content-ops/
  scripts/
  .github/
    workflows/
```

## 9) The custom RunTipi app store design

Create a custom app store repo or sub-repo using the RunTipi app store format.

Each app folder must contain:
- `config.json`
- `docker-compose.json`
- `metadata/description.md`
- `metadata/logo.jpg`

### App 1: wrapess-ghost
Purpose:
- public Ghost publication for `wrapess.com`

Containers:
- `ghost`
- `mysql`

Requirements:
- force exposed
- persistent Ghost content volume
- persistent MySQL volume
- Ghost URL built from the exposed domain
- SMTP config for auth email
- Mailgun bulk email configuration documented in post-install
- importable custom theme zip
- health check

### App 2: sloppyhero-ghost
Same pattern as Wrapess, but isolated.

### App 3: wrapess-cat
Purpose:
- brand-specific Cat instance for Wrapess

Containers:
- `cat`
- `qdrant`

Requirements:
- persistent plugin folder
- persistent data folder
- persistent qdrant storage
- site-specific prompt defaults
- site-specific plugin settings
- no direct publishing power
- optional exposure on protected admin subdomain only

### App 4: sloppyhero-cat
Same pattern as Wrapess Cat, but isolated memory and prompts.

### App 5: foodtruck-content-ops
Purpose:
- scheduler + queue + QA + Ghost publisher

Container:
- custom Node service built from this repo

Responsibilities:
- poll Cats for fresh briefs
- create queue items
- validate sources
- run QA checks
- create Ghost drafts
- never publish directly unless a human explicitly approves

## 10) RunTipi config rules Codex must follow

### Use dynamic compose schema version 2
All custom app definitions should use RunTipi's dynamic compose format.

### Use form fields
Each app should expose only the settings the operator actually needs to fill in.

Recommended form fields:

#### For Ghost apps
- `SITE_TITLE`
- `SITE_DESCRIPTION`
- `ADMIN_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`

Do **not** ask the user to type the public domain into the app config if RunTipi can provide it through app exposure variables.

#### For Cat apps
- `CAT_ADMIN_API_KEY`
- `LLM_PROVIDER`
- `LLM_MODEL`
- `EMBEDDING_PROVIDER`
- `EMBEDDING_MODEL`
- `OLLAMA_BASE_URL` if local
- provider keys if hosted APIs are used

#### For content ops
- `WRAPESS_GHOST_ADMIN_URL`
- `WRAPESS_GHOST_ADMIN_KEY`
- `SLOPPYHERO_GHOST_ADMIN_URL`
- `SLOPPYHERO_GHOST_ADMIN_KEY`
- `WRAPESS_CAT_URL`
- `WRAPESS_CAT_API_KEY`
- `SLOPPYHERO_CAT_URL`
- `SLOPPYHERO_CAT_API_KEY`
- `EDITORIAL_REVIEW_REQUIRED=true`
- `AUTO_PUBLISH=false`

### Persist data correctly
Use `${APP_DATA_DIR}` and app-specific subfolders for all persistent data.

### Keep overrides in `user-config`
If a deployment needs additional mounts or environment overrides, place them in:

```text
runtipi/user-config/<app-store>/<app-id>/docker-compose.yml
runtipi/user-config/<app-store>/<app-id>/app.env
```

Do not edit generated app files directly.

## 11) Recommended app details

### `wrapess-ghost` and `sloppyhero-ghost`

#### Container logic
- Ghost image pinned to a tested major/minor tag
- MySQL 8 pinned
- Ghost main container marked `isMain: true`
- MySQL as dependency with health check
- `url` set from RunTipi app domain vars
- `database__client=mysql`
- `database__connection__host=mysql`
- `database__connection__database=ghost`
- unique DB names per app
- volume mounted at `/var/lib/ghost/content`

#### Exposure
- `force_expose: true`
- custom domain assigned in RunTipi dashboard:
  - `wrapess.com`
  - `sloppyhero.com`

#### Post-install tasks
- create owner admin
- import theme zip
- configure members
- configure newsletters
- connect Stripe
- connect Mailgun for bulk newsletter sending
- create tiers
- create publication info
- create navigation
- create pages
- import starter content

### `wrapess-cat` and `sloppyhero-cat`

#### Container logic
- Cheshire Cat core container
- Qdrant sidecar
- optional connection to shared Ollama or external provider
- persistent volumes for:
  - plugins
  - static
  - data
  - qdrant storage

#### Plugin strategy
Codex should build a custom plugin for each Cat that:
- knows the site's brand voice
- knows the topical boundaries
- knows the no-fabrication rules
- can create source-backed briefs
- can create outlines and draft markdown/lexical payloads
- can expose custom endpoints for:
  - `/custom/brief`
  - `/custom/draft`
  - `/custom/refresh`
  - `/custom/cluster`
  - `/custom/newsletter`

#### Site-specific memory
Each Cat gets:
- its own knowledge files
- its own plugin settings
- its own memory store
- its own editorial policy file

### `foodtruck-content-ops`

This is the brain stem of the workflow.

Responsibilities:
- maintain an editorial queue
- schedule content generation
- request source-backed briefs from each Cat
- pull or receive structured draft payloads
- validate that drafts contain:
  - topical fit
  - source list
  - no fake local facts
  - no fabricated current events
  - no forbidden claim patterns
- write drafts into Ghost via Admin API
- assign internal workflow tags
- create newsletter draft items
- log every action for auditability

Storage:
- SQLite is acceptable for a first version
- file-based queue plus SQLite metadata is acceptable
- later you can move to Postgres if needed

Default rule:
- every item goes in as **draft**
- publication requires explicit review action

## 12) Ghost theme requirements

Create one shared base theme and two brand variants.

### Shared base
- clean fast layout
- article schema
- breadcrumb schema
- profile pages
- membership CTAs
- email signup blocks
- pricing table blocks
- FAQ partials
- comparison table styles
- strong internal linking zones
- update-date display

### Wrapess variant
- lighter, cleaner, more aspirational
- more editorial polish
- health / premium visual language
- soft conversion path

### SloppyHero variant
- bolder
- meatier typography choices
- stronger merchandising feel
- higher energy CTA style

### Critical schema rules
Add:
- `Organization`
- `Article`
- `ProfilePage`
- `BreadcrumbList`

Do **not** add:
- `LocalBusiness`
unless a real operating business exists

## 13) Content system requirements

Codex should create structured content schemas for:
- pillar guide
- supporting article
- comparison post
- calculator landing page
- premium template page
- newsletter issue
- update / journal note
- content refresh brief

Required fields:
- title
- slug
- excerpt
- primary keyword
- secondary keywords
- search intent
- target reader stage
- site / brand
- author / reviewer
- source URLs
- CTA type
- internal links wanted
- noindex flag
- publish status
- last substantive update date

## 14) Editorial QA rules Codex must implement

### Hard blocks
Reject any draft that contains:
- fake live ordering language
- fake truck route schedules
- fake testimonials
- fake employee or chef quotes
- fake addresses or phone numbers
- fake "visit us today" language
- unsourced legal or permit claims
- obvious scaled SEO filler
- brand crossover confusion
- duplicate or near-duplicate copy from the other site

### Soft warnings
Flag drafts that:
- are too generic
- are thin
- lack commercial usefulness
- lack sources
- sound robotic
- overuse keywords
- fail to recommend next action

### Required footer / transparency pattern
For AI-assisted content, add a review / transparency pattern such as:
- researched with AI assistance
- reviewed and edited before publication
- intended for founders evaluating niche food truck concepts

Codex should make this configurable so you can vary how explicit it appears per content type.

## 15) Content production cadence

### Daily
- Cat generates:
  - 3 to 5 briefs per site
  - 1 newsletter angle per site
  - 1 refresh suggestion per site

### Weekly
- promote the best:
  - 1 pillar or money page total
  - 2 to 4 supporting posts per site
  - 1 newsletter per site

### Monthly
- refresh top pages
- consolidate duplicates
- improve internal linking
- review rankings and conversions
- update resource pages

## 16) Information architecture

### Shared page map
- `/`
- `/about/`
- `/start-here/`
- `/newsletter/`
- `/resources/`
- `/pricing/`
- `/contact/`
- `/privacy/`
- `/terms/`

### Shared collections
- `/guides/`
- `/costs/`
- `/menu/`
- `/operations/`
- `/catering/`
- `/journal/`

### Optional premium collection
- `/member-tools/`

## 17) RunTipi deployment order

1. Confirm RunTipi version is compatible with custom app stores and dynamic compose
2. Create or add your custom app store repo
3. Install `wrapess-ghost`
4. Expose it on `wrapess.com`
5. Install `sloppyhero-ghost`
6. Expose it on `sloppyhero.com`
7. Install one Ollama app if using local models
8. Install `wrapess-cat`
9. Install `sloppyhero-cat`
10. Install `foodtruck-content-ops`
11. Configure Ghost admin keys
12. Configure Cat API keys and provider settings
13. Import themes
14. Seed pages/tags/navigation
15. Import starter content as drafts
16. Turn on newsletters
17. Connect Stripe and Mailgun
18. Submit sitemaps and verify Search Console

## 18) Domain and exposure strategy

### Public
- `wrapess.com` -> `wrapess-ghost`
- `sloppyhero.com` -> `sloppyhero-ghost`

### Private or protected
- `cat-wrapess.<admin-domain>` -> optional
- `cat-sloppyhero.<admin-domain>` -> optional

### Safer exposure note
The Cat admin interfaces should not be casually public. Keep them internal or protect them.

## 19) Analytics and search setup

Per site:
- Google Search Console
- Bing Webmaster Tools
- plausible or umami if desired
- sitemap submission
- robots review
- canonical review
- author and org data review

Track:
- indexed pages
- impressions
- clicks
- newsletter signups
- paid conversions
- pillar page rankings
- draft-to-publish velocity

## 20) Content seed plan

### Wrapess launch cluster
- wrap food truck business plan
- wrap truck startup costs
- Mediterranean food truck menu ideas
- best equipment for a wrap truck
- wrap truck commissary and prep workflow
- healthy food truck catering packages
- packaging for wraps and bowls
- how profitable is a wrap food truck

### SloppyHero launch cluster
- sandwich food truck business plan
- sloppy joe truck startup costs
- best menu for a comfort sandwich truck
- festival menu engineering for sandwich trucks
- catering packages for hero sandwich trucks
- how to run high-throughput festival service
- late-night menu ideas for sandwich trucks
- how profitable is a sandwich food truck

## 21) What Codex must deliver

### A. Main monorepo
- docs
- themes
- publisher service
- content schemas
- QA engine
- tests where practical

### B. RunTipi app store definitions
- five app folders
- `config.json`
- `docker-compose.json`
- metadata
- README

### C. Ghost import / setup scripts
- tags
- pages
- routes examples
- starter posts
- internal workflow tags
- newsletters and tiers docs

### D. Cat plugins
- wrapess plugin
- sloppyhero plugin
- site policy files
- source-brief endpoint
- draft endpoint
- refresh endpoint

### E. CI
- validate JSON
- build publisher image
- build theme zips
- run tests
- lint content schemas

## 22) Acceptance criteria

The project is successful when:

- both public domains are live on Ghost under RunTipi
- both sites clearly state they are concept / startup publications, not live trucks
- both sites have branded themes and seed content
- both sites have free newsletter funnels and paid tier scaffolding
- both Cats can generate source-backed briefs and drafts
- the content ops service can create Ghost drafts through Admin API
- no content is auto-published without approval
- the stack can be updated and managed through RunTipi
- app data survives container restarts
- the whole system is documented for maintenance

## 23) The most important implementation instruction

The website is not just a blog.
The website **is the business plan**.

So Codex should optimize for:
- topical trust
- durable structure
- monetization readiness
- operational simplicity in RunTipi
- content quality over content volume
- SEO depth over AI spray

That is the correct foundation.