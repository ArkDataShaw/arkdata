import type { TenantEntity, IdentityStatus, VisitorStatus, PaginatedResponse } from './common';

/** Core visitor profile — idempotent, upserted via COALESCE pattern */
export interface Visitor extends TenantEntity {
  // Identity
  first_name?: string;
  last_name?: string;
  email?: string;
  personal_email?: string;
  business_email?: string;
  phone?: string;
  mobile_phone?: string;
  direct_number?: string;

  // Hashed identifiers
  hem_sha256?: string;
  sha256_personal_email?: string;
  sha256_business_email?: string;

  // Location
  personal_address?: string;
  personal_city?: string;
  personal_state?: string;
  personal_zip?: string;
  personal_zip4?: string;

  // Company (B2B)
  company_name?: string;
  company_domain?: string;
  company_industry?: string;
  company_employee_count?: string;
  company_revenue?: string;
  company_sic?: string;
  company_naics?: string;
  company_phone?: string;
  company_linkedin_url?: string;
  company_city?: string;
  company_state?: string;
  company_zip?: string;
  company_description?: string;

  // Professional
  job_title?: string;
  department?: string;
  seniority_level?: string;
  headline?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;

  // Demographics (B2C)
  age_range?: string;
  gender?: string;
  married?: string;
  children?: string;
  homeowner?: string;
  net_worth?: string;
  income_range?: string;
  social_connections?: string;

  // Skiptrace
  skiptrace_credit_rating?: string;
  skiptrace_address?: string;
  skiptrace_b2b_address?: string;
  skiptrace_b2b_phone?: string;
  skiptrace_city?: string;

  // Tracking
  identity_status: IdentityStatus;
  visitor_status: VisitorStatus;
  intent_score: number;
  event_count: number;
  session_count: number;
  first_seen_at: string;
  last_seen_at: string;

  // Verification
  personal_verified_emails?: string;
  business_verified_emails?: string;
  personal_email_validation_status?: string;
  business_email_validation_status?: string;
}

/** Visitor list for VisitorCollectionViewer */
export interface VisitorRow {
  id: string;
  name: string;
  jobTitle?: string;
  company?: string;
  sessionLengthSec: number;
  arrivedAt: string;
  events: VisitorEvent[];
}

/** Paginated visitor response */
export type VisitorPage = PaginatedResponse<VisitorRow>;

/** Re-export for component compatibility */
export type { VisitorEvent } from './event';
