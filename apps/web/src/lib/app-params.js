/**
 * App parameters — Firebase configuration
 *
 * Replaces the old Base44 app-params that extracted tokens from URL params.
 * Firebase Auth handles tokens internally via its SDK.
 */
export const appParams = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
};
