import { z } from 'zod';

/** Resolution data schema — all fields optional since pixel providers vary */
const ResolutionSchema = z
  .object({
    uuid: z.string().optional(),
    hem_sha256: z.string().optional(),
    email: z.string().email().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_name: z.string().optional(),
    company_domain: z.string().optional(),
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
  })
  .passthrough() // allow extra provider-specific fields
  .optional();

/** Single event schema */
export const EventItemSchema = z.object({
  type: z.enum([
    'page_view',
    'click',
    'scroll',
    'form_submit',
    'custom',
    'identify',
    'session_start',
    'session_end',
  ]),
  url: z.string().url(),
  referrer: z.string().optional(),
  time_on_page_sec: z.number().nonnegative().optional(),
  scroll_depth: z.number().min(0).max(100).optional(),
  element_id: z.string().optional(),
  element_text: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  resolution: ResolutionSchema,
});

/** Top-level ingest request schema */
export const IngestRequestSchema = z.object({
  events: z
    .array(EventItemSchema)
    .min(1, 'At least one event is required')
    .max(100, 'Maximum 100 events per batch'),
});

export type EventItem = z.infer<typeof EventItemSchema>;
export type IngestRequest = z.infer<typeof IngestRequestSchema>;
