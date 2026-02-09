import type { CollectionReference } from 'firebase-admin/firestore';
import type { ResolutionData, MatchResult } from '../resolver';

/**
 * Match by plaintext email address.
 * Confidence: 0.90
 */
export async function matchByEmail(
  visitorsRef: CollectionReference,
  resolution: ResolutionData
): Promise<MatchResult> {
  if (!resolution.email) {
    return { matched: false };
  }

  const email = resolution.email.toLowerCase().trim();

  // Check both personal and business email fields
  const [personalSnap, businessSnap] = await Promise.all([
    visitorsRef.where('email', '==', email).limit(1).get(),
    visitorsRef.where('business_email', '==', email).limit(1).get(),
  ]);

  const match = !personalSnap.empty
    ? personalSnap.docs[0]
    : !businessSnap.empty
      ? businessSnap.docs[0]
      : null;

  if (!match) {
    return { matched: false };
  }

  return {
    matched: true,
    visitor_id: match.id,
    match_type: 'email',
    confidence: 0.90,
  };
}
