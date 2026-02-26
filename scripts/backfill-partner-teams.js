/**
 * Backfill default child teams for existing partner tenants that don't have any.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/backfill-partner-teams.js
 *
 * Or if already authenticated via gcloud:
 *   GOOGLE_CLOUD_PROJECT=arkdata-platform node scripts/backfill-partner-teams.js
 */
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT || "arkdata-platform" });
const db = getFirestore();

async function main() {
  // Find all partner tenants (plan === "partner", parent_tenant_id === null)
  const partnersSnap = await db.collection("tenants")
    .where("plan", "==", "partner")
    .get();

  console.log(`Found ${partnersSnap.size} partner tenant(s)`);

  for (const partnerDoc of partnersSnap.docs) {
    const partner = partnerDoc.data();
    const partnerId = partnerDoc.id;
    console.log(`\nChecking partner: ${partner.name} (${partnerId})`);

    // Check if this partner already has child teams
    const childrenSnap = await db.collection("tenants")
      .where("parent_tenant_id", "==", partnerId)
      .get();

    if (childrenSnap.size > 0) {
      console.log(`  Already has ${childrenSnap.size} child team(s) — skipping`);
      continue;
    }

    // Create a default child team
    const slug = partner.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const defaultTeamRef = db.collection("tenants").doc();
    await defaultTeamRef.set({
      name: partner.name,
      slug: slug + "-default",
      plan: "active",
      status: "active",
      parent_tenant_id: partnerId,
      limits: {
        monthly_pixel_limit: 10000,
        pixel_resolution_limit: 5000,
        max_domains: 5,
        max_users: 10,
        max_dashboards: 20,
        api_requests_per_day: 10000,
      },
      settings: {
        event_retention_days: 90,
        max_pixels: 10,
        max_users: 10,
        features: [],
      },
      active_users: 0,
      domain_count: 0,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    console.log(`  Created default team: ${defaultTeamRef.id}`);

    // Copy partner's users to the child team
    const usersSnap = await db.collection("tenants").doc(partnerId).collection("users").get();
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      await db.collection("tenants").doc(defaultTeamRef.id).collection("users").doc(userDoc.id).set({
        email: userData.email,
        role: "tenant_admin",
        status: "active",
        created_at: FieldValue.serverTimestamp(),
      });
      console.log(`  Added user ${userData.email} to default team`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
