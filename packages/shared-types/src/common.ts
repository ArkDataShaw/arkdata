/** Base entity with tenant isolation */
export interface TenantEntity {
  id: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

/** Pagination request */
export interface PaginationRequest {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** RBAC roles */
export type UserRole = 'super_admin' | 'tenant_admin' | 'read_only';

/** Identity resolution confidence */
export type MatchType = 'hem' | 'email' | 'phone' | 'name_company' | 'ip_ua';

/** Identity status */
export type IdentityStatus = 'anonymous' | 'partially_identified' | 'identified' | 'verified';

/** Visitor status */
export type VisitorStatus = 'active' | 'inactive' | 'churned';
