import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { Icon } from "@/components/ui/icon"
import { Elevated, RecordRow } from "@/components/ui/list-card"
import { SectionHeader } from "@/components/ui/section-header"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  SegmentedPager,
  usePagerPosition,
} from "@/components/ui/segmented-pager"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useAppInfiniteQuery } from "@/hooks/use-app-query"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { getContributionWorkspace } from "../api/admin-contribution-operations-api"
import {
  formatCompactCurrency,
  formatCurrency,
  formatShortDate,
} from "../lib/admin-contribution-presentation"
import type {
  CollectionBatchSummary,
  ContributionLane,
  ContributionLaneRow,
  ContributionLedgerRow,
  ContributionMemberRow,
  ContributionSummary,
  ContributionWorkspace,
} from "../model/admin-contribution-operations-types"
import {
  allocationLabel,
  channelLabel,
  contributionStatus,
  periodOf,
} from "../model/contribution-forms"
import {
  contributionKeys,
  usePullRefresh,
} from "../model/contribution-queries"

export const contributionLanes = [
  { label: "Ledger", value: "ledger" },
  { label: "Commitments", value: "commitments" },
  { label: "Collections", value: "collections" },
] as const satisfies readonly { label: string; value: ContributionLane }[]

const PLACEHOLDER: Record<ContributionLane, string> = {
  collections: "Search source or period",
  commitments: "Search members",
  ledger: "Search member or reference",
}

function Pill({ status }: { status: string }) {
  const { label, tone } = contributionStatus(status)
  return (
    <View className="flex-row pt-[4px]">
      <StatusPill label={label} tone={tone} />
    </View>
  )
}

function LedgerRow({
  currencyCode,
  item,
  onPress,
  position,
}: {
  currencyCode: string
  item: ContributionLedgerRow
  onPress: () => void
  position: Parameters<typeof RecordRow>[0]["position"]
}) {
  const amount = formatCurrency(item.amount, currencyCode)
  const date = formatShortDate(item.postedAt)
  return (
    <RecordRow
      accessibilityLabel={`${item.memberName}, ${amount}, ${contributionStatus(item.status).label}, ${date}`}
      amount={amount}
      avatarName={item.memberName}
      meta={`${item.memberNumber} · ${item.reference ?? channelLabel(item.channel)}`}
      onPress={onPress}
      position={position}
      supporting={<Pill status={item.status} />}
      title={item.memberName}
      trailing={
        <Text className="text-muted-foreground" variant="caption">
          {date}
        </Text>
      }
    />
  )
}

function MemberRow({
  currencyCode,
  item,
  onPress,
  position,
}: {
  currencyCode: string
  item: ContributionMemberRow
  onPress: () => void
  position: Parameters<typeof RecordRow>[0]["position"]
}) {
  const monthly = item.activeCommitmentAmount
  return (
    <RecordRow
      amount={monthly ? formatCompactCurrency(monthly, currencyCode) : undefined}
      meta={`${item.number} · ${allocationLabel(item.paymentAllocationPreference)}`}
      onPress={onPress}
      position={position}
      supporting={
        <View className="flex-row flex-wrap items-center gap-[6px]">
          <Text className="text-muted-foreground" variant="small">
            {formatCompactCurrency(item.totalSavings, currencyCode)} saved
          </Text>
          {item.status !== "active" ? (
            <StatusPill
              label={contributionStatus(item.status).label}
              tone={contributionStatus(item.status).tone}
            />
          ) : null}
        </View>
      }
      title={item.name}
      trailing={
        <Text className="text-muted-foreground" variant="caption">
          {monthly ? "monthly" : "No plan"}
        </Text>
      }
    />
  )
}

