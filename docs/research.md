# ArkData Platform — Domain Research

> Research findings mapped to project components. Sources cited.
> Conflicting information flagged explicitly.
> Last updated: 2026-02-09

---

## 1. Source Repo Analysis

### 1.1 ark-data (noahmonks) — Original Frontend

- **Stack:** Base44 platform, Vite, React, shadcn/ui, Recharts, TanStack Query
- **Pages (40+):** Home, Visitors, VisitorDetail, Companies, Analytics, AdvancedAnalytics, Sessions, Dashboards, DashboardBuilder, Integrations, Automations, Workflows, Billing, Reports, LostTraffic, FunnelBuilder, SegmentBuilder, Onboarding, Profile, AppSettings, MobileDashboard, DataHygiene + 18 Admin pages
- **Backend:** `@base44/sdk` — proprietary serverless backend (entities, auth, functions)
- **Key patterns:** Entity-based data access (`base44.entities.Visitor.list()`), server-side functions for business logic, onboarding wizard, billing/Stripe integration, dashboard builder with widgets
- **Status:** Fully functional on Base44 platform. ArkData monorepo ports the frontend and replaces `@base44/sdk` with `@arkdata/firebase-sdk`.
- **Source:** Forked to ArkDataShaw/ark-data

### 1.2 auto_pixel (ShawCole) — Pixel Automation

- **Stack:** PHP (pixel_import.php webhook), Node.js (automation scripts), MariaDB/MySQL on GCP
- **Database:** 34.26.61.148 — `superpixel_visitors` (~75 cols, idempotent upsert), `superpixel_resolution_log` (~80 cols, append-only)
- **Pixel provider:** Simple Audience — Selenium-based pixel creation and management
- **Features:** Smart sync to Google Sheets, PM2 process manager, webhook endpoint for pixel data
- **Migration path:** Database schema mapped to shared-types Visitor + RawEvent interfaces. Webhook logic replicated in pixel-ingest service.
- **Source:** ShawCole/auto_pixel

### 1.3 multiwoven (ShawCole) — Reverse ETL

- **Stack:** Ruby on Rails API + React frontend, Docker-based
- **Sources:** BigQuery, Redshift, Snowflake, PostgreSQL
- **Destinations:** Salesforce, HubSpot, Slack, Google Sheets, Facebook Custom Audiences, and 30+ more
- **Role in ArkData:** Integration/destination layer. ArkData's PostgreSQL becomes a Multiwoven source; tenant-configured syncs push enriched visitor data to their CRM/tools.
- **Deployment:** Docker Compose (self-hosted) or managed service
- **Source:** ShawCole/multiwoven (fork of Multiwoven/multiwoven)

### 1.4 VizyTemplate_v2 (ShawCole) — Visualization Dashboard

- **Stack:** React, Vite, TypeScript, Recharts, Tailwind
- **Charts:** BarChart, PieChart, DoughnutChart, PopulationPyramid, HorizontalBarChart, ChoroplethMap
- **Data format:** ~75-column CSVs with B2B+B2C data
- **Sections:** Demographics, Financial, Credit, Company, Contact
- **Migration path:** Chart components ported to `packages/ui-components` (6 charts + ChoroplethMap + ChartColorContext)
- **Source:** ShawCole/VizyTemplate

### 1.5 intent-insight-nexus (ShawCole) — Visitor Viewer

- **Stack:** React, TypeScript, Supabase, shadcn/ui
- **Features:** VisitorCollectionViewer with dropdown divs + event rows
- **Pages:** Dashboard, Downloads, DataEnrichment, SuperPixelAnalytics, IntentData
- **Migration path:** VisitorCollectionViewer pattern influences apps/web VisitorDetail page. Supabase replaced by Firestore.
- **Source:** ShawCole/intent-insight-nexus

---

## 2. Identity Resolution — Industry Research

### 2.1 Deterministic vs. Probabilistic Matching

- **Deterministic:** Exact field matches (email, phone, HEM). High confidence, low false positives. Used by: Clearbit, ZoomInfo, Apollo.
- **Probabilistic:** Statistical models combining weak signals (IP, device fingerprint, behavioral patterns). Higher match rates, more false positives. Used by: LiveRamp, The Trade Desk, Lotame.
- **ArkData approach:** Deterministic only (5 strategies). Aligns with B2B use case where false positives are costly.
- **Source:** LiveRamp identity resolution whitepaper; Clearbit documentation

### 2.2 COALESCE Upsert Pattern

- **Pattern:** Never overwrite existing non-empty fields with blank values from incoming data
- **Used by:** Segment Profiles, mParticle, Snowflake customer data platforms
- **Implementation:** Both Firestore transactions and PostgreSQL `INSERT ... ON CONFLICT ... SET field = COALESCE(EXCLUDED.field, table.field)`
- **Risk:** Stale data persists if a field value legitimately changes to empty. Mitigation: explicit null-set API for intentional deletions.

### 2.3 Confidence Scoring

| Provider | Match Type | Typical Confidence |
|----------|-----------|-------------------|
| LiveRamp | RampID (deterministic) | 95-99% |
| Clearbit | Email→Company | 85-95% |
| ZoomInfo | Phone/Email | 80-95% |
| Bombora | IP→Company (probabilistic) | 40-70% |

