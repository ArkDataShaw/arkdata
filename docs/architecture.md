# ArkData Platform — Architecture & Technical Decisions

> Source of truth for "why are we doing it this way."
> Every decision includes a one-line rationale.
> Last updated: 2026-02-09

---

## 1. Repository Structure

**Decision:** Turborepo monorepo with pnpm workspaces.
**Rationale:** Shared types, SDK, and UI components need atomic versioning across services and frontend.

```
arkdata/
├── apps/
│   ├── web/              # React SPA (Vite, shadcn/ui, Recharts)
│   └── pixel-automation/ # Pixel generation service (scaffolded)
├── packages/
│   ├── shared-types/     # TypeScript interfaces + enums
│   ├── firebase-sdk/     # Firestore ORM + Auth (base44 drop-in)
│   └── ui-components/    # Recharts wrappers + ChoroplethMap
├── services/
│   ├── pixel-ingest/     # Cloud Run: event ingestion endpoint
│   ├── identity-resolution/ # Cloud Run: 5-strategy identity matcher
│   ├── analytics-sync/   # Firestore → PostgreSQL dual-write
│   └── analytics-api/    # Cloud Run: REST API for dashboards/exports (scaffolded)
├── infra/
│   ├── terraform/        # GCP IaC (Cloud Run, CloudSQL, Pub/Sub, GCS)
│   ├── firestore-rules/  # RBAC security rules
│   └── postgresql/       # SQL migrations
├── docs/                 # Living project documentation
├── turbo.json
├── pnpm-workspace.yaml
└── firebase.json
```

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Vite + React + shadcn/ui + Recharts | Ported from ark-data; fast dev server; shadcn gives unstyled primitives |
| **Styling** | Tailwind CSS | Consistent with all source repos; utility-first reduces CSS bloat |
| **State** | TanStack Query | Server-state caching; already in ark-data; pairs with Firestore subscriptions |
| **Auth** | Firebase Auth | Custom claims for tenant_id + role; Google OAuth built-in; free tier generous |
| **Primary DB** | Firestore (native mode) | Real-time listeners for live feeds; tenant-scoped collections; Firebase Auth integration |
| **Analytical DB** | PostgreSQL 15 (Cloud SQL) | SQL joins for analytics; complex aggregations; warm cache for dashboard queries |
| **Event Bus** | Cloud Pub/Sub | Decouples services; at-least-once delivery; DLQ for failed messages; push to Cloud Run |
| **Compute** | Cloud Run | Scale-to-zero; auto-scaling 0-10; no infra management; Dockerized services |
| **Cold Storage** | GCS (lifecycle tiered) | Standard → Nearline (90d) → Coldline (180d); cost-optimized for raw event archival |
| **IaC** | Terraform | Reproducible GCP infra; state in GCS; supports dev/staging/prod environments |
| **Validation** | Zod | Runtime schema validation at ingestion boundary; TypeScript type inference |
| **Package Manager** | pnpm 9.x | Fast, disk-efficient; strict dependency isolation; workspace support |
| **Build System** | Turborepo | Incremental builds; task caching; parallel execution across workspace packages |
| **Node Version** | >= 20.0.0 | LTS; native fetch; stable ESM support |

### Target Stack (Future)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js App Router | SSR for SEO (marketing pages), RSC for data-heavy pages, API routes for BFF |
| **Styling** | Tailwind v4 | Container queries, new config format, performance improvements |
| **Animations** | MagicUI | Premium animated components built on shadcn/ui |
| **Reverse ETL** | Multiwoven (self-hosted) | Open-source CDP; connectors to Salesforce, HubSpot, Slack, Google Sheets |

## 3. Data Architecture

### 3.1 Dual-Storage Pattern

