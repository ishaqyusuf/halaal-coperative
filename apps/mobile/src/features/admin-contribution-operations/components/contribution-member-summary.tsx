import { Text } from "@/components/ui/text"
import { View } from "react-native"
import { formatCurrency } from "../lib/admin-contribution-presentation"
import type { ContributionMemberWorkspace } from "../model/admin-contribution-operations-types"

export function ContributionMemberSummary({
  member,
  currencyCode,
  showBalance = false,
}: {
  member: ContributionMemberWorkspace
  currencyCode: string
  showBalance?: boolean
}) {
  const initials = member.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
  return (
    <View>
      <View className="flex-row items-center gap-3 border-b border-border py-4">
        <View className="size-11 shrink-0 items-center justify-center rounded-xl bg-accent">
          <Text className="font-extrabold text-accent-foreground">
            {initials}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-bold text-foreground">
            {member.name}
          </Text>
          <Text className="text-xs leading-5 text-muted-foreground">
            {member.number}
            {member.deductionSourceName
              ? ` · ${member.deductionSourceName}`
              : ""}
          </Text>
        </View>
      </View>
      {showBalance ? (
        <View className="bg-brand-surface gap-2 px-4 py-5">
          <Text className="text-brand-surface-foreground text-sm">
            Monthly commitment
          </Text>
          <Text className="text-brand-surface-foreground text-3xl font-extrabold">
            {formatCurrency(member.commitmentTarget, currencyCode)}
          </Text>
          <Text className="text-brand-surface-foreground text-sm">
            {formatCurrency(member.totalSavings, currencyCode)} saved
          </Text>
        </View>
      ) : null}
    </View>
  )
}
