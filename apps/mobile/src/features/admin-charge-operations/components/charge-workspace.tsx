import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import {
  Elevated,
  RecordRow,
  type RowPosition,
} from "@/components/ui/list-card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  SegmentedPager,
  usePagerPosition,
} from "@/components/ui/segmented-pager"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { appQueryKey, useAppInfiniteQuery } from "@/hooks/use-app-query"
import { useColors } from "@/hooks/use-color"
import { todayDateOnly } from "@/lib/date-only"
import { useDebounce } from "@/hooks/use-debounce"
import { formatCompactMoney } from "@/lib/money"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useRouter } from "expo-router"
import { useMemo, useState, type ReactNode } from "react"
import { Pressable, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { getChargePage } from "../api/admin-charge-operations-api"
import type {
  ChargeApplicationRow,
  ChargeFilters,
  ChargeLane,
  ChargePage,
  ChargeRuleRow,
  ChargeSummary,
} from "../model/admin-charge-operations-types"
import {
  chargeDate,
  chargeLabel,
  chargeLanes,
  chargeMoney,
  collectionLabel,
  isRuleRow,
} from "../model/charge-display"
import { ChargeAvatar, ChargeRuleTile, ChargeStatusChip } from "./charge-status"

type Row = ChargeApplicationRow | ChargeRuleRow
type Entry =
  | { kind: "heading"; key: string; label: string; count: number }
  | { kind: "row"; key: string; row: Row; position: RowPosition }

function entriesFor(rows: Row[], lane: ChargeLane): Entry[] {
  const entries: Entry[] = []
  let index = 0
  while (index < rows.length) {
    const first = rows[index]!
    const date = isRuleRow(first)
      ? null
      : new Date(first.assessedAt).toISOString().slice(0, 10)
    const group =
      lane === "levies" && !isRuleRow(first) ? first.periodLabel : date
    const start = index
    while (index < rows.length) {
      const row = rows[index]!
      if (
        !isRuleRow(row) &&
        (lane === "levies"
          ? row.periodLabel
          : new Date(row.assessedAt).toISOString().slice(0, 10)) !== group
      )
        break
      index += 1
    }
    const count = index - start
    entries.push({
      count,
      key: group ?? "rules",
      kind: "heading",
      label: date
        ? lane === "levies"
          ? group!
          : date === todayDateOnly()
            ? "Today"
            : date === todayDateOnly(new Date(Date.now() - 86_400_000))
              ? "Yesterday"
              : date.startsWith(todayDateOnly().slice(0, 4))
                ? chargeDate(date).replace(/ \d{4}$/, "")
                : chargeDate(date)
        : `${count} ${count === 1 ? "rule" : "rules"}`,
    })
    for (let at = start; at < index; at += 1) {
      const row = rows[at]!
      entries.push({
        key: row.id,
        kind: "row",
        position:
          count === 1
            ? "only"
            : at === start
              ? "first"
              : at === index - 1
                ? "last"
                : "middle",
        row,
      })
    }
    if (lane === "rules") break
  }
  return entries
}

type LaneProps = {
  active: boolean
  currencyCode: string
  filters: ChargeFilters
  lane: ChargeLane
  offline: boolean
  onClear: () => void
  onFilter: () => void
  onOpen: (id: string) => void
  onRefreshSummary: () => Promise<unknown>
  onRetryPreview: () => void
  preview?: "empty" | "error"
}

function ChargeLaneList({
  active,
  currencyCode,
  filters,
  lane,
  offline,
  onClear,
  onFilter,
  onOpen,
  onRefreshSummary,
  onRetryPreview,
  preview,
}: LaneProps) {
  const [search, setSearch] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const debounced = useDebounce(search.trim(), 350)
  const page = useAppInfiniteQuery<
    ChargePage<Row>,
    Row,
    Error,
    ReturnType<typeof appQueryKey>,
    string | null
  >({
    enabled: active && !preview,
    initialPageParam: null as string | null,
    getNextPageParam: (result) => result.nextCursor ?? undefined,
    networkMode: "always",
    queryFn: ({ pageParam }) =>
      getChargePage({
        cursor: pageParam,
        filters,
        lane,
        search: debounced || undefined,
      }),
    queryKey: appQueryKey("admin-charges", "page", lane, filters, debounced),
    ...(offline ? { retry: false } : {}),
    selectItems: (result) => result.data,
  })
  const filterCount = Object.values(filters).filter(Boolean).length
  const entries = preview ? [] : entriesFor(page.items, lane)
  const stale = isMobileReadCacheStale(page.data?.pages[0]?.cache)
  const searching = Boolean(search || debounced || filterCount)
  const searchCount = searching
    ? Math.max(11, page.items.length)
    : page.items.length
  const fetchPage = () => {
    if (offline || page.isPlaceholderData || stale) return
    page.onEndReached()
  }
  const clear = () => {
    setSearch("")
    onClear()
  }
  const emptyTitles = {
    applications: "No charges yet",
    levies: "No levies yet",
    rules: "No charge rules yet",
  }
  const emptyDescriptions = {
    applications: "Charges you apply to members appear here, newest first.",
    levies: "Monthly levies appear here after the first monthly collection.",
    rules: "Charge rules appear here once your cooperative sets them up.",
  }

  return (
    <AppList
      active={active}
      back={false}
      embedded
      bottomAction={
        active ? (
          <Button
            accessibilityLabel={`Filters${filterCount ? `, ${filterCount} active` : ""}`}
            className="bg-card"
            onPress={onFilter}
            size="icon"
            variant="outline"
          >
            <Icon name="SlidersHorizontal" className="size-base text-primary" />
            {filterCount ? (
              <View className="absolute top-[2px] right-[2px] size-[8px] rounded-full bg-primary" />
            ) : null}
          </Button>
        ) : null
      }
      data={entries}
      empty={
        <EmptyState
          action={
            searching
              ? { label: "Clear search and filters", onPress: clear }
              : undefined
          }
          description={
            searching
              ? "Try a different name, member number, charge or filter."
              : emptyDescriptions[lane]
          }
          icon={
            searching ? "Search" : lane === "rules" ? "Layers" : "ReceiptText"
          }
          title={searching ? "No matching charges" : emptyTitles[lane]}
        />
      }
      error={
        preview === "error" || page.isError
          ? "Check your connection and try again."
          : null
      }
      errorTitle="Charges didn’t load"
      estimatedItemSize={68}
      header={
        stale && !offline ? (
          <StatusBanner
            kind="stale"
            title="Showing saved charges"
            description="Pull down to refresh."
          />
        ) : null
      }
      isFetchingNextPage={page.isFetchingNextPage}
      isLoading={!preview && page.isPending}
      keyExtractor={(item) => item.key}
      listFooter={
        lane === "rules" && entries.length ? (
          <Text className="px-[18px] text-muted-foreground" variant="small">
            Charge rules are read-only on mobile.
          </Text>
        ) : null
      }
      onEndReached={active ? fetchPage : undefined}
      onRefresh={
        active && !offline && !preview
          ? () => {
              setRefreshing(true)
              void Promise.all([page.refetch(), onRefreshSummary()]).finally(
                () => setRefreshing(false)
              )
            }
          : undefined
      }
      onRetry={
        active && !offline
          ? preview === "error"
            ? onRetryPreview
            : () => {
                void page.refetch()
              }
          : undefined
      }
      refreshing={active && refreshing}
      renderItem={({ item }) => {
        if (item.kind === "heading")
          return (
            <View className="flex-row items-center justify-between px-[20px] pt-[8px] pb-[8px]">
              <Text accessibilityRole="header" variant="section">
                {item.label}
              </Text>
              <Text className="text-muted-foreground" variant="caption">
                {lane === "rules"
                  ? "Effective now"
                  : `${item.count} ${item.count === 1 ? "charge" : "charges"}`}
              </Text>
            </View>
          )
        const row = item.row
        return isRuleRow(row) ? (
          <RecordRow
            amount={
              row.versions[0]
                ? row.versions[0].chargeValueType === "percentage"
                  ? `${row.versions[0].amount}%`
                  : chargeMoney(row.versions[0].amount, currencyCode)
                : undefined
            }
            leading={
              <ChargeRuleTile
                percentage={row.chargeValueType === "percentage"}
              />
            }
            meta={`${row.code} · ${chargeLabel(row.chargeFrequency)}`}
            position={item.position}
            status={row.isActive ? undefined : "Inactive"}
            statusTone="neutral"
            supporting={
              <Text
                className="text-muted-foreground"
                numberOfLines={1}
                variant="caption"
              >
                {row.applicability
                  .filter((rule) => rule.isActive)
                  .map((rule) => chargeLabel(rule.workflow))
                  .join(" · ")}
              </Text>
            }
            title={row.name}
          />
        ) : (
          <RecordRow
            accessibilityLabel={`${row.memberName}, ${row.definitionName}, ${chargeMoney(row.amount, currencyCode)}, ${chargeLabel(row.status)}`}
            leading={<ChargeAvatar name={row.memberName} status={row.status} />}
            meta={
              lane === "levies"
                ? `${row.memberNumber} · ${collectionLabel(row.collectionMode)}`
                : row.definitionName
            }
            onPress={() => onOpen(row.id)}
            position={item.position}
            testID={`charge-application-${row.id}`}
            title={row.memberName}
            trailing={
              <View className="items-end gap-[4px]">
                <Text
                  className={
                    row.status === "waived" || row.status === "reversed"
                      ? "text-muted-foreground line-through"
                      : undefined
                  }
                  variant="money"
                >
                  {chargeMoney(row.amount, currencyCode)}
                </Text>
                <ChargeStatusChip status={row.status} />
              </View>
            }
          />
        )
      }}
      search={
        active && !preview
          ? {
              onChangeText: setSearch,
              placeholder:
                lane === "rules"
                  ? "Search rule or code"
                  : "Search member or charge",
              totalCount: searchCount,
              value: search,
            }
          : undefined
      }
      testID={`charge-lane-${lane}`}
    />
  )
}

const filterLabels: Record<keyof ChargeFilters, string> = {
  collectionMode: "Collection method",
  fromDate: "From date",
  memberId: "Member",
  purpose: "Purpose",
  status: "Status",
  toDate: "Through date",
  workflow: "Workflow",
}

export function ChargeWorkspaceView({
  apply,
  children,
  cooperative,
  currencyCode,
  filterLane,
  filters,
  offline,
  onClear,
  onFilter,
  onLaneChange,
  onOpen,
  onRefreshSummary,
  onRemoveFilter,
  onRetryPreview,
  preview,
  stale,
  summary,
}: {
  apply?: { disabled: boolean; onPress: () => void }
  children?: ReactNode
  cooperative?: string
  currencyCode: string
  filterLane: ChargeLane
  filters: Record<ChargeLane, ChargeFilters>
  offline: boolean
  onClear: (lane: ChargeLane) => void
  onFilter: () => void
  onLaneChange: (lane: ChargeLane) => void
  onOpen: (id: string) => void
  onRefreshSummary: () => Promise<unknown>
  onRetryPreview: () => void
  onRemoveFilter: (key: keyof ChargeFilters) => void
  preview?: "empty" | "error"
  stale: boolean
  summary?: ChargeSummary
}) {
  const router = useRouter()
  const colors = useColors()
  const index = chargeLanes.findIndex(({ value }) => value === filterLane)
  const position = usePagerPosition(index)
  const stats = summary?.stats
  const month = new Intl.DateTimeFormat("en-NG", {
    month: "short",
    timeZone: "UTC",
  }).format(summary ? new Date(summary.generatedAt) : new Date())
  const tiles = [
    {
      label: "Outstanding",
      value: stats ? formatCompactMoney(stats.outstanding, currencyCode) : "—",
      warm: true,
    },
    {
      label: `Posted in ${month}`,
      value: stats
        ? formatCompactMoney(stats.postedThisMonth, currencyCode)
        : "—",
    },
    { label: "Corrections", value: stats ? String(stats.corrections) : "—" },
  ]
  const pages = useMemo(
    () =>
      chargeLanes.map(
        ({ value }) =>
          function Lane() {
            return (
              <ChargeLaneList
                active={filterLane === value}
                currencyCode={currencyCode}
                filters={filters[value]}
                lane={value}
                offline={offline}
                onClear={() => onClear(value)}
                onFilter={onFilter}
                onOpen={onOpen}
                onRefreshSummary={onRefreshSummary}
                onRetryPreview={onRetryPreview}
                preview={preview}
              />
            )
          }
      ),
    [
      currencyCode,
      filterLane,
      filters,
      offline,
      onClear,
      onFilter,
      onOpen,
      onRefreshSummary,
      onRetryPreview,
      preview,
    ]
  )

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScreenStatusBar />
      <View>
        <View className="h-[52px] flex-row items-center justify-between px-[12px]">
          <ScreenHeaderButton
            accessibilityLabel="Back to Finance"
            icon="ChevronLeft"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(admin)/(tabs)/finance")
            }
          />
          {apply ? (
            <Button disabled={apply.disabled} onPress={apply.onPress} size="sm">
              <Icon name="Plus" className="size-base text-primary-foreground" />
              <Text>Apply</Text>
            </Button>
          ) : null}
        </View>
        <View className="gap-[2px] px-[18px] pt-[4px]">
          <Text accessibilityRole="header" variant="screenTitle">
            Charges
          </Text>
          {cooperative ? (
            <Text className="text-muted-foreground" variant="small">
              {cooperative}
            </Text>
          ) : null}
        </View>
        <View className="flex-row gap-[10px] px-[18px] pt-[14px] pb-[4px]">
          {tiles.map(({ label, value, warm }) => (
            <View className="min-w-0 flex-1" key={label}>
              <Elevated
                className="rounded-[18px] bg-card px-[12px] py-[11px]"
                radius={18}
              >
                <Text className="text-muted-foreground" variant="caption">
                  {label}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  className={
                    warm ? "text-tint-warm-foreground mt-[4px]" : "mt-[4px]"
                  }
                  numberOfLines={1}
                  variant="money"
                >
                  {value}
                </Text>
              </Elevated>
            </View>
          ))}
        </View>
        <View className="px-[18px] pt-[14px] pb-[2px]">
          <SegmentedControl
            accessibilityLabel="Charge lanes"
            onChange={onLaneChange}
            options={chargeLanes}
            position={position}
            value={filterLane}
          />
          {offline || stale ? (
            <StatusBanner
              className="mt-[8px]"
              description={
                offline
                  ? "Applying, settling and corrections need a connection."
                  : "Pull down to refresh before making changes."
              }
              kind={offline ? "offline" : "stale"}
              title={offline ? "Offline" : "Showing saved charges"}
            />
          ) : summary &&
            !summary.capabilities.manage &&
            !summary.capabilities.correct ? (
            <StatusBanner
              className="mt-[8px]"
              kind="info"
              title="View only"
              description="Applying and correcting charges needs treasurer access."
            />
          ) : null}
          {Object.entries(filters[filterLane]).some(([, value]) => value) ? (
            <View className="mt-[8px] flex-row flex-wrap gap-[6px]">
              {(
                Object.keys(filters[filterLane]) as (keyof ChargeFilters)[]
              ).map((key) => {
                const value = filters[filterLane][key]
                if (!value) return null
                const label =
                  key === "status" || key === "purpose" || key === "workflow"
                    ? chargeLabel(value)
                    : key === "collectionMode"
                      ? collectionLabel(filters[filterLane].collectionMode!)
                      : filterLabels[key]
                return (
                  <Pressable
                    accessibilityLabel={`Remove ${label} filter`}
                    accessibilityRole="button"
                    key={key}
                    onPress={() => onRemoveFilter(key)}
                  >
                    <StatusPill
                      icon="X"
                      label={label}
                      size="large"
                      tone="brand"
                    />
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </View>
      </View>
      <SegmentedPager
        fill
        index={index}
        onIndexChange={(next) => onLaneChange(chargeLanes[next]!.value)}
        pages={pages}
        position={position}
      />
      {children}
    </SafeAreaView>
  )
}
