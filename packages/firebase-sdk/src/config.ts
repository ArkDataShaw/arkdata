import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function initializeFirebase(config?: Record<string, string>) {
  const firebaseConfig = config ?? {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);

  return { app, auth: authInstance, db: dbInstance };
}

export function getApp(): FirebaseApp {
  if (!app) throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  return app;
}

export function getAuthInstance(): Auth {
  if (!authInstance) throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  return authInstance;
}

export function getDb(): Firestore {
  if (!dbInstance) throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  return dbInstance;
}

// Vite env type augmentation
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}
