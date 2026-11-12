-- CreateEnum
CREATE TYPE "CooperativeMobileAccessTermStatus" AS ENUM ('pending', 'approved', 'rejected', 'revoked');

-- CreateEnum
CREATE TYPE "CooperativeMobileInvoiceStatus" AS ENUM ('issued', 'paid');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "cooperative_mobile_access_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cooperative_mobile_access_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "status" "CooperativeMobileAccessTermStatus" NOT NULL DEFAULT 'pending',
    "terms_version" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency_code" TEXT NOT NULL,
    "term_months" INTEGER NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "charge_due_at" DATE,
    "revoked_at" TIMESTAMPTZ(6),
    "review_note" TEXT,

    CONSTRAINT "cooperative_mobile_access_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooperative_mobile_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "status" "CooperativeMobileInvoiceStatus" NOT NULL DEFAULT 'issued',
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "due_at" DATE NOT NULL,
    "paid_at" DATE,
    "payment_reference" VARCHAR(120),
    "payment_key" VARCHAR(120),
    "accrual_posted_at" TIMESTAMPTZ(6),
    "remittance_posted_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cooperative_mobile_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooperative_mobile_invoice_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "term_id" UUID NOT NULL,
    "charge_application_id" UUID,
    "invoice_id" UUID,
    "charge_due_at" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cooperative_mobile_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coop_mobile_access_member_terms_idx" ON "cooperative_mobile_access_terms"("tenant_id", "member_id", "requested_at", "id");

-- CreateIndex
CREATE INDEX "coop_mobile_access_queue_idx" ON "cooperative_mobile_access_terms"("tenant_id", "status", "requested_at", "id");

-- CreateIndex
CREATE INDEX "coop_mobile_access_tenant_terms_idx" ON "cooperative_mobile_access_terms"("tenant_id", "requested_at", "id");

-- CreateIndex
CREATE INDEX "coop_mobile_access_due_idx" ON "cooperative_mobile_access_terms"("tenant_id", "charge_due_at");

-- CreateIndex
CREATE UNIQUE INDEX "cooperative_mobile_invoices_payment_key_key" ON "cooperative_mobile_invoices"("payment_key");

-- CreateIndex
CREATE INDEX "coop_mobile_invoices_status_period_idx" ON "cooperative_mobile_invoices"("status", "period");

-- CreateIndex
CREATE UNIQUE INDEX "coop_mobile_invoices_tenant_period_key" ON "cooperative_mobile_invoices"("tenant_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "cooperative_mobile_invoice_items_term_id_key" ON "cooperative_mobile_invoice_items"("term_id");

-- CreateIndex
CREATE UNIQUE INDEX "cooperative_mobile_invoice_items_charge_application_id_key" ON "cooperative_mobile_invoice_items"("charge_application_id");

-- CreateIndex
CREATE INDEX "coop_mobile_invoice_items_invoice_due_idx" ON "cooperative_mobile_invoice_items"("invoice_id", "charge_due_at");

-- AddForeignKey
ALTER TABLE "cooperative_mobile_access_terms" ADD CONSTRAINT "cooperative_mobile_access_terms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperative_mobile_access_terms" ADD CONSTRAINT "cooperative_mobile_access_terms_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperative_mobile_invoices" ADD CONSTRAINT "cooperative_mobile_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperative_mobile_invoice_items" ADD CONSTRAINT "cooperative_mobile_invoice_items_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "cooperative_mobile_access_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperative_mobile_invoice_items" ADD CONSTRAINT "cooperative_mobile_invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "cooperative_mobile_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooperative_mobile_invoice_items" ADD CONSTRAINT "cooperative_mobile_invoice_items_charge_application_id_fkey" FOREIGN KEY ("charge_application_id") REFERENCES "charge_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
