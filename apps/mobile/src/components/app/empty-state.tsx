import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

/**
 * 02 Brand native empty state: tinted 56pt icon tile, 16/800 title, muted
 * description and an optional primary action. `tone="error"` turns the
 * tile red for load failures (pair with an onRetry action).
 */
export function EmptyState({
  action,
  className,
  description,
  icon = "Inbox",
  title,
  tone = "default",
}: {
  action?: { label: string; onPress: () => void; loading?: boolean }
  className?: string
  description?: string
  icon?: string
  title: string
  tone?: "default" | "error" | "warning"
}) {
  return (
    <View
      className={cn(
        "min-h-[132px] items-center justify-center gap-[12px] px-[24px] py-[32px]",
        className
      )}
    >
      <View
        className={cn(
          "size-[56px] items-center justify-center rounded-full",
          tone === "error"
            ? "bg-tint-danger"
            : tone === "warning"
              ? "bg-tint-warm"
              : "bg-accent"
        )}
      >
        <Icon
          className={cn(
            "size-md",
            tone === "error"
              ? "text-tint-danger-foreground"
              : tone === "warning"
                ? "text-tint-warm-foreground"
                : "text-accent-foreground"
          )}
          name={icon}
        />
      </View>
      <View className="items-center gap-[4px]">
        <Text className="text-center" variant="section">
          {title}
        </Text>
        {description ? (
          <Text className="max-w-[300px] text-center text-muted-foreground" variant="small">
            {description}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Button
          className="mt-[4px]"
          loading={action.loading}
          onPress={action.onPress}
          size="sm"
          variant="secondary"
        >
          <Text>{action.label}</Text>
        </Button>
      ) : null}
    </View>
  )
}
