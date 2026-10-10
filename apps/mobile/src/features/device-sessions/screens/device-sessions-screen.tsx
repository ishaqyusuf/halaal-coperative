import { EmptyState } from "@/components/app/empty-state"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import {
  isActiveMobileDeviceSession,
  orderMobileDeviceSessions,
  summarizeMobileDeviceSessions,
  type MobileDeviceSession,
  type MobileDeviceSessionCollection,
  type MobileDeviceSessionConfirmation,
} from "@/features/device-sessions/model/device-session-types"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { LegendList } from "@legendapp/list"
import { memo, useCallback, useMemo, useState } from "react"
import {
  useWindowDimensions,
  View,
  type TextStyle,
} from "react-native"

const sessionDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
})
const expiryDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
})
const EMPTY_SESSIONS: MobileDeviceSession[] = []

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

function formatSessionStatus(input: {
  current: boolean
  expiresAt: Date
  lastUsedAt: Date
  revokedAt: Date | null
  revocationReason: string | null
}) {
  if (input.revokedAt) {
    const reason = input.revocationReason?.replace(/_/g, " ") ?? "ended"
    return `${reason.charAt(0).toUpperCase()}${reason.slice(1)} · ${sessionDateFormatter.format(input.revokedAt)}`
  }
  if (input.expiresAt.getTime() <= Date.now()) {
    return `Expired · Last active ${sessionDateFormatter.format(input.lastUsedAt)}`
  }
  if (input.current) {
    return `Active now · Expires ${expiryDateFormatter.format(input.expiresAt)}`
  }
  return `Active ${sessionDateFormatter.format(input.lastUsedAt)} · Expires ${expiryDateFormatter.format(input.expiresAt)}`
}

function formatBuildVariant(buildVariant: string) {
  const normalized = buildVariant.trim().toLowerCase()
  if (normalized === "development") return "Dev build"
  if (normalized === "preview") return "Preview build"
  if (normalized === "production") return "Production build"
  return buildVariant
}

const DeviceSessionRow = memo(function DeviceSessionRow({
  appVersion,
  buildVariant,
  current,
  deviceLabel,
  expiresAt,
  id,
  lastUsedAt,
  largeTextLayout,
  accessibilityScale,
  onRevoke,
  platform,
  revokedAt,
  revocationReason,
  showRecentHeading,
}: {
  appVersion: string
  buildVariant: string
  current: boolean
  deviceLabel: string
  expiresAt: Date
  id: string
  lastUsedAt: Date
  largeTextLayout: boolean
  accessibilityScale: number
  onRevoke: (sessionId: string) => void
  platform: string
  revokedAt: Date | null
  revocationReason: string | null
  showRecentHeading: boolean
}) {
  const colors = useColors()
  const active = revokedAt === null && expiresAt.getTime() > Date.now()
  const canRevoke = active && !current
  const handlePress = useCallback(() => onRevoke(id), [id, onRevoke])
  const content = (
    <View
      className={cn(
        "flex-row items-start gap-3 border-b border-border py-3",
        largeTextLayout ? "min-h-24" : "min-h-20 items-center"
      )}
    >
      <View
        className={
          active
            ? "size-10 shrink-0 items-center justify-center rounded-full bg-accent"
            : "size-10 shrink-0 items-center justify-center rounded-full bg-muted"
        }
      >
        <Icon
          className={
            active
              ? "size-base text-accent-foreground"
              : "size-base text-muted-foreground"
          }
          name={active ? "Monitor" : "History"}
        />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <View
          className={cn(
            "gap-2",
            largeTextLayout ? "items-start" : "flex-row items-center"
          )}
        >
          <Text
            allowFontScaling={false}
            className="min-w-0 flex-1 text-sm font-extrabold text-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.foreground,
              fontWeight: "800",
            })}
          >
            {deviceLabel}
          </Text>
          {current ? (
            <View className="rounded-full bg-accent px-2 py-1">
              <Text
                allowFontScaling={false}
                className="text-[10px] font-extrabold text-accent-foreground"
                style={scaledTextStyle(accessibilityScale, 10, 14, {
                  color: colors.accentForeground,
                  fontWeight: "800",
                })}
              >
                This device
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          allowFontScaling={false}
          className="text-xs leading-4 text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 16, {
            color: colors.mutedForeground,
          })}
        >
          {`${platform} · App ${appVersion} · ${formatBuildVariant(buildVariant)}`}
        </Text>
        <Text
          allowFontScaling={false}
          className="text-xs leading-4 text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 16, {
            color: colors.mutedForeground,
          })}
        >
          {formatSessionStatus({
            current,
            expiresAt,
            lastUsedAt,
            revokedAt,
            revocationReason,
          })}
        </Text>
      </View>
      {canRevoke && !largeTextLayout ? (
        <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      ) : null}
    </View>
  )

  return (
    <View>
      {showRecentHeading ? (
        <View
          className={cn(
            "gap-1 border-b border-border pt-6 pb-2",
            largeTextLayout
              ? "items-start"
              : "flex-row items-end justify-between"
          )}
        >
          <Text
            allowFontScaling={false}
            className="text-xl font-extrabold tracking-tight text-foreground"
            style={scaledTextStyle(accessibilityScale, 20, 28, {
              color: colors.foreground,
              fontWeight: "800",
            })}
          >
            Recently ended
          </Text>
          <Text
            allowFontScaling={false}
            className="text-xs font-semibold text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 12, 16, {
              color: colors.mutedForeground,
              fontWeight: "600",
            })}
          >
            Ended sessions
          </Text>
        </View>
      ) : null}
      {canRevoke ? (
        <Pressable
          accessibilityHint="Removes this device's access after confirmation"
          accessibilityLabel={`Review access for ${deviceLabel}`}
          accessibilityRole="button"
          className="active:bg-accent/50"
          haptic
          onPress={handlePress}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  )
})