function BatchRow({
  currencyCode,
  item,
  onPress,
  position,
}: {
  currencyCode: string
  item: CollectionBatchSummary
  onPress: () => void
  position: Parameters<typeof RecordRow>[0]["position"]
}) {
  const exceptions = item.totals.exceptionRows + item.totals.blockedRows
  const bank = /bank|card|transfer/i.test(item.deductionSource.type)
  return (
    <RecordRow
      amount={formatCompactCurrency(item.totals.paidAmount, currencyCode)}
      leading={
        <View
          className={cn(
            "size-[44px] items-center justify-center rounded-[14px]",
            bank ? "bg-tint-sky" : "bg-accent"
          )}
        >
          <Icon
            className={cn(
              "size-[20px]",
              bank ? "text-tint-sky-foreground" : "text-accent-foreground"
            )}
            name={bank ? "Landmark" : "BriefcaseBusiness"}
          />
        </View>
      }
      meta={`${item.periodLabel} · ${item.totals.rowCount} rows${exceptions ? ` · ${exceptions} exception${exceptions > 1 ? "s" : ""}` : ""}`}
      onPress={onPress}
      position={position}
      supporting={<Pill status={item.status} />}
      title={item.deductionSource.name}
      trailing={
        <Text className="text-muted-foreground" variant="caption">
          of {formatCompactCurrency(item.totals.expectedAmount, currencyCode)}
        </Text>
      }
    />
  )
}

function ContributionLaneList({
  active,
  currencyCode,
  enabled,
  focusSearch = false,
  lane,
  offline,
  onCollectionsLoaded,
  onOpenBatch,
  onOpenLedger,
  onOpenMember,
  onRefreshSummary,
  onStageBatch,
  postedThisMonth,
}: {
  active: boolean
  currencyCode: string
  enabled: boolean
  /** Record payment: open the member search with the keyboard up. */
  focusSearch?: boolean
  lane: ContributionLane
  offline: boolean
  onCollectionsLoaded: (batches: CollectionBatchSummary[]) => void
  onOpenBatch: (batch: CollectionBatchSummary) => void
  onOpenLedger: (row: ContributionLedgerRow) => void
  onOpenMember: (memberId: string) => void
  onRefreshSummary: () => Promise<unknown>
  onStageBatch?: () => void
  postedThisMonth?: number
}) {
  const [draft, setDraft] = useState("")
  const [search, setSearch] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setSearch(draft.trim().slice(0, 120)), draft ? 300 : 0)
    return () => clearTimeout(timer)
  }, [draft])

  const query = useAppInfiniteQuery({
    enabled,
    getNextPageParam: (page: ContributionWorkspace) =>
      page.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    networkMode: "always",
    queryFn: ({ pageParam }) =>
      getContributionWorkspace({
        cursor: pageParam,
        lane,
        search: search || undefined,
      }),
    queryKey: [...contributionKeys().lane(lane), search],
    selectItems: (page) => page.data,
  })
  const seen = new Set<string>()
  const rows = query.items.filter((row: ContributionLaneRow) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
  const firstPage = query.data?.pages[0]
  useEffect(() => {
    if (lane === "collections" && firstPage && !search)
      onCollectionsLoaded(firstPage.data as CollectionBatchSummary[])
  }, [firstPage, lane, onCollectionsLoaded, search])

  const pull = usePullRefresh(() =>
    Promise.all([query.refetch(), onRefreshSummary()])
  )
  const pageError = query.isFetchNextPageError
  const loadFailed = query.isError && !pageError
  const now = new Date()
  const title = search
    ? "Results"
    : lane === "ledger"
      ? periodOf(now.toISOString())
      : lane === "commitments"
        ? "Members"
        : "Batches"
  const value = search
    ? undefined
    : lane === "ledger" && postedThisMonth !== undefined
      ? `${formatCompactCurrency(postedThisMonth, currencyCode)} posted`
      : lane === "commitments"
        ? "A–Z"
        : undefined

  let footer: ReactNode = null
  if (pageError)
    footer = (
      <StatusBanner
        className="mx-[18px]"
        kind="error"
        onRetry={() => void query.fetchNextPage()}
        retryLabel="Try again"
        title="Couldn’t load more records."
      />
    )
  else if (!query.hasNextPage && rows.length > 8)
    footer = (
      <Text className="text-center text-muted-foreground" variant="caption">
        That’s everything
      </Text>
    )

  return (
    <AppList
      active={active}
      back={false}
      data={rows}
      embedded
      empty={
        search ? (
          <EmptyState
            action={{ label: "Clear search", onPress: () => setDraft("") }}
            description={`Nothing in ${lane === "commitments" ? "members" : lane} matches “${search}”.`}
            icon="Search"
            title="No matches"
          />
        ) : lane === "collections" ? (
          <EmptyState
            action={
              onStageBatch ? { label: "Stage batch", onPress: onStageBatch } : undefined
            }
            description="Stage a batch from a collection source to check payroll rows before posting."
            icon="ClipboardList"
            title="No collection batches"
          />
        ) : (
          <EmptyState
            description={
              lane === "ledger"
                ? "Posted contributions appear here, newest first."
                : "Members with savings commitments appear here."
            }
            icon={lane === "ledger" ? "ReceiptText" : "Users"}
            title={lane === "ledger" ? "No contributions yet" : "No members yet"}
          />
        )
      }
      error={loadFailed ? "Check your connection and try again." : null}
      errorTitle="Couldn’t load contributions"
      estimatedItemSize={86}
      extraData={currencyCode}
      header={
        rows.length ? <SectionHeader title={title} value={value} /> : null
      }
      isFetchingNextPage={query.isFetchingNextPage}
      isLoading={enabled && query.isPending}
      keyExtractor={(item) => item.id}
      listFooter={footer}
      onEndReached={active && !offline ? query.onEndReached : undefined}
      onRefresh={active && !offline ? pull.onRefresh : undefined}
      onRetry={() => void query.refetch()}
      refreshing={active && pull.refreshing}
      renderItem={({ item, position }) =>
        lane === "ledger" ? (
          <LedgerRow
            currencyCode={currencyCode}
            item={item as ContributionLedgerRow}
            onPress={() => onOpenLedger(item as ContributionLedgerRow)}
            position={position}
          />
        ) : lane === "commitments" ? (
          <MemberRow
            currencyCode={currencyCode}
            item={item as ContributionMemberRow}
            onPress={() => onOpenMember(item.id)}
            position={position}
          />
        ) : (
          <BatchRow
            currencyCode={currencyCode}
            item={item as CollectionBatchSummary}
            onPress={() => onOpenBatch(item as CollectionBatchSummary)}
            position={position}
          />
        )
      }
      search={
        active
          ? {
              accessibilityLabel: `Search ${lane}`,
              autoFocus: focusSearch,
              onChangeText: setDraft,
              placeholder: PLACEHOLDER[lane],
              totalCount:
                search || focusSearch
                  ? 11
                  : rows.length + (query.hasNextPage ? 1 : 0),
              value: draft,
            }
          : undefined
      }
      testID={`admin-contributions-${lane}`}
    />
  )
}

