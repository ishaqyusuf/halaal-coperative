import { isMarketingExperienceId } from "@halaalvest/domain"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MarketingPageView } from "@/components/marketing/marketing-page-view"
import { getMarketingConfig } from "@/lib/marketing-config"
import { canAccessMarketingPreview } from "@/lib/marketing-preview-access"
import { loadMarketingPageData } from "@/lib/load-marketing-page"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
    nocache: true,
  },
  title: "Marketing experience preview | Halaalvest",
}

export default async function MarketingExperiencePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ experience: string }>
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const [{ experience }, query] = await Promise.all([params, searchParams])
  const providedToken = Array.isArray(query.token)
    ? query.token[0]
    : query.token

  if (
    !isMarketingExperienceId(experience) ||
    !canAccessMarketingPreview({
      configuredToken: process.env.MARKETING_EXPERIENCE_PREVIEW_TOKEN,
      isProduction: process.env.NODE_ENV === "production",
      providedToken,
    })
  ) {
    notFound()
  }

  const marketing = getMarketingConfig()
  const pageData = await loadMarketingPageData(marketing)

  return <MarketingPageView experienceId={experience} {...pageData} />
}
