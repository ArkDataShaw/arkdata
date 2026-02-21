# ArkData Platform — Discovery Q&A

> Living transcript of scope, constraints, and requirements.
> Questions marked [ANSWERED] have confirmed answers. [OPEN] need user input.
> Last updated: 2026-02-09

---

## 1. Product Vision & Scope

**Q1.** [ANSWERED] What is ArkData in one sentence?
**A:** A multi-tenant visitor intelligence platform that ingests pixel tracking events, resolves anonymous visitors to identities, and activates that data through integrations and analytics dashboards.

**Q2.** [ANSWERED] Who are the primary users?
**A:** B2B SaaS companies who install a tracking pixel on their website and want to identify anonymous visitors, enrich their profiles (company, demographics, contact info), and push that data to CRMs/marketing tools.

**Q3.** [OPEN] What is the go-to-market timeline? Is there a hard launch date or demo date driving priority decisions?

**Q4.** [OPEN] How many tenants do you expect at launch? 1 (internal)? 5? 50? This affects infrastructure sizing and multi-tenancy edge cases.

**Q5.** [OPEN] Is there an existing customer base from the current auto_pixel system that will migrate to ArkData, or is this greenfield acquisition?

---

## 2. Source Systems & Data

**Q6.** [ANSWERED] What are the source repos being consolidated?
**A:** Five repos:
1. ark-data (noahmonks) — Founder's frontend on Base44/Vite/React
2. auto_pixel (ShawCole) — PHP+Node pixel automation, MariaDB on GCP
3. multiwoven (ShawCole) — Open-source Reverse ETL (Ruby/React)
4. VizyTemplate_v2 (ShawCole) — Recharts visualization dashboard
5. intent-insight-nexus (ShawCole) — Supabase-based visitor viewer

**Q7.** [ANSWERED] What's the current pixel data volume?
**A:** auto_pixel has superpixel_visitors (~75 cols, idempotent) and superpixel_resolution_log (~80 cols, append-only) on MariaDB at 34.26.61.148. Exact row counts unknown — needs investigation.

**Q8.** [OPEN] What is the expected daily event volume at steady state? 10K? 100K? 1M+ events/day? This determines Cloud Run scaling, Pub/Sub throughput, and PostgreSQL sizing.

**Q9.** [OPEN] Are there data retention compliance requirements (GDPR, CCPA)? The 90-day raw event retention + cold storage plan — is that driven by cost or regulation?

**Q10.** [OPEN] The current auto_pixel uses Simple Audience as the pixel provider. Will ArkData support additional providers (e.g., Bombora, 6sense, Clearbit), or is Simple Audience the only planned provider?

---

## 3. Identity Resolution

**Q11.** [ANSWERED] What identity resolution strategies are implemented?
**A:** Five strategies in confidence order:
1. HEM SHA256 (0.95) — hashed email match from pixel provider
2. Email exact (0.90) — personal or business email
3. Phone exact (0.80) — mobile/direct/personal, normalized
4. Name + Company domain (0.70) — case-insensitive
5. IP + User Agent (0.50) — 30-minute session window

**Q12.** [OPEN] Is there a plan for probabilistic/ML-based matching, or will the deterministic pipeline remain the only approach? The confidence scores suggest room for a scoring model.

**Q13.** [OPEN] How should identity conflicts be handled? If visitor A (email) and visitor B (phone) resolve to the same person, do we merge profiles? What about data from different tenants?

**Q14.** [OPEN] Should there be a manual review queue for low-confidence matches (0.50-0.70), or is auto-accept fine for all confidence levels?

---

## 4. Multi-Tenancy & RBAC

**Q15.** [ANSWERED] What are the RBAC roles?
**A:** Five roles: super_admin, tenant_admin, analyst, operator, read_only. Permissions enforced at Firestore rules level.

**Q16.** [OPEN] Can a user belong to multiple tenants? The current schema has a single tenant_id per user. Is cross-tenant access needed (e.g., agency model)?

**Q17.** [OPEN] Who provisions new tenants? Is there a self-service signup, or is it admin-created only?

**Q18.** [OPEN] What happens when a trial expires? Hard lockout? Read-only mode? Grace period?

---

## 5. Frontend & UX

**Q19.** [ANSWERED] What's the target frontend stack?
**A:** Next.js App Router + Tailwind v4 + shadcn/ui + MagicUI + Recharts. Currently scaffolded as Vite/React SPA.

**Q20.** [OPEN] The monorepo currently uses Vite/React (apps/web), but the target architecture says Next.js App Router. When does the migration happen? Is it a priority, or ship with Vite first?

**Q21.** [OPEN] 34 pages are registered in pages.config.js. Which pages are MVP-critical vs. nice-to-have? Suggest prioritizing: Home, Visitors, VisitorDetail, Companies, Analytics, Integrations, Billing.

**Q22.** [OPEN] The ark-data (noahmonks) frontend has 40 pages already built on Base44. How much of that UI should be ported vs. rebuilt? Are there screenshots or a Figma for the desired look?

---

## 6. Integrations & Destinations

**Q23.** [ANSWERED] How will data activation work?
**A:** Multiwoven (open-source Reverse ETL) as the integration/destination layer. Supports Salesforce, HubSpot, Slack, Google Sheets, BigQuery, etc.

**Q24.** [OPEN] Is Multiwoven being self-hosted (Docker) or used as a managed service? Where will it run — same GCP project, separate?

**Q25.** [OPEN] Which integrations are must-have at launch? Salesforce? HubSpot? Google Sheets? Slack notifications?

**Q26.** [OPEN] Does the existing auto_pixel Google Sheets sync need to keep working during migration, or can it be cut over?

---

## 7. Infrastructure & Deployment

**Q27.** [ANSWERED] What's the target infrastructure?
**A:** Firebase Auth + Firestore + Cloud Run/Functions + Pub/Sub + GCS + PostgreSQL, all on GCP. Terraform IaC.

**Q28.** [OPEN] Is there an existing GCP project, or does one need to be created? What's the project ID?

**Q29.** [OPEN] CI/CD pipeline — GitHub Actions? Cloud Build? What triggers deploys?

**Q30.** [OPEN] Environment strategy — dev/staging/production? The Terraform supports all three via the `environment` variable.

---

## 8. Success Criteria

**Q31.** [OPEN] What does "done" look like for a v1 launch? Define 3-5 acceptance criteria.

**Q32.** [OPEN] What's the single most important thing to get working first?

**Q33.** [OPEN] Are there existing customers/demos that need specific features by specific dates?

---

## 9. Assumptions to Challenge

**Q34.** [OPEN] The dual-storage pattern (Firestore primary + PostgreSQL warm cache) adds complexity. Is Firestore truly needed for the primary store, or would PostgreSQL alone suffice? Firestore gives real-time listeners and Firebase Auth integration — is that worth the sync overhead?

**Q35.** [OPEN] 87 entity types are mapped in the firebase-sdk. Many appear to be forward-looking (DataCleanupRun, QuarantineSnapshot, UIConfigHistory). Should we trim to only what's needed for v1?

**Q36.** [OPEN] The Vite→Next.js migration is a significant lift. Shipping with Vite first and migrating later risks throwaway work. What's the calculus here?

**Q37.** [OPEN] Cloud Run scale-to-zero for pixel-ingest means cold starts on first request after idle. For a tracking pixel, latency matters. Should min instances = 1 in production?

**Q38.** [OPEN] The CloudSQL instance (db-custom-2-7680) is production-grade from day one. For dev/staging, should we use a smaller tier to reduce costs?
