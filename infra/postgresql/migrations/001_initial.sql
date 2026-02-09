-- =============================================================================
-- ArkData Platform — Initial Database Schema
-- Migration: 001_initial.sql
-- PostgreSQL 15
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Custom Types
-- ---------------------------------------------------------------------------

CREATE TYPE tenant_plan AS ENUM ('trial', 'starter', 'professional', 'enterprise');
CREATE TYPE user_role AS ENUM ('super_admin', 'tenant_admin', 'analyst', 'operator', 'read_only');
CREATE TYPE identity_status AS ENUM ('anonymous', 'partially_identified', 'identified', 'verified');
CREATE TYPE visitor_status AS ENUM ('active', 'inactive', 'churned');
CREATE TYPE pixel_status AS ENUM ('active', 'paused', 'disabled');
CREATE TYPE pixel_provider AS ENUM ('simple_audience', 'custom');
CREATE TYPE event_type AS ENUM ('page_view', 'click', 'scroll', 'form_submit', 'custom', 'identify', 'session_start', 'session_end');
CREATE TYPE match_type AS ENUM ('hem', 'email', 'phone', 'name_company', 'ip_ua');

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------

CREATE TABLE tenants (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              TEXT        NOT NULL,
    slug              TEXT        NOT NULL UNIQUE,
    plan              tenant_plan NOT NULL DEFAULT 'trial',
    settings          JSONB       NOT NULL DEFAULT '{
        "event_retention_days": 90,
        "max_pixels": 5,
        "max_users": 10,
        "features": []
    }'::jsonb,
    trial_expires_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_plan ON tenants (plan);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           TEXT        NOT NULL,
    display_name    TEXT        NOT NULL,
    role            user_role   NOT NULL DEFAULT 'read_only',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users (tenant_id);
CREATE INDEX idx_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- visitors
-- Matches the shared-types Visitor interface. ~40 columns covering identity,
-- location, company (B2B), professional, demographics (B2C), skiptrace,
-- tracking, and verification fields.
-- ---------------------------------------------------------------------------

CREATE TABLE visitors (
    id                              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id                       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Identity
    first_name                      TEXT,
    last_name                       TEXT,
    email                           TEXT,
    personal_email                  TEXT,
    business_email                  TEXT,
    phone                           TEXT,
    mobile_phone                    TEXT,
    direct_number                   TEXT,

    -- Hashed identifiers
    hem_sha256                      TEXT,
    sha256_personal_email           TEXT,
    sha256_business_email           TEXT,

    -- Personal Location
    personal_address                TEXT,
    personal_city                   TEXT,
    personal_state                  TEXT,
    personal_zip                    TEXT,
    personal_zip4                   TEXT,

    -- Company (B2B)
    company_name                    TEXT,
    company_domain                  TEXT,
    company_industry                TEXT,
    company_employee_count          TEXT,
    company_revenue                 TEXT,
    company_sic                     TEXT,
    company_naics                   TEXT,
    company_phone                   TEXT,
    company_linkedin_url            TEXT,
    company_city                    TEXT,
    company_state                   TEXT,
    company_zip                     TEXT,
    company_description             TEXT,

    -- Professional
    job_title                       TEXT,
    department                      TEXT,
    seniority_level                 TEXT,
    headline                        TEXT,
    linkedin_url                    TEXT,
    twitter_url                     TEXT,
    facebook_url                    TEXT,

    -- Demographics (B2C)
    age_range                       TEXT,
    gender                          TEXT,
    married                         TEXT,
    children                        TEXT,
    homeowner                       TEXT,
    net_worth                       TEXT,
    income_range                    TEXT,
    social_connections              TEXT,

    -- Skiptrace
    skiptrace_credit_rating         TEXT,
    skiptrace_address               TEXT,
    skiptrace_b2b_address           TEXT,
    skiptrace_b2b_phone             TEXT,
    skiptrace_city                  TEXT,

    -- Tracking
    identity_status                 identity_status NOT NULL DEFAULT 'anonymous',
    visitor_status                  visitor_status  NOT NULL DEFAULT 'active',
    intent_score                    INTEGER         NOT NULL DEFAULT 0,
    event_count                     INTEGER         NOT NULL DEFAULT 0,
    session_count                   INTEGER         NOT NULL DEFAULT 0,
    first_seen_at                   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    last_seen_at                    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Verification
    personal_verified_emails        TEXT,
    business_verified_emails        TEXT,
    personal_email_validation_status TEXT,
    business_email_validation_status TEXT
);

