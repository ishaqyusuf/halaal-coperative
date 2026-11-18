import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppInfiniteQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import type { MobileNotificationRole } from "@halaalvest/domain/mobile-notifications"
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import {
  getNotificationCenter,
  getNotificationPage,
  markAllNotificationsRead,
  markNotificationsRead,
  updateNotificationPreference,
} from "../api/notification-center-api"
import { presentNotificationCenterForQa } from "../model/notification-center-qa"
import type {
  NotificationCenterQaState,
  NotificationDelivery,
  NotificationPreference,
} from "../model/notification-center-types"
import { resolveNotificationDestination } from "../model/notification-destination-registry"
import {
  getInboxCenter,
  type InboxPage,
  notificationQueryKeys,
  updateNotificationReadCache,
} from "../model/notification-read-cache"
import { useNotificationRuntime } from "../platform/notification-runtime-provider"
import {
  NotificationsScreen,
  type NotificationView,
} from "../screens/notifications-screen"

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return [
    "denied",
    "empty",
    "error",
    "failed",
    "fixture",
    "loading",
    "offline",
    "push-denied",
    "queued",
    "stale",
    "visual",
  ].includes(value)
    ? (value as NotificationCenterQaState)
    : null
}

export function NotificationsRouteController() {
  const { profile } = useAuthContext()
  const router = useRouter()
  const runtime = useMobileRuntime()
  const notificationRuntime = useNotificationRuntime()
  const queryClient = useQueryClient()
  const { qaState } = useLocalSearchParams<{ qaState?: string | string[] }>()
  const resolvedQaState = getQaState(qaState)
  const forceDevFixture = Boolean(resolvedQaState)
  const visualFixture =
    resolvedQaState === "visual" ||
    resolvedQaState === "push-denied" ||
    resolvedQaState === "offline" ||
    resolvedQaState === "empty"
  const fixtureOptions = { forceDevFixture, visualFixture }
  const keys = notificationQueryKeys(profile, resolvedQaState)
  const [activeView, setActiveView] = useState<NotificationView>("all")
  const [destinationError, setDestinationError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const canUseServerNotifications =
    resolvedQaState !== "denied" &&
    Boolean(profile && canUseMobileFeatureData(profile, profile.role))
  const isOffline =
    runtime.state.connectivity === "offline" || resolvedQaState === "offline"
  const timedState =
    resolvedQaState === "loading" || resolvedQaState === "error"
  const enabled = canUseServerNotifications && !timedState
  const all = useAppInfiniteQuery({
    enabled,
    initialPageParam: null as string | null,
    networkMode: "always",
    placeholderData: undefined,
    queryKey: keys.inbox,
    queryFn: ({ pageParam }): Promise<InboxPage> =>
      pageParam
        ? getNotificationPage(
            { cursor: pageParam, unreadOnly: false },
            fixtureOptions
          )
        : getNotificationCenter(fixtureOptions),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    selectItems: (page) => page.deliveries,
  })
  const center = getInboxCenter(all.data)
  const notifications = center
    ? presentNotificationCenterForQa(center, resolvedQaState)
    : null
  const unread = useAppInfiniteQuery({
    enabled:
      enabled &&
      !isOffline &&
      activeView === "unread" &&
      Boolean(notifications?.summary.unread),
    initialPageParam: null as string | null,
    placeholderData: undefined,
    queryKey: keys.unread,
    queryFn: ({ pageParam }) =>
      getNotificationPage(
        { cursor: pageParam ?? undefined, unreadOnly: true },
        fixtureOptions
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    selectItems: (page) => page.deliveries,
  })
  const cached = notifications?.cache?.status === "stale"
  const canMutateNotifications =
    Boolean(notifications) &&
    !isOffline &&
    !cached &&
    runtime.state.connectivity === "online"

  const markRead = useMutation({
    mutationFn: (ids: string[] | "all") =>
      runtime.runOnlineOperation("command", () =>
        ids === "all"
          ? markAllNotificationsRead(fixtureOptions)
          : markNotificationsRead(ids, fixtureOptions)
      ),
    onSuccess: ({ markedCount }, ids) =>
      updateNotificationReadCache(queryClient, keys, ids, markedCount),
  })
  const updatePreference = useMutation({
    mutationFn: ({
      enabled,
      preference,
    }: {
      enabled: boolean
      preference: NotificationPreference
    }) =>
      runtime.runOnlineOperation("command", () =>
        updateNotificationPreference(
          {
            enabled,
            notificationType: preference.key,
          },
          fixtureOptions
        )
      ),
    onSuccess: async (_result, { enabled, preference }) => {
      await queryClient.cancelQueries({ exact: true, queryKey: keys.inbox })
      queryClient.setQueryData<InfiniteData<InboxPage>>(
        keys.inbox,
        (current) => {
          const first = getInboxCenter(current)
          if (!current || !first) return current
          const preferences = first.preferences.map((item) =>
            item.key === preference.key ? { ...item, enabled } : item
          )
          return {
            ...current,
            pages: [
              {
                ...first,
                preferences,
                summary: {
                  ...first.summary,
                  enabledPreferences: preferences.filter((item) => item.enabled)
                    .length,
                },
              },
              ...current.pages.slice(1),
            ],
          }
        }
      )
    },
  })

  function handleMarkRead(ids: string[] | "all") {
    if (canMutateNotifications && !markRead.isPending) markRead.mutate(ids)
  }

  function handleOpenDelivery(delivery: NotificationDelivery) {
    if (!profile) return
    const result = resolveNotificationDestination(
      {
        action: delivery.action,
        ...(delivery.entityId ? { entityId: delivery.entityId } : {}),
        intendedRole:
          delivery.intendedRole ??
          ((profile.cooperativeRole ?? profile.role) as MobileNotificationRole),
        notificationId: delivery.id,
        tenantId: profile.tenant.id,
        version: 1,
      },
      profile
    )
    if (!result.ok) {
      setDestinationError(result.message)
      return
    }
    setDestinationError(null)
    router.push(result.href as never)
    if (!delivery.isRead) handleMarkRead([delivery.id])
  }

  async function refresh() {
    if (!enabled || isOffline) return
    setRefreshing(true)
    markRead.reset()
    try {
      await Promise.all([
        all.refetch(),
        ...(activeView === "unread" && notifications?.summary.unread
          ? [unread.refetch()]
          : []),
      ])
    } finally {
      setRefreshing(false)
    }
  }

  const empty = resolvedQaState === "empty"
  const allDeliveries = empty
    ? []
    : [
        ...(notifications?.deliveries ?? []),
        ...all.items.slice(center?.deliveries.length ?? 0),
      ]
  const unreadDeliveries = !notifications?.summary.unread
    ? []
    : unread.data
      ? unread.items
      : allDeliveries.filter((delivery) => !delivery.isRead)

  function lanePage(query: typeof all | typeof unread) {
    return {
      hasMore: !empty && query.hasNextPage,
      isLoadingMore: query.isFetchingNextPage,
      olderError: query.isFetchNextPageError,
      loadMore: () => {
        if (!isOffline && !cached && !query.isFetching && !markRead.isPending) {
          void query.fetchNextPage({ cancelRefetch: false })
        }
      },
    }
  }

  return (
    <NotificationsScreen
      activeView={activeView}
      all={{ ...lanePage(all), deliveries: allDeliveries }}
      canMutateNotifications={canMutateNotifications}
      canUseServerNotifications={canUseServerNotifications}
      destinationError={
        destinationError ?? notificationRuntime.destinationError
      }
      error={
        resolvedQaState === "error" ||
        (all.isError && !all.isFetchNextPageError)
      }
      isLoading={resolvedQaState === "loading" || (enabled && all.isPending)}
      isMarkingRead={markRead.isPending}
      isOffline={isOffline}
      isSignedIn={Boolean(profile)}
      markReadError={markRead.isError}
      notifications={notifications}
      onBack={() => router.back()}
      onChangeView={setActiveView}
      onClearDestinationError={() => {
        setDestinationError(null)
        notificationRuntime.clearDestinationError()
      }}
      onEnablePush={() => void notificationRuntime.requestPermission()}
      onMarkRead={handleMarkRead}
      onOpenDelivery={handleOpenDelivery}
      onOpenSystemSettings={() => void notificationRuntime.openSystemSettings()}
      onRefresh={() => void refresh()}
      onRetryRegistration={() => void notificationRuntime.retryRegistration()}
      onUpdatePreference={(preference, enabled) => {
        if (
          canMutateNotifications &&
          preference.available &&
          !preference.mandatory &&
          !updatePreference.isPending
        ) {
          updatePreference.mutate({ enabled, preference })
        }
      }}
      permissionState={
        resolvedQaState === "push-denied"
          ? "denied"
          : visualFixture
            ? "granted"
            : notificationRuntime.permissionState
      }
      preferenceError={
        updatePreference.isError
          ? updatePreference.variables.preference.title
          : null
      }
      refreshing={refreshing}
      registrationState={
        visualFixture ? "registered" : notificationRuntime.registrationState
      }
      savingPreference={
        updatePreference.isPending
          ? updatePreference.variables.preference.key
          : null
      }
      unread={{
        ...lanePage(unread),
        deliveries: unreadDeliveries,
        isLoadingMore: unread.isFetching,
        olderError: unread.isError,
        loadMore: () => {
          if (unread.isFetching) return
          if (unread.isError && !unread.isFetchNextPageError) void unread.refetch()
          else lanePage(unread).loadMore()
        },
      }}
    />
  )
}
