import type { CollectionReference } from 'firebase-admin/firestore';
import type { ResolutionData, MatchResult } from '../resolver';

/**
 * Match by phone number (normalized).
 * Confidence: 0.80
 */
export async function matchByPhone(
  visitorsRef: CollectionReference,
  resolution: ResolutionData
): Promise<MatchResult> {
  if (!resolution.phone) {
    return { matched: false };
  }

  // Normalize phone: strip non-digits
  const normalized = resolution.phone.replace(/\D/g, '');
  if (normalized.length < 10) {
    return { matched: false };
  }

  // Check mobile, direct, and personal phone fields
  const fields = ['mobile_phone', 'direct_number', 'phone'];
  for (const field of fields) {
    const snapshot = await visitorsRef
      .where(field, '==', normalized)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return {
        matched: true,
        visitor_id: snapshot.docs[0].id,
        match_type: 'phone',
        confidence: 0.80,
      };
    }
  }

  return { matched: false };
}
