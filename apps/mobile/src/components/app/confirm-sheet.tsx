import { AppSheet } from "@/components/app/app-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { View } from "react-native"

/**
 * Floating confirmation (02 Brand native). Consequential by default: no
 * backdrop/swipe dismissal, and Android Back acts as Cancel.
 */
export function ConfirmSheet({
  cancelLabel = "Cancel",
  children,
  confirmDisabled = false,
  confirmLabel,
  description,
  error,
  expandedTitle,
  icon,
  isConfirming = false,
  onCancel,
  onConfirm,
  onDismissed,
  sideBySide = false,
  title,
  tone = "default",
  visible,
}: {
  cancelLabel?: string
  children?: ReactNode
  confirmDisabled?: boolean
  confirmLabel: string
  description?: string
  error?: string | null
  /** Expand a detailed review when the content no longer fits in half the screen. */
  expandedTitle?: string
  icon?: string
  isConfirming?: boolean
  onCancel: () => void
  onConfirm: () => void
  onDismissed?: () => void
  sideBySide?: boolean
  title: string
  tone?: "default" | "destructive"
  visible: boolean
}) {
  const destructive = tone === "destructive"
  return (
    <AppSheet
      accessibilityLabel={title}
      dismissible={false}
      expandedTitle={expandedTitle}
      footer={
        <View
          className={cn(
            "gap-[10px]",
            !expandedTitle && "px-[20px] pt-[8px] pb-[20px]",
            sideBySide && "flex-row-reverse"
          )}
        >
          <Button
            className={sideBySide ? "flex-1" : undefined}
            disabled={confirmDisabled}
            loading={isConfirming}
            onPress={onConfirm}
            variant={destructive ? "destructive" : "default"}
          >
            <Text>{confirmLabel}</Text>
          </Button>
          <Button
            className={sideBySide ? "flex-1" : undefined}
            disabled={isConfirming}
            onPress={onCancel}
            variant={sideBySide ? "secondary" : "ghost"}
          >
            <Text className="text-foreground">{cancelLabel}</Text>
          </Button>
        </View>
      }
      insetFloatingFooter={Boolean(expandedTitle)}
      isSubmitting={isConfirming}
      onBackPress={() => {
        if (!isConfirming) onCancel()
      }}
      onClose={onCancel}
      onDismissed={onDismissed}
      variant={expandedTitle ? "auto" : "confirm"}
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
        <Text
          accessibilityRole="header"
          className="text-center"
          variant="title"
        >
          {title}
        </Text>
        {description ? (
          <Text
            className="text-center text-muted-foreground"
            variant={expandedTitle ? "small" : "body"}
          >
            {description}
          </Text>
        ) : null}
        {error ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            className="text-center text-destructive"
            variant="small"
          >
            {error}
          </Text>
        ) : null}
      </View>
      {children}
    </AppSheet>
  )
}
