# ArkData Platform — Decision Log

> Running log of every significant decision.
> Format: decision, alternatives considered, reasoning, date.
> Prevents context-window drift where a fresh agent reverses earlier choices.
> Last updated: 2026-02-09

---

## D-001: Turborepo + pnpm monorepo structure
**Date:** 2026-02-09
**Decision:** Use Turborepo with pnpm workspaces for the monorepo.
**Alternatives:** Nx, Lerna, yarn workspaces, separate repos.
**Reasoning:** Turborepo is lightweight, fast (incremental builds + caching), and works well with pnpm's strict dependency isolation. Nx was considered but adds more overhead for our repo size. Separate repos would break atomic type sharing across services.

## D-002: Firestore as primary store + PostgreSQL as analytical cache
**Date:** 2026-02-09
**Decision:** Dual-storage: Firestore for real-time operations, PostgreSQL for analytics/joins.
**Alternatives:** PostgreSQL only, Firestore only, Supabase (Postgres + real-time).
**Reasoning:** Firestore provides real-time listeners (live feeds, dashboard updates) and integrates natively with Firebase Auth custom claims for tenant isolation. PostgreSQL provides SQL JOIN support needed for analytics dashboards and complex queries. The sync overhead is acceptable given the clear separation of concerns. Supabase was considered but doesn't offer the same GCP-native integration.

## D-003: Firebase Auth with custom claims for RBAC
**Date:** 2026-02-09
**Decision:** Use Firebase Auth with custom claims (tenant_id, role, is_service_account).
**Alternatives:** Auth0, Clerk, Supabase Auth, custom JWT.
**Reasoning:** Firebase Auth is free tier generous (50K MAU), integrates directly with Firestore security rules, and supports Google OAuth out of the box. Custom claims (1000 byte limit) are sufficient for tenant_id + role. No external auth provider dependency.

## D-004: 5-strategy deterministic identity resolution
**Date:** 2026-02-09
**Decision:** Deterministic matching only, 5 strategies in confidence order (HEM→Email→Phone→Name+Company→IP+UA).
**Alternatives:** Probabilistic/ML matching, graph-based identity resolution, third-party resolution service (LiveRamp, Amperity).
**Reasoning:** B2B use case prioritizes precision over recall. False positives (merging wrong visitors) are costlier than false negatives (missing a match). Deterministic matching is auditable, explainable, and doesn't require training data. ML-based can be added later as a 6th strategy.

## D-005: COALESCE upsert pattern (never overwrite with blanks)
**Date:** 2026-02-09
**Decision:** Only fill empty fields; never overwrite existing non-null values with blank/null from incoming data.
**Alternatives:** Last-write-wins, timestamp-based merge, manual conflict resolution.
**Reasoning:** Pixel events provide partial data (each event may have different fields populated). Last-write-wins would cause data regression when a subsequent event lacks a field that a previous event populated. COALESCE is simple, predictable, and used by Segment/mParticle for the same reason.

## D-006: Cloud Run with scale-to-zero for all services
**Date:** 2026-02-09
**Decision:** All backend services on Cloud Run with min instances = 0.
**Alternatives:** GKE (Kubernetes), Cloud Functions, always-on Compute Engine VMs.
**Reasoning:** Cost efficiency for a startup — pay only for actual request processing. Cold starts (~2-5s) are acceptable for identity-resolution and analytics-sync (async). Pixel-ingest cold start may need min=1 in production (see discovery.md Q37).

## D-007: Pub/Sub for inter-service communication
**Date:** 2026-02-09
**Decision:** Cloud Pub/Sub topics (raw-events, identity-updates, sync-requests) with push subscriptions to Cloud Run.
**Alternatives:** Direct HTTP calls between services, Cloud Tasks, Redis Streams, Kafka.
**Reasoning:** Pub/Sub decouples services (pixel-ingest doesn't need to know about identity-resolution), provides at-least-once delivery, and DLQ for failed messages. Push subscriptions integrate natively with Cloud Run. Kafka is overkill for current volume.

## D-008: firebase-sdk as base44 drop-in replacement
**Date:** 2026-02-09
**Decision:** Build @arkdata/firebase-sdk with the same API surface as @base44/sdk to enable zero-migration-cost page porting.
**Alternatives:** Rewrite all pages to use Firebase SDK directly, use a different abstraction layer, keep base44.
**Reasoning:** 40+ pages in ark-data use `base44.entities.X.list()` pattern extensively. Matching this API means page components can be copied with only an import change. The entity proxy abstraction (87 entities) provides this compatibility.

## D-009: Ship with Vite first, migrate to Next.js later
**Date:** 2026-02-09 (PENDING CONFIRMATION — see discovery.md Q20)
**Decision:** Keep current Vite + React SPA for v1 launch.
**Alternatives:** Migrate to Next.js App Router now, use both (Next.js for marketing + Vite for app).
**Reasoning:** The ark-data frontend is already Vite-based. Migrating to Next.js before shipping adds risk and delays. Next.js migration can happen post-launch when SSR/SEO becomes important for marketing pages.

## D-010: GCS lifecycle tiering for cold event storage
**Date:** 2026-02-09
**Decision:** Standard → Nearline (90d) → Coldline (180d) for raw events in GCS.
**Alternatives:** Keep in PostgreSQL, use BigQuery, delete after retention period.
**Reasoning:** Raw events are write-once, rarely read after 90 days. GCS lifecycle rules automate cost reduction. BigQuery is more expensive for simple archival. Keeping in PostgreSQL would bloat the analytical DB.

## D-011: Single shared PostgreSQL instance (tenant_id column isolation)
**Date:** 2026-02-09
**Decision:** All tenants share one PostgreSQL instance, isolated by tenant_id column + indexes.
**Alternatives:** Schema-per-tenant, database-per-tenant, separate instances.
**Reasoning:** Cost-effective for <100 tenants. Row-level security can be added later if needed. Tenant_id indexes ensure query performance. Separate databases would complicate analytics-sync and increase CloudSQL costs.

## D-012: Zod for runtime validation at ingestion boundary
**Date:** 2026-02-09
**Decision:** Use Zod schemas to validate pixel event payloads in pixel-ingest.
**Alternatives:** JSON Schema (ajv), io-ts, manual validation, no validation.
**Reasoning:** Zod provides TypeScript type inference from schemas (single source of truth for types + validation). It's fast enough for the ingestion hot path. Validation at the boundary prevents garbage data from propagating through the pipeline.
