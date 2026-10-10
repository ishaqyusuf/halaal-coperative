import { isPublicPolicyEffective } from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return {
    title: "Support | HalaalVest",
    robots: { index: isPublicPolicyEffective("support"), follow: true },
  }
}

export default function Page() {
  return <PublicPolicyPage policy="support" />
}
