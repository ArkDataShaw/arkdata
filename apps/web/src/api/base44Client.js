/**
 * ArkData Firebase SDK Client
 *
 * Drop-in replacement for the old @base44/sdk client.
 * All existing code that imports { base44 } from '@/api/base44Client'
 * continues to work unchanged.
 */
import { base44, initializeFirebase } from '@arkdata/firebase-sdk';

// Initialize Firebase on module load
initializeFirebase();

export { base44 };
export { requestPasswordResetFn } from '@arkdata/firebase-sdk';