ArkData's scores (0.50-0.95) align with industry ranges. The IP+UA strategy at 0.50 is conservative (good).

---

## 3. Multi-Tenant Architecture

### 3.1 Tenant Isolation Strategies

| Strategy | Isolation | Complexity | Cost |
|----------|-----------|-----------|------|
| Shared DB, shared schema, tenant_id column | Low | Low | Low |
| Shared DB, separate schemas per tenant | Medium | Medium | Medium |
| Separate DB per tenant | High | High | High |

- **ArkData approach:** Shared DB + tenant_id column (Firestore subcollections, PostgreSQL tenant_id FK)
- **Rationale:** Cost-effective for <100 tenants. Firestore security rules enforce isolation. PostgreSQL indexes on tenant_id ensure query performance.
- **Source:** AWS multi-tenant SaaS architecture guide; Google Cloud multi-tenancy patterns

### 3.2 RBAC Models

- ArkData uses 5 fixed roles (super_admin → read_only)
- Alternative: Attribute-based access control (ABAC) — more flexible but complex
- Firebase custom claims limited to 1000 bytes — sufficient for tenant_id + role, but not for fine-grained permissions
- **Source:** Firebase Auth custom claims documentation

---

## 4. Pixel Tracking — Technical Landscape

### 4.1 Pixel Providers

| Provider | Method | Data Quality | Pricing |
|----------|--------|-------------|---------|
| Simple Audience | JavaScript pixel + server-side resolution | B2B: Good, B2C: Moderate | Per-resolved-visitor |
| Bombora | Intent data overlay | Company-level only | Per-account |
| Clearbit Reveal | IP→Company resolution | Company: Excellent, Contact: Via enrichment | API calls |
| 6sense | AI-based intent + firmographic | Company: Excellent | Enterprise pricing |

- **ArkData:** Currently Simple Audience only. Provider abstraction in pixel.ts supports future providers.

### 4.2 Third-Party Cookie Deprecation

- Chrome: Third-party cookies deprecated (Privacy Sandbox)
- Impact: IP+UA fingerprinting becomes primary fallback for anonymous tracking
- ArkData mitigation: Server-side pixel (webhook-based), not client-side cookie dependent
- HEM (hashed email) strategy works post-cookie because it's first-party data
- **Source:** Chrome Privacy Sandbox timeline; IAB cookie deprecation guidance

---

## 5. GCP Infrastructure Research

### 5.1 Cloud Run Pricing (us-central1)

| Resource | Price | ArkData Impact |
|----------|-------|---------------|
| vCPU-second | $0.00002400 | Scale-to-zero saves ~70% vs always-on |
| Memory GB-second | $0.00000250 | 512Mi per service, modest cost |
| Request | $0.40/million | Pixel events are the primary driver |
| Min instances | Charged even when idle | Consider min=1 for pixel-ingest in prod |

### 5.2 Cloud SQL Pricing

| Tier | vCPU | RAM | Price/month (estimate) |
|------|------|-----|----------------------|
| db-f1-micro | Shared | 0.6GB | ~$10 |
| db-custom-1-3840 | 1 | 3.75GB | ~$50 |
| db-custom-2-7680 | 2 | 7.5GB | ~$100 |
| db-custom-4-15360 | 4 | 15GB | ~$200 |

- **ArkData:** db-custom-2-7680 for all environments. Consider db-f1-micro for dev.

### 5.3 Firestore Pricing

| Operation | Price | Notes |
|-----------|-------|-------|
| Document read | $0.06/100K | Real-time listeners count each snapshot |
| Document write | $0.18/100K | Pixel events + visitor upserts are primary drivers |
| Document delete | $0.02/100K | Minimal for ArkData |
| Storage | $0.18/GB/month | Grows with visitor + event count |

- **Concern:** Dual-write (Firestore + PostgreSQL) doubles write costs. analytics-sync reads from Firestore listeners add read costs.
- **Mitigation:** Batch writes where possible. Consider write-through cache pattern.

---

## 6. Conflicting Information

### 6.1 Vite vs Next.js

- **MEMORY.md states:** "Next.js App Router" as target
- **Monorepo implements:** Vite + React SPA
- **Resolution needed:** Decide shipping path. See discovery.md Q20.

### 6.2 analytics-sync Architecture

- **Terraform:** Defines analytics-api as a Cloud Run service with Pub/Sub push endpoint
- **Implementation:** analytics-sync is a long-lived Firestore listener process (not push-based)
- **Conflict:** The Terraform push subscription to `/api/sync/identity` implies analytics-api handles sync, but the actual sync logic is in analytics-sync with onSnapshot listeners
- **Resolution needed:** Clarify whether sync is push-driven (Pub/Sub) or listener-driven (Firestore onSnapshot). Both exist in code.

### 6.3 Entity Count

- **firebase-sdk:** 87 entity types mapped to Firestore collections
- **PostgreSQL schema:** 6 tables only
- **Gap:** Most of the 87 entities (dashboards, onboarding, billing, workflows, etc.) exist only in Firestore with no PostgreSQL equivalent. This is likely intentional (only visitor/event/analytics data needs SQL), but should be confirmed.
