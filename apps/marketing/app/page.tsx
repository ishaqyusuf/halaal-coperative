import { listTenants } from "@halaalvest/db"
import { resolveQaQuickFillContext } from "@halaalvest/utils"
import { redirect } from "next/navigation"
import { DevTenantFab } from "@/components/marketing/dev-tenant-fab"
import { MarketingLanding } from "@/components/marketing/marketing-landing"
import { getMarketingConfig } from "@/lib/marketing-config"
import { getSignupHref } from "@/lib/runtime-url"
import { getServerQaEmailDomains } from "@/lib/server-notifications"

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
  const quickFill = resolveQaQuickFillContext({
    authenticatedEmail: null,
    configuredDomains: getServerQaEmailDomains(),
    isDevelopment: process.env.NODE_ENV !== "production",
  })

  return (
    <>
      <MarketingLanding
        isLaunchReady={marketing.isLaunchReady}
        quickFill={quickFill}
        signupHref={signupHref}
      />
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