function SessionSummary({
  collection,
  accessibilityScale,
  largeTextLayout,
}: {
  collection: MobileDeviceSessionCollection
  accessibilityScale: number
  largeTextLayout: boolean
}) {
  const colors = useColors()
  const summary = summarizeMobileDeviceSessions(collection.sessions)

  return (
    <View
      accessibilityLabel={`${summary.active} active sessions, ${summary.recent} recently ended`}
      className={cn(largeTextLayout ? "gap-1" : "flex-row items-center gap-2")}
    >
      <View className="flex-row items-center gap-2">
        <View className="size-2 shrink-0 rounded-full bg-primary" />
        <Text
          allowFontScaling={false}
          className="text-sm leading-5 font-extrabold text-foreground"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "800",
          })}
        >
          {`${summary.active} active`}
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        className={cn(
          "text-sm leading-5 text-muted-foreground",
          largeTextLayout && "pl-4"
        )}
        style={scaledTextStyle(accessibilityScale, 14, 20, {
          color: colors.mutedForeground,
        })}
      >
        {largeTextLayout
          ? `${summary.recent} recently ended`
          : `· ${summary.recent} recently ended`}
      </Text>
    </View>
  )
}

export function DeviceSessionsScreen({
  collection,
  error,
  isLoading,
  isOffline,
  isSubmitting,
  managed,
  notice,
  onBack,
  onRefresh,
  onRevoke,
  onRevokeAll,
}: {
  collection: MobileDeviceSessionCollection | null
  error: string | null
  isLoading: boolean
  isOffline: boolean
  isSubmitting: boolean
  managed: boolean
  notice: string | null
  onBack: () => void
  onRefresh: () => void
  onRevoke: (sessionId: string) => Promise<void>
  onRevokeAll: () => Promise<void>
}) {
  const largeTextLayout = useLargeTextLayout()
  const colors = useColors()
  const { fontScale, height: viewportHeight } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const [confirmation, setConfirmation] =
    useState<MobileDeviceSessionConfirmation | null>(null)
  const orderedSessions = useMemo(
    () => orderMobileDeviceSessions(collection?.sessions ?? EMPTY_SESSIONS),
    [collection?.sessions]
  )
  const firstRecentIndex = orderedSessions.findIndex(
    (session) => !isActiveMobileDeviceSession(session)
  )
  const activeCount = useMemo(
    () =>
      collection
        ? summarizeMobileDeviceSessions(collection.sessions).active
        : 0,
    [collection]
  )
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      const session = orderedSessions.find((item) => item.id === sessionId)
      if (session) setConfirmation({ kind: "revoke", session })
    },
    [orderedSessions]
  )
  const handleConfirm = useCallback(async () => {
    if (!confirmation) return
    if (confirmation.kind === "revoke") {
      await onRevoke(confirmation.session.id)
    } else {
      await onRevokeAll()
    }
    setConfirmation(null)
  }, [confirmation, onRevoke, onRevokeAll])
  const keyExtractor = useCallback(
    (session: MobileDeviceSession) => session.id,
    []
  )
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: MobileDeviceSession }) => (
      <DeviceSessionRow
        appVersion={item.appVersion}
        buildVariant={item.buildVariant}
        current={item.current}
        deviceLabel={item.deviceLabel}
        expiresAt={item.expiresAt}
        id={item.id}
        lastUsedAt={item.lastUsedAt}
        largeTextLayout={largeTextLayout}
        accessibilityScale={accessibilityScale}
        onRevoke={handleSelectSession}
        platform={item.platform}
        revokedAt={item.revokedAt}
        revocationReason={item.revocationReason}
        showRecentHeading={index === firstRecentIndex}
      />
    ),
    [
      accessibilityScale,
      firstRecentIndex,
      handleSelectSession,
      largeTextLayout,
    ]
  )
  const listFooter = useMemo(
    () =>
      collection ? (
        <View className="gap-5 pt-6 pb-8">
          <View className="gap-1 border-y border-border py-4">
            <Text
              allowFontScaling={false}
              className="text-sm font-extrabold text-foreground"
              style={scaledTextStyle(accessibilityScale, 14, 20, {
                color: colors.foreground,
                fontWeight: "800",
              })}
            >
              Don’t recognize a device?
            </Text>
            <Text
              allowFontScaling={false}
              className="text-xs leading-5 text-muted-foreground"
              style={scaledTextStyle(accessibilityScale, 12, 20, {
                color: colors.mutedForeground,
              })}
            >
              Remove its access, then change the account password.
            </Text>
          </View>
          <Button
            accessibilityLabel={
              managed
                ? `Remove all device access for ${collection.owner.fullName}`
                : "Sign out all devices"
            }
            className="bg-destructive/10"
            disabled={activeCount === 0 || isOffline || isSubmitting}
            onPress={() => setConfirmation({ kind: "revoke_all" })}
            variant="ghost"
          >
            <Icon className="size-base text-destructive" name="LogOut" />
            <Text
              allowFontScaling={false}
              className="font-extrabold text-destructive"
              style={scaledTextStyle(accessibilityScale, 14, 20, {
                color: colors.destructive,
                fontWeight: "800",
              })}
            >
              {managed ? "Remove all access" : "Sign out all devices"}
            </Text>
          </Button>
        </View>
      ) : null,
    [
      accessibilityScale,
      activeCount,
      collection,
      colors.destructive,
      colors.foreground,
      colors.mutedForeground,
      isOffline,
      isSubmitting,
      managed,
    ]
  )
  const sheetTitle =
    confirmation?.kind === "revoke"
      ? "Remove device access?"
      : managed
        ? "Remove all device access?"
        : "Sign out all devices?"
  const confirmLabel =
    confirmation?.kind === "revoke"
      ? "Remove access"
      : managed
        ? "Remove all access"
        : "Sign out all"

  return (
    <SafeArea className="bg-background">
      <View className="flex-1 gap-5 px-5 pt-5 pb-2">
        <ScreenHeader
          action={
            <Button
              accessibilityLabel="Refresh device access"
              disabled={isLoading || isSubmitting}
              onPress={onRefresh}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base" name="RefreshCw" />
            </Button>
          }
          leading={<ScreenBackButton onPress={onBack} />}
          title="Device access"
        />

        {collection ? (
          <View className="gap-4">
            {managed ? (
              <View className="flex-row items-center gap-3 border-b border-border pb-4">
                <View className="size-10 items-center justify-center rounded-full bg-accent">
                  <Icon
                    className="size-base text-accent-foreground"
                    name="UserRound"
                  />
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text
                    allowFontScaling={false}
                    className="text-sm font-extrabold text-foreground"
                    style={scaledTextStyle(accessibilityScale, 14, 20, {
                      color: colors.foreground,
                      fontWeight: "800",
                    })}
                  >
                    {collection.owner.fullName}
                  </Text>
                  <Text
                    allowFontScaling={false}
                    className="text-xs text-muted-foreground"
                    style={scaledTextStyle(accessibilityScale, 12, 16, {
                      color: colors.mutedForeground,
                    })}
                  >
                    Managed workspace access
                  </Text>
                </View>
              </View>
            ) : null}
            <SessionSummary
              accessibilityScale={accessibilityScale}
              collection={collection}
              largeTextLayout={largeTextLayout}
            />
          </View>
        ) : null}

        {isOffline ? (
          <View className="border-warn/40 flex-row items-start gap-3 border-y py-3">
            <Icon className="size-sm text-warn mt-0.5" name="WifiOff" />
            <Text
              allowFontScaling={false}
              className="flex-1 text-xs leading-5 text-muted-foreground"
              style={scaledTextStyle(accessibilityScale, 12, 20, {
                color: colors.mutedForeground,
              })}
            >
              Device access needs a connection. Existing access cannot be
              removed while offline.
            </Text>
          </View>
        ) : null}

        {notice ? (
          <View className="border-success/40 border-y py-3">
            <Text
              allowFontScaling={false}
              className="text-success text-sm font-semibold"
              style={scaledTextStyle(accessibilityScale, 14, 20, {
                color: colors.success,
                fontWeight: "600",
              })}
            >
              {notice}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="gap-3 border-y border-destructive/40 py-4">
            <Text
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
              className="h-auto min-h-11 self-start py-3"
              disabled={isLoading}
              onPress={onRefresh}
              size="sm"
              variant="outline"
            >
              <Icon className="size-sm" name="RefreshCw" />
              <Text
                allowFontScaling={false}
                className="text-sm font-medium text-foreground"
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.foreground,
                  fontWeight: "500",
                })}
              >
                Retry
              </Text>
            </Button>
          </View>
        ) : null}

        {isLoading && !collection ? <LoadingSpinner /> : null}

        {collection ? (
          <View className="min-h-0 flex-1">
            <View
              className={cn(
                "gap-1 border-b border-border pb-2",
                largeTextLayout
                  ? "items-start"
                  : "flex-row items-end justify-between"
              )}
            >
              <Text
                allowFontScaling={false}
                className="text-xl font-extrabold tracking-tight text-foreground"
                style={scaledTextStyle(accessibilityScale, 20, 28, {
                  color: colors.foreground,
                  fontWeight: "800",
                })}
              >
                Signed-in devices
              </Text>
              <Text
                allowFontScaling={false}
                className="text-xs font-semibold text-muted-foreground"
                style={scaledTextStyle(accessibilityScale, 12, 16, {
                  color: colors.mutedForeground,
                  fontWeight: "600",
                })}
              >
                {`${activeCount} ${activeCount === 1 ? "session" : "sessions"}`}
              </Text>
            </View>
            <LegendList
              data={orderedSessions}
              drawDistance={360}
              estimatedItemSize={largeTextLayout ? 132 : 92}
              keyExtractor={keyExtractor}
              ListEmptyComponent={
                <EmptyState
                  description="New signed-in devices will appear here."
                  icon="Monitor"
                  title="No device access"
                />
              }
              ListFooterComponent={listFooter}
              maintainVisibleContentPosition
              recycleItems
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : null}
      </View>

      <FloatingBottomSheet
        accessibilityLabel={sheetTitle}
        footer={
          <View
            className={cn(
              "gap-2 px-5 pt-3 pb-5",
              largeTextLayout ? "flex-col" : "flex-row"
            )}
          >
            <Button
              className={cn(
                "h-auto min-h-11 min-w-0 py-3",
                !largeTextLayout && "flex-1"
              )}
              disabled={isSubmitting}
              onPress={() => setConfirmation(null)}
              variant="outline"
            >
              <Text
                allowFontScaling={false}
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.foreground,
                  fontWeight: "500",
                })}
              >
                Keep access
              </Text>
            </Button>
            <Button
              className={cn(
                "h-auto min-h-11 min-w-0 py-3",
                !largeTextLayout && "flex-1"
              )}
              disabled={isSubmitting || isOffline}
              onPress={() => void handleConfirm()}
              variant="destructive"
            >
              <Text
                allowFontScaling={false}
                className="text-destructive-foreground"
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.destructiveForeground,
                  fontWeight: "500",
                })}
              >
                {isSubmitting ? "Removing…" : confirmLabel}
              </Text>
            </Button>
          </View>
        }
        onClose={() => setConfirmation(null)}
        maxDynamicContentSize={
          largeTextLayout ? viewportHeight * 0.72 : undefined
        }
        presentation="compact"
        scrollable="auto"
        title={sheetTitle}
        visible={confirmation !== null}
      >
        <View className="gap-3 px-5 pt-2 pb-3">
          <Text
            allowFontScaling={false}
            className="text-sm leading-5 text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.mutedForeground,
            })}
          >
            {confirmation?.kind === "revoke"
              ? "Sign in again to use this device."
              : managed
                ? `${activeCount} active ${activeCount === 1 ? "session" : "sessions"} will end for this workspace user.`
                : `${activeCount} active ${activeCount === 1 ? "session" : "sessions"} will end, including this device.`}
          </Text>
          {confirmation?.kind === "revoke" ? (
            <View className="border-y border-border py-3">
              <Text
                allowFontScaling={false}
                className="text-sm font-extrabold text-foreground"
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.foreground,
                  fontWeight: "800",
                })}
              >
                {confirmation.session.deviceLabel}
              </Text>
              <Text
                allowFontScaling={false}
                className="mt-1 text-xs text-muted-foreground"
                style={scaledTextStyle(accessibilityScale, 12, 16, {
                  color: colors.mutedForeground,
                })}
              >
                {`${confirmation.session.platform} · Last active ${sessionDateFormatter.format(confirmation.session.lastUsedAt)}`}
              </Text>
            </View>
          ) : null}
        </View>
      </FloatingBottomSheet>
    </SafeArea>
  )
}
