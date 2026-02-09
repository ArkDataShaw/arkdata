import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getAuthInstance } from './config';
import type { UserRole } from '@arkdata/shared-types';

export interface ArkDataUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  tenant_id: string;
  role: UserRole;
  created_at?: string;
}

/** Get current tenant_id from Firebase Auth custom claims */
export async function getTenantId(): Promise<string> {
  const auth = getAuthInstance();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdTokenResult();
  const tenantId = token.claims.tenant_id as string | undefined;
  if (!tenantId) throw new Error('No tenant_id in claims. Contact your admin.');
  return tenantId;
}

/** Get current user role from Firebase Auth custom claims */
export async function getUserRole(): Promise<UserRole> {
  const auth = getAuthInstance();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdTokenResult();
  return (token.claims.role as UserRole) ?? 'read_only';
}

function firebaseUserToArkData(user: FirebaseUser, claims: Record<string, unknown>): ArkDataUser {
  return {
    id: user.uid,
    email: user.email ?? '',
    name: user.displayName ?? user.email ?? '',
    avatar_url: user.photoURL ?? undefined,
    tenant_id: (claims.tenant_id as string) ?? '',
    role: (claims.role as UserRole) ?? 'read_only',
    created_at: user.metadata.creationTime,
  };
}

/**
 * Auth module — drop-in replacement for base44.auth
 *
 * Supports:
 *   auth.me()               → returns current user
 *   auth.logout(redirect?)   → signs out
 *   auth.redirectToLogin(redirect?) → redirects to login
 *   auth.updateMe(data)     → updates profile
 *   auth.signIn(email, pass) → email/password sign in
 *   auth.signInWithGoogle()  → Google OAuth sign in
 *   auth.onAuthChange(cb)   → listen for auth state changes
 */
export const auth = {
  /** Get current authenticated user — equivalent to base44.auth.me() */
  async me(): Promise<ArkDataUser> {
    const firebaseAuth = getAuthInstance();
    const user = firebaseAuth.currentUser;
    if (!user) throw { status: 401, message: 'Not authenticated' };

    const tokenResult = await user.getIdTokenResult();
    return firebaseUserToArkData(user, tokenResult.claims as Record<string, unknown>);
  },

  /** Sign in with email/password */
  async signIn(email: string, password: string): Promise<ArkDataUser> {
    const firebaseAuth = getAuthInstance();
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const tokenResult = await cred.user.getIdTokenResult();
    return firebaseUserToArkData(cred.user, tokenResult.claims as Record<string, unknown>);
  },

  /** Sign in with Google OAuth */
  async signInWithGoogle(): Promise<ArkDataUser> {
    const firebaseAuth = getAuthInstance();
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(firebaseAuth, provider);
    const tokenResult = await cred.user.getIdTokenResult();
    return firebaseUserToArkData(cred.user, tokenResult.claims as Record<string, unknown>);
  },

  /** Sign out — equivalent to base44.auth.logout(redirectUrl?) */
  logout(redirectUrl?: string): void {
    const firebaseAuth = getAuthInstance();
    firebaseSignOut(firebaseAuth).then(() => {
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        window.location.href = '/login';
      }
    });
  },

  /** Redirect to login page — equivalent to base44.auth.redirectToLogin(redirect?) */
  redirectToLogin(redirectUrl?: string): void {
    const target = redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login';
    window.location.href = target;
  },

  /** Update current user profile — equivalent to base44.auth.updateMe(data) */
  async updateMe(data: { name?: string; avatar_url?: string }): Promise<void> {
    const firebaseAuth = getAuthInstance();
    const user = firebaseAuth.currentUser;
    if (!user) throw { status: 401, message: 'Not authenticated' };

    await updateProfile(user, {
      displayName: data.name,
      photoURL: data.avatar_url,
    });
  },

  /** Subscribe to auth state changes */
  onAuthChange(callback: (user: ArkDataUser | null) => void): () => void {
    const firebaseAuth = getAuthInstance();
    return onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        const tokenResult = await fbUser.getIdTokenResult();
        callback(firebaseUserToArkData(fbUser, tokenResult.claims as Record<string, unknown>));
      } else {
        callback(null);
      }
    });
  },
};
