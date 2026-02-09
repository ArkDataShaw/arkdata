import type { TenantEntity } from './common';

/** Event types supported by the pixel */
export type EventType =
  | 'page_view'
  | 'click'
  | 'scroll'
  | 'form_submit'
  | 'custom'
  | 'identify'
  | 'session_start'
  | 'session_end';

/** Raw event from pixel — append-only, never mutated */
export interface RawEvent extends TenantEntity {
  visitor_id?: string;
  pixel_id: string;
  event_type: EventType;
  url: string;
  referrer?: string;
  time_on_page_sec?: number;
  scroll_depth?: number;
  element_id?: string;
  element_text?: string;
  event_timestamp: string;
  metadata?: Record<string, unknown>;

  // Resolution data from pixel provider
  resolution?: {
    uuid?: string;
    hem_sha256?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    company_domain?: string;
    ip_address?: string;
    user_agent?: string;
    [key: string]: unknown;
  };
}

/** Simplified event for UI display (VisitorCollectionViewer) */
export interface VisitorEvent {
  id: string;
  type: EventType;
  pageUrl: string;
  timeOnPageSec?: number;
  ts: string;
  meta?: Record<string, unknown>;
}

/** Resolution log entry — provenance tracking */
export interface ResolutionLogEntry {
  id: string;
  tenant_id: string;
  visitor_id: string;
  person_id?: string;
  match_type: 'hem' | 'email' | 'phone' | 'name_company' | 'ip_ua';
  confidence: number;
  matched_at: string;
  source_event_id: string;
  matched_fields: Record<string, string>;
}
