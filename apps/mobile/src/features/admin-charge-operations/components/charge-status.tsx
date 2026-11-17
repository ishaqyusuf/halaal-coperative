import { Icon } from "@/components/ui/icon"
import { initialsFor } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import type { ChargeStatus } from "../model/admin-charge-operations-types"
import { chargeLabel } from "../model/charge-display"

const palette = {
  pending: {
    avatar: "bg-tint-warm",
    chip: "bg-tint-warm",
    dot: "bg-tint-warm-foreground",
    ink: "text-tint-warm-foreground",
    avatarInk: "text-tint-warm-foreground",
  },
  posted: {
    avatar: "bg-accent",
    chip: "bg-tint-success",
    dot: "bg-tint-success-foreground",
    ink: "text-tint-success-foreground",
    avatarInk: "text-accent-foreground",
  },
  waived: {
    avatar: "bg-surface-raised",
    chip: "bg-surface-raised",
    dot: "bg-foreground-soft",
    ink: "text-foreground-soft",
    avatarInk: "text-foreground-soft",
  },
  reversed: {
    avatar: "bg-tint-vivid",
    chip: "bg-tint-vivid",
    dot: "bg-tint-vivid-foreground",
    ink: "text-tint-vivid-foreground",
    avatarInk: "text-tint-vivid-foreground",
  },
}

export function ChargeAvatar({
  name,
  status,
}: {
  name: string
  status: ChargeStatus
}) {
  const tint = palette[status]
  return (
    <View
      accessible={false}
      className={cn(
        "size-[40px] items-center justify-center rounded-[14px]",
        tint.avatar
      )}
    >
      <Text className={cn("font-bold", tint.avatarInk)} variant="small">
        {initialsFor(name)}
      </Text>
    </View>
  )
}

export function ChargeStatusChip({ status }: { status: ChargeStatus }) {
  const tint = palette[status]
  return (
    <View
      className={cn(
        "min-h-[22px] flex-row items-center gap-[5px] rounded-full px-[8px]",
        tint.chip
      )}
    >
      <View className={cn("size-[6px] rounded-full", tint.dot)} />
      <Text className={tint.ink} variant="caption">
        {chargeLabel(status)}
      </Text>
    </View>
  )
}

export function ChargeRuleGlyph({ percentage }: { percentage: boolean }) {
  return percentage ? (
    <Text className="text-accent-foreground" variant="section">
      %
    </Text>
  ) : (
    <Icon className="size-base text-accent-foreground" name="Banknote" />
  )
}

export function ChargeRuleTile({ percentage }: { percentage: boolean }) {
  return (
    <View className="size-[40px] items-center justify-center rounded-[14px] bg-accent">
      <ChargeRuleGlyph percentage={percentage} />
    </View>
  )
}
