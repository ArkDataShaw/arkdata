import type { Firestore } from 'firebase-admin/firestore';

export interface ProvenanceEntry {
  tenant_id: string;
  visitor_id: string;
  person_id?: string;
  match_type: string;
  confidence: number;
  source_event_id: string;
  matched_fields: Record<string, string>;
}

/**
 * Write a provenance entry to the resolution log.
 * This creates an audit trail for every identity match decision.
 */
export async function writeProvenance(
  db: Firestore,
  entry: ProvenanceEntry
): Promise<string> {
  const logRef = db
    .collection('tenants')
    .doc(entry.tenant_id)
    .collection('resolution_log');

  const doc = await logRef.add({
    ...entry,
    matched_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  return doc.id;
}

/**
 * Get resolution history for a visitor.
 */
export async function getResolutionHistory(
  db: Firestore,
  tenantId: string,
  visitorId: string,
  limit = 50
): Promise<ProvenanceEntry[]> {
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('resolution_log')
    .where('visitor_id', '==', visitorId)
    .orderBy('matched_at', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    ...(doc.data() as ProvenanceEntry),
  }));
}
