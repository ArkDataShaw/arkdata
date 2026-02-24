import * as functions from "firebase-functions";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** Check if a tenant is a child of the caller's tenant */
async function isChildTenant(parentTenantId: string, targetTenantId: string): Promise<boolean> {
  if (parentTenantId === targetTenantId) return true;
  const db = getFirestore();
  const targetSnap = await db.collection("tenants").doc(targetTenantId).get();
  if (!targetSnap.exists) return false;
  return targetSnap.data()?.parent_tenant_id === parentTenantId;
}

/** Generate a custom token for impersonating a user — platform_admin or super_admin (scoped) */
export const impersonateUser = functions.https.onCall(async (data, context) => {
  const { uid } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  const callerRole = context.auth.token.role as string;
  const callerTenant = context.auth.token.tenant_id as string;

  if (callerRole !== "platform_admin" && callerRole !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only platform_admin or super_admin can impersonate users");
  }
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid required");

  // Prevent impersonating yourself
  if (context.auth.uid === uid) {
    throw new functions.https.HttpsError("failed-precondition", "Cannot impersonate yourself");
  }

  const adminAuth = getAuth();

  // Verify target user exists
  let targetUser;
  try {
    targetUser = await adminAuth.getUser(uid);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    functions.logger.error("getUser failed:", message);
    throw new functions.https.HttpsError("not-found", `User not found: ${message}`);
  }

  // super_admin can only impersonate users in own + child tenants
  const targetTenantId = (targetUser.customClaims?.tenant_id as string) || "";
  if (callerRole === "super_admin" && targetTenantId && !(await isChildTenant(callerTenant, targetTenantId))) {
    throw new functions.https.HttpsError("permission-denied", "Cannot impersonate users outside your tenant hierarchy");
  }

  // Create a custom token with the target user's claims + impersonation marker
  try {
    const customToken = await adminAuth.createCustomToken(uid, {
      ...(targetUser.customClaims || {}),
      impersonated_by: context.auth.uid,
    });

    return {
      custom_token: customToken,
      target_user: {
        uid: targetUser.uid,
        email: targetUser.email,
        display_name: targetUser.displayName,
        tenant_id: targetUser.customClaims?.tenant_id,
        role: targetUser.customClaims?.role,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    functions.logger.error("createCustomToken failed:", message);
    throw new functions.https.HttpsError(
      "internal",
      `Failed to create impersonation token: ${message}`
    );
  }
});

/** End impersonation — return to the original super_admin account */
export const endImpersonation = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

  const { original_uid } = data;
  if (!original_uid) throw new functions.https.HttpsError("invalid-argument", "original_uid required");

  const adminAuth = getAuth();

  let originalUser;
  try {
    originalUser = await adminAuth.getUser(original_uid);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    functions.logger.error("getUser failed:", message);
    throw new functions.https.HttpsError("not-found", `Original admin user not found: ${message}`);
  }

  const originalRole = originalUser.customClaims?.role as string;
  if (originalRole !== "platform_admin" && originalRole !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Original user is not an admin");
  }

  try {
    const customToken = await adminAuth.createCustomToken(original_uid, {
      ...(originalUser.customClaims || {}),
    });

    return {
      custom_token: customToken,
      admin_user: {
        uid: originalUser.uid,
        email: originalUser.email,
        display_name: originalUser.displayName,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    functions.logger.error("createCustomToken failed:", message);
    throw new functions.https.HttpsError(
      "internal",
      `Failed to create return token: ${message}`
    );
  }
});
