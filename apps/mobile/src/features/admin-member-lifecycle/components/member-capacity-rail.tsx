import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import type { MemberExpansionPresentation } from "../model/member-expansion-presentation"

export function MemberCapacityRail({
  canManagePlan,
  onViewPlan,
  presentation,
}: {
  canManagePlan: boolean
  onViewPlan: () => void
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
      {canManagePlan ? (
        <Button
          accessibilityLabel={presentation.actionLabel}
          className={cn(
            "bg-brand-warm active:bg-brand-warm/90 h-11 px-4",
            useStackedLayout && "self-stretch"
          )}
          onPress={onViewPlan}
        >
          <Text className="text-brand-surface font-extrabold">
            {presentation.actionLabel}
          </Text>
          <Icon className="text-brand-surface size-sm" name="ArrowUpRight" />
        </Button>
      ) : null}
    </View>
  )
}
