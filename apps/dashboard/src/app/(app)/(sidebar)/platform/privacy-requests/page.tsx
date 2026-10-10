import { notFound } from "next/navigation"
import { PlatformPrivacyRequestsView } from "@/components/platform-privacy-requests-view"
import { getDashboardServerContext } from "@/lib/server-context"
export const metadata = { title: "Privacy requests | HalaalVest" }
export default async function PrivacyRequestsPage() {
  const context = await getDashboardServerContext()
  if (!context.auth.user?.isPlatformOwner) notFound()
  return <PlatformPrivacyRequestsView />
}
