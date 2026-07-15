import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export type ConfirmationRowProps = {
  className?: string
  detail?: string
  icon?: string
  label: string
  value?: string
}

export function ConfirmationRow({
  className,
  detail,
  icon = "Check",
  label,
  value,
}: ConfirmationRowProps) {
  return (
    <View
      className={cn(
        "min-h-[64px] flex-row items-start gap-3 rounded-md border border-border bg-card p-3",
        className
      )}
    >
      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
        <Icon name={icon} className="size-sm text-secondary-foreground" />
      </View>
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
      {value ? (
        <Text
          adjustsFontSizeToFit
          className="max-w-[116px] text-right text-sm leading-5 font-semibold text-foreground"
          minimumFontScale={0.78}
          numberOfLines={2}
        >
          {value}
        </Text>
      ) : null}
    </View>
  )
}