```
              Firestore (Primary)              PostgreSQL (Analytical)
              ─────────────────                ─────────────────────
Purpose:      Real-time reads, auth,           SQL joins, aggregations,
              live feeds, tenant CRUD          dashboards, exports

Writes:       pixel-ingest, identity-          analytics-sync (one-way
              resolution, web app              Firestore → PostgreSQL)

Reads:        Web app (real-time),             analytics-api, reports,
              firebase-sdk entity proxy        complex queries

Consistency:  Eventual (sync lag <1s           Eventual (depends on
              for listeners)                   sync service latency)

Schema:       Document collections,            6 relational tables,
              tenant-scoped paths              foreign keys, indexes
```

**Rationale:** Firestore provides real-time subscriptions and Firebase Auth integration that PostgreSQL can't match. PostgreSQL provides JOIN-based analytics that Firestore can't do. The sync service bridges the gap.

### 3.2 PostgreSQL Schema

6 tables with full referential integrity:

| Table | Type | Key Columns | Purpose |
|-------|------|-------------|---------|
| `tenants` | Master | id, slug, plan, settings | Organization/account records |
| `users` | Master | tenant_id, email, role | Platform users (RBAC) |
| `visitors` | Idempotent | tenant_id, ~45 identity cols | Resolved visitor profiles |
| `events` | Append-only | tenant_id, visitor_id, pixel_id | Raw pixel events |
| `resolution_log` | Append-only | visitor_id, match_type, confidence | Identity resolution audit trail |
| `pixels` | Master | tenant_id, domain, webhook_url | Pixel configuration |
| `sessions` | Derived | visitor_id, started_at, duration | Aggregated session data |

### 3.3 Firestore Collection Structure

```
tenants/{tenantId}/
  ├── visitors/{visitorId}
  ├── raw_events/{eventId}
  ├── sessions/{sessionId}
  ├── pixels/{pixelId}
  ├── resolution_log/{logId}
  ├── dashboards/{dashboardId}
  ├── syncs/{syncId}
  └── users/{userId}
```

**Rationale:** Tenant-scoped subcollections enforce data isolation at the Firestore path level. Security rules validate tenant_id from auth custom claims.

## 4. Event Pipeline

```
Pixel JS → POST /v1/ingest/:pixelId → pixel-ingest (Cloud Run)
           │
           ├─→ Write RawEvent to Firestore (append-only)
           ├─→ COALESCE upsert visitor in Firestore
           ├─→ Publish to raw-events Pub/Sub topic
           │
           └─→ raw-events topic → identity-resolution (Cloud Run)
                │
                ├─→ 5-strategy matcher (HEM→Email→Phone→Name+Co→IP+UA)
                ├─→ Write ResolutionLogEntry (provenance)
                ├─→ Update visitor identity_status
                └─→ Publish to identity-updates topic
                     │
                     └─→ analytics-sync (Cloud Run)
                          │
                          ├─→ UPSERT visitor to PostgreSQL (COALESCE merge)
                          └─→ INSERT event to PostgreSQL (append-only)
```

## 5. Identity Resolution

### 5.1 Match Strategies (Confidence-Ordered)

| Priority | Strategy | Confidence | Method | Latency |
|----------|----------|-----------|--------|---------|
| 1 | HEM SHA256 | 0.95 | Direct field match | ~5ms |
| 2 | Email exact | 0.90 | Normalized email query (personal + business) | ~10ms |
| 3 | Phone exact | 0.80 | Normalized 10+ digit query (mobile + direct + personal) | ~10ms |
| 4 | Name + Company | 0.70 | Company domain query + in-memory name filter | ~50ms |
| 5 | IP + User Agent | 0.50 | 30-min session window, IP + UA match | ~30ms |

**First match wins.** No fallback after success. New visitor created if all strategies fail.

### 5.2 COALESCE Pattern

Never overwrite a non-empty field with blank/null. Only fill gaps:
```
existing: { email: "john@co.com", phone: null }
incoming: { email: "",            phone: "555-1234" }
result:   { email: "john@co.com", phone: "555-1234" }
```

