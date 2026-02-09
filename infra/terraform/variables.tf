###############################################################################
# Variables — ArkData Platform Terraform Configuration
###############################################################################

# ---------- Project ----------------------------------------------------------

variable "project_id" {
  description = "GCP project ID where ArkData resources will be provisioned"
  type        = string
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

# ---------- Cloud SQL --------------------------------------------------------

variable "cloudsql_password" {
  description = "Password for the Cloud SQL 'arkdata' user. Store in a secret manager and pass via TF_VAR_cloudsql_password."
  type        = string
  sensitive   = true
}

# ---------- Container Images -------------------------------------------------

variable "artifact_registry_host" {
  description = "Artifact Registry hostname (e.g. us-central1-docker.pkg.dev)"
  type        = string
  default     = "us-central1-docker.pkg.dev"
}

variable "image_tag" {
  description = "Container image tag to deploy across all Cloud Run services"
  type        = string
  default     = "latest"
}
