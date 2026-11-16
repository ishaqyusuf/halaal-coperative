import { AppSheet } from "@/components/app/app-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

/**
 * Floating confirmation (02 Brand native). Consequential by default: no
 * backdrop/swipe dismissal, and Android Back acts as Cancel.
 */
export function ConfirmSheet({
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  icon,
  isConfirming = false,
  onCancel,
  onConfirm,
  title,
  tone = "default",
  visible,
}: {
  cancelLabel?: string
  confirmLabel: string
  description?: string
  icon?: string
  isConfirming?: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  tone?: "default" | "destructive"
  visible: boolean
}) {
  const destructive = tone === "destructive"
  return (
    <AppSheet
      accessibilityLabel={title}
      dismissible={false}
      footer={
        <View className="gap-[10px] px-[20px] pt-[8px] pb-[20px]">
          <Button
            loading={isConfirming}
            onPress={onConfirm}
            variant={destructive ? "destructive" : "default"}
          >
            <Text>{confirmLabel}</Text>
          </Button>
          <Button disabled={isConfirming} onPress={onCancel} variant="ghost">
            <Text className="text-foreground">{cancelLabel}</Text>
          </Button>
        </View>
      }
      onBackPress={() => {
        if (!isConfirming) onCancel()
      }}
      onClose={onCancel}
      variant="confirm"
      visible={visible}
    >
      <View className="items-center gap-[12px] pt-[8px]">
        <View
          className={cn(
            "size-[56px] items-center justify-center rounded-full",
            destructive ? "bg-tint-danger" : "bg-accent"
          )}
        >
          <Icon
            className={cn(
              "size-md",
              destructive
                ? "text-tint-danger-foreground"
                : "text-accent-foreground"
            )}
            name={icon ?? (destructive ? "TriangleAlert" : "CircleCheck")}
          />
        </View>
        <Text accessibilityRole="header" className="text-center" variant="title">
          {title}
        </Text>
        {description ? (
          <Text className="text-center text-muted-foreground" variant="body">
            {description}
          </Text>
        ) : null}
      </View>
    </AppSheet>
  )
}
