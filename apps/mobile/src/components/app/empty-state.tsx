import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export function EmptyState({
  className,
  description,
  icon = "Inbox",
  title,
}: {
  className?: string
  description?: string
  icon?: string
  title: string
}) {
  return (
    <View
      className={cn(
        "min-h-[132px] items-center justify-center gap-3 rounded-md border border-dashed border-border bg-secondary/60 p-5",
        className
      )}
    >
      <View className="h-11 w-11 items-center justify-center rounded-md bg-card">
        <Icon name={icon} className="size-base text-muted-foreground" />
      </View>
      <View className="items-center gap-1">
        <Text className="text-center text-sm leading-5 font-semibold text-foreground">
          {title}
        </Text>
        {description ? (
          <Text className="text-center text-xs leading-5 text-muted-foreground">
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
