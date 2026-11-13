-- CreateTable
CREATE TABLE "cooperative_mobile_paystack_checkouts" (
    "reference" VARCHAR(120) NOT NULL,
    "invoice_id" UUID NOT NULL,
    "mode" VARCHAR(4) NOT NULL,
    "authorization_url" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cooperative_mobile_paystack_checkouts_pkey" PRIMARY KEY ("reference")
);

-- CreateIndex
CREATE UNIQUE INDEX "cooperative_mobile_paystack_checkouts_invoice_id_mode_key" ON "cooperative_mobile_paystack_checkouts"("invoice_id", "mode");

-- AddForeignKey
ALTER TABLE "cooperative_mobile_paystack_checkouts" ADD CONSTRAINT "cooperative_mobile_paystack_checkouts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "cooperative_mobile_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
