/**
 * Cloud Function client wrappers.
 * Wraps httpsCallable() for each admin Cloud Function.
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { getApp, getAuthInstance } from './config';
import { clearTenantIdCache } from './auth';

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

/** Request a password reset — sends branded email from support@arkdata.io */
export async function requestPasswordResetFn(
  email: string
): Promise<{ success: boolean }> {
  const fn = getCallable<{ email: string }, { success: boolean }>('requestPasswordReset');
  const result = await fn({ email });
  return result.data;
}

/** Impersonate a user — signs in with the returned custom token */
export async function impersonateUserFn(uid: string): Promise<{
  target_user: {
    uid: string;
    email: string;
    display_name: string;
    tenant_id: string;
    role: string;
  };
}> {
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
  const auth = getAuthInstance();
  clearTenantIdCache();
  await signInWithCustomToken(auth, result.data.custom_token);

  return { target_user: result.data.target_user };
}
