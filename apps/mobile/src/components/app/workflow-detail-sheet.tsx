import {
  ConfirmationRow,
  type ConfirmationRowProps,
} from "@/components/app/confirmation-row"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { View } from "react-native"

export function WorkflowDetailSheet({
  onClose,
  onOpenNotifications,
  onOpenReceipts,
  receiptLabel = "Receipts",
  rows,
  title,
  visible,
}: {
  onClose: () => void
  onOpenNotifications?: () => void
  onOpenReceipts?: () => void
  receiptLabel?: string
  rows: ConfirmationRowProps[]
  title: string
  visible: boolean
}) {
  return (
    <FloatingBottomSheet
      accessibilityLabel={`${title} details`}
      onClose={onClose}
      presentation="compact"
      scrollable="auto"
      title={title}
      visible={visible}
      footer={
        onOpenReceipts || onOpenNotifications ? (
          <View className="flex-row gap-2 px-5 pt-3 pb-5">
            {onOpenReceipts ? (
              <Button
                className="h-11 flex-1"
                onPress={onOpenReceipts}
                variant="outline"
              >
                <Icon
                  name="ReceiptText"
                  className="size-base text-foreground"
                />
                <Text>{receiptLabel}</Text>
              </Button>
            ) : null}
            {onOpenNotifications ? (
              <Button
                className="h-11 flex-1"
                onPress={onOpenNotifications}
                variant="outline"
              >
                <Icon name="Bell" className="size-base text-foreground" />
                <Text>Updates</Text>
              </Button>
            ) : null}
          </View>
        ) : undefined
      }
    >
      <View className="px-5 pt-2 pb-4">
        <View>
          {rows.map((row) => (
            <ConfirmationRow key={`${row.label}-${row.value ?? ""}`} {...row} />
          ))}
        </View>
      </View>
    </FloatingBottomSheet>
  )
}
