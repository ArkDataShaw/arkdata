import * as functions from "firebase-functions";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";

const VALID_ROLES = ["super_admin", "tenant_admin", "analyst", "operator", "read_only"];

/** Check if caller can manage users for a given tenant */
function assertCanManageUsers(
  auth: { uid: string; token: Record<string, unknown> },
  targetTenantId: string
): void {
  const role = auth.token.role as string;
  const callerTenant = auth.token.tenant_id as string;

  if (role === "super_admin") return;
  if (role === "tenant_admin" && callerTenant === targetTenantId) return;

  throw new functions.https.HttpsError("permission-denied", "Insufficient permissions to manage users");
}

/** Invite a user to a tenant — creates auth user, sets claims, sends reset email */
export const inviteUser = functions.https.onCall(async (data, context) => {
  const { email, tenant_id, role } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  assertCanManageUsers(
    { uid: context.auth.uid, token: context.auth.token as Record<string, unknown> },
    tenant_id
  );

  if (!email || typeof email !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Email is required");
  }
  if (!tenant_id) throw new functions.https.HttpsError("invalid-argument", "tenant_id required");
  if (!role || !VALID_ROLES.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
  }

  // Tenant admins cannot invite super_admins
  if (context.auth.token.role !== "super_admin" && role === "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only super_admin can create other super_admins");
  }

  const db = getFirestore();
  const adminAuth = getAuth();

  // Verify tenant exists
  const tenantSnap = await db.collection("tenants").doc(tenant_id).get();
  if (!tenantSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Tenant not found");
  }

  // Create or look up Firebase Auth user
  let userRecord;
  try {
    userRecord = await adminAuth.getUserByEmail(email);
  } catch {
    // User doesn't exist — create with a temporary random password
    const tempPassword = crypto.randomBytes(20).toString("hex");
    userRecord = await adminAuth.createUser({
      email,
      password: tempPassword,
      emailVerified: false,
    });
  }

  // Set custom claims
  await adminAuth.setCustomUserClaims(userRecord.uid, {
    tenant_id,
    role,
  });

  // Create user doc under tenant
  await db.collection("tenants").doc(tenant_id).collection("users").doc(userRecord.uid).set({
    email,
    display_name: userRecord.displayName || email.split("@")[0],
    role,
    tenant_id,
    status: "active",
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  // Increment active_users count on tenant
  await db.collection("tenants").doc(tenant_id).update({
    active_users: FieldValue.increment(1),
    updated_at: FieldValue.serverTimestamp(),
  });

  // Generate password reset link and rewrite to our custom page
  const firebaseResetLink = await adminAuth.generatePasswordResetLink(email);
  const parsedUrl = new URL(firebaseResetLink);
  const oobCode = parsedUrl.searchParams.get("oobCode");
  const resetLink = `https://app.arkdata.io/reset-password?oobCode=${oobCode}`;

  return {
    uid: userRecord.uid,
    email: userRecord.email,
    reset_link: resetLink,
  };
});

/** Update a user's role */
export const updateUserRole = functions.https.onCall(async (data, context) => {
  const { uid, role } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid required");
  if (!role || !VALID_ROLES.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
  }

  const adminAuth = getAuth();
  const db = getFirestore();

  // Look up the target user to find their tenant
  const targetUser = await adminAuth.getUser(uid);
  const targetTenantId = (targetUser.customClaims?.tenant_id as string) || "";

  assertCanManageUsers(
    { uid: context.auth.uid, token: context.auth.token as Record<string, unknown> },
    targetTenantId
  );

  // Tenant admins cannot promote to super_admin
  if (context.auth.token.role !== "super_admin" && role === "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only super_admin can assign super_admin role");
  }

  // Update custom claims (preserve tenant_id)
  await adminAuth.setCustomUserClaims(uid, {
    ...targetUser.customClaims,
    role,
  });

  // Update Firestore user doc
  if (targetTenantId) {
    await db.collection("tenants").doc(targetTenantId).collection("users").doc(uid).update({
      role,
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  return { success: true };
});

/** Delete a user — removes auth user and Firestore doc */
export const deleteUser = functions.https.onCall(async (data, context) => {
  const { uid } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid required");

  // Prevent self-deletion
  if (context.auth.uid === uid) {
    throw new functions.https.HttpsError("failed-precondition", "Cannot delete yourself");
  }

  const adminAuth = getAuth();
  const db = getFirestore();

  const targetUser = await adminAuth.getUser(uid);
  const targetTenantId = (targetUser.customClaims?.tenant_id as string) || "";

  assertCanManageUsers(
    { uid: context.auth.uid, token: context.auth.token as Record<string, unknown> },
    targetTenantId
  );

  // Delete Firestore user doc
  if (targetTenantId) {
    await db.collection("tenants").doc(targetTenantId).collection("users").doc(uid).delete();

    // Decrement active_users count
    await db.collection("tenants").doc(targetTenantId).update({
      active_users: FieldValue.increment(-1),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  // Delete Firebase Auth user
  await adminAuth.deleteUser(uid);

  return { success: true };
});