function StatTile({
  label,
  value,
  warn = false,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <View className="min-w-0 flex-1">
      <Elevated
        className={cn(
          "rounded-[18px] px-[12px] py-[11px]",
          warn ? "bg-tint-warm" : "bg-card"
        )}
        radius={18}
      >
        <Text
          className={warn ? "text-tint-warm-foreground" : "text-muted-foreground"}
          variant="caption"
        >
          {label}
        </Text>
        <Text
          adjustsFontSizeToFit
          className={cn("mt-[4px]", warn && "text-tint-warm-foreground")}
          numberOfLines={1}
          variant="money"
        >
          {value}
        </Text>
      </Elevated>
    </View>
  )
}

/**
 * T18 screen 1 (01 Large title): back + lane action, the large title, three
 * stat tiles and the animated lanes over a full-height pager. Each lane is
 * its own paged list with the floating search.
 */
export function AdminContributionWorkspace({
  enabled,
  findMemberToken = 0,
  lane,
  offline,
  onBack,
  onCollectionsLoaded,
  onFindMember,
  onLaneChange,
  onOpenBatch,
  onOpenLedger,
  onOpenMember,
  onRefreshSummary,
  onStageBatch,
  stale,
  summary,
  summaryFailed,
}: {
  enabled: boolean
  /** Bumped by Record payment; remounts the commitments search focused. */
  findMemberToken?: number
  lane: ContributionLane
  offline: boolean
  onBack: () => void
  onCollectionsLoaded: (batches: CollectionBatchSummary[]) => void
  onFindMember?: () => void
  onLaneChange: (lane: ContributionLane) => void
  onOpenBatch: (batch: CollectionBatchSummary) => void
  onOpenLedger: (row: ContributionLedgerRow) => void
  onOpenMember: (memberId: string) => void
  onRefreshSummary: () => Promise<unknown>
  onStageBatch?: () => void
  stale: boolean
  summary?: ContributionSummary
  summaryFailed: boolean
}) {
  const { top } = useSafeAreaInsets()
  const index = contributionLanes.findIndex(({ value }) => value === lane)
  const position = usePagerPosition(index)
  const currencyCode = summary?.currencyCode ?? "NGN"
  const stats = summary?.stats
  const viewOnly =
    summary &&
    !summary.capabilities.manageMemberContributions &&
    !summary.capabilities.manageBatches
  const laneAction =
    lane === "collections" && onStageBatch
      ? { label: "Stage batch", onPress: onStageBatch }
      : lane === "commitments" && onFindMember
        ? { label: "Record payment", onPress: onFindMember }
        : null

  const pages = useMemo(
    () =>
      contributionLanes.map(
        ({ value }) =>
          function Lane() {
            return (
              <ContributionLaneList
                active={lane === value}
                currencyCode={currencyCode}
                enabled={enabled}
                focusSearch={value === "commitments" && findMemberToken > 0}
                key={value === "commitments" ? findMemberToken : 0}
                lane={value}
                offline={offline}
                onCollectionsLoaded={onCollectionsLoaded}
                onOpenBatch={onOpenBatch}
                onOpenLedger={onOpenLedger}
                onOpenMember={onOpenMember}
                onRefreshSummary={onRefreshSummary}
                onStageBatch={onStageBatch}
                postedThisMonth={stats?.postedThisMonth}
              />
            )
          }
      ),
    [
      currencyCode,
      enabled,
      findMemberToken,
      lane,
      offline,
      onCollectionsLoaded,
      onOpenBatch,
      onOpenLedger,
      onOpenMember,
      onRefreshSummary,
      onStageBatch,
      stats?.postedThisMonth,
    ]
  )

  return (
    <View
      className="flex-1 bg-background"
      testID="admin-contribution-operations-screen"
    >
      <ScreenStatusBar />
      <View>
        <View style={{ height: top }} />
        <View className="h-[52px] flex-row items-center justify-between px-[12px]">
          <ScreenHeaderButton
            accessibilityLabel="Back"
            icon="ChevronLeft"
            onPress={onBack}
          />
          {laneAction ? (
            <ScreenHeaderButton
              accessibilityLabel={laneAction.label}
              icon="Plus"
              onPress={laneAction.onPress}
              testID="admin-contributions-lane-action"
            />
          ) : null}
        </View>
        <View className="px-[18px] pt-[4px]">
          <Text accessibilityRole="header" variant="screenTitle">
            Contributions
          </Text>
        </View>
        <View className="flex-row gap-[10px] px-[18px] pt-[14px] pb-[4px]">
          <StatTile
            label="This month"
            value={
              stats ? formatCompactCurrency(stats.postedThisMonth, currencyCode) : "—"
            }
          />
          <StatTile label="Members" value={stats ? String(stats.members) : "—"} />
          <StatTile
            label="Exceptions"
            value={stats ? String(stats.exceptions) : "—"}
            warn={Boolean(stats?.exceptions)}
          />
        </View>
        <View className="gap-[8px] px-[18px] pt-[14px] pb-[6px]">
          <SegmentedControl
            accessibilityLabel="Contribution lanes"
            onChange={onLaneChange}
            options={contributionLanes}
            position={position}
            value={lane}
          />
          {offline ? (
            <StatusBanner
              description="Showing saved records. Posting needs a connection."
              kind="offline"
              title="Offline"
            />
          ) : stale || summaryFailed ? (
            <StatusBanner
              description="Pull down to refresh before making changes."
              kind="stale"
              onRetry={() => void onRefreshSummary()}
              title="Showing saved records"
            />
          ) : viewOnly ? (
            <StatusBanner
              description="Recording payments and posting batches need finance access."
              kind="info"
              title="View only"
            />
          ) : null}
        </View>
      </View>
      <SegmentedPager
        fill
        index={index}
        onIndexChange={(next) => onLaneChange(contributionLanes[next]!.value)}
        pages={pages}
        position={position}
      />
    </View>
  )
}
