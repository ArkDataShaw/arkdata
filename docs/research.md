# ArkData Platform — Domain Research

> Research findings mapped to project components. Sources cited.
> Conflicting information flagged explicitly.
> Last updated: 2026-02-24

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

---

## 7. Competitive Landscape — Website Visitor Identification / Deanonymization

> Comprehensive analysis of competitors in the website visitor identification space.
> Research date: 2026-02-24. Pricing and features verified against latest available information.

### 7.1 Market Overview

The website visitor identification market is valued at approximately **$3.55 billion** and is projected to reach **$10 billion by 2032**. The fundamental driver: **97% of B2B website visitors leave without converting**, creating massive demand for deanonymization tools.

The market divides along two key axes:

| Axis | Options |
|------|---------|
| **Target market** | B2B-only vs. B2B+B2C vs. B2C/eCommerce-only |
| **Resolution level** | Company-level (IP-to-company) vs. Person-level (individual identification) |

Company-level identification via reverse IP lookup is the established approach with 30-65% match rates. Person-level identification is the emerging frontier, achieving 5-40% match rates depending on geography (US-only is common) and data sources.

---

### 7.2 Competitor Profiles

#### 7.2.1 Clearbit Reveal (now HubSpot Breeze Intelligence)

- **Website:** [hubspot.com/products/clearbit](https://www.hubspot.com/products/clearbit)
- **Acquired by:** HubSpot (November 2023). As of April 2026, all free Clearbit tools shut down; now requires paid HubSpot subscription.
- **Approach:** B2B only, **company-level** identification
- **How it works:** IP-to-company resolution providing 100+ firmographic attributes per identified company (industry, employee count, revenue, location, tech stack)
- **What it resolves:** Company identity, firmographics, technographics. Does NOT identify individuals.
- **Pricing:**
  - Breeze Intelligence starts at $45/mo (100 credits, annual billing) on top of HubSpot subscription (min $30/mo)
  - Full Reveal functionality: $12,000-$20,000/year for enterprise, scaling with monthly traffic
  - Credit-based consumption model
- **Key integrations:** HubSpot (native/deep), Salesforce, Marketo. Post-acquisition, non-HubSpot integrations are weakening.
- **Strengths:** Excellent data quality for company enrichment. 100+ attributes per company. Deep HubSpot native integration. Strong brand recognition.
- **Weaknesses:** No person-level identification. Now locked into HubSpot ecosystem. Free tier eliminated. Credit system can get expensive at scale. No standalone product anymore.
- **Market positioning:** Enrichment-first platform now embedded in HubSpot's GTM suite. Best for existing HubSpot customers needing company-level visitor intel.

#### 7.2.2 6sense

- **Website:** [6sense.com](https://6sense.com/platform/account-matching/anonymous-website-visitor-identification/)
- **Approach:** B2B only, **company-level** identification + intent data + predictive analytics
- **How it works:** Matches IP addresses and digital fingerprints to company records. Aggregates third-party intent data from across the web (content consumption, search behavior, engagement patterns across thousands of B2B sites).
- **What it resolves:** Company identity, buying stage, intent signals, predictive scoring (likelihood to buy)
- **Pricing:**
  - Median buyer pays ~$55,211/year (Vendr data)
  - Range: $60,000-$130,000+/year depending on customization
  - No transparent pricing; custom quotes only
  - Long lock-in periods
- **Key integrations:** Salesforce (native, bi-directional), HubSpot, Microsoft Dynamics, Marketo, Eloqua, Outreach, Drift
- **Strengths:** Best-in-class intent data aggregation. Predictive buying stage models trained on historical deal data. Strong ABM orchestration. Broad third-party intent signal coverage.
- **Weaknesses:** Very expensive. Opaque pricing with hidden credit usage costs. Complex implementation. Steep learning curve. No person-level identification. Long contracts.
- **Market positioning:** Enterprise ABM platform for large sales/marketing orgs. Competes primarily with Demandbase for ABM budgets.

#### 7.2.3 Demandbase

- **Website:** [demandbase.com](https://www.dealfront.com/web-visitors/)
- **Approach:** B2B only, **company-level** identification + ABM + advertising
- **How it works:** Uses cookies, IP addresses, third-party IDs, device IDs, and public VPN/ZTNA providers. ML predicts additional identifications. Processes 18+ billion signals daily.
- **What it resolves:** Company identity, firmographics, intent signals, engagement scoring, advertising targeting
- **Pricing:**
  - Small businesses (~200 employees): $18K-$32K/year
  - Mid-market (~1,000 employees): $43K-$61K/year
  - Enterprise: $100K+/year
  - Median (Vendr): ~$65K/year
  - $1,500-$3,000 per user annually depending on tier
  - Modular pricing (pick modules you need)
- **Key integrations:** Salesforce, HubSpot, Microsoft Dynamics 365, Marketo, Adobe Marketing Cloud, Oracle Eloqua, LinkedIn Ads, Google Ads
- **Strengths:** Strong account-based advertising capabilities. Excellent for ABM orchestration. Deep CRM integrations. Website personalization features. Good intent data. Modular so you can buy what you need.
- **Weaknesses:** Expensive. VPN/shared IP matching can produce false positives. Company-level only. Complex platform with steep onboarding. No person-level identification.
- **Market positioning:** Enterprise ABM platform competing directly with 6sense. Stronger on advertising/personalization side.

#### 7.2.4 Leadfeeder (now Dealfront)

- **Website:** [dealfront.com/web-visitors](https://www.dealfront.com/web-visitors/) / [leadfeeder.com](https://www.leadfeeder.com/)
- **Approach:** B2B only, **company-level** identification. Merged with Echobot to form Dealfront (Europe-centric).
- **How it works:** Maps IP addresses to proprietary, continuously updated company database. Shows which orgs are browsing, what content they consume, how engaged they are.
- **What it resolves:** Company identity, firmographics (industry, headcount, geography, revenue), engagement metrics, acquisition source
- **Pricing:**
  - Free Lite plan: 7 days of history, up to 100 identified companies
  - Paid: starts at EUR 99/mo (annual) or EUR 165/mo (monthly) for 50 identified companies
  - Scales with volume of identified companies
  - Enterprise pricing available
- **Key integrations:** Salesforce, HubSpot, Pipedrive, Microsoft Dynamics, Slack, Google Analytics, Zapier. Two-way CRM sync.
- **Strengths:** Strong European company database (GDPR-compliant). Affordable entry point. Good CRM integrations. Free tier for testing. Unlimited visitor data storage. Form/video/download tracking.
- **Weaknesses:** Company-level only. European focus may mean weaker US data vs. US competitors. Free tier very limited (7 days). Dealfront rebrand has caused some confusion.
- **Market positioning:** Mid-market B2B lead gen tool, especially strong in Europe. Most accessible entry point for companies starting with visitor identification.

#### 7.2.5 Visitor Queue

- **Website:** [visitorqueue.com](https://www.visitorqueue.com/)
- **Approach:** B2B, **company-level** identification + website personalization
- **How it works:** Identifies companies visiting your website, provides employee contact details (email, phone, LinkedIn), and offers website personalization based on firmographic data.
- **What it resolves:** Company identity, employee contacts, engagement analytics (pages viewed, time on page, acquisition source)
- **Pricing:**
  - Starts at $39/mo for 100 unique companies
  - Scales to $2,299/mo for 40,000 unique companies
  - 14-day free trial
  - Identifies ~30% of website visitors as companies
- **Key integrations:** Salesforce, HubSpot, Slack, Zapier
- **Strengths:** Very affordable. Website personalization feature (show custom content based on visitor company/location/size). Simple interface. Good for SMBs.
- **Weaknesses:** Lower match rates than enterprise tools. Limited intent data. Company-level only. Fewer integrations than larger competitors.
- **Market positioning:** Budget-friendly B2B visitor identification for SMBs. Differentiates with website personalization feature.

#### 7.2.6 Warmly

- **Website:** [warmly.ai](https://www.warmly.ai/)
- **Approach:** B2B, **company-level + partial person-level** identification + AI-powered engagement
- **How it works:** Uses multiple data sources for identification (claims ~65% company-level, ~15% person-level). Monitors intent signals (job changes, content engagement). AI chatbot engages visitors in real-time.
- **What it resolves:** Company identity, partial individual identity, intent signals, buying readiness
- **Pricing:**
  - Free forever: 500 monthly visitors, ICP filters, basic lead routing
  - Data Only: $499/mo monthly or $4,000/year annual for 5,000 monthly visitors
  - Full platform (with AI chat, orchestration): ~$700+/mo
- **Key integrations:** Salesforce, HubSpot, Outreach, Slack, LinkedIn, email platforms
- **Strengths:** AI chatbot for real-time visitor engagement. Automated multi-channel outreach (email, LinkedIn, chat). Free tier is generous. Combines identification with action (not just data). Person-level identification (limited).
- **Weaknesses:** Person-level match rate is low (~15%). AI chatbot quality varies. Newer entrant, less proven at scale. Premium features get expensive.
- **Market positioning:** "Signal-to-action" platform. Differentiates by combining identification with automated engagement. Targets startups and SMBs wanting an all-in-one solution.

#### 7.2.7 Factors.ai

- **Website:** [factors.ai](https://www.factors.ai/)
- **Approach:** B2B, **company-level** identification + analytics + attribution
- **How it works:** Waterfall model combining four data sources (6sense, Clearbit, Demandbase, Snitcher) for 75%+ company-level match rate. Geo-location and job title triangulation for ~30% individual visitor identification.
- **What it resolves:** Company identity, firmographics, web/funnel analytics, multi-touch attribution, LinkedIn/Google ad optimization
- **Pricing:**
  - Free: $0 forever, 200 companies/month, 3 seats
  - Basic: $399/mo (annual), 3,000 companies/month, 5 seats
  - Growth: ~$15,000/year (custom quote)
  - Each additional 500 accounts: $100/mo
- **Key integrations:** Salesforce, HubSpot, G2 (buyer intent), LinkedIn Ads, Google Ads, Slack, Segment
- **Strengths:** Waterfall enrichment model (multiple sources = higher match rates). Strong analytics and attribution. G2 buyer intent integration. SOC 2 Type II and ISO 27001 certified. Good free tier.
- **Weaknesses:** Per-account overage costs add up. Analytics focus may be overkill for teams wanting just identification. Newer platform.
- **Market positioning:** Analytics-first B2B platform that combines visitor identification with attribution and ad optimization. Best for marketing teams wanting unified analytics + identification.

#### 7.2.8 Albacross

- **Website:** [albacross.com](https://www.albacross.com/)
- **Approach:** B2B, **company-level** identification + automated outreach
- **How it works:** Claims largest proprietary IP-to-company mapping database globally. Enriches with 100+ B2B attributes. AI analyzes 100+ buying intent signals.
- **What it resolves:** Company identity, firmographics, intent signals, buying readiness
- **Pricing:**
  - Self-Service: starts at EUR 79/mo
  - Advanced tiers: EUR 120-160/mo (annual billing)
  - 14-day free trial, no free plan
- **Key integrations:** Salesforce, HubSpot, Pipedrive, Slack, Zapier, LinkedIn Ads, Google Ads
- **Strengths:** Strong European IP database. Automated email + LinkedIn outreach sequences built-in. 90-day lead history retention. Good pricing for European market. White-label available for agencies.
- **Weaknesses:** Company-level only. Smaller presence in US market. Less advanced analytics than Factors.ai or 6sense. Limited intent data compared to enterprise players.
- **Market positioning:** European B2B visitor identification with built-in outreach automation. Competes with Leadfeeder/Dealfront in European market. Agency-friendly with white-label.

#### 7.2.9 Lead Forensics

- **Website:** [leadforensics.com](https://www.leadforensics.com/)
- **Approach:** B2B only, **company-level** identification
- **How it works:** Reverse IP lookup enriched with B2B contact data. Real-time notifications when ICP-matching leads visit. Lead scoring and keyword tracking.
- **What it resolves:** Company identity, contact details (of company employees, not the specific visitor), keyword/traffic sources
- **Pricing:**
  - No published pricing. Custom quotes only.
  - Estimated range: $200-$2,000+/month based on traffic
  - Contact add-ons: $2-$5 per contact
  - Two plans: Essential (SMB) and Automate (advanced workflows, CRM integrations, fuzzy matching)
- **Key integrations:** Salesforce, HubSpot, Pipedrive, Microsoft Dynamics, Zapier
- **Strengths:** One of the oldest players (established brand). Real-time alerts. Lead scoring. Customizable dashboards.
- **Weaknesses:** Cannot identify individuals (only companies). Opaque pricing. Aggressive sales tactics reported by users. Dated UI compared to newer tools. Long contracts.
- **Market positioning:** Legacy B2B visitor identification platform. Strong brand but losing ground to newer, more transparent competitors.

#### 7.2.10 Customers.ai (formerly MobileMonkey)

- **Website:** [customers.ai](https://customers.ai/)
- **Approach:** B2B+B2C, **person-level** identification
- **How it works:** X-Ray Pixel for identity resolution. Connects anonymous visitors to real-world profiles (names, emails, phone numbers). AI audience agent ("Alfred") trains on your data daily to predict likely buyers.
- **What it resolves:** Individual identity (name, email, phone), on-site behavior, predicted purchase likelihood
- **Pricing:**
  - 7-day free trial (500 visitor contacts, X-Ray Pixel, ad retargeting)
  - Pro: starts at ~$49/mo, scales with contacts
  - Enterprise: custom pricing for larger ecommerce brands
- **Key integrations:** Klaviyo, Mailchimp, Salesforce, HubSpot, Google Ads, Meta Ads, Shopify
- **Strengths:** Person-level identification. B2C capable. AI-powered audience prediction. Claims 2-7x more accurate than competitors. Affordable entry price. Ad retargeting audience recovery.
- **Weaknesses:** Pivoted from chatbot (MobileMonkey) to visitor ID -- some brand confusion. Accuracy claims hard to verify independently. US-focused for person-level ID.
- **Market positioning:** eCommerce-friendly person-level identification. Bridge between B2B tools and B2C/DTC needs. Competes with Opensend and Retention.com for eCommerce market.

#### 7.2.11 RB2B

- **Website:** [rb2b.com](https://www.rb2b.com/)
- **Approach:** B2B, **person-level** identification (US only)
- **How it works:** Captures LinkedIn profiles of individual website visitors in real-time. Real-time Slack push notifications.
- **What it resolves:** Individual name, job title, LinkedIn URL, business email (US visitors only)
- **Pricing:**
  - Free: 150 monthly identification credits
  - Pro: starts at $99-$149/mo for 150 contacts + integrations (CSV downloads, CRM pushes)
  - Pro+: Premium Resolution with multiple data sources for 70-80% identification rate (US + international)
- **Key integrations:** Slack (primary), CRM systems, CSV export
- **Strengths:** Person-level identification (40-45% standard, 70-80% with Pro+). LinkedIn profile capture is unique and actionable. Free tier. Simple setup. Real-time Slack alerts are highly engaging.
- **Weaknesses:** US-only for person-level (GDPR avoided by not processing EU data). Limited integrations vs. enterprise tools. No intent data beyond on-site behavior. No analytics/attribution. Relatively new.
- **Market positioning:** Disruptive person-level B2B identification. The tool that made "person-level" mainstream. Best for sales teams wanting immediate, actionable individual leads via Slack.

#### 7.2.12 Opensend

- **Website:** [opensend.com](https://www.opensend.com/)
- **Approach:** B2B+B2C, **person-level** identification (consumer-focused)
- **How it works:** Proprietary identity graph covering 200M+ US consumer profiles. Processes 1.2 billion daily events from 100K+ US sites. Cross-device tracking with bot filtering.
- **What it resolves:** Individual consumer identity (email, phone), cross-device profiles, lead scoring
- **Pricing:**
  - $0.21-$0.25 per identity (Opensend Connect)
  - Starting at $500/mo for full platform
  - 180M US consumer profile network
- **Key integrations:** Klaviyo, Attentive, Mailchimp, Shopify, major ESPs and SMS platforms
- **Strengths:** Strong B2C/eCommerce identity graph. Per-identity pricing is transparent. 25-35% anonymous visitor identification rate. Cross-device tracking. 2025 TrustRadius Buyer's Choice Award.
- **Weaknesses:** US-only for person-level. Consumer/eCommerce focus may not suit B2B. $500/mo minimum is steep for small stores.
- **Market positioning:** B2C/eCommerce identity resolution leader. Competes with Retention.com and Wunderkind for eCommerce budgets.

---

### 7.3 Additional Notable Players

#### 7.3.1 ZoomInfo (WebSights)

- **Approach:** B2B, company-level identification as part of massive sales intelligence platform
- **Pricing:** $15K-$47.5K+/year. No published pricing.
- **Differentiator:** Largest B2B contact database. WebSights is a feature within the platform, not a standalone product. Distinguishes verified company traffic from automated/bot traffic.
- **Website:** [zoominfo.com](https://www.zoominfo.com/features/identify-website-visitors)

#### 7.3.2 Retention.com

- **Approach:** B2C/eCommerce, person-level identification
- **Pricing:** $500-$2,500/mo (annual agreements). Hidden overage fees.
- **Differentiator:** Two products -- GROW (capture anonymous visitor emails) and Reclaim (identify missed abandonment events). 1,500+ eCommerce customers. 5-15x ROI reported. Identifies up to 35% of anonymous visitors.
- **Integrations:** Klaviyo, Salesforce, Iterable, Shopify, 80+ platforms
- **Website:** [retention.com](https://www.retention.com/)

#### 7.3.3 Identity Matrix

- **Approach:** B2B, person-level identification (US only)
- **Pricing:** Startup $149/mo (1,500 visitors, 75 reveals), Pro $849/mo (10,000 visitors, 500 reveals), Enterprise $10K-$20K+/year
- **Differentiator:** Claims to de-anonymize 50-70% of US web traffic to the individual level. Analyzes 5 trillion data points. 75% accuracy in mobile phone identification. Full page history and attribution.
- **Website:** [identitymatrix.ai](https://www.identitymatrix.ai/)

#### 7.3.4 Leadinfo

- **Approach:** B2B, company-level identification (European focus)
- **Pricing:** Starter $107/mo, Scale $226/mo, Pro $507/mo. Some sources say EUR 49/mo entry.
- **Differentiator:** Cookieless tracking (no cookies placed, pure IP-based). Screen recording feature. 70+ native integrations. GDPR-compliant by design. Recently merged with Visitor Queue.
- **Website:** [leadinfo.com](https://www.leadinfo.com/en/)

#### 7.3.5 Qualified

- **Approach:** B2B, company-level identification + AI SDR (chatbot/voice/video)
- **Pricing:** Minimum ~$42K/year. Custom enterprise pricing.
- **Differentiator:** AI SDR agent "Piper" engages visitors via chat, voice, video, and email. Deep Salesforce integration. Focused on pipeline generation, not just identification. Books meetings autonomously.
- **Website:** [qualified.com](https://www.qualified.com/)

#### 7.3.6 Wunderkind

- **Approach:** B2C/eCommerce, person-level identification (managed service)
- **Pricing:** $6,000-$60,000+/mo. Annual commitments $100K-$500K. Fully managed.
- **Differentiator:** Proprietary Identity Network recognizes 9 billion devices and 1 billion consumer profiles. 30-50% more identified profiles than leading ESPs. Fully managed revenue channel (not self-serve).
- **Website:** [wunderkind.co](https://www.wunderkind.co/)

#### 7.3.7 Snitcher

- **Approach:** B2B, company-level identification
- **Pricing:** Starts at $39/mo. Usage-based (per unique company identified). 14-day free trial.
- **Differentiator:** Auto-filters ISPs and irrelevant traffic (only pay for real leads). White-label for agencies. API access for custom integrations. GDPR-compliant. Very affordable.
- **Website:** [snitcher.com](https://www.snitcher.com/)

#### 7.3.8 Koala

- **Approach:** B2B, company-level + behavioral scoring
- **Pricing:** 14-day free trial. Business plan (contact sales).
- **Differentiator:** Lightweight JS SDK assigns persistent anonymous IDs. Connects anonymous history with known profiles when visitors reveal identity (form, email click, login). Real-time Slack alerts for high-intent patterns (pricing page visits, feature comparisons). Waterfall enrichment via Koala Prospector.
- **Website:** [getkoala.com](https://www.getkoala.com/)

#### 7.3.9 Kwanzoo

- **Approach:** B2B, person-level identification
- **Pricing:** Custom (contact sales)
- **Differentiator:** Access to 263M+ B2B professional profiles linked to first-party cookie IDs. Full contact info including work/personal email, LinkedIn URL, and mobile phone. AI campaign automation built-in.
- **Website:** [kwanzoo.com](https://www.kwanzoo.com/)

#### 7.3.10 Happier Leads / Leadpipe / Bullseye

- **Approach:** B2B+B2C, person-level identification (US-focused)
- **Happier Leads:** Claims 70% US person-level match rate via proprietary publisher network
- **Leadpipe:** Claims highest match rates in industry for both company and person-level
- **Bullseye:** Larger identity graph, more mature integrations
- **Pricing:** Varies; generally $99-$500/mo range

#### 7.3.11 Salespanel

- **Approach:** B2B, company-level + first-party behavioral data
- **Differentiator:** Enhances first-party data with firmographics and intent scoring. Strong focus on behavioral data and buying intent from on-site actions.

---

### 7.4 Competitive Landscape Summary Matrix

| Company | B2B/B2C | Company-Level | Person-Level | Intent Data | Pricing (Annual) | Primary Market |
|---------|---------|--------------|-------------|-------------|-------------------|----------------|
| **Clearbit/Breeze** | B2B | Yes | No | No | $12K-$20K+ | HubSpot users |
| **6sense** | B2B | Yes | No | Yes (best) | $55K-$130K | Enterprise ABM |
| **Demandbase** | B2B | Yes | No | Yes | $18K-$100K+ | Enterprise ABM |
| **Leadfeeder/Dealfront** | B2B | Yes | No | Limited | $1.2K-$20K | SMB/Mid-market (EU) |
| **Visitor Queue** | B2B | Yes | No | No | $468-$27.6K | SMB |
| **Warmly** | B2B | Yes | Partial (15%) | Yes | $4K-$10K+ | SMB/Startup |
| **Factors.ai** | B2B | Yes (waterfall) | Partial (30%) | Yes (via G2) | $4.8K-$15K+ | Mid-market |
| **Albacross** | B2B | Yes | No | Yes | $950-$1.9K | SMB (EU) |
| **Lead Forensics** | B2B | Yes | No | No | $2.4K-$24K | SMB/Mid-market |
| **Customers.ai** | B2B+B2C | Yes | Yes | Predictive AI | $588-$10K+ | eCommerce |
| **RB2B** | B2B | Yes | Yes (40-80%) | On-site only | $1.2K-$5K+ | Sales teams |
| **Opensend** | B2B+B2C | Limited | Yes (25-35%) | Lead scoring | $6K+ | eCommerce/DTC |
| **ZoomInfo** | B2B | Yes | No | Via platform | $15K-$47.5K+ | Enterprise sales |
| **Retention.com** | B2C | No | Yes (35%) | No | $6K-$30K | eCommerce |
| **Identity Matrix** | B2B | Yes | Yes (50-70%) | On-site | $1.8K-$20K+ | SMB/Mid-market |
| **Leadinfo** | B2B | Yes | No | No | $1.3K-$6K | SMB (EU) |
| **Qualified** | B2B | Yes | No | Via CRM | $42K+ | Enterprise (Salesforce) |
| **Wunderkind** | B2C | No | Yes (50%+) | No | $72K-$500K+ | Enterprise eComm |
| **Snitcher** | B2B | Yes | No | No | $468+ | SMB/Agencies |
| **Koala** | B2B | Yes | No | Behavioral | Contact sales | SaaS/Product-led |
| **Kwanzoo** | B2B | Yes | Yes | Yes | Contact sales | Mid-market |

---

### 7.5 Table-Stakes Features (Every Competitor Has These)

These are non-negotiable -- any visitor identification product MUST have:

1. **JavaScript pixel/snippet** -- One-line embed on customer's website to capture visitor data
2. **Company-level identification** -- Reverse IP lookup to match visitors to companies (30-65% match rate)
3. **Firmographic enrichment** -- At minimum: company name, industry, employee count, location, website
4. **CRM integration** -- At least Salesforce and/or HubSpot push
5. **Dashboard/UI** -- Web interface to view identified visitors and their activity
6. **Page-level tracking** -- Which pages each visitor/company viewed and for how long
7. **Filtering/segmentation** -- Ability to filter visitors by firmographic criteria (industry, size, location)
8. **Email notifications/alerts** -- Real-time or daily digest alerts when target accounts visit
9. **Data export** -- CSV export at minimum
10. **ISP/bot filtering** -- Automatic filtering of ISP traffic, bots, and non-company visitors
11. **GDPR/privacy controls** -- Cookie consent mechanisms, data processing agreements, opt-out capabilities
12. **Free trial or free tier** -- Nearly every competitor offers at minimum a 7-14 day trial

---

### 7.6 Premium Differentiators (Competitive Advantages)

These separate leaders from followers:

#### Tier 1: High-Impact Differentiators
1. **Person-level identification** -- Identifying the specific individual, not just the company. Only ~30% of competitors offer this. US-only limitation is common.
2. **Third-party intent data** -- Signals from outside your website (content consumption, search behavior, competitor research). Only 6sense and Demandbase do this well.
3. **Predictive buying stage/scoring** -- AI models that predict when an account is ready to buy. Requires historical deal data. 6sense leads here.
4. **AI-powered real-time engagement** -- Chatbots/AI SDRs that engage visitors while they are still on-site (Warmly, Qualified).
5. **Waterfall enrichment** -- Using multiple data providers in sequence to maximize match rates (Factors.ai approach).

#### Tier 2: Meaningful Differentiators
6. **Automated multi-channel outreach** -- Triggering email, LinkedIn, and chat sequences based on visitor behavior (Warmly, Albacross)
7. **Website personalization** -- Dynamically changing website content based on identified visitor (Visitor Queue, Demandbase)
8. **Account-based advertising** -- Retargeting identified accounts across ad networks (Demandbase, 6sense)
9. **Attribution/analytics** -- Multi-touch attribution tied to visitor identification (Factors.ai, Koala)
10. **Cross-device/cross-session identity stitching** -- Connecting the same person across devices and sessions (Opensend, Wunderkind)

#### Tier 3: Nice-to-Have Differentiators
11. **White-label/agency support** -- Multi-client management, branded reports (Snitcher, Albacross)
12. **Cookieless tracking** -- IP-only identification without placing cookies (Leadinfo)
13. **Screen recording** -- Watching actual visitor sessions (Leadinfo)
14. **LinkedIn profile capture** -- Direct LinkedIn URL for identified individuals (RB2B)
15. **B2C identity graph** -- Consumer-level identification for eCommerce (Opensend, Wunderkind, Retention.com)

---

### 7.7 Key Insights for ArkData

#### Market Gaps ArkData Could Exploit

1. **Unified B2B+B2C on one platform:** Most tools are either B2B or B2C. Very few do both well. ArkData's existing superpixel_visitors schema already handles both B2B and B2C data (~75 columns). This is a natural advantage.

2. **Transparent, usage-based pricing:** The enterprise players (6sense, Demandbase, ZoomInfo) are widely criticized for opaque pricing and long contracts. Mid-market buyers are actively seeking transparent alternatives.

3. **Provider-agnostic pixel abstraction:** ArkData's pixel.ts already supports a provider abstraction layer. Most competitors are locked to their own identity resolution. ArkData can consume data from multiple pixel providers (Simple Audience today, others tomorrow) and layer its own resolution on top.

4. **Identity resolution as a core differentiator:** ArkData's 5-strategy deterministic matching with confidence scoring and provenance tracking is more sophisticated than most mid-market tools. Exposing the "how" behind each match (provenance) is something virtually no competitor does for end users.

5. **Visualization/analytics depth:** Most visitor ID tools have basic dashboards. ArkData's VizyTemplate heritage (choropleth maps, population pyramids, advanced chart types) could provide uniquely rich analytics.

6. **Integration layer via Multiwoven:** Having Reverse ETL built into the platform (via Multiwoven) means ArkData can push enriched data to 30+ destinations natively. Most competitors rely on Zapier or basic webhooks.

#### Pricing Positioning

Based on the competitive landscape, ArkData should consider positioning between the budget tools ($39-$99/mo) and the enterprise platforms ($15K-$130K/year):

| Segment | Price Range | Competitors | ArkData Opportunity |
|---------|-------------|-------------|-------------------|
| Budget | $0-$99/mo | Snitcher, Visitor Queue, Leadfeeder free | Free tier for adoption |
| Mid-market | $300-$800/mo | Factors.ai, Warmly, Albacross | Core paid tier |
| Growth | $1K-$3K/mo | Lead Forensics, RB2B Pro+ | Advanced features |
| Enterprise | $5K+/mo | 6sense, Demandbase, ZoomInfo | Custom/white-glove |

#### Compliance Considerations

- **Person-level identification is US-only** across the industry due to GDPR constraints
- **Company-level identification is GDPR-safe** under "Legitimate Interest"
- ArkData should plan for dual-mode: company-level globally, person-level for US traffic only
- CCPA/CPRA compliance is required for person-level US identification
