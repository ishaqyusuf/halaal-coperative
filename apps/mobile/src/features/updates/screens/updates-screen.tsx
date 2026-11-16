import { AppSheet } from "@/components/app/app-sheet"
import { HeroProgress, HeroStatusCard } from "@/components/app/hero-status-card"
import { ScreenShell } from "@/components/app/screen-shell"
import { SettingsRow } from "@/components/app/settings-row"
import { ListCard } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import type { UpdatePrimaryAction } from "@/features/updates/model/update-screen-state"
import { useState } from "react"
import { View } from "react-native"

function formatDate(value?: Date | null) {
  if (!value) return "Not checked"
  return value.toLocaleString()
}

function formatTime(value: Date) {
  return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function shortId(value?: string | null) {
  if (!value) return "Embedded build"
  return value.slice(0, 8)
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  return (
    <View className="min-h-[48px] flex-row items-center justify-between gap-[16px] border-b border-border py-[10px]">
      <Text className="text-muted-foreground" variant="small">
        {label}
      </Text>
      <Text
        className="min-w-0 flex-1 text-right font-semibold"
        numberOfLines={2}
        variant="small"
      >
        {value ?? "Not set"}
      </Text>
    </View>
  )
}

/** Build details: read-only, so AppSheet auto (floating, expands if long). */
function BuildDetailsSheet({
  details,
  onClose,
  visible,
}: {
  details: UpdatesScreenProps["buildDetails"]
  onClose: () => void
  visible: boolean
}) {
  return (
    <AppSheet
      accessibilityLabel="App update build details"
      onClose={onClose}
      title="Build details"
      visible={visible}
    >
      <View>
        <InfoRow label="App version" value={details.appVersion} />
        <InfoRow label="Update version" value={details.updateVersion} />
        <InfoRow label="Channel" value={details.channel} />
        <InfoRow label="Runtime" value={details.runtimeVersion} />
        <InfoRow
          label="Running"
          value={
            details.isEmbeddedLaunch ? "Embedded build" : "Downloaded update"
          }
        />
        <InfoRow label="Update ID" value={shortId(details.updateId)} />
        <InfoRow label="Created" value={formatDate(details.createdAt)} />
        <InfoRow label="Last check" value={formatDate(details.lastCheckAt)} />
      </View>
    </AppSheet>
  )
}

type UpdatesScreenProps = {
  buildDetails: {
    appVersion: string
    channel: string
    createdAt?: Date | null
    isEmbeddedLaunch: boolean
    lastCheckAt?: Date | null
    runtimeVersion: string
    updateId?: string | null
    updateVersion: string
  }
  downloadProgressPercent: number
  isBusy: boolean
  isDownloading: boolean
  lastCheckAt?: Date | null
  message: string
  onBack: () => void
  onPrimaryAction: () => void
  primaryAction: UpdatePrimaryAction | null
  primaryIcon: "Download" | "RefreshCw" | "RotateCw"
  status: string
  statusIsCurrent: boolean
  statusIsError: boolean
  updatesEnabled: boolean
}

/**
 * App updates (T03, 02 Brand hero): ScreenShell title, the hero status card
 * (status, message, download progress and the one primary action), then the
 * update settings rows. Build details open in a floating auto sheet.
 */
export function UpdatesScreen({
  buildDetails,
  downloadProgressPercent,
  isBusy,
  isDownloading,
  lastCheckAt,
  message,
  onBack,
  onPrimaryAction,
  primaryAction,
  primaryIcon,
  status,
  statusIsCurrent,
  statusIsError,
  updatesEnabled,
}: UpdatesScreenProps) {
  const [showBuildDetails, setShowBuildDetails] = useState(false)

  return (
    <>
      <ScreenShell back={onBack} testID="updates-screen" title="App updates">
        <HeroStatusCard
          action={
            primaryAction
              ? {
                  disabled: primaryAction.disabled,
                  icon: primaryIcon,
                  label: primaryAction.label,
                  onPress: onPrimaryAction,
                }
              : undefined
          }
          busy={isBusy}
          icon={
            statusIsError
              ? "AlertCircle"
              : statusIsCurrent
                ? "Check"
                : updatesEnabled
                  ? primaryIcon
                  : "CloudOff"
          }
          message={message}
          meta={`Version ${buildDetails.appVersion} · ${
            lastCheckAt ? `Checked ${formatTime(lastCheckAt)}` : "Not checked"
          }`}
          title={status}
          tone={statusIsError ? "error" : "default"}
        >
          {isDownloading ? (
            <HeroProgress
              label="Download progress"
              value={downloadProgressPercent}
            />
          ) : null}
        </HeroStatusCard>

        <Text accessibilityRole="header" variant="section">
          Update settings
        </Text>
        <ListCard>
          <SettingsRow
            detail="Installed preview and release builds check after opening or returning to the app."
            icon="RefreshCw"
            title="Automatic checking"
            value={updatesEnabled ? "Available" : "Off"}
          />
          <SettingsRow
            accessibilityLabel="Open app update build details"
            chevron
            detail="Version, update channel, runtime and release identifier."
            icon="Info"
            onPress={() => setShowBuildDetails(true)}
            title="Build details"
            tone="sky"
          />
        </ListCard>
        <ListCard>
          <SettingsRow
            detail="HalaalVest only applies an update when its channel and runtime match this installed build. Native changes still need a new app build."
            icon="ShieldCheck"
            title="Updates are safely matched"
            tone="success"
          />
        </ListCard>
      </ScreenShell>

      <BuildDetailsSheet
        details={buildDetails}
        onClose={() => setShowBuildDetails(false)}
        visible={showBuildDetails}
      />
    </>
  )
}
