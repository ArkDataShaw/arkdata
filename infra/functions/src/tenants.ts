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

/** Check if a tenant is a child of the caller's tenant */
async function isChildTenant(parentTenantId: string, targetTenantId: string): Promise<boolean> {
  if (parentTenantId === targetTenantId) return true;
  const db = getFirestore();
  const targetSnap = await db.collection("tenants").doc(targetTenantId).get();
  if (!targetSnap.exists) return false;
  return targetSnap.data()?.parent_tenant_id === parentTenantId;
}

/** Create a new tenant — platform_admin or super_admin */
export const createTenant = functions.https.onCall(async (data, context) => {
  const { name, plan, limits, trial_days } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  const callerRole = context.auth.token.role as string;
  const callerTenant = context.auth.token.tenant_id as string;

  if (callerRole !== "platform_admin" && callerRole !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only platform_admin or super_admin can create tenants");
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

  // Always create as a child of the caller's tenant
  const parentTenantId = callerTenant;

  const tenantRef = db.collection("tenants").doc();
  await tenantRef.set({
    name,
    slug,
    plan: selectedPlan,
    status: selectedPlan === "trial" ? "trial" : "active",
    ...(trialExpiresAt && { trial_expires_at: trialExpiresAt }),
    parent_tenant_id: parentTenantId,
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

/** Create a top-level partner tenant — platform_admin only */
export const createPartnerTenant = functions.https.onCall(async (data, context) => {
  const { name, max_teams, admin_email } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  const callerRole = context.auth.token.role as string;

  if (callerRole !== "platform_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only platform_admin can create partner tenants");
  }
  if (!name || typeof name !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Partner name is required");
  }

  const db = getFirestore();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const teamLimit = typeof max_teams === "number" && max_teams > 0 ? max_teams : 10;

  const tenantRef = db.collection("tenants").doc();
  await tenantRef.set({
    name,
    slug,
    plan: "partner",
    status: "active",
    parent_tenant_id: null,
    limits: { ...DEFAULT_LIMITS, max_teams: teamLimit },
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

  // Auto-create a default child team with the same name as the partner
  const defaultTeamRef = db.collection("tenants").doc();
  await defaultTeamRef.set({
    name,
    slug: slug + "-default",
    plan: "active",
    status: "active",
    parent_tenant_id: tenantRef.id,
    limits: { ...DEFAULT_LIMITS },
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

  // If admin_email provided, invite a super_admin to the partner tenant
  // and also add them as tenant_admin to the default child team
  if (admin_email && typeof admin_email === "string") {
    const { getAuth } = await import("firebase-admin/auth");
    const auth = getAuth();
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(admin_email);
      } catch {
        userRecord = await auth.createUser({ email: admin_email });
      }
      await auth.setCustomUserClaims(userRecord.uid, {
        role: "super_admin",
        tenant_id: tenantRef.id,
      });
      // Add user to partner tenant
      await db.collection("tenants").doc(tenantRef.id).collection("users").doc(userRecord.uid).set({
        email: admin_email,
        role: "super_admin",
        status: "active",
        created_at: FieldValue.serverTimestamp(),
      });
      // Also add user to the default child team
      await db.collection("tenants").doc(defaultTeamRef.id).collection("users").doc(userRecord.uid).set({
        email: admin_email,
        role: "tenant_admin",
        status: "active",
        created_at: FieldValue.serverTimestamp(),
      });
    } catch (err: unknown) {
      // Tenant was created successfully, but admin invite failed — don't roll back
      console.error("Failed to invite admin to partner tenant:", err);
    }
  }

  return { tenant_id: tenantRef.id, default_team_id: defaultTeamRef.id };
});

/** Update tenant limits — platform_admin or super_admin (scoped to own/child tenants) */
export const updateTenantLimits = functions.https.onCall(async (data, context) => {
  const { tenant_id, limits } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  const callerRole = context.auth.token.role as string;
  const callerTenant = context.auth.token.tenant_id as string;

  if (callerRole !== "platform_admin" && callerRole !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only platform_admin or super_admin can update tenant limits");
  }
  if (!tenant_id) throw new functions.https.HttpsError("invalid-argument", "tenant_id required");
  if (!limits || typeof limits !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "limits object required");
  }

  // super_admin can only update own + child tenants
  if (callerRole === "super_admin" && !(await isChildTenant(callerTenant, tenant_id))) {
    throw new functions.https.HttpsError("permission-denied", "Cannot update limits for tenants outside your hierarchy");
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

/** Update tenant branding — platform_admin or super_admin (scoped) */
export const updateTenantBranding = functions.https.onCall(async (data, context) => {
  const { tenant_id, branding } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  const callerRole = context.auth.token.role as string;
  const callerTenant = context.auth.token.tenant_id as string;

  if (callerRole !== "platform_admin" && callerRole !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only platform_admin or super_admin can update branding");
  }
  if (!tenant_id) throw new functions.https.HttpsError("invalid-argument", "tenant_id required");
  if (!branding || typeof branding !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "branding object required");
  }

  // super_admin can only update own + child tenants
  if (callerRole === "super_admin" && !(await isChildTenant(callerTenant, tenant_id))) {
    throw new functions.https.HttpsError("permission-denied", "Cannot update branding for tenants outside your hierarchy");
  }

  // Validate hex colors if provided
  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  for (const key of ["primary_color", "accent_color"] as const) {
    if (branding[key] && !hexRegex.test(branding[key])) {
      throw new functions.https.HttpsError("invalid-argument", `${key} must be a valid hex color (e.g. #0f172a)`);
    }
  }

  // Validate URLs if provided
  const urlFields = ["logo_url", "favicon_url", "email_logo_url"] as const;
  for (const key of urlFields) {
    if (branding[key] && typeof branding[key] === "string" && branding[key].length > 0) {
      try {
        new URL(branding[key]);
      } catch {
        // Allow relative URLs like /logo.png
        if (!branding[key].startsWith("/")) {
          throw new functions.https.HttpsError("invalid-argument", `${key} must be a valid URL`);
        }
      }
    }
  }

  // Only allow known branding fields
  const allowedKeys = ["logo_url", "app_name", "primary_color", "accent_color", "favicon_url", "email_logo_url", "email_footer_text"];
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (branding[key] !== undefined) {
      sanitized[key] = branding[key];
    }
  }

  const db = getFirestore();
  const tenantRef = db.collection("tenants").doc(tenant_id);
  const tenantSnap = await tenantRef.get();

  if (!tenantSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Tenant not found");
  }

  const existing = tenantSnap.data()?.branding || {};
  await tenantRef.update({
    branding: { ...existing, ...sanitized },
    updated_at: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
