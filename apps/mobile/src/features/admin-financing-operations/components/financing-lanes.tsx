import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated, RecordRow, type RowPosition } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { SegmentedPager, usePagerPosition } from "@/components/ui/segmented-pager"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useAppInfiniteQuery } from "@/hooks/use-app-query"
import { useColors } from "@/hooks/use-color"
import { formatCompactMoney, formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getFinancingOperationsWorkspace } from "../api/admin-financing-operations-api"
import type {
  FinancingItem,
  FinancingLane,
  FinancingSummary,
  FinancingWorkspace,
} from "../model/admin-financing-operations-types"
import {
  ageOf,
  cycleLabel,
  cycleMonth,
  cycleState,
  financingLanes,
  financingState,
  leftToFinance,
  rowFlag,
  shortProduct,
  usageShares,
  withCapacityBlockers,
} from "../model/financing-presentation"
import { financingKeys, usePullRefresh } from "../model/financing-queries"

function FinancingRow({
  currencyCode,
  item,
  lane,
  onPress,
  position,
}: {
  currencyCode: string
  item: FinancingItem
  lane: FinancingLane
  onPress: () => void
  position: RowPosition
}) {
  const flag = rowFlag(item, lane)
  const state = financingState(item.state)
  return (
    <RecordRow
      accessibilityLabel={`${item.member.name}, ${formatMoney(item.amount, { currencyCode })}, ${flag.label}`}
      amount={formatMoney(item.amount, { currencyCode })}
      avatarName={item.member.name}
      chevron
      meta={`${shortProduct(item)} · ${item.termMonths} months`}
      onPress={onPress}
      position={position}
      supporting={
        flag.tone === "state" ? (
          <View className="flex-row pt-[2px]">
            <StatusPill label={state.label} tone={state.tone} />
          </View>
        ) : (
          <View className="flex-row items-center gap-[4px] pt-[2px]">
            <Icon
              className={cn(
                "size-[14px]",
                flag.tone === "warn" ? "text-tint-warm-foreground" : "text-primary"
              )}
              name={flag.tone === "warn" ? "CircleAlert" : "Check"}
            />
            <Text
              className={cn(
                "min-w-0 flex-1",
                flag.tone === "warn" ? "text-tint-warm-foreground" : "text-primary"
              )}
              numberOfLines={1}
              variant="caption"
            >
              {flag.label}
            </Text>
          </View>
        )
      }
      title={item.member.name}
      trailing={
        <Text className="text-muted-foreground" variant="caption">
          {ageOf(item.requestedAt)}
        </Text>
      }
    />
  )
}

