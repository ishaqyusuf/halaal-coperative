import { redirect } from "next/navigation"
import { DevTenantFab } from "@/components/marketing/dev-tenant-fab"
import { OnePlaceV4Landing } from "@/components/marketing/experiences/one-place-v4"
import { loadMarketingPageData } from "@/lib/load-marketing-page"
import { getMarketingConfig } from "@/lib/marketing-config"

export default async function Page() {
  const marketing = getMarketingConfig()

  if (!marketing.showHomePage && process.env.NODE_ENV !== "production") {
    redirect("/signup")
  }

  const { landingProps, showDevTenantFab, tenants } =
    await loadMarketingPageData(marketing)

  return (
    <>
      <OnePlaceV4Landing {...landingProps} />
      {showDevTenantFab ? <DevTenantFab tenants={tenants} /> : null}
    </>
  )
}
