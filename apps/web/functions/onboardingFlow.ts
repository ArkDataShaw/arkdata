import { base44 } from "@/api/base44Client";

const DEFAULT_FLOW_CONFIG = {
  categories: [
    {
      id: "setup",
      name: "Setup",
      description: "Get your workspace configured",
      order: 1,
      tasks: [
        {
          id: "task_1",
          title: "Confirm your workspace",
          description: "Add workspace name and timezone",
          required: true,
          scope: "workspace",
          category: "setup",
          ctaType: "navigate_to_route",
          ctaTarget: "/settings?tab=workspace",
          ctaLabel: "Go to Settings",
          completionType: "auto",
          completionRule: {
            ruleType: "db_field",
            table: "Tenant",
            conditions: [
              { field: "name", operator: "not_null" },
              { field: "settings_json.timezone", operator: "not_null" }
            ]
          },
          helpSlug: "workspace-setup",
          estimatedTime: "2 min",
          order: 1
        },
        {
          id: "task_2",
          title: "Add your website domain",
          description: "Register your domain for tracking",
          required: true,
          scope: "workspace",
          category: "setup",
          ctaType: "navigate_to_route",
          ctaTarget: "/settings?tab=domains",
          ctaLabel: "Add Domain",
          completionType: "auto",
          completionRule: {
            ruleType: "db_count",
            table: "Domain",
            filter: { tenant_id: "$tenant_id" },
            minCount: 1
          },
          helpSlug: "add-domain",
          estimatedTime: "3 min",
          order: 2
        },
        {
          id: "task_3",
          title: "Install your pixel",
          description: "Add tracking code to your website",
          required: true,
          scope: "workspace",
          category: "setup",
          ctaType: "navigate_to_route",
          ctaTarget: "/settings?tab=pixel",
          ctaLabel: "Get Pixel Code",
          completionType: "auto",
          completionRule: {
            ruleType: "db_count",
            table: "Domain",
            filter: { tenant_id: "$tenant_id", status: "verified" },
            minCount: 1
          },
          helpSlug: "install-pixel",
          estimatedTime: "5 min",
          order: 3
        },
        {
          id: "task_4",
          title: "Verify pixel is receiving events",
          description: "See real data coming in from your website",
          required: true,
          scope: "workspace",
          category: "setup",
          ctaType: "navigate_to_route",
          ctaTarget: "/settings?tab=pixel",
          ctaLabel: "Check Status",
          completionType: "auto",
          completionRule: {
            ruleType: "db_field",
            table: "Domain",
            conditions: [
              { field: "last_event_at", operator: "within_minutes", value: 15 }
            ]
          },
          helpSlug: "verify-pixel-events",
          estimatedTime: "5 min",
          order: 4
        },
        {
          id: "task_5",
          title: "Define at least 1 conversion",
          description: "Create a conversion goal for your business",
          required: true,
          scope: "workspace",
          category: "setup",
          ctaType: "navigate_to_route",
          ctaTarget: "/settings?tab=conversions",
          ctaLabel: "Create Conversion",
          completionType: "auto",
          completionRule: {
            ruleType: "db_count",
            table: "ConversionDefinition",
            filter: { tenant_id: "$tenant_id", is_active: true },
            minCount: 1
          },
          helpSlug: "create-conversion",
          estimatedTime: "4 min",
          order: 5
        }
      ]
    },
    {
      id: "data",
      name: "Data & Insights",
      description: "Explore your first analytics",
      order: 2,
      tasks: [
        {
          id: "task_6",
          title: "Review your first lost traffic",
          description: "See which visitors you didn't identify",
          required: false,
          scope: "user",
          category: "data",
          ctaType: "navigate_to_route",
          ctaTarget: "/lost-traffic",
          ctaLabel: "View Lost Traffic",
          completionType: "auto",
          completionRule: {
            ruleType: "page_visited",
            route: "/lost-traffic"
          },
          helpSlug: "lost-traffic-guide",
          estimatedTime: "3 min",
          order: 1
        },
        {
          id: "task_7",
          title: "Set high-intent pages",
          description: "Mark pages that indicate buying intent",
          required: true,
          scope: "workspace",
          category: "data",
          ctaType: "navigate_to_route",
          ctaTarget: "/settings?tab=intent-scoring",
          ctaLabel: "Configure Intent",
          completionType: "auto",
          completionRule: {
            ruleType: "db_count",
            table: "IntentScoring",
            filter: { tenant_id: "$tenant_id" },
            minCount: 1
          },
          helpSlug: "intent-scoring",
          estimatedTime: "4 min",
          order: 2
        },
        {
          id: "task_8",
          title: "Create your first segment",
          description: "Group visitors with similar behaviors",
          required: false,
          scope: "user",
          category: "data",
          ctaType: "navigate_to_route",
          ctaTarget: "/analytics?tab=segments",
          ctaLabel: "Create Segment",
          completionType: "auto",
          completionRule: {
            ruleType: "db_count",
            table: "Segment",
            filter: { created_by: "$user_id" },
            minCount: 1
          },
          helpSlug: "create-segment",
          estimatedTime: "5 min",
          order: 3
        }
      ]
    },
    {
      id: "activation",
      name: "Activation",
      description: "Connect your tools & push data",
      order: 3,
      tasks: [
        {
          id: "task_9",
          title: "Connect an integration",
          description: "Link your CRM or marketing tool",
          required: true,
          scope: "workspace",
          category: "activation",
          ctaType: "navigate_to_route",
          ctaTarget: "/integrations",
          ctaLabel: "Connect Integration",
          completionType: "auto",
          completionRule: {
            ruleType: "db_count",
            table: "IntegrationConnection",
            filter: { tenant_id: "$tenant_id", status: "connected" },
            minCount: 1
          },
          helpSlug: "connect-integration",
          estimatedTime: "10 min",
          order: 1,
          dependencies: ["task_1", "task_2", "task_4"]
        },
        {
          id: "task_10",
          title: "Map fields for your integration",
          description: "Configure field mappings",
          required: true,
          scope: "workspace",
          category: "activation",
          ctaType: "navigate_to_route",
          ctaTarget: "/integrations",
          ctaLabel: "Map Fields",
          completionType: "manual",
          helpSlug: "field-mapping",
          estimatedTime: "8 min",
          order: 2,
          dependencies: ["task_9"]
        },
        {
          id: "task_11",
          title: "Create a routing rule",
          description: "Auto-send high-intent visitors to CRM",
          required: true,
          scope: "workspace",
          category: "activation",
          ctaType: "navigate_to_route",
          ctaTarget: "/automations",
          ctaLabel: "Create Rule",
          completionType: "auto",
          completionRule: {
            ruleType: "db_count",
            table: "RoutingRule",
            filter: { tenant_id: "$tenant_id", enabled: true },
            minCount: 1
          },
          helpSlug: "routing-rules",
          estimatedTime: "6 min",
          order: 3,
          dependencies: ["task_9"]
        },
        {
          id: "task_12",
          title: "Push your first lead",
          description: "Send a visitor record to your CRM",
          required: true,
          scope: "workspace",
          category: "activation",
          ctaType: "navigate_to_route",
          ctaTarget: "/visitors",
          ctaLabel: "Push a Lead",
          completionType: "auto",
          completionRule: {
            ruleType: "sync_success",
            entityType: "person",
            providers: ["salesforce", "ghl", "klaviyo"]
          },
          helpSlug: "push-lead",
          estimatedTime: "3 min",
          order: 4,
          dependencies: ["task_9", "task_11"]
        }
      ]
    },
    {
      id: "team",
      name: "Team",
      description: "Build your team & complete setup",
      order: 4,
      tasks: [
        {
          id: "task_13",
          title: "Invite a teammate",
          description: "Add someone to your workspace",
          required: false,
          scope: "workspace",
          category: "team",
          ctaType: "navigate_to_route",
          ctaTarget: "/settings?tab=team",
          ctaLabel: "Invite Team",
          completionType: "auto",
          completionRule: {
            ruleType: "db_count",
            table: "User",
            filter: { tenant_id: "$tenant_id" },
            minCount: 2
          },
          helpSlug: "invite-team",
          estimatedTime: "5 min",
          order: 1
        },
        {
          id: "task_14",
          title: "Complete your profile",
          description: "Add your name and title",
          required: false,
          scope: "user",
          category: "team",
          ctaType: "navigate_to_route",
          ctaTarget: "/profile",
          ctaLabel: "Edit Profile",
          completionType: "manual",
          helpSlug: "complete-profile",
          estimatedTime: "2 min",
          order: 2
        },
        {
          id: "task_15",
          title: "Take the quick tour",
          description: "Learn key features in 5 minutes",
          required: false,
          scope: "user",
          category: "team",
          ctaType: "trigger_action",
          ctaAction: "start_tour",
          ctaLabel: "Start Tour",
          completionType: "auto",
          completionRule: {
            ruleType: "db_exists",
            table: "TourState",
            filter: { user_id: "$user_id", tour_key: "quick_tour", completed_at: { $ne: null } }
          },
          helpSlug: "quick-tour",
          estimatedTime: "5 min",
          order: 3
        }
      ]
    }
  ],
  completionCriteria: {
    requiredTasks: ["task_1", "task_2", "task_3", "task_4", "task_5", "task_7", "task_9", "task_10", "task_11", "task_12"],
    minOptionalComplete: 2
  }
};

