import type { CollectionReference } from 'firebase-admin/firestore';
import type { ResolutionData, MatchResult } from '../resolver';

/**
 * Match by IP address + User Agent (session-level fingerprint).
 * Lowest confidence — only used when no stronger signals exist.
 * Only matches visitors seen in the last 30 minutes (same session).
 * Confidence: 0.50
 */
export async function matchByIpUa(
  visitorsRef: CollectionReference,
  resolution: ResolutionData
): Promise<MatchResult> {
  if (!resolution.ip_address || !resolution.user_agent) {
    return { matched: false };
  }

  // Only look at visitors active in the last 30 minutes
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const snapshot = await visitorsRef
    .where('last_ip_address', '==', resolution.ip_address)
    .where('last_seen_at', '>=', thirtyMinAgo)
    .limit(5)
    .get();

  // Check user agent match in memory
  const match = snapshot.docs.find((doc) => {
    const data = doc.data();
    return data.last_user_agent === resolution.user_agent;
  });

  if (!match) {
    return { matched: false };
  }

  return {
    matched: true,
    visitor_id: match.id,
    match_type: 'ip_ua',
    confidence: 0.50,
  };
}
