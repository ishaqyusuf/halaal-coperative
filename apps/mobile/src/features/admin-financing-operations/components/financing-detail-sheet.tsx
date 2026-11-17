import { AppSheet } from "@/components/app/app-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated, ListCard, TintedAvatar } from "@/components/ui/list-card"
import { SectionHeader } from "@/components/ui/section-header"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useRef } from "react"
import { View } from "react-native"
import type {
  FinancingItem,
  FinancingSummary,
} from "../model/admin-financing-operations-types"
import {
  ageOf,
  financingChecks,
  financingHistory,
  financingState,
} from "../model/financing-presentation"

function useLast<T>(value: T | null) {
  const last = useRef(value)
  if (value) last.current = value
  return last.current
}

/** T20 screen 2 (02 Large title): one request or release, read-only, with its next action docked. */
export function FinancingDetailSheet({
  blockedReason,
  item: current,
  onClose,
  onDisburse,
  onReview,
  summary,
}: {
  /** Why the docked action is unavailable (offline, view only), if it is. */
  blockedReason: string | null
  item: FinancingItem | null
  onClose: () => void
  onDisburse: (item: FinancingItem) => void
  onReview: (item: FinancingItem) => void
  summary?: FinancingSummary
}) {
  const item = useLast(current)
  const currencyCode = summary?.currencyCode ?? "NGN"
  const canReview = Boolean(item?.actions.includes("review"))
  const canDisburse = Boolean(item?.actions.includes("disburse"))
  const fundsShort = Boolean(item?.blockers.some((line) => /Deployable funds/.test(line)))
  const note = !item
    ? null
    : blockedReason ??
      (canDisburse && fundsShort ? "Not enough deployable funds to release this yet." : null)
  const title = !item
    ? ""
    : canDisburse || (item.kind === "loan" && item.state === "approved")
      ? "Release"
      : canReview
        ? "Request"
        : "Financing record"
  const state = item ? financingState(item.state) : null
  return (
    <AppSheet
      footer={
        item && (canReview || canDisburse) ? (
          <View className="gap-[8px] px-[20px] pt-[8px] pb-[20px]">
            {note ? (
              <View className="flex-row items-center gap-[6px]">
                <Icon className="size-[14px] text-tint-warm-foreground" name="CircleAlert" />
                <Text className="flex-1 text-tint-warm-foreground" variant="small">
                  {note}
                </Text>
              </View>
            ) : null}
            {canReview ? (
              <Button disabled={Boolean(blockedReason)} onPress={() => onReview(item)} testID="financing-detail-review">
                <Text>Review request</Text>
              </Button>
            ) : (
              <Button
                disabled={Boolean(blockedReason) || item.blockers.length > 0}
                onPress={() => onDisburse(item)}
                testID="financing-detail-disburse"
              >
                <Icon className="size-[18px] text-primary-foreground" name="Send" />
                <Text>Disburse {formatMoney(item.amount, { currencyCode })}</Text>
              </Button>
            )}
          </View>
        ) : undefined
      }
      insetFloatingFooter
      minimumContentHeight={600}
      onClose={onClose}
      title={title}
      visible={Boolean(current)}
    >
      {item && state ? (
        <View className="gap-[14px]">
          <Elevated className="gap-[10px] rounded-[20px] bg-card p-[16px]" radius={20}>
            <View className="flex-row items-center gap-[12px]">
              <TintedAvatar name={item.member.name} />
              <View className="min-w-0 flex-1">
                <Text className="font-bold" numberOfLines={1} variant="body">
                  {item.member.name}
                </Text>
                <Text className="text-muted-foreground" variant="small">
                  {item.member.number}
                </Text>
              </View>
              <StatusPill label={state.label} tone={state.tone} />
            </View>
            <Text variant="hero">{formatMoney(item.amount, { currencyCode })}</Text>
            <Text className="text-muted-foreground" variant="small">
              {item.productName} · {item.termMonths} months · requested {ageOf(item.requestedAt)} ago
            </Text>
          </Elevated>
          {item.blockers.length ? (
            <StatusBanner
              description={item.blockers.join(" ")}
              kind="error"
              title={item.kind === "loan" ? "Can’t release yet" : "Can’t approve yet"}
            />
          ) : null}
          <SectionHeader title="Checks" />
          <ListCard inset={false}>
            {financingChecks({
              currencyCode,
              cycle: summary?.cycle,
              item,
              requiresDualApproval: Boolean(summary?.requiresDualApproval),
            }).map((check) => (
              <View className="min-h-[52px] flex-row items-center gap-[10px] px-[14px] py-[10px]" key={check.label}>
                <View
                  className={cn(
                    "size-[32px] items-center justify-center rounded-[10px]",
                    check.ok ? "bg-accent" : "bg-tint-warm"
                  )}
                >
                  <Icon
                    className={cn("size-[16px]", check.ok ? "text-accent-foreground" : "text-tint-warm-foreground")}
                    name={check.ok ? "Check" : "CircleAlert"}
                  />
                </View>
                <Text className="flex-1" variant="body">
                  {check.label}
                </Text>
                <Text
                  className={cn("max-w-[55%] text-right", check.ok ? "text-muted-foreground" : "text-tint-warm-foreground")}
                  variant="small"
                >
                  {check.value}
                </Text>
              </View>
            ))}
          </ListCard>
          <SectionHeader title="History" />
          <ListCard inset={false}>
            {financingHistory(item).map((step, index) => (
              <View className="gap-[2px] px-[14px] py-[12px]" key={`${step.actor}-${index}`}>
                <Text className="font-bold" variant="body">
                  {step.actor}
                </Text>
                <Text className="text-muted-foreground" variant="small">
                  {step.action} · {ageOf(step.at)} ago
                </Text>
                {step.note ? (
                  <Text className="text-foreground-soft italic" variant="small">
                    “{step.note}”
                  </Text>
                ) : null}
              </View>
            ))}
          </ListCard>
        </View>
      ) : null}
    </AppSheet>
  )
}

/** Cycle warnings (floating, read-only). */
export function FinancingExceptionsSheet({
  onClose,
  summary,
  visible,
}: {
  onClose: () => void
  summary?: FinancingSummary
  visible: boolean
}) {
  const warnings = summary?.cycle.warnings ?? []
  return (
    <AppSheet onClose={onClose} title="Exceptions" visible={visible}>
      <View className="gap-[10px]">
        {warnings.map((warning) => (
          <StatusBanner
            key={warning.key}
            kind={warning.severity === "critical" ? "error" : "stale"}
            title={warning.label}
          />
        ))}
        <Text className="text-muted-foreground" variant="small">
          These come from the cycle check and clear on their own when the numbers recover.
        </Text>
      </View>
    </AppSheet>
  )
}
