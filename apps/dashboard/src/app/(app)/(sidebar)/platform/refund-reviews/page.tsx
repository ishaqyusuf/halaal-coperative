import { notFound } from "next/navigation"
import { PlatformStoreRefundReviewsView } from "@/components/platform-store-refund-reviews-view"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata = { title: "Google refund reviews | HalaalVest" }

export default async function StoreRefundReviewsPage() {
  const context = await getDashboardServerContext()
  if (!context.auth.user?.isPlatformOwner) notFound()
  return <PlatformStoreRefundReviewsView />
}
