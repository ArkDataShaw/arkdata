import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Visitor } from '@arkdata/shared-types';

/**
 * COALESCE upsert — merges incoming resolution data into an existing visitor
 * document without overwriting populated fields with empty strings.
 *
 * Lookup order: uuid -> hem_sha256 -> email -> create new visitor.
 *
 * Uses a Firestore transaction for atomicity.
 */
export async function coalesceUpsert(
  tenantId: string,
  resolution: Record<string, unknown>,
  eventId: string,
): Promise<string> {
  const db = getFirestore();
  const visitorsRef = db.collection(`tenants/${tenantId}/visitors`);

  return db.runTransaction(async (tx) => {
    // --- Step 1: Locate existing visitor by identity waterfall ---
    let visitorRef: FirebaseFirestore.DocumentReference | null = null;
    let existingData: Partial<Visitor> | null = null;

    // Try uuid first
    if (resolution.uuid && typeof resolution.uuid === 'string') {
      const snap = await tx.get(
        visitorsRef.where('hem_sha256', '==', '___noop___').limit(0), // prime tx read-set
      );
      // Look up by document ID convention: uuid is the doc ID when available
      const byUuid = await tx.get(
        visitorsRef.where('id', '==', resolution.uuid).limit(1),
      );
      // Fallback: also check a dedicated uuid field match
      const byUuidField = byUuid.empty
        ? await tx.get(visitorsRef.where('uuid' as any, '==', resolution.uuid).limit(1))
        : byUuid;
      if (!byUuidField.empty) {
        visitorRef = byUuidField.docs[0].ref;
        existingData = byUuidField.docs[0].data() as Partial<Visitor>;
      }
    }

    // Try hem_sha256
    if (!visitorRef && resolution.hem_sha256 && typeof resolution.hem_sha256 === 'string') {
      const snap = await tx.get(
        visitorsRef.where('hem_sha256', '==', resolution.hem_sha256).limit(1),
      );
      if (!snap.empty) {
        visitorRef = snap.docs[0].ref;
        existingData = snap.docs[0].data() as Partial<Visitor>;
      }
    }

    // Try email
    if (!visitorRef && resolution.email && typeof resolution.email === 'string') {
      const snap = await tx.get(
        visitorsRef.where('email', '==', resolution.email).limit(1),
      );
      if (!snap.empty) {
        visitorRef = snap.docs[0].ref;
        existingData = snap.docs[0].data() as Partial<Visitor>;
      }
    }

    const now = new Date().toISOString();

    // --- Step 2: Build merged payload via COALESCE ---
    if (visitorRef && existingData) {
      const merged = coalesceFields(existingData, resolution);

      // Increment event_count
      merged.event_count = FieldValue.increment(1) as any;

      // last_seen_at = max(existing, now)
      merged.last_seen_at = maxTimestamp(existingData.last_seen_at, now);

      // Never overwrite first_seen_at
      delete (merged as any).first_seen_at;

      merged.updated_at = now;

      // Determine identity status based on available data
      merged.identity_status = deriveIdentityStatus(existingData, resolution);

      tx.update(visitorRef, merged);
      return visitorRef.id;
    }

    // --- Step 3: Create new visitor ---
    const newRef = visitorsRef.doc();
    const newVisitor: Record<string, unknown> = {
      id: newRef.id,
      tenant_id: tenantId,
      identity_status: resolution.email ? 'partially_identified' : 'anonymous',
      visitor_status: 'active',
      intent_score: 0,
      event_count: 1,
      session_count: 1,
      first_seen_at: now,
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    };

    // Apply resolution fields to new visitor (skip empty strings)
    for (const [key, value] of Object.entries(resolution)) {
      if (value !== undefined && value !== null && value !== '') {
        newVisitor[key] = value;
      }
    }

    tx.set(newRef, newVisitor);
    return newRef.id;
  });
}

/**
 * COALESCE merge: for each field in incoming, only overwrite existing
 * if the incoming value is non-empty. Never replace a populated field
 * with an empty string.
 */
function coalesceFields(
  existing: Partial<Visitor>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const [key, incomingValue] of Object.entries(incoming)) {
    // Skip system fields managed elsewhere
    if (['id', 'tenant_id', 'created_at', 'event_count', 'session_count'].includes(key)) {
      continue;
    }

    const existingValue = (existing as Record<string, unknown>)[key];

    // Only overwrite if incoming is non-empty
    if (incomingValue === undefined || incomingValue === null || incomingValue === '') {
      continue; // keep existing value
    }

    // If existing already has a non-empty value and incoming is also non-empty,
    // prefer incoming (latest data wins, as long as it's not empty)
    merged[key] = incomingValue;
  }

  return merged;
}

/**
 * Returns the later of two ISO timestamp strings.
 */
function maxTimestamp(a: string | undefined, b: string): string {
  if (!a) return b;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * Derives the identity status from existing + incoming resolution data.
 */
function deriveIdentityStatus(
  existing: Partial<Visitor>,
  incoming: Record<string, unknown>,
): Visitor['identity_status'] {
  const email = incoming.email || existing.email;
  const firstName = incoming.first_name || existing.first_name;
  const lastName = incoming.last_name || existing.last_name;
  const hem = incoming.hem_sha256 || existing.hem_sha256;

  if (email && firstName && lastName) {
    return 'identified';
  }
  if (email || hem) {
    return 'partially_identified';
  }
  return 'anonymous';
}
