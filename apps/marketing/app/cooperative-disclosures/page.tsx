import { isPublicPolicyEffective } from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return {
    title: "Cooperative disclosures | HalaalVest",
    robots: {
      index: isPublicPolicyEffective("cooperative-disclosures"),
      follow: true,
    },
  }
}

export default function Page() {
  return <PublicPolicyPage policy="cooperative-disclosures" />
}
