import {
  isPublicPolicyEffective,
  keepScheduledPolicyRequestTime,
} from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export async function generateMetadata() {
  await keepScheduledPolicyRequestTime("support")
  return {
    title: "Support | HalaalVest",
    robots: { index: isPublicPolicyEffective("support"), follow: true },
  }
}

export default async function Page() {
  await keepScheduledPolicyRequestTime("support")
  return <PublicPolicyPage policy="support" />
}
