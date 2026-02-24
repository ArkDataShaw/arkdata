import * as functions from "firebase-functions";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";

const VALID_ROLES = ["platform_admin", "super_admin", "tenant_admin", "read_only"];

/** Check if a tenant is a child of the caller's tenant */
async function isChildTenant(parentTenantId: string, targetTenantId: string): Promise<boolean> {
  if (parentTenantId === targetTenantId) return true;
  const db = getFirestore();
  const targetSnap = await db.collection("tenants").doc(targetTenantId).get();
  if (!targetSnap.exists) return false;
  return targetSnap.data()?.parent_tenant_id === parentTenantId;
}

/** Check if caller can manage users for a given tenant */
async function assertCanManageUsers(
  auth: { uid: string; token: Record<string, unknown> },
  targetTenantId: string
): Promise<void> {
  const role = auth.token.role as string;
  const callerTenant = auth.token.tenant_id as string;

  if (role === "platform_admin") return;
  if (role === "super_admin" && await isChildTenant(callerTenant, targetTenantId)) return;
  if (role === "tenant_admin" && callerTenant === targetTenantId) return;

  throw new functions.https.HttpsError("permission-denied", "Insufficient permissions to manage users");
}

/** Fetch tenant branding, falling back to defaults */
async function getTenantBrandingForEmail(tenantId: string): Promise<{
  app_name: string;
  logo_url: string;
  primary_color: string;
  footer_text: string;
}> {
  const db = getFirestore();
  const tenantSnap = await db.collection("tenants").doc(tenantId).get();
  const branding = tenantSnap.data()?.branding || {};

  // If child tenant has no branding, try parent
  const parentId = tenantSnap.data()?.parent_tenant_id;
  let parentBranding: Record<string, unknown> = {};
  if (parentId) {
    const parentSnap = await db.collection("tenants").doc(parentId).get();
    parentBranding = parentSnap.data()?.branding || {};
  }

  return {
    app_name: branding.app_name || parentBranding.app_name || "Ark Data",
    logo_url: branding.email_logo_url || parentBranding.email_logo_url || "",
    primary_color: branding.primary_color || parentBranding.primary_color || "#0f172a",
    footer_text: branding.email_footer_text || parentBranding.email_footer_text || "",
  };
}

