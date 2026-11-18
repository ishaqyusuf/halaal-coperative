import { EmptyState } from "@/components/app/empty-state"
import { ScreenShell } from "@/components/app/screen-shell"
import { TabSearchBubble } from "@/components/search/tab-search-bubble"
import { useDockVisibilityStore } from "@/lib/dock-visibility-store"
import { Elevated, ListCard, RecordRow } from "@/components/ui/list-card"
import { SectionHeader } from "@/components/ui/section-header"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  SegmentedPager,
  useLaneTabsAnchor,
  usePagerPosition,
} from "@/components/ui/segmented-pager"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { ActivityIndicator, View } from "react-native"
import type { ReactNode } from "react"
import type { useAdminFinanceDesk } from "../hooks/use-admin-finance-desk"
import {
  adminFinanceQueueFilters,
  financeDeskItemStatus,
  financeDeskLaneNames,
  formatAdminFinanceAge,
  formatAdminFinanceCurrency,
} from "../model/admin-finance-support-presentation"
import type {
  AdminFinanceSupportItem,
  AdminFinanceSupportQueueKey,
} from "../model/admin-finance-support-types"
import {
  AdminFinanceOperationsGrid,
  type AdminFinanceOperationPath,
} from "./admin-finance-operations-grid"

const emptyLanes: Record<AdminFinanceSupportQueueKey, [string, string]> = {
  receipts: [
    "No receipts to review",
    "Payment receipts members submit appear here.",
  ],
  financing: [
    "No financing requests",
    "New financing requests appear here for review.",
  ],
  procurement: [
    "No procurement requests",
    "Procurement requests appear here for review.",
  ],
  foodPurchase: [
    "No foodstuff applications",
    "Foodstuff purchase applications appear here for review.",
  ],
  projectFinancing: [
    "No project requests",
    "Project financing requests appear here for review.",
  ],
  shares: ["No share requests", "Share applications from members appear here."],
  collections: [
    "No follow-ups due",
    "Due and overdue installments appear here.",
  ],
  support: ["No open support cases", "Cases members raise appear here."],
}

