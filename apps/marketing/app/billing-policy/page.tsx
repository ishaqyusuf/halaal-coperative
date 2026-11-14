import {
  isPublicPolicyEffective,
  keepScheduledPolicyRequestTime,
} from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export async function generateMetadata() {
  await keepScheduledPolicyRequestTime("billing-policy")
  return {
    title: "Billing policy | HalaalVest",
    robots: { index: isPublicPolicyEffective("billing-policy"), follow: true },
  }
}

export default async function Page() {
  await keepScheduledPolicyRequestTime("billing-policy")
  return <PublicPolicyPage policy="billing-policy" />
}
