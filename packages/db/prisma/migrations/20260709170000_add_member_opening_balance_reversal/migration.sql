ALTER TYPE "MemberOpeningBalanceStatus" ADD VALUE 'reversed';

ALTER TABLE "member_opening_balances"
  ADD COLUMN "reversed_by_user_id" UUID,
  ADD COLUMN "reversed_at" TIMESTAMPTZ(6),
  ADD COLUMN "reversal_notes" TEXT;
