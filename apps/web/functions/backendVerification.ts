/**
 * Backend Integrity Audit
 * Identifies missing/broken endpoints and creates comprehensive list of required backend
 */

export const BACKEND_AUDIT = {
  // Frontend Requirements by Page
  pages: {
    home: {
      endpoints: [
        "GET /api/metrics/home (KPI data)",
        "GET /api/analytics/trend/sessions (30 days)",
        "GET /api/analytics/breakdown/utm-sources",
        "GET /api/analytics/top-pages",
      ],
    },
    visitors: {
      endpoints: [
        "GET /api/analytics/trend/people (30 days)",
        "GET /api/analytics/distribution/intent-scores",
        "GET /api/analytics/breakdown/job-titles",
        "GET /api/visitors/list (paginated)",
      ],
    },
    companies: {
      endpoints: [
        "GET /api/analytics/trend/companies (30 days)",
        "GET /api/analytics/distribution/industries",
        "GET /api/companies/list (paginated)",
        "GET /api/companies/:id/detail",
      ],
    },
    sessions: {
      endpoints: [
        "GET /api/analytics/trend/sessions",
        "GET /api/analytics/distribution/duration",
        "GET /api/analytics/trend/cvr",
        "GET /api/sessions/list (paginated)",
      ],
    },
    lostTraffic: {
      endpoints: [
        "GET /api/analytics/trend/lost-sessions",
        "GET /api/analytics/breakdown/lost-by-source",
        "GET /api/analytics/top-lost-pages",
        "GET /api/visitors/lost/list (paginated)",
      ],
    },
    analytics: {
      endpoints: [
        "GET /api/analytics/compare (date range comparison)",
        "GET /api/analytics/breakdown (UTM, device, geo)",
        "GET /api/analytics/heatmap (optional)",
        "GET /api/analytics/funnel",
        "GET /api/analytics/cohort",
      ],
    },
    integrations: {
      endpoints: [
        "GET /api/integrations/list",
        "POST /api/integrations/:provider/connect (OAuth)",
        "GET /api/integrations/:provider/status",
        "GET /api/integrations/health (sync status)",
        "POST /api/integrations/:provider/sync (manual)",
      ],
    },
    automations: {
      endpoints: [
        "GET /api/workflows/list",
        "POST /api/workflows/create",
        "GET /api/workflows/:id/executions",
        "GET /api/routingRules/list",
        "POST /api/routingRules/trigger",
      ],
    },
    billing: {
      endpoints: [
        "GET /api/billing/state",
        "POST /api/billing/checkout-session",
        "POST /api/billing/portal-session",
        "GET /api/billing/usage",
        "GET /api/billing/invoices",
        "POST /api/billing/apply-discount",
        "POST /api/billing/cancel",
        "POST /api/billing/webhook (Stripe)",
      ],
    },
    admin: {
      endpoints: [
        "GET /api/admin/tenants/list",
        "GET /api/admin/health",
        "GET /api/admin/health/pipeline",
        "GET /api/admin/health/integrations",
        "GET /api/admin/health/billing",
        "POST /api/admin/billing/plans",
        "POST /api/admin/tests/run",
      ],
    },
  },

  // Critical Services
  services: {
    pixelIngestion: {
      status: "required",
      description: "Accept pixel events from client domains",
      endpoints: [
        "POST /api/pixel/events (validates origin, tenant_id, event schema)",
      ],
    },
    sessionization: {
      status: "required",
      description: "Group events into sessions",
      job: "sessionize_raw_events (hourly)",
    },
    identityResolution: {
      status: "required",
      description: "Resolve visitor identity from enrichment",
      job: "resolve_visitor_identity (real-time hooks)",
      tables: ["EnhancedLeadEvent", "BillingUsageUnit"],
    },
    rollupGeneration: {
      status: "required",
      description: "Pre-compute daily metrics",
      job: "generate_daily_rollups (hourly)",
      tables: ["DailyMetric", "DailyDimensionMetric"],
    },
    billingUsageTracking: {
      status: "required",
      description: "Track billable usage units",
      job: "report_usage_to_stripe (hourly)",
    },
    stripeWebhooks: {
      status: "required",
      description: "Sync Stripe subscription state",
      endpoint: "POST /api/billing/webhook",
      requirements: ["Verify signature", "Idempotent by event.id"],
    },
    setupAssistant: {
      status: "required",
      description: "Guided setup for tenants",
      services: [
        "Generate pixel verification token",
        "Validate pixel events received",
        "Create default conversion definition",
        "Suggest first integration",
      ],
    },
  },

  // Database Requirements
  tables: {
    coreEntities: [
      "Tenant",
      "Domain",
      "Visitor",
      "Session",
      "RawEvent",
      "Person",
      "Company",
    ],
    billingEntities: [
      "TenantBilling",
      "EnhancedLeadEvent",
      "BillingUsageUnit",
      "BillingEvent",
      "BillingPlan",
    ],
    analyticsEntities: [
      "DailyMetric",
      "DailyDimensionMetric",
      "DashboardComment",
      "SavedDateRange",
    ],
    workflowEntities: [
      "Workflow",
      "WorkflowExecution",
      "WorkflowAction",
      "WorkflowCondition",
      "CustomEvent",
    ],
    integrationEntities: [
      "IntegrationProvider",
      "IntegrationConnection",
      "RoutingRule",
      "SyncJob",
    ],
  },

  // Indexes Required
  indexes: {
    RawEvent: [
      "(tenant_id, created_date) - for trend queries",
      "(tenant_id, visitor_id) - for visitor drilldown",
      "(domain_id, created_date) - for domain rollups",
    ],
    Session: [
      "(tenant_id, created_date) - for time series",
      "(tenant_id, is_converted) - for CVR analysis",
    ],
    BillingUsageUnit: [
      "(tenant_id, period_start, unit_type, unit_key) UNIQUE",
      "(tenant_id, period_start) - for period rollups",
      "(reported_to_stripe_at) - for unreported units",
    ],
    DailyMetric: [
      "(tenant_id, metric_date) - fast lookups",
    ],
  },

  // API Security Requirements
  security: {
    authentication: "Session-based (base44.auth.me())",
    authorization: "Tenant isolation by tenant_id from session context",
    rbac: {
      "billing:manage": ["Owner", "Admin"],
      "integrations:connect": ["Owner", "Admin"],
      "workflows:edit": ["Owner", "Admin"],
      "admin:view": ["Owner", "Admin"],
    },
    rateLimit: "100 req/min per tenant",
    validation: "Strict schema validation on all inputs",
  },

  // Missing Features (to be implemented)
  missing: [
    {
      feature: "Rollup table generation",
      status: "not_implemented",
      impact: "Charts will be slow without pre-computed metrics",
      priority: "high",
    },
    {
      feature: "Stripe webhook handler",
      status: "stub_only",
      impact: "Billing state won't sync correctly",
      priority: "critical",
    },
    {
      feature: "Identity resolution hooks",
      status: "not_implemented",
      impact: "No Enhanced Leads being created",
      priority: "high",
    },
    {
      feature: "Setup assistant actions",
      status: "partial",
      impact: "New users can't complete onboarding",
      priority: "high",
    },
  ],
};