/** Invite a user to a tenant — creates auth user, sets claims, sends reset email */
export const inviteUser = functions.https.onCall(async (data, context) => {
  const { email, tenant_id, role } = data;

  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  await assertCanManageUsers(
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

  // platform_admin cannot be assigned via invite
  if (role === "platform_admin") {
    throw new functions.https.HttpsError("permission-denied", "platform_admin cannot be assigned via invite");
  }

  // Only platform_admin can assign super_admin
  if (role === "super_admin" && context.auth.token.role !== "platform_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only platform_admin can assign super_admin role");
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

  // Fetch caller's display name and tenant name for the invite email
  const callerRecord = await adminAuth.getUser(context.auth.uid);
  const inviterName = callerRecord.displayName || callerRecord.email || "A team admin";
  const tenantName = tenantSnap.data()?.name || "your team";

  // Fetch tenant branding for email
  const emailBranding = await getTenantBrandingForEmail(tenant_id);

  // Send branded invite email via Gmail SMTP
  const smtpUser = functions.config().smtp?.user || "";
  const smtpPass = functions.config().smtp?.pass || "";

  if (!smtpUser || !smtpPass) {
    functions.logger.error("SMTP credentials not configured. Set smtp.user and smtp.pass via firebase functions:config:set");
    throw new functions.https.HttpsError("internal", "Email service not configured");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const logoHtml = emailBranding.logo_url
    ? `<img src="${emailBranding.logo_url}" alt="${emailBranding.app_name}" style="max-height: 40px; margin-bottom: 8px;" />`
    : "";
  const footerText = emailBranding.footer_text || `${emailBranding.app_name} &middot; <a href="https://app.arkdata.io" style="color: #64748b;">app.arkdata.io</a>`;

  await transporter.sendMail({
    from: `"${emailBranding.app_name} Support" <support@arkdata.io>`,
    to: email,
    subject: `You've been invited to join ${tenantName} on ${emailBranding.app_name}`,
    html: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
        <div style="padding: 32px 24px; text-align: center;">
          ${logoHtml}
          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">${emailBranding.app_name}</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Team Invitation</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 32px 24px; margin: 0 24px;">
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            Hello ${email},
          </p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            ${inviterName} has invited you to the <strong>${tenantName}</strong> team on <strong>${emailBranding.app_name}</strong>.
            Click the button below to set your password and join the team.
          </p>
          <div style="text-align: center;">
            <a href="${resetLink}"
               style="display: inline-block; background: ${emailBranding.primary_color}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
              Join ${tenantName}
            </a>
          </div>
          <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0; line-height: 1.5;">
            Or copy and paste this URL into your browser:<br/>
            <a href="${resetLink}" style="color: #64748b; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
        <div style="padding: 24px; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px;">
            This invitation is intended for ${email}.
          </p>
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            ${footerText}
          </p>
        </div>
      </div>
    `,
  });

  return {
    uid: userRecord.uid,
    email: userRecord.email,
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

  await assertCanManageUsers(
    { uid: context.auth.uid, token: context.auth.token as Record<string, unknown> },
    targetTenantId
  );

  // platform_admin cannot be assigned via role update
  if (role === "platform_admin") {
    throw new functions.https.HttpsError("permission-denied", "platform_admin cannot be assigned via role update");
  }

  // Only platform_admin can assign super_admin
  if (role === "super_admin" && context.auth.token.role !== "platform_admin") {
    throw new functions.https.HttpsError("permission-denied", "Only platform_admin can assign super_admin role");
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

  await assertCanManageUsers(
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

/** Request a password reset — generates link and sends branded email */
export const requestPasswordReset = functions.https.onCall(async (data) => {
  const { email } = data;

  if (!email || typeof email !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Email is required");
  }

  const adminAuth = getAuth();

  // Verify user exists — if not, return success silently (don't reveal account existence)
  try {
    await adminAuth.getUserByEmail(email);
  } catch {
    return { success: true };
  }

  // Generate reset link pointing to our custom page
  const firebaseResetLink = await adminAuth.generatePasswordResetLink(email);
  const parsedUrl = new URL(firebaseResetLink);
  const oobCode = parsedUrl.searchParams.get("oobCode");
  const resetLink = `https://app.arkdata.io/reset-password?oobCode=${oobCode}`;

  // Look up user's tenant for branding
  let emailBranding = { app_name: "Ark Data", logo_url: "", primary_color: "#0f172a", footer_text: "" };
  try {
    const userRecord = await adminAuth.getUserByEmail(email);
    const userTenantId = userRecord.customClaims?.tenant_id as string;
    if (userTenantId) {
      emailBranding = await getTenantBrandingForEmail(userTenantId);
    }
  } catch {
    // Use defaults if lookup fails
  }

  // Send branded email via Gmail SMTP
  const smtpUser = functions.config().smtp?.user || "";
  const smtpPass = functions.config().smtp?.pass || "";

  if (!smtpUser || !smtpPass) {
    functions.logger.error("SMTP credentials not configured. Set smtp.user and smtp.pass via firebase functions:config:set");
    throw new functions.https.HttpsError("internal", "Email service not configured");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const resetLogoHtml = emailBranding.logo_url
    ? `<img src="${emailBranding.logo_url}" alt="${emailBranding.app_name}" style="max-height: 40px; margin-bottom: 8px;" />`
    : "";
  const resetFooterText = emailBranding.footer_text || `${emailBranding.app_name} &middot; <a href="https://app.arkdata.io" style="color: #64748b;">app.arkdata.io</a>`;

  await transporter.sendMail({
    from: `"${emailBranding.app_name}" <support@arkdata.io>`,
    to: email,
    subject: `Reset your ${emailBranding.app_name} password`,
    html: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
        <div style="padding: 32px 24px; text-align: center;">
          ${resetLogoHtml}
          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">${emailBranding.app_name}</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Password Reset</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 32px 24px; margin: 0 24px;">
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            We received a request to reset the password for your account (<strong>${email}</strong>).
          </p>
          <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Click the button below to set a new password. This link expires in 1 hour.
          </p>
          <div style="text-align: center;">
            <a href="${resetLink}"
               style="display: inline-block; background: ${emailBranding.primary_color}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 13px; color: #94a3b8; margin: 24px 0 0; line-height: 1.5;">
            If you didn't request this, you can safely ignore this email. Your password won't change.
          </p>
        </div>
        <div style="padding: 24px; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            ${resetFooterText}
          </p>
        </div>
      </div>
    `,
  });

  return { success: true };
});
