CREATE TYPE "PaymentAllocationPreference" AS ENUM ('manual_split', 'savings_first', 'loan_first');

ALTER TABLE "members"
ADD COLUMN "payment_allocation_preference" "PaymentAllocationPreference" NOT NULL DEFAULT 'manual_split';
