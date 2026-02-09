###############################################################################
# ArkData Platform — Root Terraform Configuration
# Provisions GCP resources for the multi-tenant visitor-intelligence platform.
###############################################################################

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    # Configure via -backend-config at init time:
    #   terraform init -backend-config="bucket=arkdata-tfstate-<project_id>"
    prefix = "terraform/state"
  }
}

# ---------- Providers --------------------------------------------------------

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ---------- Enable Required APIs --------------------------------------------

resource "google_project_service" "firebase" {
  service            = "firebase.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firestore" {
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "pubsub" {
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_sql" {
  service            = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_storage" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_sql_api" {
  service            = "sql-component.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}