function FinancingLaneList({
  active,
  banner,
  enabled,
  lane,
  offline,
  onOpen,
  onRefreshSummary,
  summary,
}: {
  active: boolean
  banner: ReactNode
  enabled: boolean
  lane: FinancingLane
  offline: boolean
  onOpen: (item: FinancingItem) => void
  onRefreshSummary: () => Promise<unknown>
  summary?: FinancingSummary
}) {
  const currencyCode = summary?.currencyCode ?? "NGN"
  const [draft, setDraft] = useState("")
  const [search, setSearch] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft.trim().slice(0, 120)), draft ? 300 : 0)
    return () => clearTimeout(timer)
  }, [draft])
  const query = useAppInfiniteQuery({
    enabled,
    getNextPageParam: (page: FinancingWorkspace) => page.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    networkMode: "always",
    queryFn: ({ pageParam }) =>
      getFinancingOperationsWorkspace({ cursor: pageParam, lane, search: search || undefined }),
    queryKey: [...financingKeys().lane(lane), search],
    selectItems: (page) => page.items,
  })
  const pull = usePullRefresh(() => Promise.all([query.refetch(), onRefreshSummary()]))
  // A lane loaded before the latest summary (a pull or write elsewhere) is
  // refreshed when it becomes visible, so its rows match the lane counts.
  const summaryAt = summary ? Date.parse(summary.generatedAt) : 0
  const refetchLane = query.refetch
  const refreshedFor = useRef(0)
  useEffect(() => {
    // Once per summary, so a device clock behind the server can't loop.
    if (!active || !query.dataUpdatedAt || refreshedFor.current === summaryAt) return
    if (query.dataUpdatedAt < summaryAt) {
      refreshedFor.current = summaryAt
      void refetchLane()
    }
  }, [active, query.dataUpdatedAt, refetchLane, summaryAt])
  const items = useMemo(() => {
    const seen = new Set<string>()
    return query.items
      .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
      .map((item) => withCapacityBlockers(item, summary?.cycle, currencyCode))
  }, [currencyCode, query.items, summary?.cycle])
  const total = lane === "activity" ? undefined : summary?.lanes[lane]
  const blocked = items.filter((item) => item.blockers.length).length
  const sum = items.reduce((value, item) => value + item.amount, 0)
  const noun = lane === "review" ? "request" : "release"
  const headline = search
    ? `${items.length} ${items.length === 1 ? "match" : "matches"} for “${search}”`
    : lane === "activity"
      ? "Latest decisions and releases"
      : `${total && total.count > items.length ? `${items.length} of ${total.count}` : items.length} ${noun}${(total?.count ?? items.length) === 1 ? "" : "s"} · ${formatCompactMoney(total && !search ? total.totalAmount : sum, currencyCode)}${blocked ? ` · ${blocked} blocked` : ""}`
  const pageError = query.isFetchNextPageError
  const footer = pageError ? (
    <StatusBanner
      className="mx-[18px]"
      kind="error"
      onRetry={() => void query.fetchNextPage()}
      retryLabel="Try again"
      title="Couldn’t load more records."
    />
  ) : !query.hasNextPage && items.length ? (
    <Text className="text-center text-muted-foreground" variant="caption">
      {lane === "activity" ? "That’s all" : `That’s everything · ${items.length} ${noun}${items.length === 1 ? "" : "s"}`}
    </Text>
  ) : null

  return (
    <AppList
      active={active}
      back={false}
      data={items}
      embedded
      empty={
        search ? (
          <EmptyState
            action={{ label: "Clear search", onPress: () => setDraft("") }}
            description="Search covers member names and numbers."
            icon="Search"
            title={`No match for “${search}”`}
          />
        ) : (
          <EmptyState
            description={
              lane === "disbursement"
                ? "Approved financing appears here once its approvals are complete."
                : lane === "review"
                  ? "New requests appear here as members send them."
                  : "Decisions and releases appear here."
            }
            icon={lane === "disbursement" ? "Send" : "Inbox"}
            title={lane === "disbursement" ? "Nothing to release" : lane === "review" ? "All clear" : "No activity yet"}
          />
        )
      }
      error={query.isError && !pageError ? "Check your connection and try again. Nothing was changed." : null}
      errorTitle="Couldn’t load financing"
      estimatedItemSize={86}
      extraData={summary?.cycle}
      header={
        <View className="gap-[10px]">
          {banner}
          {items.length ? (
            <View className="flex-row items-center justify-between px-[18px]">
              <Text className="min-w-0 flex-1 text-muted-foreground" numberOfLines={1} variant="label">
                {headline}
              </Text>
              <Text className="text-muted-foreground" variant="caption">
                {lane === "activity" ? "Newest first" : "Oldest first"}
              </Text>
            </View>
          ) : null}
        </View>
      }
      isFetchingNextPage={query.isFetchingNextPage}
      isLoading={enabled && query.isPending}
      keyExtractor={(item) => item.id}
      listFooter={footer}
      onEndReached={active && !offline ? query.onEndReached : undefined}
      onRefresh={active && !offline ? pull.onRefresh : undefined}
      onRetry={() => void query.refetch()}
      refreshing={active && pull.refreshing}
      renderItem={({ item, position }) => (
        <FinancingRow
          currencyCode={currencyCode}
          item={item}
          lane={lane}
          onPress={() => onOpen(item)}
          position={position}
        />
      )}
      search={
        active && lane !== "disbursement"
          ? {
              accessibilityLabel: `Search ${lane === "review" ? "Needs review" : "All activity"}`,
              onChangeText: setDraft,
              placeholder: "Search member or number",
              totalCount: search ? 11 : items.length + (query.hasNextPage ? 1 : 0),
              value: draft,
            }
          : undefined
      }
      testID={`admin-financing-${lane}`}
    />
  )
}

