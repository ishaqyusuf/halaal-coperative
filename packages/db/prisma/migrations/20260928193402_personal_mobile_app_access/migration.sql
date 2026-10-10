-- CreateTable
CREATE TABLE "mobile_app_access_purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_name" VARCHAR(24) NOT NULL,
    "provider_subscription_id" VARCHAR(128) NOT NULL,
    "previous_provider_subscription_id" VARCHAR(128),
    "product_id" VARCHAR(200) NOT NULL,
    "duration" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "environment" VARCHAR(12) NOT NULL,
    "period_starts_at" TIMESTAMPTZ(6),
    "period_ends_at" TIMESTAMPTZ(6) NOT NULL,
    "grace_ends_at" TIMESTAMPTZ(6),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "last_verified_at" TIMESTAMPTZ(6) NOT NULL,
    "last_evidence_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mobile_app_access_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_app_access_provider_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_id" UUID NOT NULL,
    "evidence_hash" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "verified_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_app_access_provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mobile_app_access_purchases_user_status_end_idx" ON "mobile_app_access_purchases"("user_id", "status", "period_ends_at");

-- CreateIndex
CREATE INDEX "mobile_app_access_purchases_tenant_user_idx" ON "mobile_app_access_purchases"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_app_access_purchases_provider_chain_key" ON "mobile_app_access_purchases"("provider_name", "provider_subscription_id");

-- CreateIndex
CREATE INDEX "mobile_app_access_provider_events_purchase_verified_idx" ON "mobile_app_access_provider_events"("purchase_id", "verified_at");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_app_access_provider_events_purchase_hash_key" ON "mobile_app_access_provider_events"("purchase_id", "evidence_hash");

-- AddForeignKey
ALTER TABLE "mobile_app_access_purchases" ADD CONSTRAINT "mobile_app_access_purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_app_access_purchases" ADD CONSTRAINT "mobile_app_access_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_app_access_provider_events" ADD CONSTRAINT "mobile_app_access_provider_events_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "mobile_app_access_purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
