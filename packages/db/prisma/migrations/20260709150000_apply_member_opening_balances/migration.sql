ALTER TYPE "MemberOpeningBalanceStatus" ADD VALUE IF NOT EXISTS 'applied';

ALTER TABLE "member_opening_balances"
  ADD COLUMN "applied_by_user_id" UUID,
  ADD COLUMN "applied_at" TIMESTAMPTZ(6);
