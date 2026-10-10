import { isPublicPolicyEffective } from "@/lib/public-policies"
import { PublicPolicyPage } from "@/components/public-policy-page"

export const dynamic = "force-dynamic"

export function generateMetadata() {
  return {
    title: "Delete your account | HalaalVest",
    robots: { index: isPublicPolicyEffective("delete-account"), follow: true },
  }
}

export default function Page() {
  return <PublicPolicyPage policy="delete-account" />
}
