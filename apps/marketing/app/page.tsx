import { redirect } from "next/navigation"
import { MarketingPageView } from "@/components/marketing/marketing-page-view"
import { getMarketingConfig } from "@/lib/marketing-config"
import { resolveActiveMarketingExperienceId } from "@/lib/marketing-experience-policy"
import { loadMarketingPageData } from "@/lib/load-marketing-page"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function Page() {
  const marketing = getMarketingConfig()

  if (!marketing.showHomePage && process.env.NODE_ENV !== "production") {
    redirect("/signup")
  }

  const pageData = await loadMarketingPageData(marketing)
  const experienceId = resolveActiveMarketingExperienceId({
    isProduction: process.env.NODE_ENV === "production",
    requestedExperienceId: marketing.experience,
  })

  return <MarketingPageView experienceId={experienceId} {...pageData} />
}
