import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { QaMaintenanceView } from "@/components/qa-maintenance-view"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "QA maintenance | Halaalvest",
}

export default async function QaMaintenancePage() {
  const context = await getDashboardServerContext()

  if (!context.auth.user?.isPlatformOwner) {
    notFound()
  }

  return <QaMaintenanceView />
}
