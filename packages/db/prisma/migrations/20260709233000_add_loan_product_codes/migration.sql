ALTER TABLE "loan_products"
ADD COLUMN "code" TEXT;

CREATE UNIQUE INDEX "loan_products_tenant_code_key" ON "loan_products"("tenant_id", "code");
