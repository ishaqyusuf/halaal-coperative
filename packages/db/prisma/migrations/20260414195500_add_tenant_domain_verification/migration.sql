ALTER TABLE "tenant_domains"
ADD COLUMN "verification_status" TEXT NOT NULL DEFAULT 'pending_dns',
ADD COLUMN "verification_checked_at" TIMESTAMPTZ(6),
ADD COLUMN "verified_at" TIMESTAMPTZ(6);

UPDATE "tenant_domains"
SET
  "verification_status" = CASE
    WHEN "kind" IN ('site', 'dashboard') THEN 'verified'
    ELSE 'pending_dns'
  END,
  "verification_checked_at" = NOW(),
  "verified_at" = CASE
    WHEN "kind" IN ('site', 'dashboard') THEN NOW()
    ELSE NULL
  END;
