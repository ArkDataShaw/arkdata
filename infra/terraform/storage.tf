###############################################################################
# Cloud Storage — Cold event archive & export buckets
###############################################################################

# ---------- Cold events bucket -----------------------------------------------
# Tiered lifecycle: 90d Standard -> Nearline -> Coldline

resource "google_storage_bucket" "cold_events" {
  name     = "arkdata-cold-events-${var.project_id}"
  location = var.region
  project  = var.project_id

  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  # Standard -> Nearline after 90 days
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  # Nearline -> Coldline after 180 days (90d standard + 90d nearline)
  lifecycle_rule {
    condition {
      age = 180
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  # Delete non-current versions after 30 days
  lifecycle_rule {
    condition {
      age                   = 30
      with_state            = "ARCHIVED"
      num_newer_versions    = 1
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    environment = var.environment
    service     = "arkdata"
    purpose     = "cold-events"
  }

  depends_on = [google_project_service.cloud_storage]
}

# ---------- Exports bucket ---------------------------------------------------
# Temporary storage for CSV / Parquet exports

resource "google_storage_bucket" "exports" {
  name     = "arkdata-exports-${var.project_id}"
  location = var.region
  project  = var.project_id

  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  # Auto-delete exports after 7 days
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }

  versioning {
    enabled = false
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Content-Disposition"]
    max_age_seconds = 3600
  }

  labels = {
    environment = var.environment
    service     = "arkdata"
    purpose     = "exports"
  }

  depends_on = [google_project_service.cloud_storage]
}
