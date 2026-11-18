import { AppList } from "@/components/app/app-list"
import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { ListCard } from "@/components/ui/list-card"
import { SectionHeader } from "@/components/ui/section-header"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  SegmentedPager,
  usePagerPosition,
} from "@/components/ui/segmented-pager"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { useState } from "react"
import { Pressable, View } from "react-native"
import {
  NotificationDeliveryRow,
  notificationDeliveryActionLabel,
} from "../components/notification-delivery-row"
import {
  NotificationPermissionRow,
  type NotificationPushControls,
  pushPresentation,
} from "../components/notification-permission-row"
import { NotificationPreferencesScreen } from "../components/notification-preferences-screen"
import type {
  NotificationCenter,
  NotificationDelivery,
  NotificationPreference,
} from "../model/notification-center-types"

const VIEWS = ["all", "unread"] as const
export type NotificationView = (typeof VIEWS)[number]

type NotificationLane = {
  deliveries: NotificationDelivery[]
  hasMore?: boolean
  isLoadingMore: boolean
  loadMore: () => void
  olderError: boolean
}

const monthFormat = new Intl.DateTimeFormat("en-NG", { month: "long" })
const yearMonthFormat = new Intl.DateTimeFormat("en-NG", {
  month: "long",
  year: "numeric",
})
const savedTimeFormat = new Intl.DateTimeFormat("en-NG", {
  hour: "numeric",
  minute: "2-digit",
})

function groupDeliveries(deliveries: NotificationDelivery[], search: string) {
  const query = search.trim().toLowerCase()
  const groups = new Map<string, NotificationDelivery[]>()
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  for (const delivery of deliveries) {
    if (
      query &&
      !`${delivery.safeTitle} ${delivery.safeSummary}`
        .toLowerCase()
        .includes(query)
    )
      continue
    const date = new Date(delivery.occurredAt)
    let title = "Earlier"
    if (date.toDateString() === today.toDateString()) title = "Today"
    else if (date.toDateString() === yesterday.toDateString())
      title = "Yesterday"
    else if (!Number.isNaN(date.getTime())) {
      title =
        date.getFullYear() !== today.getFullYear()
          ? yearMonthFormat.format(date)
          : date.getMonth() === today.getMonth()
            ? `Earlier in ${monthFormat.format(date)}`
            : monthFormat.format(date)
    }
    const group = groups.get(title)
    if (group) group.push(delivery)
    else groups.set(title, [delivery])
  }
  return Array.from(groups, ([title, items]) => ({ items, title }))
}

