import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { PubSub } from '@google-cloud/pubsub';
import type { RawEvent, Pixel } from '@arkdata/shared-types';
import { IngestRequestSchema } from '../validators/event';
import { coalesceUpsert } from './upsert';

const pubsub = new PubSub();
const RAW_EVENTS_TOPIC = 'raw-events';

/**
 * POST /v1/ingest/:pixelId
 *
 * Receives a batch of events from the pixel JS snippet (replacing the legacy
 * PHP webhook handler from auto_pixel). For each event:
 *   1. Validates the payload via Zod
 *   2. Writes an append-only RawEvent to Firestore
 *   3. Publishes to the `raw-events` Pub/Sub topic for downstream processing
 *   4. Upserts the visitor profile via COALESCE pattern
 *
 * Returns { processed: number } on success.
 */
export async function ingestHandler(req: Request, res: Response): Promise<void> {
  const pixelId = req.params.pixelId;

  // pixelConfig is attached by the auth middleware
  const pixelConfig = (req as any).pixelConfig as Pixel & { id: string };
  const tenantId = pixelConfig.tenant_id;

  // --- Validate request body ---
  const parseResult = IngestRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'Invalid request body.',
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { events } = parseResult.data;

  const db = getFirestore();
  const eventsCollection = db.collection(`tenants/${tenantId}/events`);
  let topic: ReturnType<PubSub['topic']>;

  try {
    topic = pubsub.topic(RAW_EVENTS_TOPIC);
  } catch (err) {
    console.error('[ingest] Failed to get Pub/Sub topic:', err);
    res.status(500).json({ error: 'Internal error: Pub/Sub unavailable.' });
    return;
  }

  let processed = 0;
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const now = new Date().toISOString();

    try {
      // --- 1. Build RawEvent document ---
      const eventRef = eventsCollection.doc(); // auto-generate ID
      const rawEvent: RawEvent = {
        id: eventRef.id,
        tenant_id: tenantId,
        pixel_id: pixelId,
        event_type: event.type,
        url: event.url,
        referrer: event.referrer,
        time_on_page_sec: event.time_on_page_sec,
        scroll_depth: event.scroll_depth,
        element_id: event.element_id,
        element_text: event.element_text,
        event_timestamp: now,
        metadata: event.metadata,
        resolution: event.resolution,
        created_at: now,
        updated_at: now,
      };

      // --- 2. Write to Firestore (append-only) ---
      await eventRef.set(rawEvent);

      // --- 3. Publish to Pub/Sub for downstream pipelines ---
      const messagePayload = JSON.stringify({
        event_id: rawEvent.id,
        tenant_id: tenantId,
        pixel_id: pixelId,
        event_type: event.type,
        url: event.url,
        resolution: event.resolution ?? {},
        timestamp: now,
      });

      await topic.publishMessage({ data: Buffer.from(messagePayload) });

      // --- 4. COALESCE upsert visitor ---
      if (event.resolution && Object.keys(event.resolution).length > 0) {
        const visitorId = await coalesceUpsert(
          tenantId,
          event.resolution as Record<string, unknown>,
          rawEvent.id,
        );

        // Back-link event to visitor
        await eventRef.update({ visitor_id: visitorId });
      }

      processed++;
    } catch (err) {
      console.error(`[ingest] Error processing event ${i}:`, err);
      errors.push({
        index: i,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // --- 5. Update pixel aggregate counters ---
  try {
    const pixelRef = db.collection('pixels').doc(pixelId);
    await pixelRef.update({
      event_count: (pixelConfig.event_count ?? 0) + processed,
      last_event_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[ingest] Failed to update pixel counters:', err);
  }

  // --- Response ---
  if (errors.length > 0 && processed === 0) {
    res.status(500).json({
      error: 'All events failed to process.',
      details: errors,
    });
    return;
  }

  res.status(200).json({
    processed,
    ...(errors.length > 0 && { errors }),
  });
}
