###############################################################################
# Firestore — Native-mode database & composite indexes
###############################################################################

resource "google_firestore_database" "main" {
  provider    = google-beta
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

# ---------- Composite Indexes ------------------------------------------------

# visitors: tenant_id + last_seen_at (descending for recency queries)
resource "google_firestore_index" "visitors_tenant_last_seen" {
  provider   = google-beta
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "visitors"

  fields {
    field_path = "tenant_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "last_seen_at"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.main]
}

# events: tenant_id + event_timestamp (descending for recency queries)
resource "google_firestore_index" "events_tenant_timestamp" {
  provider   = google-beta
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "events"

  fields {
    field_path = "tenant_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "event_timestamp"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.main]
}

# sessions: tenant_id + started_at (descending for recency queries)
resource "google_firestore_index" "sessions_tenant_started" {
  provider   = google-beta
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "sessions"

  fields {
    field_path = "tenant_id"
    order      = "ASCENDING"
  }

  fields {
    field_path = "started_at"
    order      = "DESCENDING"
  }

  depends_on = [google_firestore_database.main]
}
