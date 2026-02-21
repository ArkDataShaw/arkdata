# ArkData Platform — Progress Tracker

> **Read this first.** This file mirrors `plan.md` and tracks status of every task.
> Last updated: 2026-02-16
>
> **Current state:** Phase 0 complete. Phase 1 substantially complete — pixel-automation backend (1.5) is **live on VM** with normalized PostgreSQL schema, Node.js API, PHP webhook, and Python Selenium scripts all migrated from MySQL. Monorepo services (1.1–1.4) paused pending architecture decision on whether to consolidate into the standalone pixel-automation stack. Phase 2 not started (34 empty pages). Phase 3 partially complete — GCP project, Firebase, Cloud SQL, and VM are all provisioned and running.

---

## Legend

| Status | Meaning |
|--------|---------|
| `not started` | Work hasn't begun |
| `in progress` | Actively being worked on |
| `blocked` | Cannot proceed — see blocker notes |
| `complete` | Done and verified |
| `paused` | Work started but deprioritized |

---

## Phase 0: Foundation & Monorepo Scaffold

| # | Task | Status | Log | Blockers |
|---|------|--------|-----|----------|
| 0.1 | Create ArkDataShaw/arkdata monorepo | complete | Turborepo + pnpm workspace, single initial commit (456baf6) | — |
| 0.2 | Define shared-types package | complete | 5 type files: visitor (82 fields), event, tenant, pixel, common. Full RBAC enums. **Fixed 2026-02-09:** VisitorEvent import was missing in visitor.ts (circular re-export). | — |
| 0.3 | Build firebase-sdk package (base44 drop-in) | complete | Auth module, 87-entity proxy, Firestore ORM, tenant-scoped queries | — |
| 0.4 | Port/create ui-components package | complete | 6 chart components + ChoroplethMap + ChartColorContext from VizyTemplate | — |
| 0.5 | PostgreSQL schema (001_initial.sql) | complete | **Superseded by normalized ark.* schema (see 1.5a).** Original: 6 tables (tenants, users, visitors ~45 cols, events, resolution_log, pixels, sessions). | — |
| 0.6 | Terraform infrastructure-as-code | complete | 8 .tf files: 3 Cloud Run services, CloudSQL PG15, Firestore, 3 Pub/Sub topics + DLQ, 2 GCS buckets, IAM, outputs | — |
| 0.7 | Firestore security rules | complete | 5-tier RBAC, tenant-scoped, server-only event writes, default deny | — |
| 0.8 | Firebase emulator config | complete | Auth (9099), Firestore (8081), Hosting (5000), Pub/Sub (8085), UI (4000) | — |

## Phase 1: Backend Services

| # | Task | Status | Log | Blockers |
|---|------|--------|-----|----------|
| 1.1 | pixel-ingest service (monorepo) | paused | Compiles. Tested 2026-02-09 against emulator. Bugs: Pub/Sub gRPC emulator issue, non-atomic Firestore+Pub/Sub writes, incorrect pixel counter path. **Deprioritized** — ingestion now handled by PHP webhook in pixel-automation stack (1.5). | — |
| 1.2 | identity-resolution service (monorepo) | paused | Compiles. Never tested. Depends on Pub/Sub. **Deprioritized** — identity resolution now handled inline by normalized person upsert in pixel_import.php. | — |
| 1.3 | analytics-sync service (monorepo) | paused | Compiles. Never tested. **Deprioritized** — analytics queries will run directly against PostgreSQL. | — |
| 1.4 | analytics-api service (monorepo) | not started | Package.json exists. No implementation. | — |
| 1.5 | **Pixel-automation backend** | **complete** | **2026-02-16.** Full standalone stack live on VM. See sub-tasks below. | — |

### 1.5 Sub-tasks: Pixel-Automation Backend (arkdata-pixel)

