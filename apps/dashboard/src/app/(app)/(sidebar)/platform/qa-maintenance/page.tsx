import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { QaMaintenanceView } from "@/components/platform/qa-maintenance-view"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Test data | Halaalvest",
}

export default async function QaMaintenancePage() {
  const context = await getDashboardServerContext()

  if (!context.auth.user?.isPlatformOwner) {
    notFound()
  }

  return <QaMaintenanceView />
}
