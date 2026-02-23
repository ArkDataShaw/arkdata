/**
 * @arkdata/firebase-sdk
 *
 * Drop-in replacement for @base44/sdk.
 * Preserves the same API surface so ark-data UI code needs zero changes
 * beyond swapping the import.
 *
 * Usage:
 *   import { base44 } from '@arkdata/firebase-sdk';
 *   // or: import { createClient } from '@arkdata/firebase-sdk';
 *
 *   // Same API as before:
 *   base44.entities.Visitor.list("-last_seen_at", 200)
 *   base44.auth.me()
 */

export { initializeFirebase, getDb, getAuthInstance } from './config';
export { auth, getTenantId, getUserRole, clearTenantIdCache, type ArkDataUser } from './auth';
export { createEntityProxy, type EntityProxy } from './entities';
export { listAllTenants, getTenant, listTenantUsers, listMyTeamUsers } from './admin';
export {
  createTenantFn,
  inviteUserFn,
  updateUserRoleFn,
  deleteTenantUser,
  updateTenantLimitsFn,
  impersonateUserFn,
  requestPasswordResetFn,
} from './functions';
import { createEntityProxy } from './entities';
import { auth } from './auth';

// ─── Entity Name → Firestore Collection Mapping ────────────────────
// Each Base44 entity maps to a subcollection under tenants/{tenantId}/
const ENTITY_COLLECTION_MAP: Record<string, string> = {
  // Core data
  Visitor: 'visitors',
  Person: 'people',
  Company: 'companies',
  Session: 'sessions',
  RawEvent: 'raw_events',
  Domain: 'domains',

  // Analytics & Metrics
  DailyMetric: 'daily_metrics',
  DailyDimensionMetric: 'daily_dimension_metrics',
  ConversionDefinition: 'conversion_definitions',
  Funnel: 'funnels',
  Segment: 'segments',

  // Dashboards
  Dashboard: 'dashboards',
  DashboardActivity: 'dashboard_activities',
  DashboardCollaborator: 'dashboard_collaborators',
  DashboardComment: 'dashboard_comments',
  DashboardShare: 'dashboard_shares',
  SavedDateRange: 'saved_date_ranges',

  // Onboarding
  OnboardingEvent: 'onboarding_events',
  OnboardingFlow: 'onboarding_flows',
  OnboardingTaskStatus: 'onboarding_task_statuses',
  OnboardingUserState: 'onboarding_user_states',
  OnboardingWorkspaceState: 'onboarding_workspace_states',
  TourState: 'tour_states',

  // Data Hygiene
  DataCleanupRun: 'data_cleanup_runs',
  DataHygieneAuditLog: 'data_hygiene_audit_logs',
  QuarantineSnapshot: 'quarantine_snapshots',

  // Integrations & Sync
  IntegrationConnection: 'integration_connections',
  IntegrationProvider: 'integration_providers',
  SyncJob: 'sync_jobs',

  // Workflows & Automations
  Workflow: 'workflows',
  WorkflowExecution: 'workflow_executions',
  RoutingRule: 'routing_rules',

  // System & Admin
  AuditLog: 'audit_logs',
  BillingPlan: 'billing_plans',
  Tenant: 'tenants_config',
  User: 'users',
  UIConfig: 'ui_configs',
  UIConfigHistory: 'ui_config_history',
  Notification: 'notifications',
  Job: 'jobs',
  ScheduledReport: 'scheduled_reports',

  // Help & Feedback
  HelpArticle: 'help_articles',
  HelpSettings: 'help_settings',
  Feedback: 'feedback',
};

// ─── Build entities proxy object ────────────────────────────────────
// Creates a Proxy so that base44.entities.AnyEntityName works dynamically
type EntitiesMap = Record<string, ReturnType<typeof createEntityProxy>>;

const entityCache: EntitiesMap = {};

const entitiesHandler: ProxyHandler<EntitiesMap> = {
  get(_target, prop: string) {
    if (entityCache[prop]) return entityCache[prop];

    const collectionName = ENTITY_COLLECTION_MAP[prop];
    if (!collectionName) {
      console.warn(`[ArkData SDK] Unknown entity "${prop}", using "${prop.toLowerCase()}" as collection name`);
      entityCache[prop] = createEntityProxy(prop.toLowerCase());
    } else {
      entityCache[prop] = createEntityProxy(collectionName);
    }
    return entityCache[prop];
  },
};

const entities = new Proxy({} as EntitiesMap, entitiesHandler);

// ─── Main export: drop-in for base44 ───────────────────────────────
export const base44 = { entities, auth };

// ─── Also export createClient for AuthContext.jsx compatibility ─────
// The old code does: import { createClient } from '@base44/sdk'
// We provide a compatible shim that just returns our base44 object
export function createClient(_config?: Record<string, unknown>) {
  return base44;
}

// ─── createAxiosClient shim ────────────────────────────────────────
// AuthContext.jsx imports createAxiosClient from '@base44/sdk/dist/utils/axios-client'
// We provide a minimal compatible replacement using fetch
export function createAxiosClient(config: {
  baseURL: string;
  headers?: Record<string, string>;
  token?: string;
  interceptResponses?: boolean;
}) {
  return {
    async get(path: string) {
      const url = `${config.baseURL}${path}`;
      const headers: Record<string, string> = { ...config.headers };
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw { status: res.status, data, message: res.statusText };
      }
      return res.json();
    },
    async post(path: string, body?: unknown) {
      const url = `${config.baseURL}${path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      };
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw { status: res.status, data, message: res.statusText };
      }
      return res.json();
    },
  };
}

export default base44;
