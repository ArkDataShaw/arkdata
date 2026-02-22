/**
 * Bootstrap script: Create or promote a user to super_admin
 *
 * Usage:
 *   npx ts-node infra/functions/scripts/seed-admin.ts shaw@arkdata.io
 *
 * What it does:
 *   1. Looks up or creates the Firebase Auth user
 *   2. Sets custom claims: { role: 'super_admin', tenant_id: 'arkdata' }
 *   3. Creates /tenants/arkdata doc if missing
 *   4. Creates /tenants/arkdata/users/{uid} doc
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const TENANT_ID = "arkdata";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx ts-node seed-admin.ts <email>");
    process.exit(1);
  }

  // Initialize with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS env var)
  // or the default service account when running on GCP
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(serviceAccountPath);
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp();
  }

  const auth = getAuth();
  const db = getFirestore();

  // 1. Look up or create the user
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Found existing user: ${user.uid}`);
  } catch {
    console.log(`User not found, creating: ${email}`);
    user = await auth.createUser({
      email,
      emailVerified: true,
    });
    console.log(`Created user: ${user.uid}`);
  }

  // 2. Set custom claims
  await auth.setCustomUserClaims(user.uid, {
    role: "super_admin",
    tenant_id: TENANT_ID,
  });
  console.log(`Set claims: role=super_admin, tenant_id=${TENANT_ID}`);

  // 3. Create /tenants/arkdata if missing
  const tenantRef = db.collection("tenants").doc(TENANT_ID);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) {
    await tenantRef.set({
      name: "Ark Data",
      slug: "arkdata",
      plan: "enterprise",
      status: "active",
      limits: {
        monthly_pixel_limit: 999999,
        pixel_resolution_limit: 999999,
        max_domains: 999,
        max_users: 999,
        max_dashboards: 999,
        api_requests_per_day: 999999,
      },
      settings: {
        event_retention_days: 365,
        max_pixels: 999,
        max_users: 999,
        features: ["all"],
      },
      active_users: 1,
      domain_count: 0,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    console.log(`Created tenant: ${TENANT_ID}`);
  } else {
    console.log(`Tenant ${TENANT_ID} already exists`);
  }

  // 4. Create user doc under tenant
  await tenantRef.collection("users").doc(user.uid).set(
    {
      email,
      display_name: user.displayName || email.split("@")[0],
      role: "super_admin",
      tenant_id: TENANT_ID,
      created_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Created/updated user doc: /tenants/${TENANT_ID}/users/${user.uid}`);

  console.log("\nDone! Log out and back in to refresh claims.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