export function NotificationsScreen({
  activeView,
  all,
  canMutateNotifications,
  canUseServerNotifications,
  destinationError,
  error,
  isLoading,
  isMarkingRead,
  isOffline,
  isSignedIn,
  markReadError,
  notifications,
  onBack,
  onChangeView,
  onClearDestinationError,
  onEnablePush,
  onMarkRead,
  onOpenDelivery,
  onOpenSystemSettings,
  onRefresh,
  onRetryRegistration,
  onUpdatePreference,
  permissionState,
  preferenceError,
  refreshing,
  registrationState,
  savingPreference,
  unread,
}: {
  activeView: NotificationView
  all: NotificationLane
  canMutateNotifications: boolean
  canUseServerNotifications: boolean
  destinationError: string | null
  error: boolean
  isLoading: boolean
  isMarkingRead: boolean
  isOffline: boolean
  isSignedIn: boolean
  markReadError: boolean
  notifications: NotificationCenter | null
  onBack: () => void
  onChangeView: (view: NotificationView) => void
  onClearDestinationError: () => void
  onEnablePush: () => void
  onMarkRead: (ids: string[] | "all") => void
  onOpenDelivery: (delivery: NotificationDelivery) => void
  onOpenSystemSettings: () => void
  onRefresh: () => void
  onRetryRegistration: () => void
  onUpdatePreference: (
    preference: NotificationPreference,
    enabled: boolean
  ) => void
  permissionState: NotificationPushControls["permissionState"]
  preferenceError: string | null
  refreshing: boolean
  registrationState: NotificationPushControls["registrationState"]
  savingPreference: NotificationPreference["key"] | null
  unread: NotificationLane
}) {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedDelivery, setSelectedDelivery] =
    useState<NotificationDelivery | null>(null)
  const [pushDismissed, setPushDismissed] = useState(false)
  const [search, setSearch] = useState("")
  const index = VIEWS.indexOf(activeView)
  const position = usePagerPosition(index)
  const count = notifications?.summary.unread ?? 0
  const cached = notifications?.cache?.status === "stale"
  const readOnly = isOffline || cached
  const savedAt = notifications?.cache?.cachedAt
    ? new Date(notifications.cache.cachedAt)
    : null
  const savedCopy =
    savedAt && !Number.isNaN(savedAt.getTime())
      ? `Showing notifications saved at ${savedTimeFormat.format(savedAt)}.`
      : "Showing saved notifications."

  const pushState = pushPresentation(permissionState, registrationState)
  const push: NotificationPushControls = {
    disabled: !canMutateNotifications,
    onEnable: onEnablePush,
    onOpenSettings: onOpenSystemSettings,
    onRetry: onRetryRegistration,
    permissionState,
    registrationState,
  }

  const settings = notifications ? (
    <View>
      <ScreenHeaderButton
        accessibilityLabel="Open notification settings"
        icon="Settings"
        onPress={() => setShowSettings(true)}
      />
      {pushState === "denied" || pushState === "failed" ? (
        <View className="pointer-events-none absolute right-[8px] top-[8px] size-[9px] rounded-full border border-card bg-warn" />
      ) : null}
    </View>
  ) : null

  function renderLane(view: NotificationView, lane: NotificationLane) {
    const active = activeView === view
    const groups = groupDeliveries(lane.deliveries, search)
    const total =
      view === "all" ? (notifications?.summary.totalDeliveries ?? 0) : count
    return (
      <AppList
        active={active}
        back={onBack}
        compactHeader={
          <View className="min-h-[52px] flex-row items-center justify-between border-b border-border px-[18px]">
            <ScreenHeaderButton
              accessibilityLabel="Go back"
              icon="ChevronLeft"
              onPress={onBack}
            />
            <Text variant="section">Notifications</Text>
            {settings ?? <View className="size-[44px]" />}
          </View>
        }
        data={groups}
        empty={
          !canUseServerNotifications ? (
            <EmptyState
              description={
                isSignedIn
                  ? "Your active role cannot view this inbox."
                  : "Sign in to review notifications."
              }
              icon={isSignedIn ? "ShieldX" : "LogIn"}
              title={isSignedIn ? "Inbox restricted" : "Sign in required"}
            />
          ) : !notifications && (error || isOffline) ? (
            <EmptyState
              action={
                isOffline
                  ? undefined
                  : {
                      label: "Retry notifications",
                      loading: refreshing,
                      onPress: onRefresh,
                    }
              }
              className="pt-[44px]"
              description={
                isOffline
                  ? "Connect to see your notifications."
                  : "Check your connection and try again."
              }
              icon={isOffline ? "WifiOff" : "CircleAlert"}
              title={
                isOffline ? "You’re offline" : "Couldn’t load notifications"
              }
              tone={isOffline ? "warning" : "error"}
            />
          ) : (
            <EmptyState
              className="pt-[44px]"
              description={
                search.trim()
                  ? "Try a different search."
                  : view === "unread"
                    ? "New notifications will show here."
                    : "Receipts, financing and cooperative updates will show here."
              }
              icon={
                search.trim()
                  ? "Search"
                  : view === "unread"
                    ? "CheckCheck"
                    : "Bell"
              }
              title={
                search.trim()
                  ? "No matches"
                  : view === "unread"
                    ? "You’re all caught up"
                    : "No notifications yet"
              }
            />
          )
        }
        estimatedItemSize={186}
        header={
          <>
            {destinationError ? (
              <StatusBanner
                kind="info"
                description={destinationError}
                title="Couldn’t open that notification"
                onRetry={onClearDestinationError}
                retryLabel="Dismiss"
              />
            ) : null}
            {notifications && readOnly ? (
              <StatusBanner
                kind={isOffline ? "offline" : "error"}
                title={isOffline ? "You’re offline" : "Couldn’t refresh"}
                description={
                  isOffline
                    ? `${savedCopy} Connect to mark as read.`
                    : savedCopy
                }
                onRetry={isOffline ? undefined : onRefresh}
                retrying={refreshing}
              />
            ) : notifications && error ? (
              <StatusBanner
                kind="error"
                title="Couldn’t refresh"
                onRetry={onRefresh}
                retrying={refreshing}
              />
            ) : null}
            {markReadError ? (
              <StatusBanner
                kind="error"
                title="Couldn’t mark notifications as read"
                description="Try again to save the read status."
              />
            ) : null}
            {notifications && !(pushDismissed && pushState === "off") ? (
              <NotificationPermissionRow
                {...push}
                onDismiss={() => setPushDismissed(true)}
              />
            ) : null}
            {canUseServerNotifications && !(error && !notifications) ? (
              <SegmentedControl
                accessibilityLabel="Notification views"
                onChange={onChangeView}
                options={[
                  { value: "all", label: "All" },
                  { value: "unread", label: "Unread", count, countBadge: true },
                ]}
                position={position}
                value={activeView}
              />
            ) : null}
            {notifications && lane.deliveries.length ? (
              <View className="min-h-[30px] flex-row flex-wrap items-center justify-between gap-[10px]">
                <Text className="text-muted-foreground" variant="label" tabular>
                  {count ? `${count} unread` : "All caught up"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  className="min-h-[44px] justify-center disabled:opacity-50"
                  disabled={!canMutateNotifications || !count || isMarkingRead}
                  onPress={() => onMarkRead("all")}
                >
                  <Text className="text-[14px] text-primary" variant="label">
                    Mark all read
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        }
        headerActions={settings}
        isFetchingNextPage={active && lane.isLoadingMore}
        isLoading={
          isLoading ||
          (view === "unread" && !groups.length && lane.isLoadingMore)
        }
        keyExtractor={(item) => item.title}
        listFooter={
          notifications && (lane.olderError || lane.deliveries.length) ? (
            <View className="min-h-[56px] flex-row items-center justify-center gap-[10px] px-[18px]">
              {lane.olderError && !readOnly ? (
                <>
                  <Text className="text-muted-foreground" variant="small">
                    Couldn’t load{" "}
                    {lane.deliveries.length
                      ? "older notifications"
                      : "unread notifications"}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    className="min-h-[44px] justify-center px-[14px]"
                    onPress={lane.loadMore}
                  >
                    <Text className="text-primary" variant="label">
                      Retry
                    </Text>
                  </Pressable>
                </>
              ) : lane.hasMore && readOnly ? (
                <Text className="text-muted-foreground" variant="small">
                  Older notifications need a connection
                </Text>
              ) : !lane.hasMore && view === "all" && !search.trim() ? (
                <>
                  <Icon
                    className="size-[16px] text-muted-foreground"
                    name="Check"
                  />
                  <Text className="text-muted-foreground" variant="small">
                    That’s everything
                  </Text>
                </>
              ) : null}
            </View>
          ) : null
        }
        onEndReached={
          active &&
          !readOnly &&
          lane.hasMore &&
          !lane.olderError &&
          !search.trim()
            ? lane.loadMore
            : undefined
        }
        onRefresh={
          active && canUseServerNotifications && !isOffline
            ? onRefresh
            : undefined
        }
        refreshing={active && refreshing}
        renderItem={({ item, index: groupIndex }) => (
          <View
            className={`gap-[6px] px-[18px] ${groupIndex ? "pt-[14px]" : ""}`}
          >
            <SectionHeader className="min-h-[36px]" title={item.title} />
            <ListCard>
              {item.items.map((delivery) => (
                <NotificationDeliveryRow
                  delivery={delivery}
                  key={delivery.id}
                  onActions={setSelectedDelivery}
                  onOpen={onOpenDelivery}
                />
              ))}
            </ListCard>
          </View>
        )}
        search={
          total > 10
            ? {
                localSearch: true,
                onChangeText: setSearch,
                placeholder: "Search notifications",
                totalCount: total,
                value: search,
              }
            : undefined
        }
        title="Notifications"
      />
    )
  }

  return (
    <View className="flex-1 bg-background">
      <SegmentedPager
        disabled={!canUseServerNotifications || (error && !notifications)}
        eager
        fill
        index={index}
        onIndexChange={(next) => {
          const view = VIEWS[next]
          if (view && canUseServerNotifications && !(error && !notifications))
            onChangeView(view)
        }}
        pages={[
          () => renderLane("all", all),
          () => renderLane("unread", unread),
        ]}
        position={position}
      />
      <NotificationPreferencesScreen
        error={preferenceError}
        onClose={() => setShowSettings(false)}
        onUpdatePreference={onUpdatePreference}
        preferences={notifications?.preferences ?? []}
        push={push}
        saving={savingPreference}
        visible={showSettings && Boolean(notifications)}
      />
      <AppSheet
        onClose={() => setSelectedDelivery(null)}
        title={selectedDelivery?.safeTitle ?? "Notification actions"}
        visible={Boolean(selectedDelivery)}
      >
        {selectedDelivery ? (
          <ListCard className="bg-muted">
            <Pressable
              accessibilityRole="button"
              className="min-h-[56px] flex-row items-center gap-[12px] px-[14px]"
              onPress={() => {
                setSelectedDelivery(null)
                onOpenDelivery(selectedDelivery)
              }}
            >
              <Icon className="size-base text-primary" name="ArrowUpRight" />
              <Text variant="body">
                {notificationDeliveryActionLabel(selectedDelivery)}
              </Text>
            </Pressable>
            {!selectedDelivery.isRead ? (
              <Pressable
                accessibilityRole="button"
                className="min-h-[56px] flex-row items-center gap-[12px] px-[14px] disabled:opacity-50"
                disabled={!canMutateNotifications || isMarkingRead}
                onPress={() => {
                  setSelectedDelivery(null)
                  onMarkRead([selectedDelivery.id])
                }}
              >
                <Icon className="size-base text-primary" name="Check" />
                <Text variant="body">Mark as read</Text>
              </Pressable>
            ) : null}
          </ListCard>
        ) : null}
      </AppSheet>
    </View>
  )
}
