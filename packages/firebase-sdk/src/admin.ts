/**
 * Admin helpers for platform_admin / super_admin cross-tenant queries.
 * These bypass getTenantId() scoping and read from top-level collections.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { getDb } from './config';
import { getUserRole, getTenantId } from './auth';
import type { TenantBranding } from '@arkdata/shared-types';

function docToObject<T>(docSnap: { id: string; data: () => DocumentData }): T {
  return { id: docSnap.id, ...docSnap.data() } as T;
}

async function assertAdminRole(): Promise<void> {
  const role = await getUserRole();
  if (role !== 'platform_admin' && role !== 'super_admin') {
    throw new Error('Forbidden: platform_admin or super_admin role required');
  }
}

/** List tenants visible to the caller.
 *  - platform_admin: all tenants
 *  - super_admin: own tenant + child tenants (parent_tenant_id == callerTenant)
 *
 *  Firestore rules already allow super_admin to read any tenant doc,
 *  so the scoping here is a UX concern (show only relevant tenants).
 */
export async function listAllTenants<T = DocumentData>(): Promise<T[]> {
  const role = await getUserRole();
  await assertAdminRole();
  const db = getDb();

  if (role === 'platform_admin') {
    const q = query(collection(db, 'tenants'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToObject<T>(d));
  }

  // super_admin: fetch all tenants, then filter to own + children client-side.
  // We do a full scan because Firestore can't OR-query across parent_tenant_id
  // values and "field not set" in a single query. The set is small enough.
  const tenantId = await getTenantId();
  const q = query(collection(db, 'tenants'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => {
      const data = d.data();
      // Own tenant
      if (d.id === tenantId) return true;
      // Child tenant (explicitly parented)
      if (data.parent_tenant_id === tenantId) return true;
      // Legacy tenant (no parent_tenant_id set) — include for backward compat
      if (data.parent_tenant_id === undefined || data.parent_tenant_id === null) return true;
      return false;
    })
    .map((d) => docToObject<T>(d));
}

/** Get a single tenant by ID (cross-tenant — admin only) */
export async function getTenant<T = DocumentData>(tenantId: string): Promise<T | null> {
  await assertAdminRole();
  const db = getDb();
  const docSnap = await getDoc(doc(db, 'tenants', tenantId));
  if (!docSnap.exists()) return null;
  return docToObject<T>(docSnap);
}

/** List users within a specific tenant (cross-tenant — admin only) */
export async function listTenantUsers<T = DocumentData>(tenantId: string): Promise<T[]> {
  await assertAdminRole();
  const db = getDb();
  const q = query(
    collection(db, 'tenants', tenantId, 'users'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToObject<T>(d));
}

/** List users in the caller's own tenant (tenant_admin, super_admin, or platform_admin) */
export async function listMyTeamUsers<T = DocumentData>(): Promise<T[]> {
  const role = await getUserRole();
  if (role !== 'platform_admin' && role !== 'super_admin' && role !== 'tenant_admin') {
    throw new Error('Forbidden: tenant_admin or higher role required');
  }
  const tenantId = await getTenantId();
  const db = getDb();
  const q = query(
    collection(db, 'tenants', tenantId, 'users'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToObject<T>(d));
}

const DEFAULT_BRANDING: TenantBranding = {
  app_name: 'Ark Data',
  logo_url: '/logo.png',
  primary_color: '#0f172a',
  accent_color: '#7c3aed',
};

/** Fetch tenant branding — inherits from parent if child has none */
export async function getTenantBranding(tenantId?: string): Promise<TenantBranding> {
  const tid = tenantId || await getTenantId();
  const db = getDb();
  const tenantSnap = await getDoc(doc(db, 'tenants', tid));
  if (!tenantSnap.exists()) return { ...DEFAULT_BRANDING };

  const data = tenantSnap.data();
  const branding = data.branding || {};

  // If child tenant, inherit missing fields from parent
  if (data.parent_tenant_id) {
    const parentSnap = await getDoc(doc(db, 'tenants', data.parent_tenant_id));
    if (parentSnap.exists()) {
      const parentBranding = parentSnap.data()?.branding || {};
      return {
        ...DEFAULT_BRANDING,
        ...parentBranding,
        ...branding,
      };
    }
  }

  return { ...DEFAULT_BRANDING, ...branding };
}