export async function runBackendAudit() {
  console.log("🔍 Running Backend Integrity Audit...\n");

  const audit = {
    timestamp: new Date().toISOString(),
    results: {
      pagesAudited: Object.keys(BACKEND_AUDIT.pages).length,
      endpointsRequired: Object.values(BACKEND_AUDIT.pages).reduce(
        (sum, page) => sum + page.endpoints.length,
        0
      ),
      tablesRequired: BACKEND_AUDIT.tables.coreEntities.length +
                     BACKEND_AUDIT.tables.billingEntities.length +
                     BACKEND_AUDIT.tables.analyticsEntities.length,
      missingFeatures: BACKEND_AUDIT.missing.length,
      criticalIssues: BACKEND_AUDIT.missing.filter((m) => m.priority === "critical").length,
    },
    audit: BACKEND_AUDIT,
  };

  console.log("📊 Audit Results:");
  console.log(`   Pages: ${audit.results.pagesAudited}`);
  console.log(`   Endpoints Required: ${audit.results.endpointsRequired}`);
  console.log(`   Tables Required: ${audit.results.tablesRequired}`);
  console.log(`   Missing Features: ${audit.results.missingFeatures}`);
  console.log(`   Critical Issues: ${audit.results.criticalIssues}`);

  if (audit.results.criticalIssues > 0) {
    console.warn("\n⚠️ CRITICAL ISSUES DETECTED:");
    BACKEND_AUDIT.missing
      .filter((m) => m.priority === "critical")
      .forEach((m) => {
        console.warn(`   - ${m.feature}: ${m.impact}`);
      });
  }

  return audit;
}