export function AdminFinanceWorkQueue({
  currencyCode,
  desk,
  destinationNotice,
  offline,
  onOpenItem,
  onOpenOperation,
  tenantName,
}: {
  currencyCode: string
  desk: ReturnType<typeof useAdminFinanceDesk>
  destinationNotice?: ReactNode
  offline: boolean
  onOpenItem: (item: AdminFinanceSupportItem) => void
  onOpenOperation: (href: AdminFinanceOperationPath) => void
  tenantName: string
}) {
  const colors = useColors()
  const anchor = useLaneTabsAnchor()
  const dockHidden = useDockVisibilityStore((state) => state.hidden)
  const { summary } = desk
  const lanes = adminFinanceQueueFilters.filter(
    ({ value }) =>
      (value !== "shares" || summary?.deskCounts.shares !== null) &&
      (value !== "foodPurchase" || summary?.deskCounts.foodPurchase !== null)
  )
  const index = Math.max(
    0,
    lanes.findIndex(({ value }) => value === desk.lane)
  )
  const position = usePagerPosition(index)
  const updatedTime = desk.updatedAt
    ? new Date(desk.updatedAt).toLocaleTimeString("en-NG", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null
  const timestamp = offline
    ? updatedTime
      ? `Offline · ${updatedTime}`
      : "Offline"
    : desk.refreshing
      ? "Updating…"
      : updatedTime
        ? `${desk.stale ? "Saved" : "Updated"} ${updatedTime}`
        : null
  const total = summary?.total ?? 0
  const showSearch = (!offline || Boolean(desk.search)) && total > 10

  return (
    <ScreenShell
      back={false}
      contentClassName={
        showSearch ? "gap-[16px] pb-[56px] pt-[14px]" : "gap-[16px] pt-[14px]"
      }
      header={
        <View className="flex-row items-center gap-[6px]">
          <View
            className={
              offline || desk.stale
                ? "size-[6px] rounded-full bg-muted-foreground"
                : "bg-success size-[6px] rounded-full"
            }
          />
          <Text
            className="min-w-0 flex-1 text-muted-foreground"
            numberOfLines={1}
            variant="small"
          >
            {tenantName}
            {timestamp ? ` · ${timestamp}` : ""}
          </Text>
        </View>
      }
      onRefresh={desk.refresh}
      onScroll={(event) => {
        anchor.onScroll(event)
        const { contentOffset, contentSize, layoutMeasurement } =
          event.nativeEvent
        if (
          contentSize.height - contentOffset.y - layoutMeasurement.height <
          280
        )
          desk.nextPage()
      }}
      refreshing={desk.refreshing}
      scrollRef={anchor.scrollRef}
      overlay={
        showSearch ? (
          <TabSearchBubble
            accessibilityLabel="Search the queue"
            dockHidden={dockHidden}
            hideWhenDockHidden
            maxLength={120}
            onChangeText={desk.setSearch}
            placeholder="Search member, number or reference"
            testID="admin-finance-search"
            value={desk.search}
          />
        ) : null
      }
      testID="admin-finance-support-screen"
      title="Finance"
    >
      {destinationNotice}
      {offline ? (
        <StatusBanner
          description={
            updatedTime
              ? `Showing work saved at ${updatedTime}. Reviews are paused until you reconnect.`
              : "Reconnect to load finance work."
          }
          kind="offline"
          title="You’re offline"
          tone="neutral"
        />
      ) : desk.error && desk.hasData ? (
        <StatusBanner
          description={
            updatedTime
              ? `Showing work from ${updatedTime}. Refresh before reviewing an item.`
              : undefined
          }
          kind="error"
          onRetry={desk.refresh}
          retrying={desk.refreshing}
          title="Couldn’t refresh"
        />
      ) : null}
      {(!desk.hasData && desk.error) || (offline && !desk.hasData) ? (
        <Elevated className="rounded-[20px] bg-card" radius={20}>
          <EmptyState
            action={
              offline
                ? undefined
                : {
                    label: "Try again",
                    onPress: desk.refresh,
                    variant: "default",
                    loading: desk.refreshing,
                  }
            }
            description={
              offline
                ? "Your saved finance work will appear here after the next successful refresh."
                : "Check your connection and try again."
            }
            icon={offline ? "WifiOff" : "CircleAlert"}
            title={offline ? "No saved work" : "Finance work didn’t load"}
            tone={offline ? "default" : "error"}
          />
        </Elevated>
      ) : !summary || desk.isLoading ? (
        <>
          <SectionHeader className="min-h-[26px]" title="Operations" />
          <ListSkeleton rows={4} />
        </>
      ) : (
        <>
          <AdminFinanceOperationsGrid
            onSelect={onOpenOperation}
            summary={summary}
          />
          <View className="min-h-[26px] flex-row items-center justify-between gap-[10px]">
            <Text accessibilityRole="header" variant="section">
              Needs review
            </Text>
            <Text
              className={
                summary.blocked
                  ? "text-tint-vivid-foreground"
                  : "text-muted-foreground"
              }
              tabular
              variant="caption"
            >
              {total} open
              {summary.blocked ? ` · ${summary.blocked} blocked` : ""}
            </Text>
          </View>
          <View className="-mr-[18px]" ref={anchor.anchorRef}>
            <SegmentedControl
              accessibilityLabel="Queue lanes"
              onChange={desk.setLane}
              options={lanes.map(({ label, value }) => {
                const count = summary.queueCounts.find(
                  ({ key }) => key === value
                )
                const hot =
                  count?.blocked ||
                  (value === "collections" && summary.deskCounts.repayments)
                return {
                  label,
                  value,
                  count: value === "all" ? total : (count?.count ?? 0),
                  countTone: hot ? ("attention" as const) : undefined,
                }
              })}
              position={position}
              value={lanes[index]?.value ?? "all"}
            />
          </View>
          <SegmentedPager
            index={index}
            onIndexChange={(next) => desk.setLane(lanes[next]?.value ?? "all")}
            onTapTransition={anchor.revealTabs}
            pages={lanes.map(
              ({ value }) =>
                function FinanceLanePage() {
                  const items = desk.laneItems(value)
                  const active = value === desk.lane
                  const [title, description] =
                    value === "all"
                      ? [
                          "All clear",
                          "Nothing is waiting for a finance decision.",
                        ]
                      : emptyLanes[value]
                  if (active && desk.laneLoading && !items.length)
                    return <ListSkeleton rows={4} />
                  if (!items.length)
                    return (
                      <Elevated className="rounded-[20px] bg-card" radius={20}>
                        {active && desk.laneError ? (
                          <EmptyState
                            action={{
                              label: "Try again",
                              onPress: desk.refresh,
                            }}
                            title="Couldn’t load this lane"
                            tone="error"
                          />
                        ) : (
                          <EmptyState
                            description={
                              desk.searchTerm
                                ? `Nothing matches “${desk.searchTerm}”.`
                                : description
                            }
                            icon={
                              desk.searchTerm
                                ? "Search"
                                : value === "all"
                                  ? "Check"
                                  : "Inbox"
                            }
                            title={desk.searchTerm ? "No matches" : title}
                          />
                        )}
                      </Elevated>
                    )
                  return (
                    <View className="gap-[12px]">
                      {active && desk.laneError ? (
                        <StatusBanner
                          kind="error"
                          onRetry={desk.refresh}
                          title="Couldn’t load more work"
                        />
                      ) : null}
                      <ListCard>
                        {items.map((item) => {
                          const status = financeDeskItemStatus(item)
                          return (
                            <RecordRow
                              accessibilityLabel={`Review ${item.title}, ${item.subtitle}`}
                              amount={
                                item.amount === null
                                  ? undefined
                                  : formatAdminFinanceCurrency(
                                      item.amount,
                                      currencyCode
                                    )
                              }
                              key={`${item.queueKey}:${item.id}`}
                              meta={item.subtitle}
                              onPress={() => onOpenItem(item)}
                              status={status.label}
                              statusTone={status.tone}
                              supporting={
                                <Text
                                  className={
                                    item.blockers.length
                                      ? "text-destructive"
                                      : "text-muted-foreground"
                                  }
                                  numberOfLines={1}
                                  variant="small"
                                >
                                  {item.blockers[0] ??
                                    [
                                      financeDeskLaneNames[item.queueKey],
                                      item.member?.number,
                                      formatAdminFinanceAge(
                                        item.ageMinutes
                                      ).replace(" waiting", ""),
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                </Text>
                              }
                              testID={`admin-work-queue-item-${item.id}`}
                              title={item.title}
                            />
                          )
                        })}
                      </ListCard>
                      {active && desk.isFetchingNextPage ? (
                        <ActivityIndicator
                          accessibilityLabel="Loading more"
                          color={colors.mutedForeground}
                        />
                      ) : null}
                    </View>
                  )
                }
            )}
            position={position}
          />
        </>
      )}
    </ScreenShell>
  )
}