function CapacityCard({
  canManageCycle,
  onExceptions,
  onOpenCycle,
  summary,
}: {
  canManageCycle: boolean
  onExceptions: () => void
  onOpenCycle: () => void
  summary?: FinancingSummary
}) {
  const colors = useColors()
  if (!summary) {
    return (
      <Elevated className="h-[150px] rounded-[20px] bg-card" radius={20}>
        <View />
      </Elevated>
    )
  }
  const { cycle, currencyCode } = summary
  const state = cycleState(cycle)
  const money = (value: number) => formatCompactMoney(value, currencyCode)
  if (state === "missing" || state === "draft") {
    return (
      <Elevated className="gap-[10px] rounded-[20px] bg-card p-[16px]" radius={20}>
        <Text className="text-muted-foreground" variant="label">
          {cycleMonth(cycle)} cycle
        </Text>
        <Text variant="title">Not opened</Text>
        <Text className="text-muted-foreground" variant="small">
          {money(cycle.totalCapacityAmount)} capacity is ready to open.
        </Text>
        {canManageCycle ? (
          <Button onPress={onOpenCycle} variant="secondary">
            <Icon className="size-[18px] text-secondary-foreground" name="RotateCw" />
            <Text>Open cycle</Text>
          </Button>
        ) : null}
      </Elevated>
    )
  }
  const shares = usageShares(cycle)
  const warnings = cycle.warnings.length
  return (
    <Elevated className="gap-[12px] rounded-[20px] bg-card p-[16px]" radius={20}>
      <View className="flex-row items-start justify-between gap-[10px]">
        <View>
          <Text className="text-muted-foreground" variant="label">
            Left to finance
          </Text>
          <Text variant="hero">{money(leftToFinance(cycle))}</Text>
        </View>
        {warnings ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-[36px] flex-row items-center gap-[6px] rounded-full bg-tint-warm px-[12px]"
            onPress={onExceptions}
          >
            <Icon className="size-[14px] text-tint-warm-foreground" name="TriangleAlert" />
            <Text className="text-tint-warm-foreground" variant="label">
              {warnings} exception{warnings > 1 ? "s" : ""}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View
        accessibilityLabel={`${Math.round(shares.disbursedShare * 100)}% disbursed, ${Math.round(shares.reservedShare * 100)}% reserved`}
        accessibilityRole="image"
        className="h-[8px] flex-row overflow-hidden rounded-full bg-surface-raised"
      >
        <View
          style={{
            backgroundColor: colors.primary,
            height: 8,
            width: `${shares.disbursedShare * 100}%`,
          }}
        />
        <View
          style={{
            backgroundColor: colors.brandWarm,
            height: 8,
            width: `${shares.reservedShare * 100}%`,
          }}
        />
      </View>
      <View className="flex-row flex-wrap gap-x-[12px] gap-y-[2px]">
        <Text className="text-muted-foreground" variant="caption">
          {money(shares.disbursed)} disbursed
        </Text>
        <Text className="text-muted-foreground" variant="caption">
          {money(shares.reserved)} reserved
        </Text>
        <Text className="text-muted-foreground" variant="caption">
          of {money(cycle.totalCapacityAmount)}
        </Text>
      </View>
      <View className="flex-row gap-[10px] border-t border-border pt-[12px]">
        <View className="flex-1">
          <Text variant="money">{money(Math.max(0, cycle.quick.remainingAmount))}</Text>
          <Text className="text-muted-foreground" variant="caption">
            Quick left · {cycle.quickAllocationPercentage}%
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="money">{money(Math.max(0, cycle.normal.remainingAmount))}</Text>
          <Text className="text-muted-foreground" variant="caption">
            Normal left · {cycle.normalAllocationPercentage}%
          </Text>
        </View>
      </View>
    </Elevated>
  )
}

/**
 * T20 screen 1 (02 Large title): back + cycle chip, the large title, the
 * capacity card and animated lanes with counts over a full-height pager.
 * Each lane is its own cursor-paged list; search covers review and activity.
 */
export function FinancingLanes({
  enabled,
  lane,
  notice,
  offline,
  onBack,
  onCycle,
  onDismissNotice,
  onExceptions,
  onLaneChange,
  onOpen,
  onRefreshSummary,
  stale,
  summary,
  summaryFailed,
}: {
  enabled: boolean
  lane: FinancingLane
  /** A deep-linked record that is gone. */
  notice: string | null
  offline: boolean
  onBack: () => void
  onCycle: () => void
  onDismissNotice: () => void
  onExceptions: () => void
  onLaneChange: (lane: FinancingLane) => void
  onOpen: (item: FinancingItem) => void
  onRefreshSummary: () => Promise<unknown>
  stale: boolean
  summary?: FinancingSummary
  summaryFailed: boolean
}) {
  const { top } = useSafeAreaInsets()
  const index = financingLanes.findIndex(({ value }) => value === lane)
  const position = usePagerPosition(index)
  const caps = summary?.capabilities
  const canManageCycle = Boolean(caps?.manageCycle) && !offline && !stale
  const state = cycleState(summary?.cycle)
  const tone = state === "open" ? "success" : state === "paused" ? "warning" : "neutral"
  const options = financingLanes.map((option) => ({
    ...option,
    count:
      option.value === "activity" || !summary
        ? undefined
        : summary.lanes[option.value].count,
  }))
  const banner = useMemo(
    () =>
        notice ? (
          <StatusBanner
            className="mx-[18px]"
            description={notice}
            kind="info"
            onRetry={onDismissNotice}
            retryLabel="Dismiss"
            title="Record not found"
          />
        ) : offline ? (
          <StatusBanner
            className="mx-[18px]"
            description="You can read the queue; decisions and releases need a connection."
            kind="offline"
            title="You’re offline"
          />
        ) : stale || summaryFailed ? (
          <StatusBanner
            className="mx-[18px]"
            description="Pull down to refresh before acting."
            kind="stale"
            onRetry={() => void onRefreshSummary()}
            title="Showing a saved copy"
          />
        ) : summary && !caps?.review ? (
          <StatusBanner
            className="mx-[18px]"
            description="Reviewing and releasing need the finance role."
            kind="info"
            title="View only"
          />
        ) : state === "paused" ? (
          <StatusBanner
            className="mx-[18px]"
            description="Members can’t send new requests; reviews and releases continue."
            kind="info"
            onRetry={canManageCycle ? onCycle : undefined}
            retryLabel="Resume"
            title={`${cycleMonth(summary?.cycle)} intake is paused`}
          />
        ) : state === "closed" ? (
          <StatusBanner
            className="mx-[18px]"
            description="New requests open with the next cycle."
            kind="info"
            title={`${cycleMonth(summary?.cycle)} is closed`}
          />
        ) : null,
    [canManageCycle, caps?.review, notice, offline, onCycle, onDismissNotice, onRefreshSummary, stale, state, summary, summaryFailed]
  )
  const pages = useMemo(
    () =>
      financingLanes.map(
        ({ value }) =>
          function Lane() {
            return (
              <FinancingLaneList
                active={lane === value}
                banner={value === lane ? banner : null}
                enabled={enabled}
                lane={value}
                offline={offline}
                onOpen={onOpen}
                onRefreshSummary={onRefreshSummary}
                summary={summary}
              />
            )
          }
      ),
    [banner, enabled, lane, offline, onOpen, onRefreshSummary, summary]
  )
  return (
    <View className="flex-1 bg-background" testID="admin-financing-operations-screen">
      <ScreenStatusBar />
      <View>
        <View style={{ height: top }} />
        <View className="h-[52px] flex-row items-center justify-between px-[12px]">
          <ScreenHeaderButton accessibilityLabel="Back" icon="ChevronLeft" onPress={onBack} />
          {summary ? (
            <Pressable
              accessibilityLabel={`${cycleMonth(summary.cycle)} cycle, ${cycleLabel(state)}${canManageCycle ? ", change" : ""}`}
              accessibilityRole={canManageCycle ? "button" : "text"}
              disabled={!canManageCycle}
              onPress={onCycle}
              testID="admin-financing-cycle-chip"
            >
              <View className="min-h-[36px] flex-row items-center gap-[6px] rounded-full border border-border bg-card px-[12px]">
                <StatusPill label={cycleLabel(state)} tone={tone} />
                <Text variant="label">{cycleMonth(summary.cycle)}</Text>
                {canManageCycle ? (
                  <Icon className="size-[14px] text-muted-foreground" name="ChevronDown" />
                ) : null}
              </View>
            </Pressable>
          ) : null}
        </View>
        <View className="gap-[12px] px-[18px] pt-[4px] pb-[10px]">
          <View>
            <Text accessibilityRole="header" variant="screenTitle">
              Financing operations
            </Text>
            <Text className="text-muted-foreground" variant="small">
              {offline ? "Offline" : stale ? "Saved copy" : summary ? `Live · ${new Date(summary.generatedAt).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}` : "Loading…"}
            </Text>
          </View>
          <CapacityCard
            canManageCycle={canManageCycle}
            onExceptions={onExceptions}
            onOpenCycle={onCycle}
            summary={summary}
          />
          <SegmentedControl
            accessibilityLabel="Financing lanes"
            onChange={onLaneChange}
            options={options}
            position={position}
            value={lane}
          />
        </View>
      </View>
      <SegmentedPager
        fill
        index={index}
        onIndexChange={(next) => onLaneChange(financingLanes[next]!.value)}
        pages={pages}
        position={position}
      />
    </View>
  )
}
