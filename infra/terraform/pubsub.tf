###############################################################################
# Pub/Sub — Async event bus for pixel-ingest -> identity-resolution -> sync
###############################################################################

# ---------- Topics -----------------------------------------------------------

resource "google_pubsub_topic" "raw_events" {
  name    = "raw-events"
  project = var.project_id

  message_retention_duration = "86400s" # 24 hours

  schema_settings {
    encoding = "JSON"
  }

  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_topic" "identity_updates" {
  name    = "identity-updates"
  project = var.project_id

  message_retention_duration = "86400s"

  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_topic" "sync_requests" {
  name    = "sync-requests"
  project = var.project_id

  message_retention_duration = "86400s"

  depends_on = [google_project_service.pubsub]
}

# ---------- Dead-letter topics -----------------------------------------------

resource "google_pubsub_topic" "raw_events_dlq" {
  name    = "raw-events-dlq"
  project = var.project_id

  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_topic" "identity_updates_dlq" {
  name    = "identity-updates-dlq"
  project = var.project_id

  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_topic" "sync_requests_dlq" {
  name    = "sync-requests-dlq"
  project = var.project_id

  depends_on = [google_project_service.pubsub]
}

# ---------- Subscriptions: identity-resolution Cloud Run ---------------------

resource "google_pubsub_subscription" "identity_resolution_raw_events" {
  name    = "identity-resolution-raw-events-sub"
  topic   = google_pubsub_topic.raw_events.id
  project = var.project_id

  ack_deadline_seconds       = 30
  message_retention_duration = "604800s" # 7 days
  retain_acked_messages      = false

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.identity_resolution.uri}/api/events/resolve"

    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.raw_events_dlq.id
    max_delivery_attempts = 10
  }

  expiration_policy {
    ttl = "" # never expire
  }
}

# ---------- Subscriptions: analytics-sync Cloud Run --------------------------

resource "google_pubsub_subscription" "analytics_sync_identity_updates" {
  name    = "analytics-sync-identity-updates-sub"
  topic   = google_pubsub_topic.identity_updates.id
  project = var.project_id

  ack_deadline_seconds       = 30
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.analytics_api.uri}/api/sync/identity"

    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.identity_updates_dlq.id
    max_delivery_attempts = 10
  }

  expiration_policy {
    ttl = ""
  }
}

resource "google_pubsub_subscription" "analytics_sync_sync_requests" {
  name    = "analytics-sync-sync-requests-sub"
  topic   = google_pubsub_topic.sync_requests.id
  project = var.project_id

  ack_deadline_seconds       = 60
  message_retention_duration = "604800s"
  retain_acked_messages      = false

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.analytics_api.uri}/api/sync/run"

    oidc_token {
      service_account_email = google_service_account.pubsub_invoker.email
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.sync_requests_dlq.id
    max_delivery_attempts = 10
  }

  expiration_policy {
    ttl = ""
  }
}

# ---------- Service account for Pub/Sub push auth ----------------------------

resource "google_service_account" "pubsub_invoker" {
  account_id   = "pubsub-invoker"
  display_name = "Pub/Sub Push Invoker"
  project      = var.project_id
}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_identity" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.identity_resolution.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoke_analytics" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.analytics_api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}
