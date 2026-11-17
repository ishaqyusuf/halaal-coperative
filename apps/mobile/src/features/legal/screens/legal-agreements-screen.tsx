import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
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
import { Pressable } from "@/components/ui/pressable"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import type { LegalBundle, LegalDocument, LegalRecord } from "../api/legal-api"
import {
  LEGAL_STATUS,
  documentIcon,
  effectiveLabel,
  isDocumentRecorded,
  legalDay,
  legalDayTime,
  legalState,
  needsReviewTitle,
  recordTitle,
} from "../model/legal-presentation"

export type LegalSheet = "record" | "record-error" | null

/**
 * Platform documents on 03 Status card (T26): the status card says whether
 * the current terms and privacy notice are recorded; each document opens a
 * full-screen reader; recording asks in a floating confirm with the exact
 * versions.
 */
export function LegalAgreementsScreen(props: {
  bundle: LegalBundle | null
  busy: boolean
  checked: boolean
  loading: boolean
  message: string | null
  offline: boolean
  readError: string | null
  reading: LegalDocument | null
  records: LegalRecord[] | null
  refreshing: boolean
  sheet: LegalSheet
  writeError: string | null
  onBack: () => void
  onCheck: (value: boolean) => void
  onCloseReader: () => void
  onCloseSheet: () => void
  onConfirm: () => void
  onOpenRecord: () => void
  onRead: (document: LegalDocument) => void
  onRefresh: () => void
  onRefreshDocuments: () => void
}) {
  const ready = Boolean(props.bundle && props.records) && !props.offline
  const state = props.bundle && props.records ? legalState(props.bundle, props.records) : null
  const needs = state === "needs" || state === "updated"
  const status = state ? LEGAL_STATUS[state] : null

  const recordsSection =
    props.records && props.records.length ? (
      <StatusSection title="Your records">
        {props.records.map((record) => {
          const latest = props.bundle?.documents.some(
            (document) =>
              document.documentType === record.documentType &&
              document.documentVersion === record.documentVersion
          )
          return (
            <StatusRow
              icon="FileCheck2"
              key={`${record.documentType}:${record.documentVersion}:${String(record.acceptedAt)}`}
              meta={`Version ${record.documentVersion} · ${legalDayTime(record.acceptedAt)}`}
              title={recordTitle(record)}
              tone={latest ? "brand" : "neutral"}
            />
          )
        })}
      </StatusSection>
    ) : (
      <View className="gap-[6px]">
        <StatusSectionHeading title="Your records" />
        <Text className="px-[4px] text-muted-foreground" variant="small">
          No acknowledgements recorded yet.
        </Text>
      </View>
    )

  return (
    <ScreenShell
      back={props.onBack}
      footer={
        ready && needs ? (
          <Button
            disabled={!props.checked || props.busy}
            onPress={props.onOpenRecord}
            testID="legal-review-record"
          >
            <Text>Review and record</Text>
          </Button>
        ) : undefined
      }
      onRefresh={ready ? props.onRefresh : undefined}
      refreshing={props.refreshing}
      testID="legal-screen"
      title="Platform documents"
    >
      {props.message ? <StatusBanner kind="info" title={props.message} /> : null}
      {props.offline ? (
        <StatusBanner
          kind="offline"
          title="Reconnect to load the current documents and record your acknowledgement."
        />
      ) : null}
      {props.offline ? (
        <StatusBlock
          body="The current versions load when you’re back online."
          icon="WifiOff"
          testID="legal-offline"
          title="Documents need a connection"
          tone="warning"
        />
      ) : !ready && props.loading ? (
        <View className="gap-[9px]">
          <StatusSectionHeading title="Current documents" />
          <ListSkeleton rows={2} />
        </View>
      ) : !ready || !props.bundle || !state || !status ? (
        <StatusBlock
          action={{ icon: "RefreshCw", label: "Try again", onPress: props.onRefresh }}
          body={props.readError ?? "Platform documents could not be loaded. Refresh to try again."}
          icon="CircleAlert"
          testID="legal-error"
          title="Documents couldn’t load"
          tone="danger"
        />
      ) : state === "drafts" || state === "unavailable" ? (
        <>
          <StatusBlock
            action={
              state === "unavailable"
                ? { icon: "RefreshCw", label: "Try again", onPress: props.onRefresh }
                : undefined
            }
            body={status.body(props.bundle)}
            icon={status.icon}
            testID={`legal-${state}`}
            title={status.title}
            tone={status.tone}
          />
          {recordsSection}
        </>
      ) : (
        <>
          {props.readError ? (
            <StatusBanner kind="error" onRetry={props.onRefresh} title="Couldn’t refresh the documents" />
          ) : null}
          <StatusCard
            body={status.body(props.bundle)}
            icon={status.icon}
            pill={status.pill}
            testID="legal-status"
            title={needsReviewTitle(props.bundle, state)}
            tone={status.tone}
          />
          <StatusSection side={effectiveLabel(props.bundle)} title="Current documents">
            {props.bundle.documents.map((document) => {
              const recorded = isDocumentRecorded(document, props.records ?? [])
              const look = documentIcon(document)
              return (
                <StatusRow
                  accessibilityLabel={`Read ${document.contentSnapshot.title}`}
                  chevron
                  icon={look.icon}
                  key={document.documentType}
                  meta={`Version ${document.documentVersion}`}
                  onPress={() => props.onRead(document)}
                  testID={`legal-doc-${document.documentType}`}
                  title={document.contentSnapshot.title}
                  tone={look.tone}
                  trailing={
                    recorded ? (
                      <StatusPill label="Recorded" tone="success" />
                    ) : (
                      <StatusPill label={state === "updated" ? "Updated" : "New"} tone="warning" />
                    )
                  }
                />
              )
            })}
          </StatusSection>
          {needs ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: props.checked }}
              className={cn(
                "flex-row items-start gap-[12px] rounded-[16px] border-[1.5px] p-[14px]",
                props.checked ? "border-primary bg-accent" : "border-border bg-card"
              )}
              haptic
              onPress={() => props.onCheck(!props.checked)}
              testID="legal-checkbox"
            >
              <View
                className={cn(
                  "size-[24px] items-center justify-center rounded-[7px] border-2",
                  props.checked ? "border-primary bg-primary" : "border-muted-foreground"
                )}
              >
                {props.checked ? (
                  <Icon className="size-[15px] text-primary-foreground" name="Check" />
                ) : null}
              </View>
              <Text className="min-w-0 flex-1 font-semibold" variant="small">
                I accept the platform terms and acknowledge that I have read the privacy notice.
              </Text>
            </Pressable>
          ) : null}
          {recordsSection}
        </>
      )}

      <FullScreenFormSheet
        footer={
          <Button onPress={props.onCloseReader} testID="legal-reader-done" variant="secondary">
            <Text>Done</Text>
          </Button>
        }
        onClose={props.onCloseReader}
        title={props.reading?.contentSnapshot.title ?? "Document"}
        visible={props.reading !== null}
      >
        {props.reading ? (
          <View className="gap-[4px] pb-[8px]" testID="legal-reader">
            <View className="mb-[10px] flex-row items-center gap-[10px]">
              <StatusPill label={`Version ${props.reading.documentVersion}`} tone="brand" />
              <Text className="text-muted-foreground" variant="small">
                {`Effective ${legalDay(props.reading.contentSnapshot.effectiveAt)}`}
              </Text>
            </View>
            <Text variant="body">{props.reading.contentSnapshot.introduction}</Text>
            {props.reading.contentSnapshot.sections.map((section) => (
              <View className="gap-[4px] pt-[14px]" key={section.title}>
                <Text accessibilityRole="header" variant="section">
                  {section.title}
                </Text>
                <Text className="leading-[21px] text-muted-foreground" variant="small">
                  {section.body}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </FullScreenFormSheet>

      <ConfirmSheet
        cancelLabel="Go back"
        confirmLabel="Record acknowledgement"
        description="Your acceptance of the terms and acknowledgement of the privacy notice will be recorded with their exact versions."
        icon="FileCheck2"
        isConfirming={props.busy}
        onCancel={props.onCloseSheet}
        onConfirm={props.onConfirm}
        title="Record platform documents?"
        visible={props.sheet === "record"}
      >
        <View className="mt-[16px] rounded-[14px] bg-surface-raised px-[14px] py-[4px]">
          {(props.bundle?.documents ?? []).map((document, index) => (
            <View
              className={cn(
                "min-h-[40px] flex-row items-center justify-between gap-[12px] py-[8px]",
                index > 0 && "border-t border-border"
              )}
              key={document.documentType}
            >
              <Text className="text-muted-foreground" variant="small">
                {document.contentSnapshot.title}
              </Text>
              <Text className="font-bold" variant="small">
                {`Version ${document.documentVersion}`}
              </Text>
            </View>
          ))}
        </View>
      </ConfirmSheet>
      <ConfirmSheet
        cancelLabel="Go back"
        confirmLabel="Refresh documents"
        description={props.writeError ?? undefined}
        icon="CircleAlert"
        onCancel={props.onCloseSheet}
        onConfirm={props.onRefreshDocuments}
        title="Couldn’t record"
        tone="destructive"
        visible={props.sheet === "record-error"}
      />
    </ScreenShell>
  )
}
