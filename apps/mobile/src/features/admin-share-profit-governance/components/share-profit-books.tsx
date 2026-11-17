import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { Icon } from "@/components/ui/icon"
import { ListCard, RecordRow, TintedAvatar, type RowPosition } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SectionHeader } from "@/components/ui/section-header"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { SegmentedPager, usePagerPosition } from "@/components/ui/segmented-pager"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useAppInfiniteQuery } from "@/hooks/use-app-query"
import { formatCompactMoney, formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { View } from "react-native"
import { getShareProfitWorkspace } from "../api/admin-share-profit-governance-api"
import type {
  ProfitPeriod,
  ShareApplication,
  ShareProfitBook,
  ShareProfitQaState,
  ShareProfitSummary,
  ShareProfitWorkspace,
} from "../model/admin-share-profit-governance-types"
import {
  LIFECYCLE,
  daysSince,
  periodChips,
  periodStage,
} from "../model/share-profit-presentation"
import { shareProfitKeys, usePullRefresh } from "../model/share-profit-queries"
import { LedgerNav, LifecycleStepper, StatStrip } from "./share-profit-ui"

const BOOKS = [
  { label: "Shares", value: "shares" },
  { label: "Profit", value: "profit" },
] as const satisfies readonly { label: string; value: ShareProfitBook }[]

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC" })
}

function range(period: ProfitPeriod) {
  const start = new Date(period.periodStart)
  const end = new Date(period.periodEnd)
  return `${start.toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC" })} – ${end.toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" })}`
}

/** QA states keep their old meaning: the page arrives empty or monthly. */
function qaPage(page: ShareProfitWorkspace, qaState: ShareProfitQaState | null): ShareProfitWorkspace {
  if (qaState === "empty")
    return {
      ...page,
      profit: page.profit ? { ...page.profit, nextCursor: null, periods: [], total: 0 } : null,
      shares: page.shares ? { ...page.shares, applications: [], ledger: [], nextCursor: null, total: 0 } : null,
    }
  if (qaState === "monthly" && page.shares)
    return {
      ...page,
      shares: {
        ...page.shares,
        applications: [],
        nextCursor: null,
        policy: { ...page.shares.policy, configurationMode: "monthly_history" },
      },
    }
  return page
}

function ApplicationRow({
  currencyCode,
  item,
  onPress,
  position,
  unitAmount,
}: {
  currencyCode: string
  item: ShareApplication
  onPress: () => void
  position: RowPosition
  unitAmount: number
}) {
  const days = daysSince(item.createdAt)
  const money = formatMoney(item.requestedUnits * (item.unitAmountSnapshot || unitAmount), { currencyCode })
  return (
    <RecordRow
      accessibilityLabel={`${item.memberName}, ${item.requestedUnits} units, ${money}`}
      amount={money}
      chevron
      leading={<TintedAvatar name={item.memberName} size={40} />}
      meta={`${item.memberNumber} · ${formatDay(item.createdAt)}`}
      onPress={onPress}
      position={position}
      supporting={
        days >= 7 ? (
          <Text className="text-tint-warm-foreground" variant="caption">
            Waiting {days} days
          </Text>
        ) : undefined
      }
      title={item.memberName}
      trailing={
        <Text className="text-muted-foreground" variant="caption">
          {item.requestedUnits} × {formatCompactMoney(item.unitAmountSnapshot || unitAmount, currencyCode)}
        </Text>
      }
    />
  )
}

function PeriodRow({
  currencyCode,
  onPress,
  period,
}: {
  currencyCode: string
  onPress: () => void
  period: ProfitPeriod
}) {
  return (
    <Pressable
      accessibilityLabel={`${period.name}, ${formatMoney(period.distributableAmount, { currencyCode })}`}
      accessibilityRole="button"
      className="mx-[18px] mb-[10px]"
      onPress={onPress}
    >
      <View className="gap-[12px] rounded-[20px] bg-card p-[16px]">
        <View className="flex-row items-start gap-[10px]">
          <View className="min-w-0 flex-1">
            <Text className="font-bold" numberOfLines={1} variant="body">
              {period.name}
            </Text>
            <Text className="text-muted-foreground" variant="small">
              {range(period)}
            </Text>
          </View>
          <Text variant="money">{formatMoney(period.distributableAmount, { currencyCode })}</Text>
        </View>
        <LifecycleStepper labels={LIFECYCLE} stage={periodStage(period)} />
        <View className="flex-row flex-wrap gap-[6px]">
          {periodChips(period).map((chip) => (
            <StatusPill key={chip.label} label={chip.label} tone={chip.tone} />
          ))}
        </View>
      </View>
    </Pressable>
  )
}

