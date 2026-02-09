###############################################################################
# Outputs — ArkData Platform
###############################################################################

# ---------- Cloud Run Service URLs -------------------------------------------

output "pixel_ingest_url" {
  description = "URL for the pixel-ingest Cloud Run service"
  value       = google_cloud_run_v2_service.pixel_ingest.uri
}

output "identity_resolution_url" {
  description = "URL for the identity-resolution Cloud Run service"
  value       = google_cloud_run_v2_service.identity_resolution.uri
}

output "analytics_api_url" {
  description = "URL for the analytics-api Cloud Run service"
  value       = google_cloud_run_v2_service.analytics_api.uri
}

# ---------- Database ---------------------------------------------------------

output "cloudsql_instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.arkdata.name
}

output "cloudsql_connection_name" {
  description = "Cloud SQL instance connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.arkdata.connection_name
}

output "cloudsql_public_ip" {
  description = "Cloud SQL public IP address"
  value       = google_sql_database_instance.arkdata.public_ip_address
}

output "database_connection_string" {
  description = "PostgreSQL connection string (use via Cloud SQL Proxy in production)"
  value       = "postgresql://arkdata:<PASSWORD>@${google_sql_database_instance.arkdata.public_ip_address}:5432/arkdata"
  sensitive   = false
}

output "database_proxy_connection_string" {
  description = "PostgreSQL connection string for use with Cloud SQL Auth Proxy"
  value       = "postgresql://arkdata:<PASSWORD>@/arkdata?host=/cloudsql/${google_sql_database_instance.arkdata.connection_name}"
  sensitive   = false
}

# ---------- Pub/Sub ----------------------------------------------------------

output "pubsub_topic_raw_events" {
  description = "Pub/Sub topic ID for raw pixel events"
  value       = google_pubsub_topic.raw_events.id
}

output "pubsub_topic_identity_updates" {
  description = "Pub/Sub topic ID for identity resolution updates"
  value       = google_pubsub_topic.identity_updates.id
}

output "pubsub_topic_sync_requests" {
  description = "Pub/Sub topic ID for sync requests"
  value       = google_pubsub_topic.sync_requests.id
}

# ---------- Storage ----------------------------------------------------------

output "gcs_cold_events_bucket" {
  description = "GCS bucket name for cold event storage"
  value       = google_storage_bucket.cold_events.name
}

output "gcs_exports_bucket" {
  description = "GCS bucket name for data exports"
  value       = google_storage_bucket.exports.name
}

# ---------- Firestore --------------------------------------------------------

output "firestore_database" {
  description = "Firestore database name"
  value       = google_firestore_database.main.name
}
