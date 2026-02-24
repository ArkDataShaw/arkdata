import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getAuthInstance, getDb } from './config';
import { collection, getDocs, query, limit as firestoreLimit, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserRole } from '@arkdata/shared-types';

export interface ArkDataUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  tenant_id: string;
  role: UserRole;
  created_at?: string;
  phone?: string;
  bio?: string;
  /** Set when an admin is impersonating this user */
  impersonated_by?: string;
}

const IMPERSONATION_KEY = 'arkdata_impersonation_origin';

export interface ImpersonationOrigin {
  admin_uid: string;
  admin_email: string;
  admin_name: string;
}

/** Save the original admin info before impersonating */
export function saveImpersonationOrigin(origin: ImpersonationOrigin): void {
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(origin));
}

/** Get the saved impersonation origin (null if not impersonating) */
export function getImpersonationOrigin(): ImpersonationOrigin | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clear impersonation origin */
export function clearImpersonationOrigin(): void {
  localStorage.removeItem(IMPERSONATION_KEY);
}

/** Wait for Firebase Auth to resolve its initial state (cached after first resolution) */
let authReadyPromise: Promise<FirebaseUser | null> | null = null;

function waitForAuthReady(): Promise<FirebaseUser | null> {
  // If user is already available, skip the listener entirely
  const firebaseAuth = getAuthInstance();
  if (firebaseAuth.currentUser) return Promise.resolve(firebaseAuth.currentUser);

  // Cache the promise so repeated calls share the same listener
  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }
  return authReadyPromise;
}

let cachedTenantId: string | null = null;
let cachedUser: ArkDataUser | null = null;
let cachedTokenClaims: Record<string, unknown> | null = null;

/** Clear all auth caches (call on logout or user switch) */
export function clearTenantIdCache(): void {
  cachedTenantId = null;
  cachedUser = null;
  cachedTokenClaims = null;
  authReadyPromise = null;
}

/** Get current tenant_id from Firebase Auth custom claims (cached after first call) */
export async function getTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;
  const auth = getAuthInstance();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdTokenResult();
  const tenantId = token.claims.tenant_id as string | undefined;
  if (!tenantId) throw new Error('No tenant_id in claims. Contact your admin.');
  cachedTenantId = tenantId;
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
    // Return cached user if available (cleared on logout/sign-in)
    if (cachedUser) return cachedUser;

    // Wait for Firebase Auth to restore session on initial load
    const user = await waitForAuthReady();
    if (!user) throw { status: 401, message: 'Not authenticated' };

    // Force refresh on first load to ensure custom claims are present
    const tokenResult = await user.getIdTokenResult(true);
    cachedTokenClaims = tokenResult.claims as Record<string, unknown>;
    cachedUser = firebaseUserToArkData(user, cachedTokenClaims);
    // Mark as impersonated if the claim is present or localStorage has origin
    if (cachedTokenClaims.impersonated_by) {
      cachedUser.impersonated_by = cachedTokenClaims.impersonated_by as string;
    } else if (getImpersonationOrigin()) {
      cachedUser.impersonated_by = getImpersonationOrigin()!.admin_uid;
    }
    // Also populate tenant cache while we have the claims
    if (cachedTokenClaims.tenant_id) {
      cachedTenantId = cachedTokenClaims.tenant_id as string;
      // Pre-warm the Firestore WebSocket connection so entity queries don't wait 40s+
      // Fire-and-forget: a tiny read opens the channel in the background
      const db = getDb();
      getDocs(query(collection(db, 'tenants', cachedTenantId, '_warmup'), firestoreLimit(1))).catch(() => {});

      // Merge extended profile fields (phone, bio) from Firestore user doc
      try {
        const userDoc = await getDoc(doc(db, 'tenants', cachedTenantId, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.phone) cachedUser.phone = data.phone;
          if (data.bio) cachedUser.bio = data.bio;
        }
      } catch {
        // Non-blocking — doc may not exist yet for new users
      }
    }
    return cachedUser;
  },

  /** Sign in with email/password */
  async signIn(email: string, password: string): Promise<ArkDataUser> {
    cachedUser = null;
    cachedTenantId = null;
    cachedTokenClaims = null;
    clearImpersonationOrigin();
    const firebaseAuth = getAuthInstance();
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    // Force refresh to ensure custom claims (tenant_id, role) are present —
    // especially important after password reset which revokes prior tokens
    const tokenResult = await cred.user.getIdTokenResult(true);
    cachedTokenClaims = tokenResult.claims as Record<string, unknown>;
    cachedUser = firebaseUserToArkData(cred.user, cachedTokenClaims);
    if (cachedTokenClaims.tenant_id) cachedTenantId = cachedTokenClaims.tenant_id as string;
    return cachedUser;
  },

  /** Sign in with Google OAuth */
  async signInWithGoogle(): Promise<ArkDataUser> {
    cachedUser = null;
    cachedTenantId = null;
    cachedTokenClaims = null;
    clearImpersonationOrigin();
    const firebaseAuth = getAuthInstance();
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(firebaseAuth, provider);
    const tokenResult = await cred.user.getIdTokenResult(true);
    cachedTokenClaims = tokenResult.claims as Record<string, unknown>;
    cachedUser = firebaseUserToArkData(cred.user, cachedTokenClaims);
    if (cachedTokenClaims.tenant_id) cachedTenantId = cachedTokenClaims.tenant_id as string;
    return cachedUser;
  },

  /** Sign out — equivalent to base44.auth.logout(redirectUrl?) */
  logout(redirectUrl?: string): void {
    cachedTenantId = null;
    clearImpersonationOrigin();
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
  async updateMe(data: { name?: string; avatar_url?: string; phone?: string; bio?: string }): Promise<void> {
    const firebaseAuth = getAuthInstance();
    const user = firebaseAuth.currentUser;
    if (!user) throw { status: 401, message: 'Not authenticated' };

    await updateProfile(user, {
      displayName: data.name,
      photoURL: data.avatar_url,
    });

    // Persist extended fields to Firestore user doc
    if (cachedTenantId) {
      const db = getDb();
      const userRef = doc(db, 'tenants', cachedTenantId, 'users', user.uid);
      const updates: Record<string, unknown> = { updated_at: serverTimestamp() };
      if (data.name !== undefined) updates.display_name = data.name;
      if (data.phone !== undefined) updates.phone = data.phone;
      if (data.bio !== undefined) updates.bio = data.bio;
      await updateDoc(userRef, updates);
    }

    // Update cached user
    if (cachedUser) {
      if (data.name !== undefined) cachedUser.name = data.name;
      if (data.phone !== undefined) cachedUser.phone = data.phone;
      if (data.bio !== undefined) cachedUser.bio = data.bio;
    }
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

  /** Send a password reset email */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const firebaseAuth = getAuthInstance();
    await firebaseSendPasswordResetEmail(firebaseAuth, email);
  },
};
