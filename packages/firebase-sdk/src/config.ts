import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { getStorage as fbGetStorage, type FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

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
  // Use persistent local cache with multi-tab support — serves cached data
  // instantly on repeat visits and avoids Firestore cold-connect delays
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

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

export function getStorageInstance(): FirebaseStorage {
  if (!app) throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  if (!storageInstance) {
    storageInstance = fbGetStorage(app);
  }
  return storageInstance;
}

// Vite env type augmentation
declare global {
  interface ImportMeta {
    env: Record<string, string>;
  }
}
