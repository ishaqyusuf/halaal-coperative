import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { AdminFinanceActionStack } from "../components/admin-finance-action-stack"
import { AdminFinanceItemDetailSheet } from "../components/admin-finance-item-detail-sheet"
import { AdminFinanceWorkQueue } from "../components/admin-finance-work-queue"
import { useAdminFinanceSupportController } from "../hooks/use-admin-finance-support-controller"

export function AdminFinanceSupportScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const controller = useAdminFinanceSupportController({ initialEntityId })

  return (
    <>
      <AdminFinanceWorkQueue
        {...controller.queue}
        destinationNotice={
          controller.isDestinationUnavailable ? (
            <NotificationDestinationNotice
              onDismiss={controller.dismissDestinationNotice}
            />
          ) : undefined
        }
      />
      <AdminFinanceItemDetailSheet {...controller.detailSheet} />
      <AdminFinanceActionStack {...controller.actionStack} />
    </>
  )
}
