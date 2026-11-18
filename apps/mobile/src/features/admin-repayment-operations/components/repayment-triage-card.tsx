import { Icon } from "@/components/ui/icon"
import { Elevated, TintedAvatar } from "@/components/ui/list-card"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { formatCompactMoney, formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { memo } from "react"
import { Pressable, View } from "react-native"
import type {
  RepaymentLane,
  RepaymentWorkspaceItem,
} from "../model/admin-repayment-operations-types"
import {
  type FollowUpChip,
  followUpChip,
  formatRepaymentDate,
  rowSeverity,
  rowStatus,
} from "../model/admin-repayment-presentation"

const railClass = {
  bad: "bg-destructive",
  brand: "bg-brand",
  ok: "bg-success",
  warn: "bg-brand-warm",
} as const

const chipClass: Record<FollowUpChip["tone"], [string, string]> = {
  brand: ["bg-accent", "text-accent-foreground"],
  info: ["bg-tint-sky", "text-tint-sky-foreground"],
  neutral: ["bg-surface-raised", "text-foreground-soft"],
  vivid: ["bg-tint-vivid", "text-tint-vivid-foreground"],
  warning: ["bg-tint-warm", "text-tint-warm-foreground"],
}

export function FollowUpBadge({ chip }: { chip: FollowUpChip }) {
  const [surface, text] = chipClass[chip.tone]
  return (
    <View
      className={cn(
        "min-h-[22px] flex-row items-center gap-[4px] self-start rounded-full px-[8px]",
        surface
      )}
    >
      {chip.icon ? (
        <Icon className={cn("size-[12px]", text)} name={chip.icon} />
      ) : null}
      <Text className={text} numberOfLines={1} variant="caption">
        {chip.label}
      </Text>
    </View>
  )
}

function QuickAction({
  disabled,
  icon,
  label,
  onPress,
  primary = false,
  testID,
}: {
  disabled: boolean
  icon: string
  label: string
  onPress: () => void
  primary?: boolean
  testID?: string
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={cn(
        "min-h-[44px] flex-1 flex-row items-center justify-center gap-[6px] rounded-[12px] active:opacity-80",
        primary ? "bg-accent" : "bg-surface-raised",
        disabled && "opacity-40"
      )}
      onPress={disabled ? undefined : onPress}
      testID={testID}
    >
      <Icon
        className={cn(
          "size-[16px]",
          primary ? "text-accent-foreground" : "text-foreground"
        )}
        name={icon}
      />
      <Text
        className={primary ? "text-accent-foreground" : undefined}
        variant="label"
      >
        {label}
      </Text>
    </Pressable>
  )
}

export const RepaymentTriageCard = memo(function RepaymentTriageCard({
  canFollowUp,
  canPost,
  currencyCode,
  item,
  lane,
  onFollowUp,
  onOpen,
  onRecord,
  writesBlocked,
}: {
  canFollowUp: boolean
  canPost: boolean
  currencyCode: string
  item: RepaymentWorkspaceItem
  lane: RepaymentLane
  onFollowUp: (item: RepaymentWorkspaceItem) => void
  onOpen: (item: RepaymentWorkspaceItem) => void
  onRecord: (item: RepaymentWorkspaceItem) => void
  writesBlocked: boolean
}) {
  const posted = item.lane === "posted"
  const status = rowStatus(item)
  const chip = followUpChip(item, lane)
  const money = formatMoney(item.amount, { currencyCode })
  const detail = posted
    ? [formatRepaymentDate(item.dueAt), item.reference].filter(Boolean).join(" · ")
    : `Inst ${item.installmentNumber ?? "–"} · ${formatCompactMoney(item.loan.outstandingPrincipal, currencyCode)} left`
  const showActions = !posted && canFollowUp
  return (
    <Elevated className="overflow-hidden rounded-[18px] bg-card" radius={18}>
      <Pressable
        accessibilityHint="Opens the facility"
        accessibilityLabel={`${item.member.name}, ${money}, ${status.label}`}
        accessibilityRole="button"
        className="gap-[10px] py-[14px] pr-[14px] pl-[18px] active:bg-surface-raised"
        onPress={() => onOpen(item)}
        testID={`repayment-row-${item.id}`}
      >
        <View
          className={cn(
            "absolute top-0 bottom-0 left-0 w-[4px]",
            railClass[rowSeverity(item)]
          )}
        />
        <View className="flex-row items-center gap-[10px]">
          <TintedAvatar name={item.member.name} />
          <View className="min-w-0 flex-1">
            <Text className="font-bold" numberOfLines={1} variant="body">
              {item.member.name}
            </Text>
            <Text
              className="text-muted-foreground"
              numberOfLines={1}
              variant="caption"
            >
              {item.member.number} · {item.loan.productName}
            </Text>
          </View>
          <StatusPill label={status.label} tone={status.tone} />
        </View>
        <View className="flex-row items-baseline justify-between gap-[10px]">
          <Text className="text-[20px] leading-[26px]" variant="money">
            {money}
          </Text>
          <Text
            className="min-w-0 flex-1 text-right text-muted-foreground"
            numberOfLines={1}
            variant="caption"
          >
            {detail}
          </Text>
        </View>
        {chip ? (
          <View className="flex-row items-center justify-between gap-[8px]">
            <FollowUpBadge chip={chip} />
            {chip.next ? (
              <Text className="text-muted-foreground" variant="caption">
                {chip.next}
              </Text>
            ) : null}
          </View>
        ) : null}
        {showActions ? (
          <View className="flex-row gap-[8px]">
            <QuickAction
              disabled={writesBlocked}
              icon="Bell"
              label="Follow up"
              onPress={() => onFollowUp(item)}
              testID={`repayment-row-follow-up-${item.id}`}
            />
            {canPost ? (
              <QuickAction
                disabled={writesBlocked}
                icon="Plus"
                label="Record"
                onPress={() => onRecord(item)}
                primary
                testID={`repayment-row-record-${item.id}`}
              />
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Elevated>
  )
})
