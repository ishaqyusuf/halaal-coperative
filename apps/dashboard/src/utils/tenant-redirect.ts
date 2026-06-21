import { createTenantRedirect } from "@halaalvest/tenant-url/next/server"
import { getDashboardTenantUrlConfig } from "./tenant-url-config"

export const tenantRedirect = createTenantRedirect({
  getConfig: getDashboardTenantUrlConfig,
})
