import * as functions from "firebase-functions";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const DEFAULT_LIMITS = {
  monthly_pixel_limit: 10000,
  pixel_resolution_limit: 5000,
  max_domains: 5,
  max_users: 10,
  max_dashboards: 20,
  api_requests_per_day: 10000,
};

/** Create a new tenant — super_admin only */
export const createTenant = functions.https.onCall(async (data, context) => {
  const { name, plan, limits, trial_days } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  if (context.auth.token.role !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only super_admin can create tenants");
  }
  if (!name || typeof name !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Tenant name is required");
  }

  const db = getFirestore();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const selectedPlan = plan || "trial";

  // Calculate trial expiration if plan is trial
  let trialExpiresAt = null;
  if (selectedPlan === "trial") {
    const days = typeof trial_days === "number" && trial_days > 0 ? trial_days : 14;
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + days);
    trialExpiresAt = expiresDate.toISOString();
  }

  const tenantRef = db.collection("tenants").doc();
  await tenantRef.set({
    name,
    slug,
    plan: selectedPlan,
    status: selectedPlan === "trial" ? "trial" : "active",
    ...(trialExpiresAt && { trial_expires_at: trialExpiresAt }),
    limits: { ...DEFAULT_LIMITS, ...limits },
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

  return { tenant_id: tenantRef.id };
});

/** Update tenant limits — super_admin only */
export const updateTenantLimits = functions.https.onCall(async (data, context) => {
  const { tenant_id, limits } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  if (context.auth.token.role !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only super_admin can update tenant limits");
  }
  if (!tenant_id) throw new functions.https.HttpsError("invalid-argument", "tenant_id required");
  if (!limits || typeof limits !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "limits object required");
  }

  const db = getFirestore();
  const tenantRef = db.collection("tenants").doc(tenant_id);
  const tenantSnap = await tenantRef.get();

  if (!tenantSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Tenant not found");
  }

  // Merge new limits with existing
  const existing = tenantSnap.data()?.limits || {};
  await tenantRef.update({
    limits: { ...existing, ...limits },
    updated_at: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
