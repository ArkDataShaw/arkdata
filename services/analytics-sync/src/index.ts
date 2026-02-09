import * as admin from 'firebase-admin';
import { Pool } from 'pg';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

/**
 * Sync a visitor document from Firestore to PostgreSQL.
 * Uses UPSERT (INSERT ... ON CONFLICT UPDATE) to handle both creates and updates.
 */
async function syncVisitor(tenantId: string, visitorId: string, data: Record<string, unknown>): Promise<void> {
  const query = `
    INSERT INTO visitors (
      id, tenant_id, first_name, last_name, email, personal_email, business_email,
      phone, mobile_phone, direct_number, hem_sha256, sha256_personal_email,
      personal_address, personal_city, personal_state, personal_zip,
      company_name, company_domain, company_industry, company_employee_count,
      company_revenue, company_phone, company_city, company_state, company_zip,
      job_title, department, seniority_level, linkedin_url,
      age_range, gender, married, children, homeowner, net_worth, income_range,
      identity_status, visitor_status, intent_score, event_count, session_count,
      first_seen_at, last_seen_at, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
      $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
      $37, $38, $39, $40, $41, $42, $43, $44, $45
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), visitors.first_name),
      last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), visitors.last_name),
      email = COALESCE(NULLIF(EXCLUDED.email, ''), visitors.email),
      company_name = COALESCE(NULLIF(EXCLUDED.company_name, ''), visitors.company_name),
      job_title = COALESCE(NULLIF(EXCLUDED.job_title, ''), visitors.job_title),
      identity_status = EXCLUDED.identity_status,
      visitor_status = EXCLUDED.visitor_status,
      intent_score = EXCLUDED.intent_score,
      event_count = EXCLUDED.event_count,
      session_count = EXCLUDED.session_count,
      last_seen_at = GREATEST(visitors.last_seen_at, EXCLUDED.last_seen_at),
      updated_at = NOW()
  `;

  const values = [
    visitorId, tenantId,
    data.first_name ?? null, data.last_name ?? null, data.email ?? null,
    data.personal_email ?? null, data.business_email ?? null,
    data.phone ?? null, data.mobile_phone ?? null, data.direct_number ?? null,
    data.hem_sha256 ?? null, data.sha256_personal_email ?? null,
    data.personal_address ?? null, data.personal_city ?? null,
    data.personal_state ?? null, data.personal_zip ?? null,
    data.company_name ?? null, data.company_domain ?? null,
    data.company_industry ?? null, data.company_employee_count ?? null,
    data.company_revenue ?? null, data.company_phone ?? null,
    data.company_city ?? null, data.company_state ?? null, data.company_zip ?? null,
    data.job_title ?? null, data.department ?? null,
    data.seniority_level ?? null, data.linkedin_url ?? null,
    data.age_range ?? null, data.gender ?? null, data.married ?? null,
    data.children ?? null, data.homeowner ?? null,
    data.net_worth ?? null, data.income_range ?? null,
    data.identity_status ?? 'anonymous', data.visitor_status ?? 'active',
    data.intent_score ?? 0, data.event_count ?? 0, data.session_count ?? 0,
    data.first_seen_at ?? new Date().toISOString(),
    data.last_seen_at ?? new Date().toISOString(),
    data.created_at ?? new Date().toISOString(),
    new Date().toISOString(),
  ];

  await pool.query(query, values);
}

/**
 * Sync an event document from Firestore to PostgreSQL.
 * Events are append-only — INSERT only, no upsert needed.
 */
async function syncEvent(tenantId: string, eventId: string, data: Record<string, unknown>): Promise<void> {
  const query = `
    INSERT INTO events (
      id, tenant_id, visitor_id, pixel_id, event_type, url, referrer,
      time_on_page_sec, scroll_depth, event_timestamp, metadata, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (id) DO NOTHING
  `;

  const values = [
    eventId, tenantId,
    data.visitor_id ?? null, data.pixel_id ?? null,
    data.event_type ?? 'page_view', data.url ?? null, data.referrer ?? null,
    data.time_on_page_sec ?? null, data.scroll_depth ?? null,
    data.event_timestamp ?? new Date().toISOString(),
    data.metadata ? JSON.stringify(data.metadata) : null,
    data.created_at ?? new Date().toISOString(),
  ];

  await pool.query(query, values);
}

/**
 * Listen for Firestore changes across all tenants and sync to PostgreSQL.
 * This runs as a long-lived process.
 */
async function startListeners(): Promise<void> {
  // Listen for tenant collection changes
  const tenantsRef = db.collection('tenants');
  const tenantSnap = await tenantsRef.get();

  for (const tenantDoc of tenantSnap.docs) {
    const tenantId = tenantDoc.id;

    // Visitor listener
    db.collection('tenants').doc(tenantId).collection('visitors')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added' || change.type === 'modified') {
            try {
              await syncVisitor(tenantId, change.doc.id, change.doc.data());
            } catch (error) {
              console.error(`Failed to sync visitor ${change.doc.id}:`, error);
            }
          }
        });
      });

    // Event listener
    db.collection('tenants').doc(tenantId).collection('events')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            try {
              await syncEvent(tenantId, change.doc.id, change.doc.data());
            } catch (error) {
              console.error(`Failed to sync event ${change.doc.id}:`, error);
            }
          }
        });
      });

    console.log(`Started listeners for tenant ${tenantId}`);
  }

  console.log(`Analytics sync service started for ${tenantSnap.size} tenants`);
}

startListeners().catch(console.error);

export { syncVisitor, syncEvent };
