import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import type { MemberExpansionPresentation } from "../model/member-expansion-presentation"

export function MemberCapacityRail({
  presentation,
}: {
  presentation: Exclude<MemberExpansionPresentation, null>
}) {
  const useStackedLayout = useLargeTextLayout()

  return (
    <View
      accessibilityLabel={`${presentation.title}. ${presentation.detail}`}
      className={cn(
        "bg-brand-surface min-h-20 gap-3 rounded-2xl px-4 py-4",
        !useStackedLayout && "flex-row items-center"
      )}
    >
      <View className="bg-brand-surface-foreground/12 size-11 shrink-0 items-center justify-center rounded-full">
        <Icon
          className="text-brand-surface-foreground size-base"
          name="UsersRound"
        />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-brand-surface-foreground text-base font-extrabold">
          {presentation.title}
        </Text>
        <Text className="text-brand-surface-foreground/75 text-sm font-semibold">
          {presentation.detail}
        </Text>
      </View>
    </View>
  )
}
