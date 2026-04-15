import { listTenants } from "@halaal-vest/db"
import { redirect } from "next/navigation"
import { DevTenantFab } from "@/components/marketing/dev-tenant-fab"
import { LaunchLanding } from "@/components/marketing/launch-landing"
import { PrelaunchLanding } from "@/components/marketing/prelaunch-landing"
import { getMarketingConfig } from "@/lib/marketing-config"

export default async function Page() {
  const marketing = getMarketingConfig()

  if (!marketing.showHomePage) {
    redirect("/signup")
  }

  const tenants =
    process.env.NODE_ENV !== "production" ? await listTenants() : []

  return (
    <>
      {marketing.isLaunchReady ? <LaunchLanding /> : <PrelaunchLanding />}
      {process.env.NODE_ENV !== "production" ? (
        <DevTenantFab
          tenants={tenants.map((tenant) => ({
            id: tenant.id,
            memberCount: tenant.memberCount,
            name: tenant.name,
            slug: tenant.slug,
          }))}
        />
      ) : null}
    </>
  )
}
