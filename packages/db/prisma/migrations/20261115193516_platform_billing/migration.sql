/*
  Warnings:

  - You are about to drop the `cooperative_mobile_invoices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cooperative_mobile_paystack_checkouts` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PlatformBillStatus" AS ENUM ('issued', 'paid', 'no_charge');

-- CreateEnum
CREATE TYPE "PlatformBillLineKind" AS ENUM ('seat_fee', 'ai_overage', 'mobile_access');

-- CreateEnum
CREATE TYPE "PlatformSeatFeePayer" AS ENUM ('cooperative', 'members');

-- CreateEnum
CREATE TYPE "PlatformBillFundingSourceType" AS ENUM ('charge', 'business');

-- DropForeignKey
ALTER TABLE "cooperative_mobile_invoice_items" DROP CONSTRAINT "cooperative_mobile_invoice_items_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "cooperative_mobile_invoices" DROP CONSTRAINT "cooperative_mobile_invoices_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "cooperative_mobile_paystack_checkouts" DROP CONSTRAINT "cooperative_mobile_paystack_checkouts_invoice_id_fkey";

-- DropTable
DROP TABLE "cooperative_mobile_invoices";

-- DropTable
DROP TABLE "cooperative_mobile_paystack_checkouts";

-- DropEnum
DROP TYPE "CooperativeMobileInvoiceStatus";

-- CreateTable
CREATE TABLE "platform_bills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "status" "PlatformBillStatus" NOT NULL DEFAULT 'issued',
    "seat_fee_payer" "PlatformSeatFeePayer" NOT NULL DEFAULT 'cooperative',
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "due_at" DATE NOT NULL,
    "paid_at" DATE,
    "payment_reference" VARCHAR(120),
    "payment_key" VARCHAR(120),
    "funding_source_type" "PlatformBillFundingSourceType",
    "funding_source_id" UUID,
    "funding_source_name" VARCHAR(200),
    "funding_chosen_at" TIMESTAMPTZ(6),
    "funding_chosen_by_user_id" UUID,
    "accrual_posted_at" TIMESTAMPTZ(6),
    "remittance_posted_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_bill_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bill_id" UUID NOT NULL,
    "kind" "PlatformBillLineKind" NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_amount" DECIMAL(18,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "platform_bill_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_bill_seats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bill_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "charge_application_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_bill_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_bill_paystack_checkouts" (
    "reference" VARCHAR(120) NOT NULL,
    "invoice_id" UUID NOT NULL,
    "mode" VARCHAR(4) NOT NULL,
    "authorization_url" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_bill_paystack_checkouts_pkey" PRIMARY KEY ("reference")
);

-- CreateTable
CREATE TABLE "tenant_platform_billing_settings" (
    "tenant_id" UUID NOT NULL,
    "seat_fee_payer" "PlatformSeatFeePayer" NOT NULL DEFAULT 'cooperative',
    "assistant_auto_billing" BOOLEAN NOT NULL DEFAULT false,
    "assistant_monthly_cap" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_platform_billing_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "platform_assistant_usage" (
    "tenant_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "billable_messages" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_assistant_usage_pkey" PRIMARY KEY ("tenant_id","period")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_bills_payment_key_key" ON "platform_bills"("payment_key");

-- CreateIndex
CREATE INDEX "platform_bills_status_period_idx" ON "platform_bills"("status", "period");

-- CreateIndex
CREATE INDEX "platform_bills_tenant_funding_idx" ON "platform_bills"("tenant_id", "funding_source_type", "funding_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_bills_tenant_period_key" ON "platform_bills"("tenant_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "platform_bill_lines_bill_kind_key" ON "platform_bill_lines"("bill_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "platform_bill_seats_charge_application_id_key" ON "platform_bill_seats"("charge_application_id");

-- CreateIndex
CREATE INDEX "platform_bill_seats_tenant_member_idx" ON "platform_bill_seats"("tenant_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_bill_seats_bill_member_key" ON "platform_bill_seats"("bill_id", "member_id");

-- CreateIndex
CREATE INDEX "platform_bill_paystack_checkouts_invoice_id_mode_created_at_idx" ON "platform_bill_paystack_checkouts"("invoice_id", "mode", "created_at");

-- AddForeignKey
ALTER TABLE "platform_bills" ADD CONSTRAINT "platform_bills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_bill_lines" ADD CONSTRAINT "platform_bill_lines_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "platform_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_bill_seats" ADD CONSTRAINT "platform_bill_seats_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "platform_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_bill_seats" ADD CONSTRAINT "platform_bill_seats_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_bill_seats" ADD CONSTRAINT "platform_bill_seats_charge_application_id_fkey" FOREIGN KEY ("charge_application_id") REFERENCES "charge_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_bill_paystack_checkouts" ADD CONSTRAINT "platform_bill_paystack_checkouts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "platform_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperative_mobile_invoice_items" ADD CONSTRAINT "cooperative_mobile_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "platform_bills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_platform_billing_settings" ADD CONSTRAINT "tenant_platform_billing_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_assistant_usage" ADD CONSTRAINT "platform_assistant_usage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
