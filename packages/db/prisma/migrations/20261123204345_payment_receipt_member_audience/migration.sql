-- CreateEnum
CREATE TYPE "PaymentReceiptMemberAudience" AS ENUM ('disabled', 'enabled', 'selected_members');

-- CreateTable
CREATE TABLE "tenant_payment_receipt_member_access" (
    "tenant_id" UUID NOT NULL,
    "audience" "PaymentReceiptMemberAudience" NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tenant_payment_receipt_member_access_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "tenant_payment_receipt_member_grants" (
    "tenant_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,

    CONSTRAINT "tenant_payment_receipt_member_grants_pkey" PRIMARY KEY ("tenant_id","member_id")
);

-- CreateIndex
CREATE INDEX "tenant_payment_receipt_member_grants_member_id_idx" ON "tenant_payment_receipt_member_grants"("member_id");

-- AddForeignKey
ALTER TABLE "tenant_payment_receipt_member_access" ADD CONSTRAINT "tenant_payment_receipt_member_access_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_payment_receipt_member_grants" ADD CONSTRAINT "tenant_payment_receipt_member_grants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant_payment_receipt_member_access"("tenant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_payment_receipt_member_grants" ADD CONSTRAINT "tenant_payment_receipt_member_grants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
