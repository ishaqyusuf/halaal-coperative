import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Text } from "@/components/ui/text"
import type { UpdatePrimaryAction } from "@/features/updates/model/update-screen-state"
import { useColors } from "@/hooks/use-color"
import { useState } from "react"
import { ActivityIndicator, ScrollView, View } from "react-native"

function formatDate(value?: Date | null) {
  if (!value) return "Not checked"
  return value.toLocaleString()
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
    <View className="flex-row items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <Text className="text-sm font-medium text-muted-foreground">{label}</Text>
      <Text
        className="min-w-0 flex-1 text-right text-sm font-semibold text-foreground"
        numberOfLines={2}
      >
        {value ?? "Not set"}
      </Text>
    </View>
  )
}

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
    <FloatingBottomSheet
      accessibilityLabel="App update build details"
      onClose={onClose}
      presentation="compact"
      scrollable="auto"
      title="Build details"
      visible={visible}
    >
      <View className="px-5 pb-6">
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
    </FloatingBottomSheet>
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

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          leading={<ScreenBackButton onPress={onBack} />}
          title="App updates"
        />

        <View className="flex-row items-start gap-4 border-y border-border py-5">
          <View className="min-w-0 flex-1 gap-2">
            <Text className="text-3xl font-extrabold tracking-tight text-foreground">
              {status}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {message}
            </Text>
            <View className="flex-row flex-wrap items-center gap-2 pt-1">
              <Text className="text-xs font-extrabold text-foreground">
                Version {buildDetails.appVersion}
              </Text>
              <Text className="text-xs text-muted-foreground">·</Text>
              <Text className="text-xs font-semibold text-muted-foreground">
                {lastCheckAt
                  ? `Checked ${formatDate(lastCheckAt)}`
                  : "Not checked this session"}
              </Text>
            </View>
          </View>
          <View
            className={
              statusIsError
                ? "h-14 w-14 items-center justify-center rounded-xl bg-destructive/10"
                : "h-14 w-14 items-center justify-center rounded-xl bg-accent"
            }
          >
            <Icon
              className={
                statusIsError
                  ? "size-lg text-destructive"
                  : "size-lg text-accent-foreground"
              }
              name={
                statusIsError
                  ? "AlertCircle"
                  : statusIsCurrent
                    ? "Check"
                    : primaryIcon
              }
            />
          </View>
        </View>

        {isDownloading ? (
          <ProgressBar
            fillClassName="bg-primary"
            info="downloaded"
            label="Download progress"
            value={downloadProgressPercent}
          />
        ) : null}

        {primaryAction ? (
          <Button
            accessibilityLabel={primaryAction.label}
            className="h-12 w-full"
            disabled={primaryAction.disabled}
            onPress={onPrimaryAction}
          >
            {isBusy ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Icon
                className="size-sm text-primary-foreground"
                name={primaryIcon}
              />
            )}
            <Text>{primaryAction.label}</Text>
          </Button>
        ) : null}

        <View>
          <Text className="pb-2 text-xl font-extrabold tracking-tight text-foreground">
            Update settings
          </Text>
          <View className="flex-row items-center justify-between gap-4 border-b border-border py-4">
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-extrabold text-foreground">
                Automatic checking
              </Text>
              <Text className="text-xs leading-4 text-muted-foreground">
                Installed preview and release builds check after opening or
                returning to the app.
              </Text>
            </View>
            <Text className="text-xs font-extrabold text-muted-foreground">
              {updatesEnabled ? "Available" : "Off"}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Open app update build details"
            accessibilityRole="button"
            className="min-h-14 flex-row items-center justify-between gap-4 border-b border-border py-4"
            haptic
            onPress={() => setShowBuildDetails(true)}
            transition
          >
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-extrabold text-foreground">
                Build details
              </Text>
              <Text className="text-xs leading-4 text-muted-foreground">
                Version, update channel, runtime, and release identifier.
              </Text>
            </View>
            <Icon
              className="size-sm text-muted-foreground"
              name="ChevronRight"
            />
          </Pressable>
        </View>

        <View className="flex-row gap-3 border-y border-border py-4">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-accent">
            <Icon
              className="size-sm text-accent-foreground"
              name="ShieldCheck"
            />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-sm font-extrabold text-foreground">
              Updates are safely matched
            </Text>
            <Text className="text-xs leading-4 text-muted-foreground">
              HalaalVest only applies an update when its channel and runtime
              match this installed build. Native changes still require a new app
              build.
            </Text>
          </View>
        </View>
      </ScrollView>

      <BuildDetailsSheet
        details={buildDetails}
        onClose={() => setShowBuildDetails(false)}
        visible={showBuildDetails}
      />
    </SafeArea>
  )
}