**Rationale:** Prevents data regression from partial event payloads. Applied at both Firestore (transaction) and PostgreSQL (SQL COALESCE) levels.

## 6. Authentication & Authorization

### 6.1 Firebase Auth Custom Claims

```json
{
  "tenant_id": "uuid",
  "role": "tenant_admin",
  "is_service_account": false
}
```

Set by backend on user creation. Validated by Firestore security rules and firebase-sdk auth module.

### 6.2 RBAC Permission Matrix

| Permission | super_admin | tenant_admin | analyst | operator | read_only |
|-----------|:-----------:|:------------:|:-------:|:--------:|:---------:|
| Read all data | x | x | x | x | x |
| Write visitors/events | x | x | — | — | — |
| Manage pixels/syncs | x | x | — | x | — |
| Create dashboards | x | x | x | — | — |
| Manage users | x | x | — | — | — |
| Delete any resource | x | x | — | — | — |
| Cross-tenant access | x | — | — | — | — |

## 7. Infrastructure

### 7.1 GCP Services

| Service | Resource | Configuration |
|---------|----------|--------------|
| Cloud Run | pixel-ingest | 1vCPU/512Mi, 0-10 instances, 30s timeout, public |
| Cloud Run | identity-resolution | 1vCPU/512Mi, 0-10 instances, 60s timeout |
| Cloud Run | analytics-api | 1vCPU/512Mi, 0-10 instances, 300s timeout |
| Cloud SQL | PostgreSQL 15 | 2vCPU/7.5GB, 20GB SSD, auto-resize, HA in prod |
| Pub/Sub | 3 topics + 3 DLQ | raw-events, identity-updates, sync-requests |
| GCS | cold-events | Standard→Nearline(90d)→Coldline(180d) |
| GCS | exports | Standard, 7d auto-delete, CORS enabled |
| Firestore | Native mode | us-central1, 3 composite indexes |
| Firebase | Auth + Hosting | Email/password + Google OAuth |

### 7.2 Terraform State

Backend: GCS bucket `arkdata-tfstate-<project_id>`, prefix `terraform/state`.

### 7.3 Environment Variables (per Cloud Run service)

All services: `GCP_PROJECT_ID`, `GCP_REGION`, `ENVIRONMENT`, `DATABASE_URL`
pixel-ingest: + `PUBSUB_TOPIC_RAW_EVENTS`
identity-resolution: + `PUBSUB_TOPIC_RAW_EVENTS`, `PUBSUB_TOPIC_IDENTITY_UPDATES`
analytics-api: + `PUBSUB_TOPIC_SYNC_REQUESTS`, `GCS_EXPORT_BUCKET`

## 8. Firebase SDK (base44 Drop-in)

The `@arkdata/firebase-sdk` package is a drop-in replacement for `@base44/sdk` used in the original ark-data frontend. This allows existing page components to work with zero import changes:

```js
// Before (ark-data)
import { base44 } from '@base44/sdk';
const visitors = await base44.entities.Visitor.list();

// After (arkdata) — same API
import { base44 } from '@arkdata/firebase-sdk';
const visitors = await base44.entities.Visitor.list();
```

87 entity types are mapped to Firestore collections. Entity proxy methods: `list()`, `filter()`, `get()`, `create()`, `update()`, `delete()`, `subscribe()`.

## 9. Open Architecture Questions

1. **Vite vs Next.js timing** — Ship with Vite first or migrate now?
2. **Multiwoven deployment** — Same GCP project or separate? Docker Compose or Kubernetes?
3. **Analytics-API scope** — REST endpoints needed: visitor queries, dashboard data, CSV/Parquet exports. What else?
4. **Event cold storage format** — JSON lines in GCS? Parquet for cost/query efficiency?
5. **Firebase custom claims provisioning** — Cloud Function trigger on user creation? Admin API?
