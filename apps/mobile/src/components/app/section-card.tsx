import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export function SectionCard({
  children,
  className,
  icon,
  title,
}: {
  children: React.ReactNode
  className?: string
  icon: string
  title: string
}) {
  return (
    <View
      className={cn(
        "gap-4 rounded-md border border-border bg-card p-4 shadow-sm shadow-black/5",
        className
      )}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary">
          <Icon name={icon} className="size-base text-secondary-foreground" />
        </View>
        <Text
          className="flex-1 text-lg leading-6 font-semibold text-foreground"
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  )
}
