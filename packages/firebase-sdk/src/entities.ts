import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { getDb } from './config';
import { getTenantId } from './auth';

/**
 * Entity proxy — drop-in replacement for base44.entities.X
 *
 * Matches the Base44 SDK API surface:
 *   .list(sort?, limit?)           → fetch all docs, optionally sorted/limited
 *   .filter(filterObj, sort?, limit?) → fetch docs matching filters
 *   .get(id)                       → fetch single doc by ID (added for convenience)
 *   .create(data)                  → create new doc
 *   .update(id, data)             → update existing doc
 *   .delete(id)                   → delete doc
 *   .subscribe(callback)          → real-time listener
 */
export interface EntityProxy<T = DocumentData> {
  list(sort?: string, maxResults?: number): Promise<T[]>;
  filter(filterObj: Record<string, unknown>, sort?: string, maxResults?: number): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  subscribe(callback: (event: { type: string; data: T }) => void): () => void;
}

/** Parse Base44-style sort string (e.g. "-created_date" → descending by created_date) */
function parseSortString(sort?: string): { field: string; direction: 'asc' | 'desc' } | null {
  if (!sort) return null;
  if (sort.startsWith('-')) {
    return { field: sort.slice(1), direction: 'desc' };
  }
  return { field: sort, direction: 'asc' };
}

/** Map Base44 field names to Firestore field names */
function mapFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    created_date: 'created_at',
    updated_date: 'updated_at',
    started_at: 'started_at',
    last_seen_at: 'last_seen_at',
  };
  return fieldMap[field] ?? field;
}

/** Get the tenant-scoped collection path */
async function getTenantCollection(collectionName: string) {
  const db = getDb();
  const tenantId = await getTenantId();
  return collection(db, 'tenants', tenantId, collectionName);
}

/** Convert Firestore doc to plain object with id */
function docToObject<T>(docSnap: { id: string; data: () => DocumentData }): T {
  return { id: docSnap.id, ...docSnap.data() } as T;
}

/**
 * Create an entity proxy for a Firestore collection.
 * Every query is automatically scoped to the current tenant.
 */
export function createEntityProxy<T extends DocumentData = DocumentData>(
  collectionName: string
): EntityProxy<T> {
  return {
    async list(sort?: string, maxResults?: number): Promise<T[]> {
      const colRef = await getTenantCollection(collectionName);
      const constraints: QueryConstraint[] = [];

      const sortInfo = parseSortString(sort);
      if (sortInfo) {
        constraints.push(orderBy(mapFieldName(sortInfo.field), sortInfo.direction));
      }
      if (maxResults) {
        constraints.push(firestoreLimit(maxResults));
      }

      const q = query(colRef, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => docToObject<T>(d));
    },

    async filter(
      filterObj: Record<string, unknown>,
      sort?: string,
      maxResults?: number
    ): Promise<T[]> {
      const colRef = await getTenantCollection(collectionName);
      const constraints: QueryConstraint[] = [];

      // Convert filter object to Firestore where clauses
      for (const [key, value] of Object.entries(filterObj)) {
        if (value !== undefined && value !== null) {
          constraints.push(where(mapFieldName(key), '==', value));
        }
      }

      const sortInfo = parseSortString(sort);
      if (sortInfo) {
        constraints.push(orderBy(mapFieldName(sortInfo.field), sortInfo.direction));
      }
      if (maxResults) {
        constraints.push(firestoreLimit(maxResults));
      }

      const q = query(colRef, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => docToObject<T>(d));
    },

    async get(id: string): Promise<T | null> {
      const db = getDb();
      const tenantId = await getTenantId();
      const docRef = doc(db, 'tenants', tenantId, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return docToObject<T>(docSnap);
    },

    async create(data: Partial<T>): Promise<T> {
      const colRef = await getTenantCollection(collectionName);
      const tenantId = await getTenantId();
      const docData = {
        ...data,
        tenant_id: tenantId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      const docRef = await addDoc(colRef, docData);
      // Return the created document with its ID
      const created = await getDoc(docRef);
      return docToObject<T>(created);
    },

    async update(id: string, data: Partial<T>): Promise<T> {
      const db = getDb();
      const tenantId = await getTenantId();
      const docRef = doc(db, 'tenants', tenantId, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp(),
      } as DocumentData);
      // Return the updated document
      const updated = await getDoc(docRef);
      return docToObject<T>(updated);
    },

    async delete(id: string): Promise<void> {
      const db = getDb();
      const tenantId = await getTenantId();
      const docRef = doc(db, 'tenants', tenantId, collectionName, id);
      await deleteDoc(docRef);
    },

    subscribe(callback: (event: { type: string; data: T }) => void): () => void {
      let unsubscribe: (() => void) | null = null;

      // Set up real-time listener (async initialization)
      getTenantCollection(collectionName).then((colRef) => {
        unsubscribe = onSnapshot(query(colRef), (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            callback({
              type: change.type, // 'added' | 'modified' | 'removed'
              data: docToObject<T>(change.doc),
            });
          });
        });
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    },
  };
}
