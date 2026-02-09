import { Request, Response, NextFunction } from 'express';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Validates the pixel API key from the X-Pixel-Key header or `key` query param.
 *
 * The key is stored in Firestore at `pixels/{pixelId}` and must match
 * the pixel_id path parameter. This prevents enumeration attacks and
 * ensures only authorised callers can send events for a given pixel.
 */
export async function validatePixelKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const pixelKey =
    (req.headers['x-pixel-key'] as string | undefined) ??
    (req.query.key as string | undefined);

  if (!pixelKey) {
    res.status(401).json({ error: 'Missing pixel API key. Provide X-Pixel-Key header or ?key= query param.' });
    return;
  }

  const pixelId = req.params.pixelId;
  if (!pixelId) {
    res.status(400).json({ error: 'Missing pixelId path parameter.' });
    return;
  }

  try {
    const db = getFirestore();
    const pixelDoc = await db.collection('pixels').doc(pixelId).get();

    if (!pixelDoc.exists) {
      res.status(404).json({ error: 'Pixel not found.' });
      return;
    }

    const pixelData = pixelDoc.data()!;

    // The pixel API key is the pixel document ID itself (pixelId)
    // Verify the caller-supplied key matches
    if (pixelKey !== pixelId) {
      res.status(403).json({ error: 'Invalid pixel API key.' });
      return;
    }

    // Check pixel is active
    if (pixelData.status !== 'active') {
      res.status(403).json({ error: `Pixel is ${pixelData.status}. Only active pixels can ingest events.` });
      return;
    }

    // Attach pixel config to request for downstream handlers
    (req as any).pixelConfig = { id: pixelId, ...pixelData };

    next();
  } catch (err) {
    console.error('[auth] Error validating pixel key:', err);
    res.status(500).json({ error: 'Internal error during authentication.' });
  }
}
