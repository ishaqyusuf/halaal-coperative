-- AlterEnum
ALTER TYPE "AuthChallengePurpose" ADD VALUE 'account_deletion_email';

-- AlterTable
ALTER TABLE "auth_challenges" ADD COLUMN     "recipient_email_hash" VARCHAR(64);