CREATE INDEX idx_visitors_tenant_id ON visitors (tenant_id);
CREATE INDEX idx_visitors_tenant_last_seen ON visitors (tenant_id, last_seen_at DESC);
CREATE INDEX idx_visitors_email ON visitors (email) WHERE email IS NOT NULL;
CREATE INDEX idx_visitors_personal_email ON visitors (personal_email) WHERE personal_email IS NOT NULL;
CREATE INDEX idx_visitors_business_email ON visitors (business_email) WHERE business_email IS NOT NULL;
CREATE INDEX idx_visitors_hem_sha256 ON visitors (hem_sha256) WHERE hem_sha256 IS NOT NULL;
CREATE INDEX idx_visitors_company_domain ON visitors (tenant_id, company_domain) WHERE company_domain IS NOT NULL;
CREATE INDEX idx_visitors_identity_status ON visitors (tenant_id, identity_status);
CREATE INDEX idx_visitors_visitor_status ON visitors (tenant_id, visitor_status);
CREATE INDEX idx_visitors_intent_score ON visitors (tenant_id, intent_score DESC);

-- ---------------------------------------------------------------------------
-- events
-- Append-only raw events from pixel ingestion. Matches shared-types RawEvent.
-- ---------------------------------------------------------------------------

CREATE TABLE events (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_id          UUID        REFERENCES visitors(id) ON DELETE SET NULL,
    pixel_id            UUID        NOT NULL,
    event_type          event_type  NOT NULL,
    url                 TEXT        NOT NULL,
    referrer            TEXT,
    time_on_page_sec    INTEGER,
    scroll_depth        INTEGER,
    element_id          TEXT,
    element_text        TEXT,
    event_timestamp     TIMESTAMPTZ NOT NULL,
    metadata            JSONB,
    resolution          JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_tenant_id ON events (tenant_id);
CREATE INDEX idx_events_tenant_timestamp ON events (tenant_id, event_timestamp DESC);
CREATE INDEX idx_events_visitor_id ON events (visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX idx_events_pixel_id ON events (tenant_id, pixel_id);
CREATE INDEX idx_events_event_type ON events (tenant_id, event_type);
CREATE INDEX idx_events_event_timestamp ON events (event_timestamp DESC);

-- ---------------------------------------------------------------------------
-- resolution_log
-- Provenance tracking for identity resolution matches.
-- ---------------------------------------------------------------------------

CREATE TABLE resolution_log (
    id                  SERIAL      PRIMARY KEY,
    tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_id          UUID        NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    person_id           UUID,
    match_type          match_type  NOT NULL,
    confidence          REAL        NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    matched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_event_id     UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    matched_fields      JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_resolution_log_tenant_id ON resolution_log (tenant_id);
CREATE INDEX idx_resolution_log_visitor_id ON resolution_log (visitor_id);
CREATE INDEX idx_resolution_log_matched_at ON resolution_log (tenant_id, matched_at DESC);
CREATE INDEX idx_resolution_log_match_type ON resolution_log (tenant_id, match_type);

-- ---------------------------------------------------------------------------
-- pixels
-- Pixel configuration per tenant. Matches shared-types Pixel interface.
-- ---------------------------------------------------------------------------

CREATE TABLE pixels (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                TEXT            NOT NULL,
    domain              TEXT            NOT NULL,
    status              pixel_status    NOT NULL DEFAULT 'active',
    webhook_url         TEXT            NOT NULL,
    snippet_code        TEXT            NOT NULL,
    pixel_provider      pixel_provider  NOT NULL DEFAULT 'simple_audience',
    provider_metadata   JSONB,
    event_count         INTEGER         NOT NULL DEFAULT 0,
    last_event_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pixels_tenant_id ON pixels (tenant_id);
CREATE INDEX idx_pixels_domain ON pixels (tenant_id, domain);
CREATE INDEX idx_pixels_status ON pixels (tenant_id, status);

-- ---------------------------------------------------------------------------
-- sessions
-- Aggregated session data per visitor.
-- ---------------------------------------------------------------------------

CREATE TABLE sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    visitor_id      UUID        NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    duration_sec    INTEGER,
    page_count      INTEGER     NOT NULL DEFAULT 0,
    event_count     INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_tenant_id ON sessions (tenant_id);
CREATE INDEX idx_sessions_tenant_started ON sessions (tenant_id, started_at DESC);
CREATE INDEX idx_sessions_visitor_id ON sessions (visitor_id);

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at on row modification
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_tenants
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_visitors
    BEFORE UPDATE ON visitors
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_events
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_pixels
    BEFORE UPDATE ON pixels
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_sessions
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMIT;
