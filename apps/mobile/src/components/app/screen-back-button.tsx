import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { cn } from "@/lib/utils"

export function ScreenBackButton({
  onPress,
  tone = "default",
}: {
  onPress: () => void
  tone?: "default" | "inverse"
}) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      className={cn(
        "size-11 items-center justify-center rounded-lg",
        tone === "inverse"
          ? "active:bg-brand-surface-foreground/10"
          : "active:bg-accent"
      )}
      haptic
      onPress={onPress}
      transition
    >
      <Icon
        className={cn(
          "size-md",
          tone === "inverse"
            ? "text-brand-surface-foreground"
            : "text-foreground"
        )}
        name="ChevronLeft"
      />
    </Pressable>
  )
}
