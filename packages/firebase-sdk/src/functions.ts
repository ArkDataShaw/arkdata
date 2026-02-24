/**
 * Cloud Function client wrappers.
 * Wraps httpsCallable() for each admin Cloud Function.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { getApp, getAuthInstance } from './config';
import { clearTenantIdCache, saveImpersonationOrigin, clearImpersonationOrigin, getImpersonationOrigin } from './auth';

function getCallable<TData, TResult>(name: string) {
  const functions = getFunctions(getApp());
  return httpsCallable<TData, TResult>(functions, name);
}

/** Create a new tenant */
export async function createTenantFn(
  name: string,
  plan?: string,
  limits?: Record<string, number>,
  trialDays?: number
): Promise<{ tenant_id: string }> {
  const fn = getCallable<
    { name: string; plan?: string; limits?: Record<string, number>; trial_days?: number },
    { tenant_id: string }
  >('createTenant');
  const result = await fn({ name, plan, limits, trial_days: trialDays });
  return result.data;
}

/** Create a top-level partner tenant (platform_admin only) */
export async function createPartnerTenantFn(
  name: string,
  maxTeams?: number,
  adminEmail?: string
): Promise<{ tenant_id: string }> {
  const fn = getCallable<
    { name: string; max_teams?: number; admin_email?: string },
    { tenant_id: string }
  >('createPartnerTenant');
  const result = await fn({ name, max_teams: maxTeams, admin_email: adminEmail });
  return result.data;
}

/** Invite a user to a tenant */
export async function inviteUserFn(
  email: string,
  tenantId: string,
  role: string
): Promise<{ uid: string; email: string; reset_link: string }> {
  const fn = getCallable<
    { email: string; tenant_id: string; role: string },
    { uid: string; email: string; reset_link: string }
  >('inviteUser');
  const result = await fn({ email, tenant_id: tenantId, role });
  return result.data;
}

/** Update a user's role */
export async function updateUserRoleFn(
  uid: string,
  role: string
): Promise<{ success: boolean }> {
  const fn = getCallable<
    { uid: string; role: string },
    { success: boolean }
  >('updateUserRole');
  const result = await fn({ uid, role });
  return result.data;
}

/** Delete a user */
export async function deleteTenantUser(
  uid: string
): Promise<{ success: boolean }> {
  const fn = getCallable<{ uid: string }, { success: boolean }>('deleteUser');
  const result = await fn({ uid });
  return result.data;
}

/** Update tenant limits */
export async function updateTenantLimitsFn(
  tenantId: string,
  limits: Record<string, number>
): Promise<{ success: boolean }> {
  const fn = getCallable<
    { tenant_id: string; limits: Record<string, number> },
    { success: boolean }
  >('updateTenantLimits');
  const result = await fn({ tenant_id: tenantId, limits });
  return result.data;
}

/** Update tenant branding */
export async function updateTenantBrandingFn(
  tenantId: string,
  branding: Record<string, string>
): Promise<{ success: boolean }> {
  const fn = getCallable<
    { tenant_id: string; branding: Record<string, string> },
    { success: boolean }
  >('updateTenantBranding');
  const result = await fn({ tenant_id: tenantId, branding });
  return result.data;
}

/** Request a password reset — sends branded email from support@arkdata.io */
export async function requestPasswordResetFn(
  email: string
): Promise<{ success: boolean }> {
  const fn = getCallable<{ email: string }, { success: boolean }>('requestPasswordReset');
  const result = await fn({ email });
  return result.data;
}

/** Add a custom domain to a tenant */
export async function addDomainFn(
  tenantId: string,
  domain: string
): Promise<{ domain_id: string; verification_token: string }> {
  const fn = getCallable<
    { tenant_id: string; domain: string },
    { domain_id: string; verification_token: string }
  >('addDomain');
  const result = await fn({ tenant_id: tenantId, domain });
  return result.data;
}

/** Remove a custom domain from a tenant */
export async function removeDomainFn(
  tenantId: string,
  domainId: string
): Promise<{ success: boolean }> {
  const fn = getCallable<
    { tenant_id: string; domain_id: string },
    { success: boolean }
  >('removeDomain');
  const result = await fn({ tenant_id: tenantId, domain_id: domainId });
  return result.data;
}

/** Verify a custom domain's DNS TXT record */
export async function verifyDomainFn(
  tenantId: string,
  domainId: string
): Promise<{ verified: boolean; message?: string }> {
  const fn = getCallable<
    { tenant_id: string; domain_id: string },
    { verified: boolean; message?: string }
  >('verifyDomain');
  const result = await fn({ tenant_id: tenantId, domain_id: domainId });
  return result.data;
}

/** Impersonate a user — saves admin origin, signs in with the returned custom token */
let impersonationInProgress = false;

export async function impersonateUserFn(uid: string): Promise<{
  target_user: {
    uid: string;
    email: string;
    display_name: string;
    tenant_id: string;
    role: string;
  };
}> {
  if (impersonationInProgress) throw new Error('Impersonation already in progress');
  impersonationInProgress = true;

  try {
    const auth = getAuthInstance();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');

    // If already impersonating, use the stored admin origin — don't overwrite it
    // with the impersonated user's info
    const existingOrigin = getImpersonationOrigin();
    if (!existingOrigin) {
      saveImpersonationOrigin({
        admin_uid: currentUser.uid,
        admin_email: currentUser.email ?? '',
        admin_name: currentUser.displayName ?? currentUser.email ?? '',
      });
    }

    const fn = getCallable<
      { uid: string },
      {
        custom_token: string;
        target_user: {
          uid: string;
          email: string;
          display_name: string;
          tenant_id: string;
          role: string;
        };
      }
    >('impersonateUser');
    const result = await fn({ uid });

    // Sign in with the custom token to switch identity
    clearTenantIdCache();
    const cred = await signInWithCustomToken(auth, result.data.custom_token);
    // Force-refresh to ensure claims are fully populated
    await cred.user.getIdTokenResult(true);

    return { target_user: result.data.target_user };
  } finally {
    impersonationInProgress = false;
  }
}

/** End impersonation — sign back in as the original super_admin */
export async function endImpersonationFn(): Promise<void> {
  if (impersonationInProgress) throw new Error('Impersonation switch already in progress');
  impersonationInProgress = true;

  try {
    const origin = getImpersonationOrigin();
    if (!origin) throw new Error('Not currently impersonating');

    const fn = getCallable<
      { original_uid: string },
      { custom_token: string; admin_user: { uid: string; email: string; display_name: string } }
    >('endImpersonation');
    const result = await fn({ original_uid: origin.admin_uid });

    // Sign back in as the admin — clear origin AFTER successful sign-in
    const auth = getAuthInstance();
    clearTenantIdCache();
    const cred = await signInWithCustomToken(auth, result.data.custom_token);
    // Force-refresh to ensure admin claims are fully populated
    await cred.user.getIdTokenResult(true);
    // Only clear origin after successful sign-in so "Return to Admin" survives failures
    clearImpersonationOrigin();
  } finally {
    impersonationInProgress = false;
  }
}
