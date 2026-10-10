import { isPublicPolicyEffective } from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return {
    title: "Platform terms | HalaalVest",
    robots: {
      index: isPublicPolicyEffective("terms"),
      follow: true,
    },
  }
}

export default function Page() {
  return <PublicPolicyPage policy="terms" />
}
