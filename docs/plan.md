# ArkData Platform — Implementation Plan

> Phased task breakdown with acceptance criteria.
> Each phase has entry/exit conditions. Tasks numbered for reference in progress.md.
> Last updated: 2026-02-09

---

## Phase 0: Foundation & Monorepo Scaffold
**Entry condition:** Source repos analyzed, architecture decisions documented.
**Exit condition:** All scaffolding tasks pass acceptance criteria. Monorepo builds cleanly.

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 0.1 | Create ArkDataShaw/arkdata monorepo | Turborepo + pnpm workspace, apps/packages/services structure, clean `pnpm install` |
| 0.2 | Define shared-types package | Visitor (75+ fields), Event, Tenant, Pixel, Common types. Exported via index.ts. |
| 0.3 | Build firebase-sdk (base44 drop-in) | Auth module (login/logout/me), entity proxy (list/filter/get/create/update/delete/subscribe), tenant-scoped queries. Import-compatible with `@base44/sdk`. |
| 0.4 | Port ui-components package | 6+ chart components from VizyTemplate. ChartColorContext. All export cleanly. |
| 0.5 | PostgreSQL schema | Tables: tenants, users, visitors, events, resolution_log, pixels, sessions. Indexes on tenant_id + query patterns. Migration runs cleanly on PG15. |
| 0.6 | Terraform IaC | Cloud Run (3 services), CloudSQL, Firestore, Pub/Sub (3 topics + DLQ), GCS (2 buckets), IAM. `terraform plan` succeeds. |
| 0.7 | Firestore security rules | 5-tier RBAC, tenant-scoped, server-only event writes. Rules deploy to emulator. |
| 0.8 | Firebase emulator config | Auth, Firestore, Hosting, Pub/Sub, UI. `firebase emulators:start` works. |

---

## Phase 1: Backend Services
**Entry condition:** Phase 0 complete. Shared types and firebase-sdk available.
**Exit condition:** All services pass unit tests. End-to-end pixel→identity→sync pipeline works against Firebase emulators.

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 1.1 | pixel-ingest service | POST /v1/ingest/:pixelId accepts events, validates via Zod, writes to Firestore, publishes to Pub/Sub, upserts visitor. Returns 200 with {processed} count. |
| 1.2 | identity-resolution service | Subscribes to raw-events topic. Runs 5-strategy matcher. Updates visitor identity_status. Writes resolution_log entry. Publishes to identity-updates. |
| 1.3 | analytics-sync service | Listens to Firestore visitor/event changes. UPSERTs to PostgreSQL with COALESCE merge. Events are INSERT-only. |
| 1.4 | analytics-api service | REST endpoints: GET /visitors (paginated, filtered), GET /visitors/:id, GET /analytics/summary, GET /export/:format. Queries PostgreSQL. Returns JSON or file stream. |
| 1.5 | pixel-automation service | Pixel generation via Simple Audience API/Selenium. CRUD pixel configurations. Store credentials securely. |

---

