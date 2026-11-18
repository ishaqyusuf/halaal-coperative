import { AppSheet } from "@/components/app/app-sheet"
import {
  CenteredStatus,
  GateStatusBadge,
  type GateStatusTone,
} from "@/components/app/gate-status"
import { GroupedRow, GroupedSection } from "@/components/app/grouped-section"
import { ScreenShell } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
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

/** Download progress: 6pt track, primary fill, "NN% downloaded". */
function DownloadProgress({ value }: { value: number }) {
  const colors = useColors()
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <View
      accessibilityLabel={`Download progress, ${clamped}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: 100, min: 0, now: clamped }}
      accessible
      className="mt-[8px] w-full gap-[6px]"
    >
      <View className="flex-row justify-between">
        <Text className="text-muted-foreground" variant="caption">
          Download progress
        </Text>
        <Text className="text-muted-foreground" variant="caption">
          {clamped}% downloaded
        </Text>
      </View>
      <View className="h-[6px] overflow-hidden rounded-full bg-surface-raised">
        {/* Style-only: a measured width cannot share an element with className. */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 999,
            height: 6,
            width: `${clamped}%`,
          }}
        />
      </View>
    </View>
  )
}

/**
 * App updates (T03, owner pick 03 Docked action): ScreenShell title, a
 * centred status (badge, title, message, version line, download progress),
 * the update settings group, and the one primary action docked at the bottom.
 * Build details open in a floating auto sheet.
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
  const colors = useColors()
  const [showBuildDetails, setShowBuildDetails] = useState(false)
  const tone: GateStatusTone = statusIsError
    ? "danger"
    : statusIsCurrent
      ? "ok"
      : updatesEnabled
        ? "brand"
        : "neutral"
  const badgeIcon = statusIsError
    ? "AlertCircle"
    : statusIsCurrent
      ? "Check"
      : updatesEnabled
        ? primaryIcon
        : "CloudOff"

  return (
    <>
      <ScreenShell
        back={onBack}
        contentClassName="gap-[22px]"
        footer={
          primaryAction ? (
            <Button
              accessibilityLabel={primaryAction.label}
              disabled={primaryAction.disabled}
              loading={isBusy}
              onPress={onPrimaryAction}
            >
              {isBusy ? null : (
                <Icon
                  className="size-base"
                  color={colors.primaryForeground}
                  name={primaryIcon}
                />
              )}
              <Text>{primaryAction.label}</Text>
            </Button>
          ) : undefined
        }
        testID="updates-screen"
        title="App updates"
      >
        <CenteredStatus
          badge={<GateStatusBadge icon={badgeIcon} size={76} tone={tone} />}
          body={message}
          title={status}
        >
          <Text className="text-foreground" variant="caption">
            Version {buildDetails.appVersion} ·{" "}
            {lastCheckAt ? `Checked ${formatTime(lastCheckAt)}` : "Not checked"}
          </Text>
          {isDownloading ? (
            <DownloadProgress value={downloadProgressPercent} />
          ) : null}
        </CenteredStatus>

        <View className="gap-[16px]">
          <GroupedSection caption="Update settings">
            <GroupedRow
              detail="Installed preview and release builds check after opening or returning to the app."
              icon="RefreshCw"
              title="Automatic checking"
              value={updatesEnabled ? "Available" : "Off"}
            />
            <GroupedRow
              accessibilityLabel="Open app update build details"
              chevron
              detail="Version, update channel, runtime and release identifier."
              icon="Info"
              onPress={() => setShowBuildDetails(true)}
              title="Build details"
              tone="sky"
            />
          </GroupedSection>
          <GroupedSection>
            <GroupedRow
              detail="HalaalVest only applies an update when its channel and runtime match this installed build. Native changes still need a new app build."
              icon="ShieldCheck"
              title="Updates are safely matched"
            />
          </GroupedSection>
        </View>
      </ScreenShell>

      <BuildDetailsSheet
        details={buildDetails}
        onClose={() => setShowBuildDetails(false)}
        visible={showBuildDetails}
      />
    </>
  )
}
