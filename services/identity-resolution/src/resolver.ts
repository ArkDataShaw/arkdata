import type { Firestore } from 'firebase-admin/firestore';
import { matchByHem } from './matchers/hem';
import { matchByEmail } from './matchers/email';
import { matchByPhone } from './matchers/phone';
import { matchByNameCompany } from './matchers/name-company';
import { matchByIpUa } from './matchers/ip-ua';

export interface ResolutionData {
  uuid?: string;
  hem_sha256?: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  company_domain?: string;
  ip_address?: string;
  user_agent?: string;
  [key: string]: unknown;
}

export interface MatchResult {
  matched: boolean;
  visitor_id?: string;
  match_type?: string;
  confidence?: number;
  is_new?: boolean;
}

/**
 * Deterministic identity resolution pipeline.
 *
 * Strategies are ordered by confidence (highest first).
 * First match wins — we don't attempt lower-confidence matches
 * once a high-confidence match is found.
 */
export async function resolveIdentity(
  db: Firestore,
  tenantId: string,
  eventId: string,
  resolution: ResolutionData
): Promise<MatchResult> {
  const visitorsRef = db.collection('tenants').doc(tenantId).collection('visitors');
  const logRef = db.collection('tenants').doc(tenantId).collection('resolution_log');

  // Strategy 1: HEM SHA256 (confidence 0.95)
  if (resolution.hem_sha256) {
    const result = await matchByHem(visitorsRef, resolution);
    if (result.matched) {
      await writeLog(logRef, tenantId, result, eventId, resolution);
      return result;
    }
  }

  // Strategy 2: Email exact match (confidence 0.90)
  if (resolution.email) {
    const result = await matchByEmail(visitorsRef, resolution);
    if (result.matched) {
      await writeLog(logRef, tenantId, result, eventId, resolution);
      return result;
    }
  }

  // Strategy 3: Phone exact match (confidence 0.80)
  if (resolution.phone) {
    const result = await matchByPhone(visitorsRef, resolution);
    if (result.matched) {
      await writeLog(logRef, tenantId, result, eventId, resolution);
      return result;
    }
  }

  // Strategy 4: Name + Company (confidence 0.70)
  if (resolution.first_name && resolution.last_name && resolution.company_domain) {
    const result = await matchByNameCompany(visitorsRef, resolution);
    if (result.matched) {
      await writeLog(logRef, tenantId, result, eventId, resolution);
      return result;
    }
  }

  // Strategy 5: IP + User Agent — session-level (confidence 0.50)
  if (resolution.ip_address && resolution.user_agent) {
    const result = await matchByIpUa(visitorsRef, resolution);
    if (result.matched) {
      await writeLog(logRef, tenantId, result, eventId, resolution);
      return result;
    }
  }

  // No match found — create a new anonymous visitor
  const newVisitor = await visitorsRef.add({
    tenant_id: tenantId,
    hem_sha256: resolution.hem_sha256 ?? null,
    email: resolution.email ?? null,
    first_name: resolution.first_name ?? null,
    last_name: resolution.last_name ?? null,
    company_name: resolution.company_name ?? null,
    company_domain: resolution.company_domain ?? null,
    identity_status: resolution.email ? 'partially_identified' : 'anonymous',
    visitor_status: 'active',
    intent_score: 0,
    event_count: 1,
    session_count: 1,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const result: MatchResult = {
    matched: true,
    visitor_id: newVisitor.id,
    match_type: 'new',
    confidence: 1.0,
    is_new: true,
  };

  await writeLog(logRef, tenantId, result, eventId, resolution);
  return result;
}

async function writeLog(
  logRef: FirebaseFirestore.CollectionReference,
  tenantId: string,
  result: MatchResult,
  eventId: string,
  resolution: ResolutionData
): Promise<void> {
  await logRef.add({
    tenant_id: tenantId,
    visitor_id: result.visitor_id,
    match_type: result.match_type,
    confidence: result.confidence,
    matched_at: new Date().toISOString(),
    source_event_id: eventId,
    matched_fields: Object.fromEntries(
      Object.entries(resolution).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    ),
  });
}
