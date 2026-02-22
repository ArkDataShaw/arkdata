/**
 * Admin helpers for super_admin cross-tenant queries.
 * These bypass getTenantId() scoping and read from top-level collections.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  type DocumentData,
} from 'firebase/firestore';
import { getDb } from './config';
import { getUserRole, getTenantId } from './auth';

function docToObject<T>(docSnap: { id: string; data: () => DocumentData }): T {
  return { id: docSnap.id, ...docSnap.data() } as T;
}

async function assertSuperAdmin(): Promise<void> {
  const role = await getUserRole();
  if (role !== 'super_admin') {
    throw new Error('Forbidden: super_admin role required');
  }
}

/** List all tenants (cross-tenant — super_admin only) */
export async function listAllTenants<T = DocumentData>(): Promise<T[]> {
  await assertSuperAdmin();
  const db = getDb();
  const q = query(collection(db, 'tenants'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToObject<T>(d));
}

/** Get a single tenant by ID (cross-tenant — super_admin only) */
export async function getTenant<T = DocumentData>(tenantId: string): Promise<T | null> {
  await assertSuperAdmin();
  const db = getDb();
  const docSnap = await getDoc(doc(db, 'tenants', tenantId));
  if (!docSnap.exists()) return null;
  return docToObject<T>(docSnap);
}

/** List users within a specific tenant (cross-tenant — super_admin only) */
export async function listTenantUsers<T = DocumentData>(tenantId: string): Promise<T[]> {
  await assertSuperAdmin();
  const db = getDb();
  const q = query(
    collection(db, 'tenants', tenantId, 'users'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToObject<T>(d));
}

/** List users in the caller's own tenant (tenant_admin or super_admin) */
export async function listMyTeamUsers<T = DocumentData>(): Promise<T[]> {
  const role = await getUserRole();
  if (role !== 'super_admin' && role !== 'tenant_admin') {
    throw new Error('Forbidden: tenant_admin or super_admin role required');
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
