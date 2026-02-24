#!/usr/bin/env node
/**
 * Migration Script: Promote users to platform_admin and set up whitelabel tenant structure.
 *
 * Run once via Firebase Admin SDK:
 *   node scripts/migrate-platform-admin.js
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account key, OR
 *   - Run from a GCP environment with default credentials
 *
 * After running:
 *   - Both users must sign out and back in to refresh their auth claims.
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// ── Configuration ────────────────────────────────────────────────────
const PLATFORM_ADMINS = [
  // Add the email addresses of Noah and Shaw here
  process.env.NOAH_EMAIL || "noah@arkdata.io",
  process.env.SHAW_EMAIL || "shaw@arkdata.io",
];

const ARKDATA_TENANT_ID = "arkdata";

const DEFAULT_BRANDING = {
  app_name: "Ark Data",
  logo_url: "/logo.png",
  primary_color: "#0f172a",
  accent_color: "#7c3aed",
};

// ── Initialize Firebase Admin ────────────────────────────────────────
initializeApp();
const adminAuth = getAuth();
const db = getFirestore();

async function main() {
  console.log("=== Platform Admin Migration ===\n");

  // Step 1: Promote users to platform_admin
  console.log("Step 1: Promoting users to platform_admin...");
  for (const email of PLATFORM_ADMINS) {
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      console.log(`  Found user: ${email} (uid: ${userRecord.uid})`);

      // Update custom claims
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: "platform_admin",
        tenant_id: ARKDATA_TENANT_ID,
      });
      console.log(`  ✓ Updated claims: role=platform_admin, tenant_id=${ARKDATA_TENANT_ID}`);

      // Update Firestore user doc
      const userDocRef = db.collection("tenants").doc(ARKDATA_TENANT_ID).collection("users").doc(userRecord.uid);
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        await userDocRef.update({
          role: "platform_admin",
          updated_at: FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ Updated Firestore user doc`);
      } else {
        console.log(`  ⚠ No Firestore user doc found at tenants/${ARKDATA_TENANT_ID}/users/${userRecord.uid}`);
      }
    } catch (err) {
      console.error(`  ✗ Failed for ${email}: ${err.message}`);
    }
  }

  // Step 2: Set parent_tenant_id on all existing tenants
  // - The "arkdata" tenant is the platform root → parent_tenant_id: null
  // - All other existing tenants are clients of ArkData → parent_tenant_id: "arkdata"
  console.log("\nStep 2: Setting parent_tenant_id on all existing tenants...");
  const tenantsSnap = await db.collection("tenants").get();
  let updated = 0;
  for (const tenantDoc of tenantsSnap.docs) {
    const data = tenantDoc.data();
    if (data.parent_tenant_id === undefined) {
      const parentId = tenantDoc.id === ARKDATA_TENANT_ID ? null : ARKDATA_TENANT_ID;
      await tenantDoc.ref.update({
        parent_tenant_id: parentId,
        updated_at: FieldValue.serverTimestamp(),
      });
      console.log(`  ${tenantDoc.id === ARKDATA_TENANT_ID ? "⬡" : "↳"} ${data.name || tenantDoc.id} → parent: ${parentId || "(root)"}`);
      updated++;
    }
  }
  console.log(`  ✓ Updated ${updated} tenants (${tenantsSnap.size} total)`);

  // Step 3: Set default branding on arkdata tenant
  console.log("\nStep 3: Setting default branding on arkdata tenant...");
  const arkdataRef = db.collection("tenants").doc(ARKDATA_TENANT_ID);
  const arkdataSnap = await arkdataRef.get();
  if (arkdataSnap.exists) {
    const data = arkdataSnap.data();
    if (!data.branding) {
      await arkdataRef.update({
        branding: DEFAULT_BRANDING,
        updated_at: FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ Set default branding on arkdata tenant`);
    } else {
      console.log(`  ⚠ Branding already exists on arkdata tenant, skipping`);
    }
  } else {
    console.log(`  ✗ arkdata tenant not found!`);
  }

  console.log("\n=== Migration Complete ===");
  console.log("\nIMPORTANT: Both platform admin users must sign out and back in to refresh their auth claims.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