export async function initializeDefaultFlow() {
  try {
    const existing = await base44.entities.OnboardingFlow.filter({
      scope: "global",
      name: "Ark Data Setup (Default)",
      status: "published"
    });

    if (existing.length > 0) {
      console.log("Default onboarding flow already exists");
      return existing[0];
    }

    const flow = await base44.entities.OnboardingFlow.create({
      scope: "global",
      name: "Ark Data Setup (Default)",
      status: "published",
      version: 1,
      config_json: DEFAULT_FLOW_CONFIG,
      gating_enabled: true,
      target_roles: ["admin", "user"]
    });

    console.log("Default onboarding flow created:", flow.id);
    return flow;
  } catch (error) {
    console.error("Error initializing default onboarding flow:", error);
    throw error;
  }
}

export async function getEffectiveFlow(tenantId) {
  try {
    // Try tenant override first
    const tenantFlow = await base44.entities.OnboardingFlow.filter({
      tenant_id: tenantId,
      scope: "tenant",
      status: "published"
    });

    if (tenantFlow.length > 0) {
      return tenantFlow[0];
    }

    // Fall back to global default
    const globalFlow = await base44.entities.OnboardingFlow.filter({
      scope: "global",
      status: "published"
    });

    return globalFlow.length > 0 ? globalFlow[0] : null;
  } catch (error) {
    console.error("Error fetching onboarding flow:", error);
    return null;
  }
}