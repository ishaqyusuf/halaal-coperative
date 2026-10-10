import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { NotificationDeliveryRow } from "@/features/notifications/components/notification-delivery-row"
import { NotificationPermissionRow } from "@/features/notifications/components/notification-permission-row"
import { NotificationPreferencesScreen } from "@/features/notifications/components/notification-preferences-screen"
import type {
  NotificationCenter,
  NotificationDelivery,
  NotificationPreference,
} from "@/features/notifications/model/notification-center-types"
import type {
  NotificationPermissionState,
  NotificationRegistrationState,
} from "@/features/notifications/platform/notification-runtime-provider"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type TextStyle,
} from "react-native"

type NotificationView = "all" | "unread"

function scaledTextStyle(
  accessibilityScale: number,
  fontSize: number,
  lineHeight: number,
  overrides?: Pick<TextStyle, "color" | "fontWeight">
) {
  return {
    fontSize: fontSize * accessibilityScale,
    lineHeight: lineHeight * accessibilityScale,
    ...overrides,
  }
}

function NotificationSummary({
  accessibilityScale,
  failed,
  largeTextLayout,
  total,
  unread,
}: {
  accessibilityScale: number
  failed: number
  largeTextLayout: boolean
  total: number
  unread: number
}) {
  const colors = useColors()

  return (
    <View
      accessibilityLabel={`${unread} unread notifications, ${total} total${failed ? `, ${failed} delivery issue` : ""}`}
      className={cn(
        "gap-2",
        largeTextLayout ? "items-start" : "flex-row flex-wrap items-center"
      )}
    >
      <View className="flex-row items-center gap-2">
        <View className="size-2 shrink-0 rounded-full bg-brand" />
        <Text
          allowFontScaling={false}
          className="text-sm font-extrabold text-foreground"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "800",
          })}
        >
          {`${unread} unread`}
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        className={cn(
          "text-sm text-muted-foreground",
          largeTextLayout && "pl-4"
        )}
        style={scaledTextStyle(accessibilityScale, 14, 20, {
          color: colors.mutedForeground,
        })}
      >
        {largeTextLayout ? `${total} total` : `· ${total} total`}
      </Text>
      {failed ? (
        <Text
          allowFontScaling={false}
          className={cn(
            "text-sm font-semibold text-destructive",
            largeTextLayout && "pl-4"
          )}
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.destructive,
            fontWeight: "600",
          })}
        >
          {largeTextLayout
            ? `${failed} delivery issue`
            : `· ${failed} delivery issue`}
        </Text>
      ) : null}
    </View>
  )
}

