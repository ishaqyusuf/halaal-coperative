CREATE TYPE "KycStatus" AS ENUM ('not_started', 'pending', 'verified', 'rejected');

ALTER TABLE "members"
ADD COLUMN "kyc_status" "KycStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN "government_id_number" TEXT,
ADD COLUMN "kyc_document_url" TEXT;
