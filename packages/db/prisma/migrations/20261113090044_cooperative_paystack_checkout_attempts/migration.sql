-- DropIndex
DROP INDEX "cooperative_mobile_paystack_checkouts_invoice_id_mode_key";

-- CreateIndex
CREATE INDEX "cooperative_mobile_paystack_checkouts_invoice_id_mode_creat_idx" ON "cooperative_mobile_paystack_checkouts"("invoice_id", "mode", "created_at");
