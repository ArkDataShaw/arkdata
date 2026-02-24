import type { UserRole, TenantBranding } from './common';

/** Tenant (organization) */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  trial_expires_at?: string;
  settings: TenantSettings;
  limits: TenantLimits;
  parent_tenant_id?: string | null;
  branding?: TenantBranding;
  custom_domain?: string;
  active_users?: number;
  domain_count?: number;
  last_event_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  event_retention_days: number; // default 90
  max_pixels: number;
  max_users: number;
  features: string[];
}

/** Usage limits for a tenant */
export interface TenantLimits {
  monthly_pixel_limit: number;
  pixel_resolution_limit: number;
  max_domains: number;
  max_users: number;
  max_dashboards: number;
  api_requests_per_day: number;
}

/** Default limits for new tenants */
export const DEFAULT_TENANT_LIMITS: TenantLimits = {
  monthly_pixel_limit: 10000,
  pixel_resolution_limit: 5000,
  max_domains: 5,
  max_users: 10,
  max_dashboards: 20,
  api_requests_per_day: 10000,
};

/** User within a tenant */
export interface TenantUser {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'banned';
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}
