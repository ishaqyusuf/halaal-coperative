import {
  isPublicPolicyEffective,
  keepScheduledPolicyRequestTime,
} from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export async function generateMetadata() {
  await keepScheduledPolicyRequestTime("privacy")
  return {
    title: "Privacy notice | HalaalVest",
    robots: {
      index: isPublicPolicyEffective("privacy"),
      follow: true,
    },
  }
}

export default async function Page() {
  await keepScheduledPolicyRequestTime("privacy")
  return <PublicPolicyPage policy="privacy" />
}
