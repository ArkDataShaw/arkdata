# Pixel Generation Flow — Legacy Reference

> Extracted 2026-02-16 from the original auto_pixel codebase before history scrub.
> All client-specific names have been redacted.

---

## Overview

The pixel generation flow has two parts:
1. **Frontend form** (`PixelGeneration.tsx`) — user enters client name + website URL
2. **Backend API** (`POST /generate`) — creates pixel in IntentCore, provisions database, creates Google Sheet, returns pixel snippet

---

## Frontend: PixelGeneration.tsx

React component with the following flow:

### Input Validation
- **Client name**: Required. Must match `/^[_a-zA-Z0-9]+$/` (letters, numbers, underscores only — no hyphens)
- **Website URL**: Required. Auto-prepends `https://` if no protocol specified

### API Call
```typescript
const apiUrl = import.meta.env.VITE_API_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:4000' : 'https://api.arkdata.io')

const res = await fetch(`${apiUrl}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client: clientName, website: formattedUrl }),
})
```

### Response Shape
```json
{
  "pixelSnippet": "<script>...</script>",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/..."
}
```

### UI Elements
- Loading spinner during generation
- Error display (red alert box)
- Success display with:
  - Google Sheet link (clickable, with "Copy URL" button)
  - Pixel script block (pre-formatted, with "Copy" button)
  - Instruction: "Add this script to your client's website just before the closing </head> tag."

### Key Pattern: Copy to Clipboard
```typescript
const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    alert(`${label} copied to clipboard!`)
}
```

---

## Backend: Client Provisioning (create_client_v2.php)

The `/generate` endpoint in the Node.js server calls Selenium to create the pixel on IntentCore, then provisions the client. The PHP provisioner handles:

### 1. Client Slug Generation
```php
$clientSlug = preg_replace('/[^a-zA-Z0-9_]/', '', str_replace(' ', '_', $clientName));
```

### 2. Database Tables Created (V2 Schema)

**events** — ~95 columns including:
- Core: id, uuid, pair_ulid, pixel_id, event_type, event_timestamp, ip_address, hem_sha256
- Behavioral: url, title, referrer, utm_source/medium/campaign/content, time_on_page, idle_time, scroll_percentage
- Element tracking: element_text, element_url, element_selector, link_text, click_x, click_y
- Video tracking: video_id, video_src, video_current_time, video_duration, video_percent
- Form tracking: form_id, form_name, form_action, form_method, form_data (JSON)
- File tracking: file_name, file_type
- Identity: first_name, last_name, personal_emails, personal_verified_emails, business_email, business_verified_emails, sha256_personal_email, sha256_business_email
- Contact: direct_number, mobile_phone, personal_phone (each with _dnc flag), valid_phones
- Demographics: personal_address/city/state/zip/zip4, age_range, gender, net_worth, income_range, homeowner, married, children
- Professional: job_title, headline, department, seniority_level, inferred_years_experience, education_history
- Company: company_name, company_domain, company_phone, company_address/city/state/zip, company_industry, company_employee_count, company_revenue, company_linkedin_url, company_sic, company_naics, company_description, company_name_history, job_title_history
- Social: linkedin_url, twitter_url, facebook_url, social_connections, skills, interests
- Skiptrace (17 cols): match_score, name, address, city, state, zip, landline_numbers, wireless_numbers, credit_rating, dnc, exact_age, ethnic_code, language_code, ip, b2b_address, b2b_phone, b2b_source, b2b_website
- Device: screen_width/height/resolution, viewport_width/height/size, user_agent

**visitors** — ~80 columns (same identity/demographic/company fields as events, plus):
- Aggregates: event_count, total_sessions, total_time_on_site, average_scroll_depth
- Last-seen tracking: last_url, last_title, last_referrer, last_event_type, last_ip_address, last_pixel_id, last_user_agent
- Attribution: first_utm_source/medium/campaign, last_utm_source/medium/campaign

**emails** — Parsed email index with:
- uuid, email, first_name, last_name
- email_type ENUM: 'personal', 'business', 'deep_verified', 'personal_verified', 'business_verified'
- source_column, source_table (events or visitors)
- Unique constraint on (uuid, email)

**raw_events** — Audit/replay log:
- uuid, pixel_id, event_type, event_timestamp, received_at
- ip_address, user_agent, payload (JSON), payload_sha256 (dedup key)

### 3. Google Sheet Creation

Uses Google Sheets API v4 with Domain-Wide Delegation:
```
- Creates spreadsheet titled "{clientName}_V2_Data"
- Renames Sheet1 → "Visitors", adds "Events" tab
- Reads default column headers from central `available_columns` table
- Writes headers to Row 1 of each tab
- Makes sheet public (anyone with link = viewer)
- Registers in central pixel_sheets table with enabled_headers JSON
```

### 4. Central Registration
Inserts into `pixel_sheets` with:
- client_name, client_slug, pixel_id, sheet_id, sheet_url
- status='active', paused=0, display_timezone='America/New_York'
- enabled_headers (JSON of visitor/event column lists)
- ON CONFLICT: updates sheet_id, sheet_url, client_slug, enabled_headers

---

## Mapping to ArkData's Normalized Schema

| Legacy Table | ArkData Equivalent |
|-------------|-------------------|
| Per-client `events` (95 cols) | `ark.events` (12 cols) + `ark.persons` (identity) + `ark.companies` |
| Per-client `visitors` (80 cols) | `ark.persons` (stored once, encrypted PII) |
| Per-client `emails` | `ark.emails` (tenant-scoped, encrypted) |
| Per-client `raw_events` | `ark.raw_events` (partitioned, JSONB payload) |
| Central `pixel_sheets` | `ark.pixels` (tenant-scoped) |

---

## Notes for ArkData Implementation

1. The `POST /generate` API contract (`{ client, website }` → `{ pixelSnippet, sheetUrl }`) is already implemented in the active Node.js server at `server/src/index.ts`
2. The frontend form logic (validation, URL formatting, copy-to-clipboard) should be ported to the ArkData dashboard's Settings/Onboarding page
3. Google Sheet creation is optional for MVP — focus on the pixel snippet generation first
4. The `available_columns` table pattern (dynamic column selection per client) maps to `ark.pixels.enabled_headers` JSONB
