import type { CollectionReference } from 'firebase-admin/firestore';
import type { ResolutionData, MatchResult } from '../resolver';

/**
 * Match by Hashed Email (HEM) SHA256.
 * Highest confidence match — the pixel provider resolved the visitor's
 * email hash which directly maps to a known visitor.
 * Confidence: 0.95
 */
export async function matchByHem(
  visitorsRef: CollectionReference,
  resolution: ResolutionData
): Promise<MatchResult> {
  if (!resolution.hem_sha256) {
    return { matched: false };
  }

  const snapshot = await visitorsRef
    .where('hem_sha256', '==', resolution.hem_sha256)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { matched: false };
  }

  const visitor = snapshot.docs[0];
  return {
    matched: true,
    visitor_id: visitor.id,
    match_type: 'hem',
    confidence: 0.95,
  };
}
