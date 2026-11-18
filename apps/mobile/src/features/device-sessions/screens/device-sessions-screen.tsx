import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { ScreenShell } from "@/components/app/screen-shell"
import {
  StatusBlock,
  StatusCard,
  StatusRow,
  StatusSection,
  StatusSectionHeading,
} from "@/components/app/status-card"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import {
  deviceAccessHeadline,
  deviceIcon,
  deviceMeta,
  deviceSignedIn,
  deviceWhen,
  groupDeviceSessions,
  platformLabel,
} from "@/features/device-sessions/model/device-access-presentation"
import {
  isActiveMobileDeviceSession,
  type MobileDeviceSession,
  type MobileDeviceSessionCollection,
  type MobileDeviceSessionConfirmation,
} from "@/features/device-sessions/model/device-session-types"
import { useMemo, useState } from "react"
import { View } from "react-native"

export type DeviceAccessBlock = { title: string; body: string; icon: string }

/**
 * Device access on 03 Status card (T26): a status card with the active and
 * ended counts, then This phone, Other devices and Recently ended. Removing
 * one device, this phone or every device asks in a floating confirm that
 * stays open with the error when the change fails.
 */
export function DeviceSessionsScreen({
  blocked,
  collection,
  isLoading,
  isOffline,
  isSubmitting,
  managed,
  notice,
  onBack,
  onDismissWriteError,
  onRefresh,
  onRevoke,
  onRevokeAll,
  readError,
  refreshing,
  writeError,
}: {
  blocked: DeviceAccessBlock | null
  collection: MobileDeviceSessionCollection | null
  isLoading: boolean
  isOffline: boolean
  isSubmitting: boolean
  managed: boolean
  notice: string | null
  onBack: () => void
  onDismissWriteError: () => void
  onRefresh: () => void
  onRevoke: (sessionId: string) => Promise<boolean>
  onRevokeAll: () => Promise<boolean>
  readError: string | null
  refreshing: boolean
  writeError: string | null
}) {
  const [confirmation, setConfirmation] =
    useState<MobileDeviceSessionConfirmation | null>(null)
  const groups = useMemo(
    () => groupDeviceSessions(collection?.sessions ?? []),
    [collection?.sessions]
  )
  const ready = !blocked && Boolean(collection?.sessions.length)
  const ownerName = collection?.owner.fullName ?? "This user"

  function close() {
    if (isSubmitting) return
    setConfirmation(null)
    onDismissWriteError()
  }
  async function confirm() {
    if (!confirmation) return
    const done =
      confirmation.kind === "revoke"
        ? await onRevoke(confirmation.session.id)
        : await onRevokeAll()
    if (done) setConfirmation(null)
  }
  const choose = (session: MobileDeviceSession) =>
    isOffline || isSubmitting ? undefined : () => setConfirmation({ kind: "revoke", session })

  const row = (session: MobileDeviceSession) => {
    return isActiveMobileDeviceSession(session) ? (
      <StatusRow
        accessibilityHint="Opens a confirmation to remove this device's access"
        accessibilityLabel={`Review access for ${session.deviceLabel}`}
        chevron={!isOffline}
        icon={deviceIcon(session)}
        key={session.id}
        meta={deviceMeta(session)}
        onPress={choose(session)}
        testID={`device-row-${session.id}`}
        title={session.deviceLabel}
        tone={session.current ? "brand" : "info"}
        trailing={session.current ? <StatusPill label="This phone" tone="brand" /> : undefined}
      />
    ) : (
      <StatusRow
        dimmed
        icon={deviceIcon(session)}
        key={session.id}
        meta={deviceMeta(session)}
        title={session.deviceLabel}
        tone="neutral"
        trailing={
          <Text className="text-muted-foreground" variant="label">
            Ended
          </Text>
        }
      />
    )
  }

  const sheet =
    confirmation?.kind === "revoke_all"
      ? managed
        ? {
            body: `${groups.active} active ${groups.active === 1 ? "session" : "sessions"} will end for ${ownerName}.`,
            confirm: "Remove all access",
            icon: "LogOut",
            title: "Remove all device access?",
          }
        : {
            body: `${groups.active} active ${groups.active === 1 ? "session" : "sessions"} will end, including this phone.`,
            confirm: "Sign out all",
            icon: "LogOut",
            title: "Sign out all devices?",
          }
      : confirmation?.session.current
        ? {
            body: "You’ll go back to sign in. Your other devices stay signed in.",
            confirm: "Sign out",
            icon: "LogOut",
            title: "Sign out this phone?",
          }
        : {
            body: "Sign in again to use this device.",
            confirm: "Remove access",
            icon: confirmation ? deviceIcon(confirmation.session) : "Smartphone",
            title: "Remove device access?",
          }

  return (
    <ScreenShell
      back={onBack}
      footer={
        ready ? (
          <Button
            accessibilityLabel={
              managed ? `Remove all device access for ${ownerName}` : "Sign out all devices"
            }
            className="bg-tint-danger active:bg-tint-danger"
            disabled={groups.active === 0 || isOffline || isSubmitting}
            onPress={() => setConfirmation({ kind: "revoke_all" })}
            testID="device-access-all"
            variant="ghost"
          >
            <Icon className="size-base text-tint-danger-foreground" name="LogOut" />
            <Text className="text-tint-danger-foreground">
              {managed ? "Remove all access" : "Sign out all devices"}
            </Text>
          </Button>
        ) : undefined
      }
      onRefresh={collection && !blocked ? onRefresh : undefined}
      refreshing={refreshing}
      testID="device-access-screen"
      title="Device access"
    >
      {notice ? <StatusBanner kind="info" title={notice} /> : null}
      {isOffline ? (
        <StatusBanner
          kind="offline"
          title="You’re offline. Device access can’t be changed until you reconnect."
        />
      ) : null}
      {blocked ? (
        <StatusBlock
          action={{ icon: "ChevronLeft", label: "Go back", onPress: onBack, variant: "secondary" }}
          body={blocked.body}
          icon={blocked.icon}
          testID="device-access-blocked"
          title={blocked.title}
          tone="warning"
        />
      ) : isLoading && !collection ? (
        <View className="gap-[9px]">
          <StatusSectionHeading title="Signed-in devices" />
          <ListSkeleton rows={3} />
        </View>
      ) : !collection ? (
        <StatusBlock
          action={
            readError && !isOffline
              ? { icon: "RefreshCw", label: "Try again", onPress: onRefresh }
              : undefined
          }
          body={readError ?? "Device access could not be loaded. Try again."}
          icon={isOffline ? "WifiOff" : "CircleAlert"}
          testID="device-access-error"
          title={isOffline ? "Device access needs a connection" : "Device access couldn’t load"}
          tone={isOffline ? "warning" : "danger"}
        />
      ) : !collection.sessions.length ? (
        <StatusBlock
          body="New signed-in devices will appear here."
          icon="Smartphone"
          testID="device-access-empty"
          title="No device access"
          tone="neutral"
        />
      ) : (
        <>
          {readError ? (
            <StatusBanner
              kind="error"
              onRetry={isOffline ? undefined : onRefresh}
              title="Couldn’t refresh device access"
            />
          ) : null}
          <StatusCard
            body={
              managed
                ? "Removing access signs that device out of this workspace user’s account."
                : "Don’t recognize a device? Remove its access, then change your account password."
            }
            icon={managed ? "Users" : "ShieldCheck"}
            pill={`${groups.active} active · ${groups.ended.length} ended`}
            testID="device-access-status"
            title={managed ? ownerName : deviceAccessHeadline(groups.active)}
            tone="brand"
          />
          {groups.current.length ? (
            <StatusSection title="This phone">{groups.current.map(row)}</StatusSection>
          ) : null}
          {groups.other.length ? (
            <StatusSection
              side={`${groups.other.length} active`}
              title={managed ? "Signed-in devices" : "Other devices"}
            >
              {groups.other.map(row)}
            </StatusSection>
          ) : !managed ? (
            <StatusSection title="Other devices">
              <StatusRow
                icon="ShieldCheck"
                meta="Only this phone is signed in."
                title="No other devices"
                tone="brand"
              />
            </StatusSection>
          ) : null}
          {groups.ended.length ? (
            <StatusSection title="Recently ended">{groups.ended.map(row)}</StatusSection>
          ) : null}
        </>
      )}
      <ConfirmSheet
        cancelLabel="Keep access"
        confirmDisabled={isOffline}
        confirmLabel={writeError ? "Try again" : sheet.confirm}
        description={sheet.body}
        error={writeError}
        icon={sheet.icon}
        isConfirming={isSubmitting}
        onCancel={close}
        onConfirm={() => void confirm()}
        title={sheet.title}
        tone="destructive"
        visible={confirmation !== null}
      >
        {confirmation?.kind === "revoke" ? (
          <View className="mt-[16px] overflow-hidden rounded-[14px] bg-surface-raised">
            <StatusRow
              icon={deviceIcon(confirmation.session)}
              meta={`${platformLabel(confirmation.session.platform)} · ${deviceWhen(confirmation.session)} · Signed in ${deviceSignedIn(confirmation.session)}`}
              title={confirmation.session.deviceLabel}
              tone={confirmation.session.current ? "brand" : "info"}
            />
          </View>
        ) : null}
      </ConfirmSheet>
    </ScreenShell>
  )
}
