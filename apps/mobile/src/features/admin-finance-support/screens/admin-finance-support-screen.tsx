import { SafeArea } from "@/components/safe-area"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { AdminFinanceActionStack } from "../components/admin-finance-action-stack"
import { AdminFinanceItemDetailSheet } from "../components/admin-finance-item-detail-sheet"
import { AdminFinanceOperationsSheet } from "../components/admin-finance-operations-sheet"
import { AdminFinanceWorkQueue } from "../components/admin-finance-work-queue"
import { useAdminFinanceSupportController } from "../hooks/use-admin-finance-support-controller"

export function AdminFinanceSupportScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const controller = useAdminFinanceSupportController({ initialEntityId })

  return (
    <SafeArea className="flex-1 bg-background">
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
      <AdminFinanceOperationsSheet {...controller.operationsSheet} />
      <AdminFinanceItemDetailSheet {...controller.detailSheet} />
      <AdminFinanceActionStack {...controller.actionStack} />
    </SafeArea>
  )
}