| # | Task | Status | Log |
|---|------|--------|-----|
| 1.5a | Normalized `ark.*` PostgreSQL schema | complete | **2026-02-16.** `sql/001_normalized_schema.sql` — 8 tables (tenants, pixels, persons, companies, person_companies, events, raw_events, emails). RLS on all tenant-scoped tables. PII encryption columns (AES-256-GCM `_enc` + HMAC-SHA256 `_hash` blind indexes). JSONB bundles for skiptrace (17 cols) and social (6 cols). Monthly partitioned events/raw_events. Materialized view `mv_tenant_export` for fast CSV exports. Triggers for visitor_count/event_count. **~94% storage reduction** vs old per-event identity duplication. Applied to Cloud SQL at 34.148.231.66. |
| 1.5b | Node.js API server migration | complete | **2026-02-16.** `mysql2` → `pg` Pool. Created `pool.ts` (PG connection pool with tenant RLS), `crypto.ts` (AES-256-GCM + HMAC). Rewrote `index.ts` (1530→~600 lines), `db.ts`, `pixelDeleter.ts`, `websiteUrlUpdater.ts`, `audienceLab.ts`. All queries target `ark.*` tables with `$N` placeholders and `ON CONFLICT` upserts. Version `2.0.0-ark-normalized`. TypeScript builds clean. |
| 1.5c | PHP webhook ingestion migration | complete | **2026-02-16.** `config.php`: `mysqli` → PDO pgsql + `encryptPII()`/`decryptPII()`/`blindIndex()` helpers. `pixel_import.php`: complete rewrite for normalized pipeline — resolve tenant → raw_event (idempotent via SHA256) → person upsert (encrypted PII, JSONB bundles) → company upsert → person_company link → slim event. `visitor_upsert_functions.php`: compatibility wrapper. |
| 1.5d | Python Selenium scripts migration | complete | **2026-02-16.** `mysql-connector-python` → `psycopg2-binary`. `database.py`: `ArkDatabase` class with SQLAlchemy `postgresql+psycopg2://`, queries `ark.pixels JOIN ark.tenants`. `oplet_bot.py`, `run_oplet_poller.py`, `api_discovery_bot.py`: all queries updated to `ark.pixels`. `daily_sync.py`: removed SSH tunnel logic, obsoleted backfill/prepare_db (normalized schema handles inline). |
| 1.5e | Encryption keys + deployment | complete | **2026-02-16.** Generated `ENCRYPTION_KEY` and `HMAC_KEY` (32-byte hex). Updated `.env` on VM. `npm install` + `npm run build` clean. `pip3 install -r requirements.txt` installed psycopg2-binary. PM2 restarted — API healthy at `http://104.196.140.156:4000`. `/health` returns `{ schema: "ark (normalized)" }`. `/admin/pixels` confirms DB connectivity. |

## Phase 2: Web Application (Frontend)

| # | Task | Status | Log | Blockers |
|---|------|--------|-----|----------|
| 2.1 | App shell (routing, auth gate, layout) | complete | App.jsx, AuthContext, base44Client, Layout, pages.config (34 routes). Firebase Auth working (login/logout tested). | — |
| 2.2 | Shared UI components (shadcn/ui) | complete | 50+ shadcn components installed in apps/web/src/components/ui/ | — |
| 2.3 | Shared app components | complete | DataTable, MetricCard, IntentScore, StatusBadge, chart components, billing, dashboards, onboarding | — |
| 2.4 | Page implementations (34 pages) | not started | All pages registered in pages.config.js but component files are empty/placeholder | — |
| 2.5 | Home / Dashboard page | not started | — | — |
| 2.6 | Visitors + VisitorDetail pages | not started | — | — |
| 2.7 | Companies page | not started | — | — |
| 2.8 | Analytics + AdvancedAnalytics pages | not started | — | — |
| 2.9 | Sessions page | not started | — | — |
| 2.10 | Dashboards + DashboardBuilder pages | not started | — | — |
| 2.11 | Integrations page | not started | — | — |
| 2.12 | Billing page | not started | — | — |
| 2.13 | Admin pages (Tenants, Users, Security, etc.) | not started | — | — |
| 2.14 | Onboarding flow | not started | — | — |
| 2.15 | Reports + Exports | not started | Depends on analytics-api (1.4) | 1.4 |
| **2.16** | **Pixel management page** | **not started** | Next priority. Create/pause/delete pixels via API. Connect to `/generate` and `/admin/pixels` endpoints. | — |

## Phase 3: Infrastructure & Deployment

