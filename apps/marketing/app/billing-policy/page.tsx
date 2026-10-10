import { isPublicPolicyEffective } from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return {
    title: "Billing policy | HalaalVest",
    robots: { index: isPublicPolicyEffective("billing-policy"), follow: true },
  }
}

export default function Page() {
  return <PublicPolicyPage policy="billing-policy" />
}
