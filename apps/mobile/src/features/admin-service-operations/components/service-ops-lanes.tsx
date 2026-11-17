import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton, ScreenHero, ScreenShell } from "@/components/app/screen-shell"
import { BottomSearchFooter } from "@/components/search/bottom-search-footer"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  SegmentedPager,
  useLaneTabsAnchor,
  usePagerPosition,
} from "@/components/ui/segmented-pager"
import { ListSkeleton, Skeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useBottomSearchScroll } from "@/hooks/use-bottom-search-scroll"
import { useColors } from "@/hooks/use-color"
import { formatCompactMoney, formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import { memo, type ReactNode } from "react"
import { ActivityIndicator, Pressable, View } from "react-native"
import type { OpsLane, OpsLaneState, OpsRow } from "../model/service-ops-types"

const RowCard = memo(function RowCard({
  currencyCode,
  icon,
  onAction,
  onOpen,
  row,
  testIdPrefix,
  writesBlocked,
}: {
  currencyCode: string
  icon: string
  onAction: (row: OpsRow) => void
  onOpen: (row: OpsRow) => void
  row: OpsRow
  testIdPrefix: string
  writesBlocked: boolean
}) {
  return (
    <Elevated className="overflow-hidden rounded-[20px] bg-card" radius={20}>
      <Pressable
        accessibilityHint="Opens the record"
        accessibilityLabel={`${row.title}, ${row.subtitle}${row.amount === null ? "" : `, ${formatMoney(row.amount, { currencyCode })}`}${row.pill ? `, ${row.pill.label}` : ""}`}
        accessibilityRole="button"
        className="gap-[12px] p-[14px] active:bg-surface-raised"
        onPress={() => onOpen(row)}
        testID={`${testIdPrefix}-row-${row.id}`}
      >
        <View className="flex-row items-center gap-[12px]">
          <View className="size-[44px] items-center justify-center rounded-[14px] bg-accent">
            {row.avatarText ? (
              <Text className="text-accent-foreground" variant="label">
                {row.avatarText}
              </Text>
            ) : (
              <Icon className="size-[20px] text-accent-foreground" name={icon} />
            )}
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-bold" numberOfLines={1} variant="body">
              {row.title}
            </Text>
            <Text className="text-muted-foreground" numberOfLines={1} variant="small">
              {row.subtitle}
            </Text>
          </View>
          {row.amount === null ? null : (
            <Text variant="money">{formatMoney(row.amount, { currencyCode })}</Text>
          )}
        </View>
        {row.pill || row.meta || row.actionLabel ? (
          <View className="flex-row items-center gap-[8px]">
            {row.pill ? <StatusPill label={row.pill.label} tone={row.pill.tone} /> : null}
            <Text
              className={cn(
                "min-w-0 flex-1",
                row.metaTone === "danger" ? "text-destructive" : "text-muted-foreground"
              )}
              numberOfLines={1}
              variant="caption"
            >
              {row.meta ?? ""}
            </Text>
            {row.actionLabel ? (
              <Pressable
                accessibilityLabel={`${row.actionLabel}: ${row.title}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: writesBlocked }}
                className={cn(
                  "min-h-[36px] justify-center rounded-full bg-accent px-[14px] active:opacity-80",
                  writesBlocked && "opacity-40"
                )}
                hitSlop={4}
                onPress={writesBlocked ? undefined : () => onAction(row)}
                testID={`${testIdPrefix}-action-${row.id}`}
              >
                <Text className="text-accent-foreground" variant="label">
                  {row.actionLabel}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Elevated>
  )
})

export function ServiceOpsLanes<TLane extends string>({
  currencyCode,
  hero,
  heroAction,
  icon,
  lane,
  lanes,
  laneState,
  lead,
  offline,
  onAction,
  onLaneChange,
  onOpen,
  onRefresh,
  refreshing,
  search,
  searchPlaceholder,
  searchTerm,
  setSearch,
  stale,
  summaryError,
  testIdPrefix,
  title,
  topSlot,
  writesBlocked,
}: {
  currencyCode: string
  hero: { caption: string; needAction?: number; sub?: string; value?: number }
  heroAction?: { icon: string; label: string; onPress: () => void }
  icon: string
  lane: TLane
  lanes: OpsLane<TLane>[]
  laneState: (lane: TLane) => OpsLaneState
  lead?: (lane: TLane) => ReactNode
  offline: boolean
  onAction: (row: OpsRow, lane: TLane) => void
  onLaneChange: (lane: TLane) => void
  onOpen: (row: OpsRow, lane: TLane) => void
  onRefresh: () => void
  refreshing: boolean
  search: string
  searchPlaceholder: string
  searchTerm: string
  setSearch: (value: string) => void
  stale: boolean
  summaryError: boolean
  testIdPrefix: string
  title: string
  topSlot?: ReactNode
  writesBlocked: boolean
}) {
  const router = useRouter()
  const colors = useColors()
  const anchor = useLaneTabsAnchor()
  const searchScroll = useBottomSearchScroll()
  const index = Math.max(0, lanes.findIndex(({ value }) => value === lane))
  const position = usePagerPosition(index)
  const active = laneState(lane)
  const activeCount = lanes[index]?.count
  const searchTotal = active.hasNext ? (activeCount ?? active.items.length) : active.items.length

  return (
    <ScreenShell
      contentClassName="gap-[14px] pb-[72px]"
      hero={
        <ScreenHero className="gap-[18px]">
          <View className="flex-row items-center gap-[10px]">
            <ScreenHeaderButton
              accessibilityLabel="Back"
              icon="ChevronLeft"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/(admin)/(tabs)/finance")
              }
              tone="inverse"
            />
            <Text
              accessibilityRole="header"
              className="min-w-0 flex-1 text-center text-hero-foreground"
              numberOfLines={1}
              variant="section"
            >
              {title}
            </Text>
            {heroAction ? (
              <ScreenHeaderButton
                accessibilityLabel={heroAction.label}
                icon={heroAction.icon}
                onPress={heroAction.onPress}
                tone="inverse"
              />
            ) : (
              <View className="size-[44px]" />
            )}
          </View>
          <View className="gap-[4px]">
            <Text className="text-hero-foreground/80" variant="label">
              {hero.caption}
            </Text>
            <View className="flex-row items-center justify-between gap-[10px]">
              {hero.value === undefined ? (
                <Skeleton className="h-[40px] w-[160px] rounded-[10px]" />
              ) : (
                <Text className="text-hero-foreground" variant="hero">
                  {formatCompactMoney(hero.value, currencyCode)}
                </Text>
              )}
              {hero.needAction ? (
                <View className="rounded-full bg-hero-foreground/15 px-[12px] py-[6px]">
                  <Text className="text-hero-accent" variant="label">
                    {hero.needAction} need action
                  </Text>
                </View>
              ) : null}
            </View>
            {hero.sub ? (
              <Text className="text-hero-foreground/80" numberOfLines={1} variant="small">
                {hero.sub}
              </Text>
            ) : null}
          </View>
        </ScreenHero>
      }
      onRefresh={onRefresh}
      onScroll={(event) => {
        anchor.onScroll(event)
        searchScroll.onScroll(event)
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
        if (contentSize.height - contentOffset.y - layoutMeasurement.height < 320)
          active.nextPage()
      }}
      overlay={
        <BottomSearchFooter
          accessibilityLabel={`Search ${title}`}
          alwaysShowSearch={Boolean(search)}
          hidden={searchScroll.hidden}
          maxLength={120}
          onChangeText={setSearch}
          placeholder={searchPlaceholder}
          searchVisible
          totalCount={searchTotal}
          value={search}
        />
      }
      refreshing={refreshing}
      scrollRef={anchor.scrollRef}
      testID={`${testIdPrefix}-screen`}
    >
      {topSlot}
      {offline ? (
        <StatusBanner
          description="Showing saved records. Actions need a connection."
          kind="offline"
          title="You’re offline"
          tone="neutral"
        />
      ) : stale ? (
        <StatusBanner
          kind="stale"
          onRetry={onRefresh}
          retryLabel="Refresh"
          retrying={refreshing}
          title="Refresh before acting"
        />
      ) : summaryError ? (
        <StatusBanner
          kind="error"
          onRetry={onRefresh}
          retrying={refreshing}
          title="Couldn’t refresh the summary"
        />
      ) : null}
      <View ref={anchor.anchorRef}>
        <SegmentedControl
          accessibilityLabel={`${title} lanes`}
          onChange={onLaneChange}
          options={lanes.map(({ count, label, value }) => ({
            count: searchTerm ? undefined : count,
            label,
            value,
          }))}
          position={position}
          scrollable={lanes.length > 3}
          value={lane}
        />
      </View>
      <SegmentedPager
        index={index}
        onIndexChange={(next) => onLaneChange(lanes[next]?.value ?? lanes[0]!.value)}
        onTapTransition={anchor.revealTabs}
        pages={lanes.map(
          ({ empty, label, value }) =>
            function OpsLanePage() {
              const state = laneState(value)
              const leading = lead?.(value)
              if (state.loading)
                return (
                  <View className="gap-[12px]">
                    {leading}
                    <ListSkeleton rows={4} />
                  </View>
                )
              if (!state.items.length)
                return (
                  <View className="gap-[12px]">
                    {searchTerm ? null : leading}
                    <Elevated className="rounded-[20px] bg-card" radius={20}>
                      {state.error ? (
                        <EmptyState
                          action={
                            offline
                              ? undefined
                              : {
                                  label: "Try again",
                                  loading: state.refreshing,
                                  onPress: state.refetch,
                                  variant: "secondary",
                                }
                          }
                          description={
                            offline
                              ? "Reconnect to load this lane."
                              : "Check your connection, then try again."
                          }
                          icon={offline ? "WifiOff" : "CircleAlert"}
                          title="Couldn’t load this lane"
                          tone={offline ? "default" : "error"}
                        />
                      ) : (
                        <EmptyState
                          action={
                            searchTerm
                              ? { label: "Clear search", onPress: () => setSearch(""), variant: "ghost" }
                              : undefined
                          }
                          description={
                            searchTerm
                              ? `Nothing in ${label} matches “${searchTerm}”.`
                              : "New work appears here as members submit it."
                          }
                          icon={searchTerm ? "SearchX" : "Inbox"}
                          title={searchTerm ? "No matches" : empty}
                        />
                      )}
                    </Elevated>
                  </View>
                )
              return (
                <View className={cn("gap-[12px]", state.updating && "opacity-60")}>
                  {searchTerm ? null : leading}
                  {state.error ? (
                    <StatusBanner
                      kind="error"
                      onRetry={state.refetch}
                      retrying={state.refreshing}
                      title="Couldn’t load more"
                    />
                  ) : null}
                  {state.items.map((row) => (
                    <RowCard
                      currencyCode={currencyCode}
                      icon={icon}
                      key={row.id}
                      onAction={(item) => onAction(item, value)}
                      onOpen={(item) => onOpen(item, value)}
                      row={row}
                      testIdPrefix={testIdPrefix}
                      writesBlocked={writesBlocked}
                    />
                  ))}
                  {state.fetchingNext ? (
                    <View className="min-h-[64px] flex-row items-center justify-center gap-[10px]">
                      <ActivityIndicator color={colors.mutedForeground} />
                      <Text className="text-muted-foreground" variant="small">
                        Loading more
                      </Text>
                    </View>
                  ) : !state.hasNext ? (
                    <View className="min-h-[48px] flex-row items-center justify-center gap-[6px] pt-[10px]">
                      <Icon className="size-[14px] text-muted-foreground" name="Check" />
                      <Text className="text-muted-foreground" variant="caption">
                        {state.items.length} {state.items.length === 1 ? "record" : "records"} · all shown
                      </Text>
                    </View>
                  ) : (
                    <View className="min-h-[64px]" />
                  )}
                </View>
              )
            }
        )}
        position={position}
      />
    </ScreenShell>
  )
}
