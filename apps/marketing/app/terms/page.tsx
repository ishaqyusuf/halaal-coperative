import {
  isPublicPolicyEffective,
  keepScheduledPolicyRequestTime,
} from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export async function generateMetadata() {
  await keepScheduledPolicyRequestTime("terms")
  return {
    title: "Platform terms | HalaalVest",
    robots: {
      index: isPublicPolicyEffective("terms"),
      follow: true,
    },
  }
}

export default async function Page() {
  await keepScheduledPolicyRequestTime("terms")
  return <PublicPolicyPage policy="terms" />
}