function NotificationControls({
  accessibilityScale,
  activeView,
  canMarkRead,
  isMarkingRead,
  largeTextLayout,
  onChangeView,
  onMarkAllRead,
  onOpenSettings,
  unread,
}: {
  accessibilityScale: number
  activeView: NotificationView
  canMarkRead: boolean
  isMarkingRead: boolean
  largeTextLayout: boolean
  onChangeView: (view: NotificationView) => void
  onMarkAllRead: () => void
  onOpenSettings: () => void
  unread: number
}) {
  const colors = useColors()
  const views = [
    ["unread", `Unread ${unread}`],
    ["all", "All"],
  ] as const

  return (
    <View className="border-b border-border">
      <View className="flex-row items-end gap-1">
        {views.map(([value, label]) => {
          const active = activeView === value
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={cn(
                "min-h-12 items-center justify-center border-b-2 px-3",
                active ? "border-foreground" : "border-transparent"
              )}
              key={value}
              onPress={() => onChangeView(value)}
            >
              <Text
                allowFontScaling={false}
                className={cn(
                  "text-sm",
                  active
                    ? "font-extrabold text-foreground"
                    : "font-semibold text-muted-foreground"
                )}
                style={scaledTextStyle(accessibilityScale, 13, 18, {
                  color: active ? colors.foreground : colors.mutedForeground,
                  fontWeight: active ? "800" : "600",
                })}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
        {!largeTextLayout && unread ? (
          <Button
            className="ml-auto"
            disabled={isMarkingRead || !canMarkRead}
            onPress={onMarkAllRead}
            size="sm"
            variant="ghost"
          >
            <Text
              allowFontScaling={false}
              className="text-sm font-bold text-foreground"
              style={scaledTextStyle(accessibilityScale, 13, 18, {
                color: colors.foreground,
                fontWeight: "700",
              })}
            >
              Read all
            </Text>
          </Button>
        ) : null}
      </View>
      {largeTextLayout ? (
        <View className="gap-2 py-3">
          <Button
            className="min-h-11"
            onPress={onOpenSettings}
            variant="outline"
          >
            <Icon className="size-sm" name="Settings" />
            <Text
              allowFontScaling={false}
              className="text-sm font-bold text-foreground"
              style={scaledTextStyle(accessibilityScale, 13, 18, {
                color: colors.foreground,
                fontWeight: "700",
              })}
            >
              Notification settings
            </Text>
          </Button>
          {unread ? (
            <Button
              className="min-h-11"
              disabled={isMarkingRead || !canMarkRead}
              onPress={onMarkAllRead}
              variant="ghost"
            >
              <Text
                allowFontScaling={false}
                className="text-sm font-bold text-foreground"
                style={scaledTextStyle(accessibilityScale, 13, 18, {
                  color: colors.foreground,
                  fontWeight: "700",
                })}
              >
                Read all
              </Text>
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

export function NotificationsScreen({
  canMutateNotifications,
  canUseServerNotifications,
  destinationError,
  error,
  isLoading,
  isMarkingRead,
  isSignedIn,
  isUpdatingPreference,
  notifications,
  onBack,
  onClearDestinationError,
  onEnablePush,
  onMarkRead,
  onOpenDelivery,
  onOpenSystemSettings,
  onRetry,
  onRetryRegistration,
  onUpdatePreference,
  permissionState,
  registrationState,
}: {
  canMutateNotifications: boolean
  canUseServerNotifications: boolean
  destinationError: string | null
  error: string | null
  isLoading: boolean
  isMarkingRead: boolean
  isSignedIn: boolean
  isUpdatingPreference: boolean
  notifications: NotificationCenter | null
  onBack: () => void
  onClearDestinationError: () => void
  onEnablePush: () => void
  onMarkRead: (deliveryIds: string[]) => void
  onOpenDelivery: (delivery: NotificationDelivery) => void
  onOpenSystemSettings: () => void
  onRetry: () => void
  onRetryRegistration: () => void
  onUpdatePreference: (
    preference: NotificationPreference,
    enabled: boolean
  ) => void
  permissionState: NotificationPermissionState
  registrationState: NotificationRegistrationState
}) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const [activeView, setActiveView] = useState<NotificationView>("unread")
  const [showSettings, setShowSettings] = useState(false)
  const visibleDeliveries = useMemo(() => {
    const deliveries = notifications?.deliveries ?? []
    return activeView === "unread"
      ? deliveries.filter((delivery) => !delivery.isRead)
      : deliveries
  }, [activeView, notifications?.deliveries])
  const unreadIds = useMemo(
    () =>
      notifications?.deliveries
        .filter((delivery) => !delivery.isRead)
        .map((delivery) => delivery.id) ?? [],
    [notifications?.deliveries]
  )

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10 pt-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showSettings && notifications ? (
          <NotificationPreferencesScreen
            accessibilityScale={accessibilityScale}
            error={error}
            isUpdatingPreference={isUpdatingPreference}
            largeTextLayout={largeTextLayout}
            onClose={() => setShowSettings(false)}
            onUpdatePreference={onUpdatePreference}
            preferences={notifications.preferences}
          />
        ) : (
          <>
            <ScreenHeader
              action={
                largeTextLayout ? null : (
                  <Button
                    accessibilityLabel="Open notification settings"
                    disabled={!notifications}
                    onPress={() => setShowSettings(true)}
                    size="icon"
                    variant="ghost"
                  >
                    <Icon className="size-base text-foreground" name="Settings" />
                  </Button>
                )
              }
              leading={<ScreenBackButton onPress={onBack} />}
              title="Notifications"
            />

            {!canUseServerNotifications ? (
              <EmptyState
                description={
                  isSignedIn
                    ? "Your active role cannot view this inbox."
                    : "Sign in to review notifications."
                }
                icon={isSignedIn ? "ShieldX" : "LogIn"}
                title={isSignedIn ? "Inbox restricted" : "Sign in required"}
              />
            ) : null}

            {canUseServerNotifications ? (
              <>
                <CachedReadBanner
                  action="changing notification read status"
                  cache={notifications?.cache}
                  label="notification data"
                />
                {error ? (
                  <View className="gap-3 border-y border-border py-4">
                    <Text
                      accessibilityLiveRegion="assertive"
                      allowFontScaling={false}
                      className="text-sm font-semibold text-destructive"
                      style={scaledTextStyle(accessibilityScale, 14, 20, {
                        color: colors.destructive,
                        fontWeight: "600",
                      })}
                    >
                      {error}
                    </Text>
                    <Button
                      accessibilityLabel="Retry notifications"
                      className="min-h-11 self-start"
                      disabled={isLoading}
                      onPress={onRetry}
                      size="sm"
                      variant="ghost"
                    >
                      <Text
                        allowFontScaling={false}
                        className="text-sm font-bold text-foreground"
                        style={scaledTextStyle(accessibilityScale, 13, 18, {
                          color: colors.foreground,
                          fontWeight: "700",
                        })}
                      >
                        Retry
                      </Text>
                    </Button>
                  </View>
                ) : null}
                {destinationError ? (
                  <Pressable
                    accessibilityHint="Dismisses this message"
                    accessibilityLabel={destinationError}
                    accessibilityRole="button"
                    className="flex-row items-start gap-3 border-y border-border py-4"
                    onPress={onClearDestinationError}
                  >
                    <Icon className="mt-0.5 size-sm text-warn" name="ShieldAlert" />
                    <Text
                      allowFontScaling={false}
                      className="min-w-0 flex-1 text-sm text-foreground"
                      style={scaledTextStyle(accessibilityScale, 14, 20, {
                        color: colors.foreground,
                      })}
                    >
                      {destinationError}
                    </Text>
                    <Icon className="size-sm text-muted-foreground" name="X" />
                  </Pressable>
                ) : null}
                {isLoading ? <LoadingSpinner /> : null}

                {!isLoading && notifications ? (
                  <>
                    <NotificationSummary
                      accessibilityScale={accessibilityScale}
                      failed={notifications.summary.failed}
                      largeTextLayout={largeTextLayout}
                      total={notifications.summary.totalDeliveries}
                      unread={notifications.summary.unread}
                    />
                    <NotificationControls
                      accessibilityScale={accessibilityScale}
                      activeView={activeView}
                      canMarkRead={canMutateNotifications}
                      isMarkingRead={isMarkingRead}
                      largeTextLayout={largeTextLayout}
                      onChangeView={setActiveView}
                      onMarkAllRead={() => onMarkRead(unreadIds)}
                      onOpenSettings={() => setShowSettings(true)}
                      unread={notifications.summary.unread}
                    />
                    <NotificationPermissionRow
                      accessibilityScale={accessibilityScale}
                      largeTextLayout={largeTextLayout}
                      onEnable={onEnablePush}
                      onOpenSettings={onOpenSystemSettings}
                      onRetry={onRetryRegistration}
                      permissionState={permissionState}
                      registrationState={registrationState}
                    />
                    <VirtualizedCardList
                      data={visibleDeliveries}
                      empty={
                        <EmptyState
                          description="New activity will appear here."
                          icon={activeView === "unread" ? "Check" : "Bell"}
                          title={
                            activeView === "unread"
                              ? "You're all caught up"
                              : "No notifications"
                          }
                        />
                      }
                      estimatedItemSize={largeTextLayout ? 172 : 104}
                      inline
                      keyExtractor={(delivery) => delivery.id}
                      maxHeight={largeTextLayout ? 980 : 720}
                      renderItem={({ index, item: delivery }) => (
                        <NotificationDeliveryRow
                          accessibilityScale={accessibilityScale}
                          delivery={delivery}
                          isLast={index === visibleDeliveries.length - 1}
                          largeTextLayout={largeTextLayout}
                          onOpen={onOpenDelivery}
                        />
                      )}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeArea>
  )
}
