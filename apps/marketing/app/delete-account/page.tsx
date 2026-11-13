import { getMarketingQaQuickFillContext } from "@/lib/qa-form-access.server"
import { isPublicPolicyEffective } from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return {
    title: "Delete your account | HalaalVest",
    robots: { index: isPublicPolicyEffective("delete-account"), follow: true },
  }
}

export default async function Page() {
  const quickFill = await getMarketingQaQuickFillContext()
  return <PublicPolicyPage policy="delete-account" quickFill={quickFill} />
}
