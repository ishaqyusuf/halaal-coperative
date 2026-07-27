import { notFound } from "next/navigation"
import { QaMaintenanceView } from "@/components/qa-maintenance-view"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function QaMaintenancePage() {
  const context = await getDashboardServerContext()

  if (!context.auth.user?.isPlatformOwner) {
    notFound()
  }

  return <QaMaintenanceView />
}
