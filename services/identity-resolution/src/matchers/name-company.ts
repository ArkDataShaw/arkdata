import type { CollectionReference } from 'firebase-admin/firestore';
import type { ResolutionData, MatchResult } from '../resolver';

/**
 * Match by first_name + last_name + company_domain.
 * Confidence: 0.70
 */
export async function matchByNameCompany(
  visitorsRef: CollectionReference,
  resolution: ResolutionData
): Promise<MatchResult> {
  if (!resolution.first_name || !resolution.last_name || !resolution.company_domain) {
    return { matched: false };
  }

  const firstName = resolution.first_name.toLowerCase().trim();
  const lastName = resolution.last_name.toLowerCase().trim();
  const domain = resolution.company_domain.toLowerCase().trim();

  const snapshot = await visitorsRef
    .where('company_domain', '==', domain)
    .get();

  // Firestore doesn't support case-insensitive queries, so we filter in memory
  const match = snapshot.docs.find((doc) => {
    const data = doc.data();
    return (
      (data.first_name ?? '').toLowerCase() === firstName &&
      (data.last_name ?? '').toLowerCase() === lastName
    );
  });

  if (!match) {
    return { matched: false };
  }

  return {
    matched: true,
    visitor_id: match.id,
    match_type: 'name_company',
    confidence: 0.70,
  };
}
