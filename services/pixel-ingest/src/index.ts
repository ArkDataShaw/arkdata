import express from 'express';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { ingestHandler } from './handlers/ingest';
import { validatePixelKey } from './middleware/auth';

// ---------------------------------------------------------------------------
// Firebase Admin — initialise once at process start.
// In Cloud Run, Application Default Credentials are provided automatically.
// ---------------------------------------------------------------------------
initializeApp({ credential: applicationDefault() });

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app: ReturnType<typeof express> = express();
const PORT = parseInt(process.env.PORT ?? '8080', 10);

// --- Global middleware ---

// Parse JSON bodies (pixel payloads are JSON)
app.use(express.json({ limit: '1mb' }));

// CORS — allow all origins for pixel snippets embedded on customer sites
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Pixel-Key');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight
  if (_req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

// --- Routes ---

/** Health check — used by Cloud Run for readiness and liveness probes */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'pixel-ingest' });
});

/** Main ingest endpoint — receives pixel event batches */
app.post('/v1/ingest/:pixelId', validatePixelKey, ingestHandler);

// --- Start ---
app.listen(PORT, () => {
  console.log(`[pixel-ingest] Listening on port ${PORT}`);
});

export { app };
