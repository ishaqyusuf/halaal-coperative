import {
  ConfirmationRow,
  type ConfirmationRowProps,
} from "@/components/app/confirmation-row"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { useEffect } from "react"
import { Keyboard, useWindowDimensions, View } from "react-native"

type SubmissionReviewSheetProps = {
  cancelLabel?: string
  confirmLabel?: string
  description?: string
  error?: string | null
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
  onDismissed?: () => void
  rows: ConfirmationRowProps[]
  title: string
  visible: boolean
}

export function SubmissionReviewSheet({
  cancelLabel = "Review again",
  confirmLabel = "Confirm and submit",
  description,
  error,
  isSubmitting,
  onClose,
  onConfirm,
  onDismissed,
  rows,
  title,
  visible,
}: SubmissionReviewSheetProps) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale, height } = useWindowDimensions()
  const bodyTextScale = Number.isFinite(fontScale) ? Math.max(fontScale, 1) : 1
  useEffect(() => {
    if (visible) Keyboard.dismiss()
  }, [visible])

  return (
    <FloatingBottomSheet
      accessibilityLabel={title}
      dismissible={!isSubmitting}
      maxDynamicContentSize={
        largeTextLayout
          ? Math.max(420, height * 0.74)
          : Math.min(520, height * 0.58)
      }
      onClose={onClose}
      onDismissed={onDismissed}
      presentation="compact"
      scrollable="auto"
      title={title}
      visible={visible}
      footer={
        <View
          className={cn(
            "gap-2 px-5 pt-3 pb-5",
            largeTextLayout ? "items-stretch" : "flex-row"
          )}
        >
          <Button
            className={cn(
              "min-h-11 py-2",
              largeTextLayout ? "w-full" : "flex-1"
            )}
            disabled={isSubmitting}
            onPress={onClose}
            variant="outline"
          >
            <Text>{cancelLabel}</Text>
          </Button>
          <Button
            className={cn(
              "min-h-11 py-2",
              largeTextLayout ? "w-full" : "flex-1"
            )}
            disabled={isSubmitting}
            onPress={onConfirm}
          >
            <Icon className="size-base text-primary-foreground" name="Send" />
            <Text>{isSubmitting ? "Submitting" : confirmLabel}</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-4 px-5 pt-3 pb-4">
        {description ? (
          <Text
            allowFontScaling={false}
            className="text-sm leading-5 text-muted-foreground"
            style={{
              color: colors.mutedForeground,
              fontSize: 14 * bodyTextScale,
              lineHeight: 20 * bodyTextScale,
            }}
          >
            {description}
          </Text>
        ) : null}
        {error ? (
          <View className="flex-row items-start gap-3 rounded-xl bg-destructive/10 p-3">
            <Icon
              className="size-sm mt-0.5 text-destructive"
              name="AlertCircle"
            />
            <Text
              accessibilityLiveRegion="polite"
              className="min-w-0 flex-1 text-sm leading-5 font-medium text-destructive"
            >
              {error}
            </Text>
          </View>
        ) : null}
        <View className="gap-2">
          {rows.map((row) => (
            <ConfirmationRow key={`${row.label}-${row.value ?? ""}`} {...row} />
          ))}
        </View>
      </View>
    </FloatingBottomSheet>
  )
}
