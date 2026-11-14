import {
  isPublicPolicyEffective,
  keepScheduledPolicyRequestTime,
} from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export async function generateMetadata() {
  await keepScheduledPolicyRequestTime("cooperative-disclosures")
  return {
    title: "Cooperative disclosures | HalaalVest",
    robots: {
      index: isPublicPolicyEffective("cooperative-disclosures"),
      follow: true,
    },
  }
}

export default async function Page() {
  await keepScheduledPolicyRequestTime("cooperative-disclosures")
  return <PublicPolicyPage policy="cooperative-disclosures" />
}
