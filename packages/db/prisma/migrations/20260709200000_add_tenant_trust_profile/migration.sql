ALTER TABLE "tenants"
  ADD COLUMN "trust_legal_terms_url" TEXT,
  ADD COLUMN "trust_privacy_policy_url" TEXT,
  ADD COLUMN "trust_data_processing_url" TEXT,
  ADD COLUMN "trust_incident_contact_name" TEXT,
  ADD COLUMN "trust_incident_contact_email" TEXT,
  ADD COLUMN "trust_backup_retention_note" TEXT,
  ADD COLUMN "trust_recovery_point_objective" TEXT,
  ADD COLUMN "trust_recovery_time_objective" TEXT,
  ADD COLUMN "trust_reviewed_at" TIMESTAMPTZ(6),
  ADD COLUMN "trust_reviewed_by_user_id" UUID;
