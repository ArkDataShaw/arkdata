import type { UserRole } from './common';

/** Tenant (organization) */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  trial_expires_at?: string;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  event_retention_days: number; // default 90
  max_pixels: number;
  max_users: number;
  features: string[];
}

/** User within a tenant */
export interface TenantUser {
  id: string;
  tenant_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  last_login_at?: string;
  created_at: string;
}