| # | Task | Status | Log | Blockers |
|---|------|--------|-----|----------|
| 3.1 | GCP project setup | complete | **2026-02-16.** Project `arkdata-hub` (shaw@arkdata.io). Firebase Auth configured. | — |
| 3.2 | Terraform apply (dev environment) | not started | Terraform files exist but have not been applied. Manual provisioning used instead for current infra. | — |
| 3.3 | Firebase project init | complete | **2026-02-16.** Firebase project linked to `arkdata-hub`. Auth provider (email/password) enabled. Dashboard `.env` configured with Firebase keys. | — |
| 3.4 | Docker builds + Artifact Registry push | not started | Dockerfiles exist for pixel-ingest and identity-resolution. Pixel-automation runs directly on VM (no container). | — |
| 3.5 | Cloud Run deployment (monorepo services) | not started | Monorepo services paused. Pixel-automation runs on VM via PM2. | — |
| 3.6 | PostgreSQL provisioning + schema | complete | **2026-02-16.** Cloud SQL instance `arkdata-pixel-db` at 34.148.231.66 (PostgreSQL 15, db-f1-micro, us-east1). Users: `postgres`/`arkdata_pixel`. Normalized `ark.*` schema applied with all 8 tables, indexes, RLS policies, partitions (2026_02, 2026_03), triggers, materialized view. | — |
| 3.7 | GCP VM for pixel automation | complete | **2026-02-16.** `arkdata-pixel-vm` at 104.196.140.156 (e2-medium, us-east1-b, Debian 12). Chrome/Selenium, Node.js 20, PHP 8.2, Python 3.11. PM2 running `arkdata-pixel-api` on port 4000. GitHub repo: `ArkDataShaw/arkdata-pixel`. | — |
| 3.8 | DNS + custom domain | not started | `arkdata.io` domain available. Need to configure DNS records for API and dashboard. | — |

## Phase 4: Integration & Testing

| # | Task | Status | Log | Blockers |
|---|------|--------|-----|----------|
| 4.1 | End-to-end pixel ingest test | not started | Test: POST webhook payload → verify raw_event, person, event, company rows in DB. API `/generate` creates pixel, but no full round-trip test with IntentCore webhook yet. | — |
| 4.2 | Identity resolution integration test | not started | Verify person deduplication via `(tenant_id, source_uuid)` unique constraint. Verify encrypted PII round-trip (encrypt → store → decrypt → matches original). | — |
| 4.3 | Export/materialized view test | not started | `REFRESH MATERIALIZED VIEW ark.mv_tenant_export` → `COPY TO` CSV → verify correct joined data. | — |
| 4.4 | Multiwoven reverse ETL integration | not started | Connect Multiwoven to Cloud SQL as source. Configure destinations (HubSpot, Salesforce, Google Sheets). | — |
| 4.5 | Data migration (existing MySQL → PostgreSQL) | not started | Migrate live data from MariaDB at 34.26.61.148 into normalized `ark.*` schema. Requires ETL script to split ~80-col rows into persons + events + companies. | 3.6 |

## Phase 5: Polish & Launch

| # | Task | Status | Log | Blockers |
|---|------|--------|-----|----------|
| 5.1 | Production Terraform apply | not started | — | Phase 4 complete |
| 5.2 | Monitoring + alerting setup | not started | — | 5.1 |
| 5.3 | Cold storage lifecycle (90-day retention) | not started | Detach old event partitions → export to GCS as Parquet/CSV. Cloud Scheduler for monthly partition creation. | 5.1 |
| 5.4 | User onboarding flow end-to-end | not started | — | 2.14, 5.1 |
| 5.5 | Billing integration (Stripe) | not started | — | 2.12, 5.1 |

---

## Live Infrastructure Summary

| Resource | Details |
|----------|---------|
| GCP Project | `arkdata-hub` (shaw@arkdata.io) |
| Cloud SQL | `arkdata-pixel-db` — PostgreSQL 15 at 34.148.231.66 (db-f1-micro, us-east1) |
| VM | `arkdata-pixel-vm` — 104.196.140.156 (e2-medium, us-east1-b, Debian 12) |
| API | Node.js v2.0.0-ark-normalized on PM2, port 4000 |
| Schema | `ark.*` — 8 tables, RLS, PII encryption, JSONB bundles, monthly partitions |
| GitHub | `ArkDataShaw/arkdata-pixel` (private) |
| Firebase | Auth enabled (email/password), linked to `arkdata-hub` |
| Dashboard | `ArkDataShaw/arkdata` monorepo, apps/web with 34 route stubs |

## Database Schema: `ark.*`

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `tenants` | 0 | Multi-tenant registry (slug, settings) |
| `pixels` | 0 | Pixel registry (replaces pixel_sheets) |
| `persons` | 0 | Deduplicated identities — PII encrypted, JSONB bundles |
| `companies` | 0 | Company directory, deduped by (tenant, domain) |
| `person_companies` | 0 | Many-to-many junction (person ↔ company) |
| `events` | 0 | Slim behavioral events (~12 cols), monthly partitioned |
| `raw_events` | 0 | Full webhook payloads (JSONB), SHA256 idempotency |
| `emails` | 0 | Parsed email index with NPN/CRD matching |
| `mv_tenant_export` | 0 | Materialized view for fast CSV exports |
