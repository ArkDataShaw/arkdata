import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import * as dns from "dns";
import { promisify } from "util";

const resolveTxt = promisify(dns.resolveTxt);

/** Check if a tenant is a child of the caller's tenant */
async function isChildTenant(parentTenantId: string, targetTenantId: string): Promise<boolean> {
  if (parentTenantId === targetTenantId) return true;
  const db = getFirestore();
  const targetSnap = await db.collection("tenants").doc(targetTenantId).get();
  if (!targetSnap.exists) return false;
  return targetSnap.data()?.parent_tenant_id === parentTenantId;
}

/** Add a custom domain to a tenant */
export const addDomain = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

  const role = context.auth.token.role as string;
  const callerTenant = context.auth.token.tenant_id as string;
  const { tenant_id, domain } = data;

  if (!tenant_id || !domain) {
    throw new functions.https.HttpsError("invalid-argument", "tenant_id and domain are required");
  }

  // Validate role
  if (role !== "platform_admin" && role !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Insufficient permissions");
  }

  // Scope check for super_admin
  if (role === "super_admin" && !(await isChildTenant(callerTenant, tenant_id))) {
    throw new functions.https.HttpsError("permission-denied", "Cannot manage domains for this tenant");
  }

  // Validate domain format
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid domain format");
  }

  const verificationToken = `arkdata-verify-${crypto.randomBytes(16).toString("hex")}`;

  const db = getFirestore();
  const docRef = await db.collection("tenants").doc(tenant_id).collection("custom_domains").add({
    domain,
    status: "pending",
    verification_token: verificationToken,
    created_at: FieldValue.serverTimestamp(),
  });

  return { domain_id: docRef.id, verification_token: verificationToken };
});

/** Remove a custom domain from a tenant */
export const removeDomain = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

  const role = context.auth.token.role as string;
  const callerTenant = context.auth.token.tenant_id as string;
  const { tenant_id, domain_id } = data;

  if (!tenant_id || !domain_id) {
    throw new functions.https.HttpsError("invalid-argument", "tenant_id and domain_id are required");
  }

  if (role !== "platform_admin" && role !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Insufficient permissions");
  }

  if (role === "super_admin" && !(await isChildTenant(callerTenant, tenant_id))) {
    throw new functions.https.HttpsError("permission-denied", "Cannot manage domains for this tenant");
  }

  const db = getFirestore();
  await db.collection("tenants").doc(tenant_id).collection("custom_domains").doc(domain_id).delete();

  return { success: true };
});

/** Verify a custom domain's DNS TXT record */
export const verifyDomain = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

  const role = context.auth.token.role as string;
  const callerTenant = context.auth.token.tenant_id as string;
  const { tenant_id, domain_id } = data;

  if (!tenant_id || !domain_id) {
    throw new functions.https.HttpsError("invalid-argument", "tenant_id and domain_id are required");
  }

  if (role !== "platform_admin" && role !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Insufficient permissions");
  }

  if (role === "super_admin" && !(await isChildTenant(callerTenant, tenant_id))) {
    throw new functions.https.HttpsError("permission-denied", "Cannot manage domains for this tenant");
  }

  const db = getFirestore();
  const domainDoc = await db.collection("tenants").doc(tenant_id)
    .collection("custom_domains").doc(domain_id).get();

  if (!domainDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Domain not found");
  }

  const domainData = domainDoc.data()!;
  const expectedToken = domainData.verification_token;

  try {
    const records = await resolveTxt(domainData.domain);
    // records is an array of arrays of strings
    const allRecords = records.flat();
    const verified = allRecords.some((r) => r.includes(expectedToken));

    if (verified) {
      await domainDoc.ref.update({
        status: "verified",
        verified_at: FieldValue.serverTimestamp(),
      });
      return { verified: true };
    }

    return { verified: false, message: "TXT record not found. Add a TXT record with the verification token." };
  } catch (err: any) {
    return { verified: false, message: `DNS lookup failed: ${err.code || err.message}` };
  }
});
