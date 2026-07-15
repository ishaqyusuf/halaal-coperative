import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export function StatCard({
  className,
  detail,
  label,
  value,
}: {
  className?: string
  detail: string
  label: string
  value: string
}) {
  return (
    <View
      className={cn(
        "min-h-[136px] min-w-[148px] flex-1 justify-between gap-3 rounded-md border border-border bg-card p-4 shadow-sm shadow-black/5",
        className
      )}
    >
      <Text
        className="text-sm leading-5 text-muted-foreground"
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        className="text-2xl leading-8 font-bold text-foreground"
        minimumFontScale={0.72}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        className="text-xs leading-5 text-muted-foreground"
        numberOfLines={2}
      >
        {detail}
      </Text>
    </View>
  )
}
