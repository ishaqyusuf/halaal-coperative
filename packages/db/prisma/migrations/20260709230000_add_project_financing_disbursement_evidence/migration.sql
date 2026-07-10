ALTER TABLE "project_financing_requests"
  ADD COLUMN "disbursed_by_user_id" UUID,
  ADD COLUMN "disbursed_at" TIMESTAMPTZ(6),
  ADD COLUMN "disbursement_reference" TEXT,
  ADD COLUMN "disbursement_notes" TEXT;

ALTER TABLE "project_financing_requests"
  ADD CONSTRAINT "project_financing_requests_disbursed_by_user_id_fkey"
  FOREIGN KEY ("disbursed_by_user_id")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
