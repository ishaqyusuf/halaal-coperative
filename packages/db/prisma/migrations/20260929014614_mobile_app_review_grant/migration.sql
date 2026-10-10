-- CreateTable
CREATE TABLE "mobile_app_review_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "environment" VARCHAR(12) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mobile_app_review_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_app_review_grants_user_id_key" ON "mobile_app_review_grants"("user_id");

-- CreateIndex
CREATE INDEX "mobile_app_review_grants_tenant_expiry_idx" ON "mobile_app_review_grants"("tenant_id", "expires_at");

-- AddForeignKey
ALTER TABLE "mobile_app_review_grants" ADD CONSTRAINT "mobile_app_review_grants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_app_review_grants" ADD CONSTRAINT "mobile_app_review_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
