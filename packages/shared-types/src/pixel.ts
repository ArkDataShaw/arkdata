import type { TenantEntity } from './common';

/** Pixel configuration */
export interface Pixel extends TenantEntity {
  name: string;
  domain: string;
  status: 'active' | 'paused' | 'disabled';
  snippet_code: string;
  pixel_provider: 'intentcore' | 'simple_audience' | 'custom';
  webhook_url?: string;
  provider_metadata?: {
    segment_id?: string;
    segment_url?: string;
    api_url?: string;
    oplet?: string;
    row_count?: number;
  };
  event_count: number;
  last_event_at?: string;
}

/** Pixel generation request */
export interface PixelGenerateRequest {
  tenant_id: string;
  name: string;
  domain: string;
  provider: 'simple_audience' | 'custom';
  provider_credentials?: {
    username?: string;
    password?: string;
    workspace?: string;
  };
}
