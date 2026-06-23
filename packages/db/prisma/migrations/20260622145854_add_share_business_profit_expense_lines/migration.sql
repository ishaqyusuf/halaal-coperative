-- CreateTable
CREATE TABLE "share_business_profit_expense_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "profit_entry_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "share_business_profit_expense_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "share_business_profit_expense_lines_tenant_profit_idx" ON "share_business_profit_expense_lines"("tenant_id", "profit_entry_id");

-- AddForeignKey
ALTER TABLE "share_business_profit_expense_lines" ADD CONSTRAINT "share_business_profit_expense_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_business_profit_expense_lines" ADD CONSTRAINT "share_business_profit_expense_lines_profit_entry_id_fkey" FOREIGN KEY ("profit_entry_id") REFERENCES "share_business_profit_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
