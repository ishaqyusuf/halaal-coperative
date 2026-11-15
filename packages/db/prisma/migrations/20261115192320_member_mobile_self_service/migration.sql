-- CreateEnum
CREATE TYPE "CooperativeMobileAccessAcceptanceSource" AS ENUM ('member_self_service', 'member_request', 'admin_confirmed');

-- AlterTable
ALTER TABLE "cooperative_mobile_access_terms" ADD COLUMN     "acceptance_source" "CooperativeMobileAccessAcceptanceSource",
ADD COLUMN     "accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "accepted_by_user_id" UUID,
ADD COLUMN     "revoked_by_member" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "cooperative_mobile_self_service_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "cooperative_mobile_access_terms" ADD CONSTRAINT "cooperative_mobile_access_terms_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
