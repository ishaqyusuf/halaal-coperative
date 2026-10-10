-- DropForeignKey
ALTER TABLE "mobile_app_access_provider_events" DROP CONSTRAINT "mobile_app_access_provider_events_purchase_id_fkey";

-- DropForeignKey
ALTER TABLE "mobile_app_access_purchases" DROP CONSTRAINT "mobile_app_access_purchases_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "mobile_app_access_purchases" DROP CONSTRAINT "mobile_app_access_purchases_user_id_fkey";

-- AddForeignKey
ALTER TABLE "mobile_app_access_purchases" ADD CONSTRAINT "mobile_app_access_purchases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_app_access_purchases" ADD CONSTRAINT "mobile_app_access_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_app_access_provider_events" ADD CONSTRAINT "mobile_app_access_provider_events_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "mobile_app_access_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
