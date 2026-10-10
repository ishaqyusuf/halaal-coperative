import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export type ConfirmationRowProps = {
  className?: string
  detail?: string
  icon?: string
  label: string
  showIcon?: boolean
  value?: string
}

export function ConfirmationRow({
  className,
  detail,
  icon = "Check",
  label,
  showIcon = true,
  value,
}: ConfirmationRowProps) {
  const largeTextLayout = useLargeTextLayout()

  return (
    <View
      className={cn(
        "min-h-[64px] gap-3 border-b border-border py-3 last:border-b-0",
        largeTextLayout ? "items-start" : "flex-row items-start",
        className
      )}
    >
      <View
        className={cn(
          "min-w-0 flex-row items-start gap-3",
          largeTextLayout ? "w-full" : "flex-1"
        )}
      >
        {showIcon ? (
          <View className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
            <Icon name={icon} className="size-sm text-accent-foreground" />
          </View>
        ) : null}
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm leading-5 font-semibold text-foreground">
            {label}
          </Text>
          {detail ? (
            <Text className="text-xs leading-5 text-muted-foreground">
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
      {value ? (
        <Text
          className={cn(
            "text-sm leading-5 font-semibold text-foreground",
            largeTextLayout ? "max-w-full text-left" : "max-w-[46%] text-right"
          )}
        >
          {value}
        </Text>
      ) : null}
    </View>
  )
}
