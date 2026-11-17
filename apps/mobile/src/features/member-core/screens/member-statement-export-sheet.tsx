import { AppSheet } from "@/components/app/app-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated, TintedAvatar } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import type { GeneratedReportFile } from "@/features/admin-reports-access/public/generated-report-file"
import { useEffect, useState } from "react"
import { ActivityIndicator, View } from "react-native"

export type StatementExportActions = {
  blocked: "offline" | "stale" | null
  file: GeneratedReportFile | null
  onCancel: () => void
  onGenerate: () => void
  onShare: () => void
  sharing: boolean
}

function useExportCountdown(expiresAt?: string | null) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!expiresAt) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const remaining = expiresAt
    ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000))
    : 0
  const countdown = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
  return { countdown, remaining }
}

export function StatementFileBanner({
  file,
  onOpen,
  onShare,
  sharing,
}: Pick<StatementExportActions, "file" | "onShare" | "sharing"> & {
  onOpen: () => void
}) {
  const ready = file?.status === "ready"
  const { countdown } = useExportCountdown(ready ? file?.expiresAt : null)
  const expired = file?.status === "expired"
  if (!ready && !expired && file?.status !== "pending") return null

  return (
    <Elevated
      className="flex-row items-center gap-[8px] rounded-[20px] bg-card px-[12px] py-[6px]"
      radius={20}
    >
      <Pressable
        accessibilityRole="button"
        className="min-h-[44px] min-w-0 flex-1 flex-row items-center gap-[10px]"
        onPress={onOpen}
      >
        <TintedAvatar
          icon={ready ? "FileCheck" : "FileText"}
          name="Statement"
        />
        <View className="min-w-0 flex-1">
          <Text variant="label">
            {ready
              ? "Statement file ready"
              : expired
                ? "Statement file expired"
                : "Preparing statement file"}
          </Text>
          <Text className="text-muted-foreground" variant="caption">
            {ready
              ? `Expires in ${countdown} · ${file?.rowCount} rows`
              : expired
                ? "Deleted from this device"
                : "Full statement · CSV"}
          </Text>
        </View>
      </Pressable>
      {ready ? (
        <Button
          loading={sharing}
          onPress={onShare}
          size="sm"
          variant="secondary"
        >
          <Text>Share</Text>
        </Button>
      ) : null}
    </Elevated>
  )
}

export function StatementExportSheet({
  blocked,
  file,
  onCancel,
  onClose,
  onGenerate,
  onShare,
  sharing,
  visible,
}: StatementExportActions & { onClose: () => void; visible: boolean }) {
  const status = file?.status
  const ready = status === "ready"
  const expired = status === "expired"
  const pending = status === "pending"
  const failed = status === "failed"
  const { countdown, remaining } = useExportCountdown(
    ready && visible ? file?.expiresAt : null
  )
  const title = ready || expired ? "Statement file" : "Export statement"
  const head =
    ready || expired
      ? file?.filename
      : failed
        ? "Couldn’t create the file"
        : "Full statement"
  const meta = ready
    ? `${file?.rowCount ?? 0} rows · CSV`
    : expired
      ? "Expired"
      : failed
        ? "No file was saved."
        : "CSV file · up to 500 rows"
  const footer = ready ? (
    <View className="gap-[10px]">
      <Button
        loading={sharing}
        onPress={onShare}
        testID="member-statement-share-file"
      >
        <Icon className="size-sm text-primary-foreground" name="Share2" />
        <Text>Share file</Text>
      </Button>
      <Button
        className="bg-surface-raised"
        onPress={onClose}
        testID="member-statement-export-done"
        variant="ghost"
      >
        <Text>Done</Text>
      </Button>
    </View>
  ) : pending ? (
    <Button
      onPress={onCancel}
      testID="member-statement-cancel-export"
      variant="outline"
    >
      <Text>Cancel</Text>
    </Button>
  ) : (
    <Button
      disabled={Boolean(blocked)}
      onPress={onGenerate}
      testID="member-statement-create-file"
    >
      <Icon className="size-sm text-primary-foreground" name="Download" />
      <Text>
        {expired ? "Create a new file" : failed ? "Try again" : "Create file"}
      </Text>
    </Button>
  )

  return (
    <AppSheet
      footer={footer}
      insetFloatingFooter
      onClose={onClose}
      title={title}
      visible={visible}
    >
      {pending ? (
        <View
          accessibilityLiveRegion="polite"
          className="items-center gap-[12px] py-[18px]"
        >
          <ActivityIndicator accessibilityLabel="Generating statement" />
          <Text variant="section">Preparing your statement</Text>
        </View>
      ) : (
        <>
          <View className="flex-row items-center gap-[14px]">
            <View
              className={cn(
                "size-[52px] items-center justify-center rounded-[18px]",
                ready
                  ? "bg-tint-success"
                  : failed
                    ? "bg-tint-danger"
                    : expired
                      ? "bg-surface-raised"
                      : "bg-accent"
              )}
            >
              <Icon
                className={cn(
                  "size-[24px]",
                  ready
                    ? "text-tint-success-foreground"
                    : failed
                      ? "text-tint-danger-foreground"
                      : expired
                        ? "text-muted-foreground"
                        : "text-accent-foreground"
                )}
                name={
                  ready ? "FileCheck" : expired || failed ? "FileX" : "FileText"
                }
              />
            </View>
            <View className="min-w-0 flex-1 gap-[2px]">
              <Text variant="section">{head}</Text>
              <Text className="text-muted-foreground" variant="small">
                {meta}
              </Text>
            </View>
          </View>
          {ready || expired ? (
            <View
              className={cn(
                "flex-row items-start gap-[8px] rounded-[14px] px-[12px] py-[10px]",
                ready && remaining < 60 ? "bg-tint-warm" : "bg-surface-raised"
              )}
            >
              <Icon
                className="size-sm mt-[2px] text-muted-foreground"
                name="Clock"
              />
              <Text
                className="min-w-0 flex-1 text-muted-foreground"
                variant="small"
              >
                {expired
                  ? "This file expired and was deleted from this device."
                  : `Expires in ${countdown}, then it’s deleted from this device`}
              </Text>
            </View>
          ) : null}
          {!status || status === "cancelled" ? (
            <View className="gap-[8px]">
              <Text className="text-muted-foreground" variant="small">
                Savings, financing, shares, charges, profile and documents from
                your statement.
              </Text>
              <View className="flex-row items-start gap-[8px]">
                <Icon
                  className="size-sm mt-[2px] text-muted-foreground"
                  name="LockKeyhole"
                />
                <Text className="flex-1 text-muted-foreground" variant="small">
                  Kept privately on this device and deleted 15 minutes after
                  it’s made.
                </Text>
              </View>
              {status === "cancelled" ? (
                <Text variant="small">Cancelled. No file was saved.</Text>
              ) : null}
            </View>
          ) : null}
          {file?.error ? (
            <StatusBanner kind="error" title={file.error} />
          ) : null}
          {!ready && blocked ? (
            <StatusBanner
              kind={blocked}
              title={
                blocked === "offline"
                  ? "Exporting needs a connection"
                  : "Refresh your statement before exporting"
              }
            />
          ) : null}
        </>
      )}
    </AppSheet>
  )
}
