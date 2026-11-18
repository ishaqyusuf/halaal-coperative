import { EmptyState } from "@/components/app/empty-state"
import { Elevated } from "@/components/ui/list-card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  SegmentedPager,
  type useLaneTabsAnchor,
  usePagerPosition,
} from "@/components/ui/segmented-pager"
import { Skeleton, ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { formatCompactMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { ActivityIndicator, View } from "react-native"
import type { useAdminRepayments } from "../hooks/use-admin-repayments"
import type {
  RepaymentLane,
  RepaymentSummary,
  RepaymentWorkspaceItem,
} from "../model/admin-repayment-operations-types"
import {
  groupLaneItems,
  repaymentLanes,
} from "../model/admin-repayment-presentation"
import { RepaymentTriageCard } from "./repayment-triage-card"

const emptyLane: Record<RepaymentLane, [string, string, string]> = {
  collections: [
    "CircleCheck",
    "No overdue instalments",
    "Every member is up to date. Overdue instalments appear here for follow-up.",
  ],
  due: [
    "CalendarClock",
    "Nothing due right now",
    "No instalments are due or overdue. New ones appear here as they fall due.",
  ],
  posted: [
    "Receipt",
    "No repayments posted yet",
    "Repayments you or other admins record appear here, newest first.",
  ],
}

export function RepaymentSummaryCard({
  currencyCode,
  summary,
}: {
  currencyCode: string
  summary: RepaymentSummary | undefined
}) {
  const colors = useColors()
  if (!summary)
    return (
      <Elevated className="gap-[12px] rounded-[20px] bg-card p-[16px]" radius={20}>
        <Skeleton className="h-[14px] w-[40%] rounded-[6px]" />
        <Skeleton className="h-[30px] w-[55%] rounded-[8px]" />
        <Skeleton className="h-[6px] w-full rounded-full" />
        <Skeleton className="h-[14px] w-[70%] rounded-[6px]" />
      </Elevated>
    )
  const money = (value: number) => formatCompactMoney(value, currencyCode)
  const progress = summary.principal
    ? Math.max(0, Math.min(1, summary.paidPrincipal / summary.principal))
    : 0
  return (
    <Elevated
      className="gap-[10px] rounded-[20px] bg-card p-[16px]"
      radius={20}
    >
      <View className="flex-row items-start justify-between gap-[10px]">
        <View className="gap-[2px]">
          <Text className="text-muted-foreground" variant="caption">
            Outstanding principal
          </Text>
          <Text className="text-[30px] leading-[36px]" variant="money">
            {money(summary.outstanding)}
          </Text>
        </View>
        {summary.counts.collections ? (
          <StatusPill
            label={`${summary.counts.collections} need action`}
            tone="warning"
          />
        ) : (
          <StatusPill label="All on track" tone="success" />
        )}
      </View>
      <View
        accessibilityLabel={`${Math.round(progress * 100)}% repaid`}
        accessibilityRole="progressbar"
        className="h-[6px] overflow-hidden rounded-full bg-surface-raised"
      >
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 999,
            height: "100%",
            width: `${progress * 100}%`,
          }}
        />
      </View>
      <Text className="text-muted-foreground" variant="small">
        {money(summary.paidPrincipal)} repaid of {money(summary.principal)} ·{" "}
        {summary.activeFacilities} active{" "}
        {summary.activeFacilities === 1 ? "facility" : "facilities"}
      </Text>
      <View className="mt-[2px] flex-row border-t border-border pt-[12px]">
        <View className="flex-1 gap-[2px]">
          <Text variant="money">{money(summary.dueThisMonth)}</Text>
          <Text className="text-muted-foreground" variant="caption">
            Due this month
          </Text>
        </View>
        <View className="flex-1 gap-[2px] border-l border-border pl-[14px]">
          <Text
            className={summary.overdue ? "text-destructive" : undefined}
            variant="money"
          >
            {money(summary.overdue)}
          </Text>
          <Text className="text-muted-foreground" variant="caption">
            Overdue
          </Text>
        </View>
      </View>
    </Elevated>
  )
}

