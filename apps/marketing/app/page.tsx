import { listTenants } from "@halaalvest/db"
import { redirect } from "next/navigation"
import { DevTenantFab } from "@/components/marketing/dev-tenant-fab"
import { LaunchLanding } from "@/components/marketing/launch-landing"
import { PrelaunchLanding } from "@/components/marketing/prelaunch-landing"
import { getMarketingConfig } from "@/lib/marketing-config"
import { getSignupHref } from "@/lib/runtime-url"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Page() {
  const marketing = getMarketingConfig()

  if (!marketing.showHomePage && process.env.NODE_ENV !== "production") {
    redirect("/signup")
  }

  const tenants =
    process.env.NODE_ENV !== "production" ? await listTenants() : []
  const signupHref = marketing.earlyAccessModeEnabled
    ? "#early-access"
    : await getSignupHref()

  return (
    <>
      {marketing.isLaunchReady ? (
        <LaunchLanding signupHref={signupHref} />
      ) : (
        <PrelaunchLanding signupHref={signupHref} />
      )}
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
