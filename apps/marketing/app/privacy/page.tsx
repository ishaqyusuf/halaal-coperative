import { isPublicPolicyEffective } from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return {
    title: "Privacy notice | HalaalVest",
    robots: {
      index: isPublicPolicyEffective("privacy"),
      follow: true,
    },
  }
}

export default function Page() {
  return <PublicPolicyPage policy="privacy" />
}