function BookList({
  active,
  banner,
  book,
  enabled,
  offline,
  onOpenPeriod,
  onOpenShare,
  onRefreshSummary,
  qaState,
  summary,
}: {
  active: boolean
  banner: ReactNode
  book: ShareProfitBook
  enabled: boolean
  offline: boolean
  onOpenPeriod: (period: ProfitPeriod) => void
  onOpenShare: (application: ShareApplication) => void
  onRefreshSummary: () => Promise<unknown>
  qaState: ShareProfitQaState | null
  summary?: ShareProfitSummary
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
    getNextPageParam: (page: ShareProfitWorkspace) =>
      (book === "shares" ? page.shares?.nextCursor : page.profit?.nextCursor) ?? undefined,
    initialPageParam: undefined as string | undefined,
    networkMode: "always",
    queryFn: async ({ pageParam }) =>
      qaPage(await getShareProfitWorkspace({ book, cursor: pageParam, search: search || undefined }), qaState),
    queryKey: [...shareProfitKeys().book(book), search, qaState],
    selectItems: (page): readonly (ShareApplication | ProfitPeriod)[] =>
      (book === "shares" ? page.shares?.applications : page.profit?.periods) ?? [],
  })
  const pull = usePullRefresh(() => Promise.all([query.refetch(), onRefreshSummary()]))
  const first = query.data?.pages[0]
  const policy = first?.shares?.policy ?? summary?.policy
  const monthly = book === "shares" && policy?.configurationMode === "monthly_history"
  const rows = query.items as (ShareApplication | ProfitPeriod)[]
  const ledger = book === "shares" && !search ? (first?.shares?.ledger ?? []) : []
  const stats = summary
    ? book === "shares"
      ? [
          { label: "Pending", tone: summary.shares.pendingCount ? ("warning" as const) : undefined, value: monthly ? "—" : String(summary.shares.pendingCount) },
          { label: monthly ? "Share model" : "Unit price", value: monthly ? "History" : formatCompactMoney(summary.policy.unitAmount, currencyCode) },
          { label: "Posted capital", value: formatCompactMoney(summary.shares.postedCapital, currencyCode) },
        ]
      : [
          { label: "To approve", tone: summary.profit.pendingApprovalCount ? ("warning" as const) : undefined, value: String(summary.profit.pendingApprovalCount) },
          { label: "To publish", tone: summary.profit.readyToPublishCount ? ("brand" as const) : undefined, value: String(summary.profit.readyToPublishCount) },
          { label: "Unpublished", value: formatCompactMoney(summary.profit.unpublishedAmount, currencyCode) },
        ]
    : null
  const pendingUnits = summary?.shares.pendingUnits ?? 0

  const ledgerCard = ledger.length ? (
    <View className="gap-[10px] px-[18px] pt-[6px]">
      <SectionHeader title="Recent postings" value="Share capital ledger" />
      <ListCard inset={false}>
        {ledger.map((row) => (
          <View className="min-h-[56px] flex-row items-center gap-[10px] px-[14px] py-[10px]" key={row.id}>
            <View className="min-w-0 flex-1">
              <Text className="font-bold" numberOfLines={1} variant="body">
                {row.member.fullName}
              </Text>
              <Text className="text-muted-foreground" numberOfLines={1} variant="small">
                {row.sourceType.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase())} · {formatDay(row.effectiveDate)}
              </Text>
            </View>
            <Text className="text-tint-success-foreground" variant="money">
              +{formatMoney(row.amount, { currencyCode })}
            </Text>
          </View>
        ))}
      </ListCard>
    </View>
  ) : null

  const footer =
    query.isFetchNextPageError ? (
      <StatusBanner
        className="mx-[18px]"
        kind="error"
        onRetry={() => void query.fetchNextPage()}
        retryLabel="Try again"
        title="Couldn’t load more records."
      />
    ) : book === "shares" ? (
      query.hasNextPage ? null : ledgerCard
    ) : rows.length ? (
      <View className="flex-row items-center justify-center gap-[6px] px-[18px]">
        <Icon className="size-[14px] text-muted-foreground" name="Shield" />
        <Text className="text-muted-foreground" variant="caption">
          Members see profit only after it’s published.
        </Text>
      </View>
    ) : null

  return (
    <AppList
      active={active}
      back={false}
      data={monthly ? [] : rows}
      embedded
      empty={
        monthly ? (
          <View className="gap-[12px]">
            <StatusBanner
              className="mx-[18px]"
              description="This cooperative records dated share history, so there are no unit requests to review here."
              kind="info"
              title="Monthly share history"
            />
            {ledgerCard}
          </View>
        ) : search ? (
          <EmptyState
            action={{ label: "Clear search", onPress: () => setDraft("") }}
            description="Try a member name or member number."
            icon="Search"
            title="No matches"
          />
        ) : book === "shares" ? (
          <View className="gap-[12px]">
            <EmptyState
              description="New share requests from members will appear here."
              icon="CircleCheck"
              title="Nothing to review"
            />
            {ledgerCard}
          </View>
        ) : (
          <EmptyState
            description="Periods appear once a business profit entry is recorded on the web."
            icon="ChartPie"
            title="No profit periods yet"
          />
        )
      }
      error={query.isError && !query.isFetchNextPageError ? "Check your connection and try again. Nothing was changed." : null}
      errorTitle="Couldn’t load shares and profit"
      estimatedItemSize={book === "shares" ? 72 : 150}
      extraData={currencyCode}
      header={
        <View className="gap-[12px]">
          {stats ? <StatStrip stats={stats} /> : null}
          {banner}
          {rows.length && !monthly ? (
            <View>
              <SectionHeader
                title={search ? `Results for “${search}”` : book === "shares" ? "To review" : "Profit periods"}
                value={
                  search
                    ? `${rows.length} found`
                    : book === "shares"
                      ? `${pendingUnits} units · oldest first`
                      : `${first?.profit?.total ?? rows.length} periods`
                }
              />
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
      renderItem={({ item, position }) =>
        book === "shares" ? (
          <ApplicationRow
            currencyCode={currencyCode}
            item={item as ShareApplication}
            onPress={() => onOpenShare(item as ShareApplication)}
            position={position}
            unitAmount={policy?.unitAmount ?? 0}
          />
        ) : (
          <PeriodRow
            currencyCode={currencyCode}
            onPress={() => onOpenPeriod(item as ProfitPeriod)}
            period={item as ProfitPeriod}
          />
        )
      }
      search={
        active && book === "shares" && !monthly
          ? {
              accessibilityLabel: "Search share requests",
              onChangeText: setDraft,
              placeholder: "Search name or member number",
              totalCount: search ? 11 : rows.length + (query.hasNextPage ? 1 : 0),
              value: draft,
            }
          : undefined
      }
      testID={`share-profit-${book}`}
    />
  )
}

/**
 * T22 screen 1 (03 Lifecycle ledger): fixed compact header, the Shares /
 * Profit tabs with counts, and one paged list per book with a stat strip.
 */
export function ShareProfitBooks({
  book,
  enabled,
  offline,
  onBookChange,
  onOpenPeriod,
  onOpenShare,
  onRefreshSummary,
  qaState,
  stale,
  summary,
  summaryFailed,
}: {
  book: ShareProfitBook
  enabled: boolean
  offline: boolean
  onBookChange: (book: ShareProfitBook) => void
  onOpenPeriod: (period: ProfitPeriod) => void
  onOpenShare: (application: ShareApplication) => void
  onRefreshSummary: () => Promise<unknown>
  qaState: ShareProfitQaState | null
  stale: boolean
  summary?: ShareProfitSummary
  summaryFailed: boolean
}) {
  const index = BOOKS.findIndex(({ value }) => value === book)
  const position = usePagerPosition(index)
  const monthly = summary?.policy.configurationMode === "monthly_history"
  const options = BOOKS.map((option) => ({
    ...option,
    count:
      !summary || qaState === "empty"
        ? undefined
        : option.value === "shares"
          ? monthly
            ? undefined
            : summary.shares.pendingCount
          : summary.profit.pendingApprovalCount + summary.profit.readyToPublishCount,
  }))
  const banner = useMemo(
    () =>
      offline ? (
        <StatusBanner
          description="Showing saved records. Decisions need a connection."
          kind="offline"
          title="Offline"
        />
      ) : stale || summaryFailed ? (
        <StatusBanner
          description="Pull down to refresh before deciding."
          kind="stale"
          onRetry={() => void onRefreshSummary()}
          title="Showing saved records"
        />
      ) : null,
    [offline, onRefreshSummary, stale, summaryFailed]
  )
  const pages = useMemo(
    () =>
      BOOKS.map(
        ({ value }) =>
          function Book() {
            return (
              <BookList
                active={book === value}
                banner={book === value ? banner : null}
                book={value}
                enabled={enabled}
                offline={offline}
                onOpenPeriod={onOpenPeriod}
                onOpenShare={onOpenShare}
                onRefreshSummary={onRefreshSummary}
                qaState={qaState}
                summary={qaState === "empty" && summary ? emptySummary(summary) : summary}
              />
            )
          }
      ),
    [banner, book, enabled, offline, onOpenPeriod, onOpenShare, onRefreshSummary, qaState, summary]
  )
  return (
    <View className="flex-1 bg-background" testID="admin-share-profit-governance-screen">
      <ScreenStatusBar />
      <LedgerNav title="Shares and profit" />
      <View className={cn("px-[18px] pt-[2px] pb-[12px]")}>
        <SegmentedControl
          accessibilityLabel="Books"
          onChange={onBookChange}
          options={options}
          position={position}
          value={book}
        />
      </View>
      <SegmentedPager
        fill
        index={index}
        onIndexChange={(next) => onBookChange(BOOKS[next]!.value)}
        pages={pages}
        position={position}
      />
    </View>
  )
}

function emptySummary(summary: ShareProfitSummary): ShareProfitSummary {
  return {
    ...summary,
    profit: { pendingApprovalCount: 0, readyToPublishCount: 0, unpublishedAmount: 0 },
    shares: { ...summary.shares, pendingCount: 0, pendingUnits: 0 },
  }
}
