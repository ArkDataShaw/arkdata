import * as functions from "firebase-functions";
import { getAuth } from "firebase-admin/auth";

/** Generate a custom token for impersonating a user — super_admin only */
export const impersonateUser = functions.https.onCall(async (data, context) => {
  const { uid } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  if (context.auth.token.role !== "super_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only super_admin can impersonate users");
  }
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid required");

  // Prevent impersonating yourself
  if (context.auth.uid === uid) {
    throw new functions.https.HttpsError("failed-precondition", "Cannot impersonate yourself");
  }

  const adminAuth = getAuth();

  // Verify target user exists
  const targetUser = await adminAuth.getUser(uid);
  if (!targetUser) {
    throw new functions.https.HttpsError("not-found", "User not found");
  }

  // Create a custom token with the target user's claims
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
});
