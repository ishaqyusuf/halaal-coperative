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
    <View className={cn("gap-4 border-b border-border pb-5", className)}>
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
          <Icon name={icon} className="size-sm text-accent-foreground" />
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
