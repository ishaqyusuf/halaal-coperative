-- CreateTable
CREATE TABLE "membership_removals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "roles" "MembershipRole"[],
    "removed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_by_user_id" UUID,
    "restored_at" TIMESTAMPTZ(6),
    "restored_by_user_id" UUID,

    CONSTRAINT "membership_removals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_removals_tenant_restored_idx" ON "membership_removals"("tenant_id", "restored_at");

-- CreateIndex
CREATE INDEX "membership_removals_user_id_idx" ON "membership_removals"("user_id");

-- AddForeignKey
ALTER TABLE "membership_removals" ADD CONSTRAINT "membership_removals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_removals" ADD CONSTRAINT "membership_removals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
