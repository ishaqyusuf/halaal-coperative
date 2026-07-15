import {
  ConfirmationRow,
  type ConfirmationRowProps,
} from "@/components/app/confirmation-row"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { View } from "react-native"

export function SubmissionReviewSheet({
  confirmLabel = "Confirm and submit",
  description,
  isSubmitting,
  onClose,
  onConfirm,
  rows,
  title,
  visible,
}: {
  confirmLabel?: string
  description: string
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
  rows: ConfirmationRowProps[]
  title: string
  visible: boolean
}) {
  return (
    <FloatingBottomSheet
      accessibilityLabel={title}
      onClose={onClose}
      snapPoints={["58%"]}
      title={title}
      visible={visible}
    >
      <View className="gap-4 px-5 pt-2 pb-6">
        <Text className="text-sm leading-5 text-muted-foreground">
          {description}
        </Text>
        <View className="gap-2">
          {rows.map((row) => (
            <ConfirmationRow key={`${row.label}-${row.value ?? ""}`} {...row} />
          ))}
        </View>
        <View className="flex-row gap-2">
          <Button
            className="h-11 flex-1"
            disabled={isSubmitting}
            onPress={onClose}
            variant="outline"
          >
            <Icon name="X" className="size-base text-foreground" />
            <Text>Review again</Text>
          </Button>
          <Button
            className="h-11 flex-1"
            disabled={isSubmitting}
            onPress={onConfirm}
          >
            <Icon name="Send" className="size-base text-primary-foreground" />
            <Text>{isSubmitting ? "Submitting" : confirmLabel}</Text>
          </Button>
        </View>
      </View>
    </FloatingBottomSheet>
  )
}