## Phase 2: Web Application (Frontend)
**Entry condition:** Phase 1 complete. Backend APIs available (at least via emulators).
**Exit condition:** All MVP pages render with real data from Firestore. Navigation works. Auth flow complete.

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 2.1 | App shell | Routing, auth gate, layout (sidebar + topbar), responsive. Login/logout works. |
| 2.2 | Shared UI components | shadcn/ui installed. DataTable, MetricCard, IntentScore, StatusBadge work standalone. |
| 2.3 | Shared app components | Chart wrappers, billing components, dashboard components render with sample data. |
| 2.4 | Home page | Overview metrics (total visitors, events, identified %), recent activity feed, quick actions. |
| 2.5 | Visitors page | Paginated table with search/filter. Columns: name, email, company, status, intent score, last seen. Click → VisitorDetail. |
| 2.6 | VisitorDetail page | Full visitor profile. Identity fields, company info, demographics. Event timeline. Resolution log. |
| 2.7 | Companies page | Aggregated company view. Company name, domain, visitor count, avg intent score. Drill-down to visitors. |
| 2.8 | Analytics page | Time-series charts: visitors over time, events by type, top pages, top referrers. Date range selector. |
| 2.9 | Sessions page | Session list with duration, page count, event count. Filter by visitor, date range. |
| 2.10 | Dashboards + DashboardBuilder | Create custom dashboards with widget builder. Save/load. Share with collaborators. |
| 2.11 | Integrations page | List connected integrations. Connect new (Multiwoven-powered). Sync status + history. |
| 2.12 | Billing page | Current plan display. Usage metrics. Upgrade/downgrade. Stripe integration. |
| 2.13 | Admin pages | Tenant management, user CRUD, security settings, logs, health dashboard. Super_admin only. |
| 2.14 | Onboarding flow | Step-by-step wizard: create tenant → add pixel → verify data → invite team. |
| 2.15 | Reports + Exports | Scheduled reports. CSV/PDF export. Powered by analytics-api. |

---

## Phase 3: Infrastructure & Deployment
**Entry condition:** Phase 1 + Phase 2 MVP pages complete and tested against emulators.
**Exit condition:** All services running on GCP. Firebase deployed. PostgreSQL migrated. DNS configured.

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 3.1 | GCP project setup | Project created, billing enabled, APIs enabled. Service accounts created. |
| 3.2 | Terraform apply (dev) | `terraform apply` succeeds. All resources created. Outputs captured. |
| 3.3 | Firebase project init | Firebase project linked to GCP. Auth providers configured. Firestore rules deployed. |
| 3.4 | Docker builds | Dockerfiles build for pixel-ingest, identity-resolution, analytics-api. Images pushed to Artifact Registry. |
| 3.5 | Cloud Run deployment | All 3 services running. Health checks passing. Environment variables configured. |
| 3.6 | PostgreSQL migration | 001_initial.sql applied. Tables created. Indexes verified. Connection from Cloud Run confirmed. |
| 3.7 | DNS + custom domain | Custom domain pointing to Firebase Hosting (web) and Cloud Run (API). SSL certificates provisioned. |

---

## Phase 4: Integration & Testing
**Entry condition:** Phase 3 complete. All services running on GCP.
**Exit condition:** Full pipeline works end-to-end. Data flows from pixel to dashboard.

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 4.1 | E2E pixel ingest test | Pixel JS snippet on test page → event appears in Firestore + PostgreSQL within 30s. |
| 4.2 | Identity resolution test | Anonymous visitor resolves to identified profile after form submit (email match). Resolution log shows match. |
| 4.3 | Firestore→PostgreSQL sync | Visitor created in Firestore appears in PostgreSQL within 5s. Fields match. |
| 4.4 | Multiwoven integration | PostgreSQL configured as Multiwoven source. Test sync to Google Sheets succeeds. |
| 4.5 | auto_pixel data migration | Existing MariaDB data exported and imported to PostgreSQL. Row counts match. No data loss. |

---

## Phase 5: Polish & Launch
**Entry condition:** Phase 4 complete. End-to-end pipeline verified.
**Exit condition:** Production environment live. Monitoring active. First tenant onboarded.

| # | Task | Acceptance Criteria |
|---|------|-------------------|
| 5.1 | Production Terraform apply | Production environment provisioned. HA enabled. Backups configured. |
| 5.2 | Monitoring + alerting | Cloud Monitoring dashboards for all services. Alerts for: service down, error rate > 5%, DLQ messages > 0. |
| 5.3 | Cold storage lifecycle | Events older than 90 days archived to GCS. Lifecycle rules verified. |
| 5.4 | Onboarding E2E | New tenant signup → pixel install → first data → dashboard view. Under 10 minutes. |
| 5.5 | Billing integration | Stripe checkout for plan upgrades. Usage-based billing for event volume. Invoices generated. |