export function RepaymentLanes({
  anchor,
  data,
  offline,
  onFollowUp,
  onOpen,
  onRecord,
  writesBlocked,
}: {
  anchor: ReturnType<typeof useLaneTabsAnchor>
  data: ReturnType<typeof useAdminRepayments>
  offline: boolean
  onFollowUp: (item: RepaymentWorkspaceItem) => void
  onOpen: (item: RepaymentWorkspaceItem) => void
  onRecord: (item: RepaymentWorkspaceItem) => void
  writesBlocked: boolean
}) {
  const colors = useColors()
  const index = Math.max(
    0,
    repaymentLanes.findIndex(({ value }) => value === data.lane)
  )
  const position = usePagerPosition(index)
  const counts = data.summary?.counts
  const capabilities = data.capabilities

  return (
    <>
      <View ref={anchor.anchorRef}>
        <SegmentedControl
          accessibilityLabel="Repayment lanes"
          onChange={data.selectLane}
          options={repaymentLanes.map(({ label, value }) => ({
            count: counts && !data.searchTerm ? counts[value] : undefined,
            countTone:
              value === "collections" && counts?.collections
                ? ("attention" as const)
                : undefined,
            label,
            value,
          }))}
          position={position}
          value={data.lane}
        />
      </View>
      <SegmentedPager
        index={index}
        onIndexChange={(next) =>
          data.selectLane(repaymentLanes[next]?.value ?? "due")
        }
        onTapTransition={anchor.revealTabs}
        pages={repaymentLanes.map(
          ({ value }) =>
            function RepaymentLanePage() {
              const lane = data.lanes[value]
              const [icon, title, description] = emptyLane[value]
              if (lane.loading) return <ListSkeleton rows={5} />
              if (!lane.items.length) {
                if (lane.error)
                  return (
                    <Elevated className="rounded-[20px] bg-card" radius={20}>
                      <EmptyState
                        action={
                          offline
                            ? undefined
                            : {
                                label: "Try again",
                                loading: lane.refreshing,
                                onPress: () => void lane.refetch(),
                                variant: "secondary",
                              }
                        }
                        description={
                          offline
                            ? "Reconnect to load repayments."
                            : "Check your connection, then try again. Pull down to refresh."
                        }
                        icon={offline ? "WifiOff" : "CircleAlert"}
                        title="Couldn’t load repayments"
                        tone={offline ? "default" : "error"}
                      />
                    </Elevated>
                  )
                return (
                  <Elevated className="rounded-[20px] bg-card" radius={20}>
                    <EmptyState
                      action={
                        data.searchTerm
                          ? {
                              label: "Clear search",
                              onPress: () => data.setSearch(""),
                              variant: "ghost",
                            }
                          : undefined
                      }
                      description={
                        data.searchTerm
                          ? "Search by member name or number, for example QHC-0042."
                          : description
                      }
                      icon={data.searchTerm ? "SearchX" : icon}
                      title={
                        data.searchTerm
                          ? `No match for “${data.searchTerm}”`
                          : title
                      }
                    />
                  </Elevated>
                )
              }
              const groups = groupLaneItems(value, lane.items)
              return (
                <View
                  className={cn("gap-[10px]", lane.updating && "opacity-60")}
                >
                  {lane.error ? (
                    <StatusBanner
                      kind="error"
                      onRetry={() => void lane.refetch()}
                      retrying={lane.refreshing}
                      title="Couldn’t load more repayments"
                    />
                  ) : null}
                  {groups.map((group) => (
                    <View className="gap-[10px]" key={group.title}>
                      <View className="flex-row items-baseline justify-between gap-[10px] px-[4px] pt-[6px]">
                        <Text
                          accessibilityRole="header"
                          className={cn(
                            "tracking-[0.7px] uppercase",
                            group.attention
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                          variant="caption"
                        >
                          {group.title}
                        </Text>
                        <Text
                          className="text-muted-foreground"
                          tabular
                          variant="caption"
                        >
                          {group.count} ·{" "}
                          {formatCompactMoney(group.total, data.currencyCode)}
                        </Text>
                      </View>
                      {group.items.map((item) => (
                        <RepaymentTriageCard
                          canFollowUp={Boolean(capabilities?.followUp)}
                          canPost={Boolean(capabilities?.post)}
                          currencyCode={data.currencyCode}
                          item={item}
                          key={item.id}
                          lane={value}
                          onFollowUp={onFollowUp}
                          onOpen={onOpen}
                          onRecord={onRecord}
                          writesBlocked={writesBlocked}
                        />
                      ))}
                    </View>
                  ))}
                  {lane.fetchingNext ? (
                    <View
                      accessibilityLiveRegion="polite"
                      className="min-h-[64px] flex-row items-center justify-center gap-[10px]"
                    >
                      <ActivityIndicator color={colors.mutedForeground} />
                      <Text className="text-muted-foreground" variant="small">
                        Loading more
                      </Text>
                    </View>
                  ) : !lane.hasNext ? (
                    <Text
                      className="min-h-[48px] pt-[14px] text-center text-muted-foreground"
                      variant="caption"
                    >
                      {lane.items.length}{" "}
                      {lane.items.length === 1 ? "item" : "items"}
                      {data.searchTerm ? " match" : ""} · all shown
                    </Text>
                  ) : (
                    <View className="min-h-[64px]" />
                  )}
                </View>
              )
            }
        )}
        position={position}
      />
    </>
  )
}
