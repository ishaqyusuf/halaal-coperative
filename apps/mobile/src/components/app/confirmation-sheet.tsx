import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { useWindowDimensions, View } from "react-native"

type ConfirmationSheetProps = {
  cancelLabel?: string
  confirmLabel: string
  description: string
  isConfirming?: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  tone?: "default" | "destructive"
  visible: boolean
}

export function ConfirmationSheet({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  isConfirming = false,
  onClose,
  onConfirm,
  title,
  tone = "default",
  visible,
}: ConfirmationSheetProps) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const bodyTextScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const actions = (
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
        disabled={isConfirming}
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
        disabled={isConfirming}
        onPress={onConfirm}
        variant={tone === "destructive" ? "destructive" : "default"}
      >
        <Icon
          className={
            tone === "destructive"
              ? "size-base text-destructive-foreground"
              : "size-base text-primary-foreground"
          }
          name={tone === "destructive" ? "Trash2" : "Check"}
        />
        <Text>{isConfirming ? "Working" : confirmLabel}</Text>
      </Button>
    </View>
  )

  return (
    <FloatingBottomSheet
      accessibilityLabel={title}
      dismissible={!isConfirming}
      onClose={onClose}
      presentation="compact"
      scrollable="auto"
      title={title}
      visible={visible}
    >
      <View className="pt-3">
        <View className="px-5 pb-4">
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
        </View>
        {actions}
      </View>
    </FloatingBottomSheet>
  )
}
