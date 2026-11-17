import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Elevated, TintedAvatar } from "@/components/ui/list-card"
import { SectionHeader } from "@/components/ui/section-header"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { DetailSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useAppQuery } from "@/hooks/use-app-query"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { View } from "react-native"
import { getAdminReportActivityEvent } from "../api/admin-reports-access-api"
import type {
  AdminActivityEvent,
  AdminReportActivityFilters,
  AdminReportCard,
  AdminReportFilters,
} from "../model/admin-reports-access-types"
import type { GeneratedReportFile } from "../model/generated-report-file"
import {
  ACTION_CHIPS,
  actionIcon,
  actionTone,
  actorRole,
  AREA_CHIPS,
  countdownText,
  dayLabel,
  FILE_LOOK,
  matchQuickRange,
  QUICK_RANGES,
  quickRange,
  rangeText,
  reportLook,
  timeLabel,
} from "../model/report-presentation"
import { reportKeys, useNow } from "../model/report-queries"
import { ReportTile } from "./report-lanes"

/** Keep the last value while a sheet animates closed (no blank frame). */
function useLastPresent<T>(value: T | null) {
  const last = useRef(value)
  if (value) last.current = value
  return value ?? last.current
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Elevated className={cn("gap-[10px] rounded-[20px] bg-card p-[16px]", className)} radius={20}>
      {children}
    </Elevated>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-[12px]">
      <Text className="text-muted-foreground" variant="small">
        {label}
      </Text>
      <Text className="flex-1 text-right" variant="label">
        {value}
      </Text>
    </View>
  )
}

function ReportIdentity({ report }: { report: AdminReportCard }) {
  const look = reportLook(report.key)
  return (
    <Card className="flex-row items-center gap-[12px]">
      <ReportTile icon={look.icon} tone={look.tone} />
      <View className="min-w-0 flex-1">
        <Text className="font-bold" variant="body">
          {report.title}
        </Text>
        <Text className="text-muted-foreground" variant="small">
          {report.detail}
        </Text>
      </View>
    </Card>
  )
}

function Expiry({ expiresAt, note }: { expiresAt: string | null; note: string }) {
  const now = useNow(Boolean(expiresAt))
  return (
    <View className="flex-row items-center gap-[12px] rounded-[16px] bg-surface-raised px-[14px] py-[12px]">
      <Icon className="size-[20px] text-muted-foreground" name="Clock" />
      <View className="flex-1">
        <Text variant="label">Available for {countdownText(expiresAt, now)}</Text>
        <Text className="text-muted-foreground" variant="small">
          {note}
        </Text>
      </View>
    </View>
  )
}

function DateRange({
  onChange,
  value,
}: {
  onChange: (value: AdminReportFilters) => void
  value: AdminReportFilters
}) {
  const today = todayDateOnly()
  return (
    <View className="flex-row gap-[10px]">
      <FormField className="flex-1" label="Start date">
        <DateField
          maximumDate={value.toDate ?? today}
          onChange={(fromDate) => onChange({ ...value, fromDate })}
          placeholder="Any date"
          testID="report-range-from"
          value={value.fromDate}
        />
      </FormField>
      <FormField className="flex-1" label="End date">
        <DateField
          maximumDate={today}
          minimumDate={value.fromDate ?? undefined}
          onChange={(toDate) => onChange({ ...value, toDate })}
          placeholder="Any date"
          testID="report-range-to"
          value={value.toDate}
        />
      </FormField>
    </View>
  )
}

type GenerateStep = "error" | "form" | "review" | "submitting" | "success"

/**
 * T23 screen 2 (01): date range → review → generating (cancel) → ready with
 * Share, or the error with Try again. The CSV stays private on the phone.
 */
export function GenerateReportSheet({
  offline,
  onCancel,
  onClose,
  onGenerate,
  onShare,
  report: current,
}: {
  offline: boolean
  onCancel: (id: string) => void
  onClose: () => void
  onGenerate: (
    report: AdminReportCard,
    filters: AdminReportFilters,
    id: string
  ) => Promise<GeneratedReportFile | null>
  onShare: (file: GeneratedReportFile) => void
  report: AdminReportCard | null
}) {
  const report = useLastPresent(current)
  const [range, setRange] = useState<AdminReportFilters>({ fromDate: null, toDate: null })
  const [step, setStep] = useState<GenerateStep>("form")
  const [file, setFile] = useState<GeneratedReportFile | null>(null)
  const pendingId = useRef<string | null>(null)
  useEffect(() => {
    if (!current) return
    setRange({ fromDate: null, toDate: null })
    setStep("form")
    setFile(null)
  }, [current])
  if (!report) return null
  const quick = matchQuickRange(range)

  const run = async () => {
    const id = createClientSubmissionKey()
    pendingId.current = id
    setStep("submitting")
    const result = await onGenerate(report, range, id)
    if (pendingId.current !== id) return
    pendingId.current = null
    if (result?.status === "ready") {
      setFile(result)
      setStep("success")
    } else setStep("error")
  }
  const cancel = () => {
    if (pendingId.current) onCancel(pendingId.current)
    pendingId.current = null
    setStep("review")
  }
  const reviewing = step === "review" || step === "submitting" || step === "error"

  return (
    <AppSheet
      contentKey={step}
      dirty={step === "form" && Boolean(range.fromDate || range.toDate)}
      footer={
        step === "success" && file ? (
          <View className="gap-[8px]">
            <Button onPress={() => onShare(file)} testID="report-share">
              <Icon className="size-[18px] text-primary-foreground" name="Share" />
              <Text>Share</Text>
            </Button>
            <Button onPress={onClose} variant="ghost">
              <Text>Done</Text>
            </Button>
          </View>
        ) : step === "submitting" ? (
          <View className="gap-[8px]">
            <Button disabled loading>
              <Text>Generating…</Text>
            </Button>
            <Button onPress={cancel} testID="report-generate-cancel" variant="ghost">
              <Text>Cancel</Text>
            </Button>
          </View>
        ) : reviewing ? (
          <Button disabled={offline} onPress={() => void run()} testID="report-generate-submit">
            <Icon className="size-[18px] text-primary-foreground" name={step === "error" ? "RefreshCw" : "FileText"} />
            <Text>{step === "error" ? "Try again" : "Generate report"}</Text>
          </Button>
        ) : (
          <Button disabled={offline} onPress={() => setStep("review")} testID="report-generate-continue">
            <Text>Continue</Text>
          </Button>
        )
      }
      headerTrailing={
        step === "success" ? undefined : (
          <Text className="text-muted-foreground" variant="caption">
            {reviewing ? "Step 2 of 2" : "Step 1 of 2"}
          </Text>
        )
      }
      isSubmitting={step === "submitting"}
      onBack={step === "review" || step === "error" ? () => setStep("form") : undefined}
      onClose={() => {
        if (pendingId.current) cancel()
        onClose()
      }}
      title={step === "success" ? "Report ready" : "Generate report"}
      variant="form"
      visible={Boolean(current)}
    >
      {step === "success" && file ? (
        <View className="gap-[16px]">
          <View className="items-center gap-[8px] pt-[12px]">
            <ReportTile icon="Check" tone="success" />
            <Text variant="title">Report ready</Text>
            <Text className="text-center text-muted-foreground" variant="small">
              {report.title} · {rangeText(file.filterSnapshot ?? range)}
            </Text>
          </View>
          <Card className="flex-row items-center gap-[12px]">
            <ReportTile icon="FileCheck" tone="success" />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} variant="label">
                {file.filename}
              </Text>
              <Text className="text-muted-foreground" variant="small">
                {file.rowCount ?? 0} rows · CSV
              </Text>
            </View>
          </Card>
          <Expiry expiresAt={file.expiresAt} note="Saved privately on this phone, then removed." />
        </View>
      ) : reviewing ? (
        <View className="gap-[16px]">
          {step === "error" ? (
            <StatusBanner
              description="Nothing was saved."
              kind="error"
              title="The report could not be generated."
            />
          ) : null}
          {offline ? (
            <StatusBanner description="Generating reports needs a connection." kind="offline" title="You’re offline" />
          ) : null}
          <ReportIdentity report={report} />
          <SectionHeader
            action={step === "review" ? { label: "Edit", onPress: () => setStep("form") } : undefined}
            title="Check before generating"
          />
          <Card>
            <KV label="Report" value={report.title} />
            <KV label="Date range" value={rangeText(range)} />
            <KV label="Format" value="CSV file" />
            <KV label="Rows" value={`Up to ${report.rowLimit.toLocaleString("en-NG")}`} />
            <KV label="Kept" value="Private on this phone · 15 min" />
          </Card>
          {step === "submitting" ? (
            <Text className="text-center text-muted-foreground" variant="small">
              Generating · you can cancel while this runs
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="gap-[16px]">
          {offline ? (
            <StatusBanner description="Generating reports needs a connection." kind="offline" title="You’re offline" />
          ) : null}
          <ReportIdentity report={report} />
          <SectionHeader
            action={
              range.fromDate || range.toDate
                ? { label: "Clear", onPress: () => setRange({ fromDate: null, toDate: null }) }
                : undefined
            }
            title="Date range"
          />
          <DateRange onChange={setRange} value={range} />
          <SegmentedControl
            accessibilityLabel="Quick ranges"
            onChange={(value) => setRange(quickRange(value))}
            options={QUICK_RANGES.map(([value, label]) => ({ label, value }))}
            scrollable
            value={quick ?? ("" as never)}
            variant="pills"
          />
          <View className="gap-[10px] pt-[4px]">
            {[
              ["FileText", `CSV file · up to ${report.rowLimit.toLocaleString("en-NG")} rows`],
              ["Lock", "Saved privately on this phone for 15 minutes"],
            ].map(([icon, label]) => (
              <View className="flex-row items-center gap-[10px]" key={label}>
                <Icon className="size-[18px] text-muted-foreground" name={icon!} />
                <Text className="flex-1 text-muted-foreground" variant="small">
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </AppSheet>
  )
}

/** T23 screen 3 (01): one generated file, floating (no input). */
export function ReportFileSheet({
  file: current,
  offline,
  onCancel,
  onClose,
  onRetry,
  onShare,
}: {
  file: GeneratedReportFile | null
  offline: boolean
  onCancel: (file: GeneratedReportFile) => void
  onClose: () => void
  onRetry: (file: GeneratedReportFile) => void
  onShare: (file: GeneratedReportFile) => void
}) {
  const file = useLastPresent(current)
  if (!file) return null
  const look = FILE_LOOK[file.status]
  const generatedAt = new Date(file.generatedAt).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })
  return (
    <AppSheet
      footer={
        file.status === "ready" ? (
          <Button onPress={() => onShare(file)} testID="report-file-share">
            <Icon className="size-[18px] text-primary-foreground" name="Share" />
            <Text>Share</Text>
          </Button>
        ) : file.status === "pending" ? (
          <Button onPress={() => onCancel(file)} testID="report-file-cancel" variant="secondary">
            <Text>Cancel</Text>
          </Button>
        ) : (
          <Button disabled={offline} onPress={() => onRetry(file)} testID="report-file-retry">
            <Icon className="size-[18px] text-primary-foreground" name="RefreshCw" />
            <Text>{file.status === "failed" ? "Try again" : "Generate again"}</Text>
          </Button>
        )
      }
      insetFloatingFooter
      onClose={onClose}
      title={file.reportTitle}
      visible={Boolean(current)}
    >
      <View className="gap-[14px]">
        <View className="flex-row items-center gap-[12px]">
          <ReportTile icon={look.icon} tone={look.tone} />
          <StatusPill className="self-center" label={look.label} tone={look.pill} />
        </View>
        <View className="gap-[10px]">
          <KV label="Date range" value={rangeText(file.filterSnapshot ?? { fromDate: null, toDate: null })} />
          {file.rowCount !== null ? <KV label="Rows" value={`${file.rowCount} · CSV`} /> : null}
          <KV label="Generated" value={`${dayLabel(file.generatedAt)}, ${generatedAt}`} />
        </View>
        {file.status === "ready" ? (
          <Expiry expiresAt={file.expiresAt} note="Kept privately on this phone, then removed." />
        ) : file.status === "pending" ? (
          <Text className="text-muted-foreground" variant="small">
            Generating · you can cancel while this runs
          </Text>
        ) : file.status === "failed" ? (
          <StatusBanner description="Nothing was saved." kind="error" title={file.error ?? "The report could not be generated."} />
        ) : (
          <Text className="text-muted-foreground" variant="small">
            {file.status === "expired"
              ? "This copy was removed from your phone after 15 minutes."
              : "No file was saved."}
          </Text>
        )}
      </View>
    </AppSheet>
  )
}

const CLEAN: AdminReportActivityFilters = {
  action: null,
  area: null,
  entityType: null,
  fromDate: null,
  search: null,
  toDate: null,
}

/** T23 screen 5 (01): search, date range, action and record filters. */
export function ActivityFilterSheet({
  filters,
  onApply,
  onClose,
  visible,
}: {
  filters: AdminReportActivityFilters
  onApply: (filters: AdminReportActivityFilters) => void
  onClose: () => void
  visible: boolean
}) {
  const [draft, setDraft] = useState(filters)
  useEffect(() => {
    if (visible) setDraft(filters)
  }, [filters, visible])
  const dirty = JSON.stringify(draft) !== JSON.stringify(filters)
  return (
    <AppSheet
      dirty={dirty}
      footer={
        <View className="flex-row gap-[10px]">
          <Button onPress={() => setDraft(CLEAN)} testID="activity-filter-clear" variant="secondary">
            <Text>Clear</Text>
          </Button>
          <Button
            className="flex-1"
            onPress={() => onApply({ ...draft, search: draft.search?.trim() || null })}
            testID="activity-filter-apply"
          >
            <Text>Show results</Text>
          </Button>
        </View>
      }
      onClose={onClose}
      title="Filter activity"
      variant="form"
      visible={visible}
    >
      <View className="gap-[16px]">
        <FormField label="Search">
          <Input
            onChangeText={(search) => setDraft({ ...draft, search })}
            placeholder="Actor or action"
            returnKeyType="search"
            testID="activity-filter-search"
            value={draft.search ?? ""}
          />
        </FormField>
        <SectionHeader title="Date range" />
        <DateRange
          onChange={(range) => setDraft({ ...draft, ...range })}
          value={{ fromDate: draft.fromDate, toDate: draft.toDate }}
        />
        <SectionHeader title="Action" />
        <SegmentedControl
          accessibilityLabel="Action"
          onChange={(value) => setDraft({ ...draft, action: value || null })}
          options={ACTION_CHIPS.map(([value, label]) => ({ label, value: value ?? "" }))}
          scrollable
          value={draft.action ?? ""}
          variant="pills"
        />
        <SectionHeader title="Record" />
        <SegmentedControl
          accessibilityLabel="Record"
          onChange={(value) =>
            setDraft({ ...draft, area: (value || null) as AdminReportActivityFilters["area"] })
          }
          options={AREA_CHIPS.map(([value, label]) => ({ label, value: value ?? "" }))}
          scrollable
          value={draft.area ?? ""}
          variant="pills"
        />
      </View>
    </AppSheet>
  )
}

function Person({ label, name, role }: { label: string; name: string; role: string }) {
  const system = role === "Automated"
  return (
    <View className="flex-row items-center gap-[12px]">
      {system ? (
        <ReportTile icon="Settings" tone="neutral" />
      ) : (
        <TintedAvatar name={name} size={44} />
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-muted-foreground" variant="caption">
          {label}
        </Text>
        <Text numberOfLines={1} variant="label">
          {name}
        </Text>
        <Text className="text-muted-foreground" numberOfLines={1} variant="small">
          {role}
        </Text>
      </View>
    </View>
  )
}

/**
 * T23 screen 6 (01): who did it, who authorized it, the record and its change
 * lines. Opens from a row (seeded) or a notification (by id only).
 */
export function ActivityDetailSheet({
  enabled,
  eventId: currentId,
  onClose,
  seed,
}: {
  enabled: boolean
  eventId: string | null
  onClose: () => void
  seed?: AdminActivityEvent | null
}) {
  const eventId = useLastPresent(currentId)
  const query = useAppQuery({
    enabled: enabled && Boolean(currentId),
    networkMode: "always",
    placeholderData: seed?.id === eventId ? seed : undefined,
    queryFn: () => getAdminReportActivityEvent(eventId!),
    queryKey: reportKeys().event(eventId ?? ""),
    refetchOnScreenFocus: false,
  })
  if (!eventId) return null
  const event = query.data
  if (!event)
    return (
      <AppSheet onClose={onClose} title="Activity" visible={Boolean(currentId)}>
        {query.isError ? (
          <EmptyState
            action={{ label: "Try again", onPress: () => void query.refetch() }}
            description="It may have been removed, or the connection dropped."
            icon="CircleAlert"
            title="Couldn’t load this activity"
            tone="error"
          />
        ) : (
          <DetailSkeleton rows={4} />
        )}
      </AppSheet>
    )
  const tone = actionTone(event.action)
  const lines = event.metadataSummary
  const system = event.actorType !== "user"
  const authorized = event.authorizerLabel !== "Not recorded"
  return (
    <AppSheet onClose={onClose} title="Activity" visible={Boolean(currentId)}>
      <View className="gap-[16px]">
          <View className="items-center gap-[8px] pt-[8px]">
            <ReportTile
              icon={actionIcon(event.action)}
              tone={tone === "success" ? "success" : tone === "lilac" ? "lilac" : "brand"}
            />
            <Text className="text-center" variant="title">
              {event.actionLabel}
            </Text>
            <Text className="text-muted-foreground" variant="small">
              {dayLabel(event.occurredAt)} · {timeLabel(event.occurredAt)}
            </Text>
          </View>
          <Card className="gap-[14px]">
            <Person label="Done by" name={event.actorLabel} role={actorRole(event)} />
            {authorized ? (
              <Person label="Authorized by" name={event.authorizerLabel} role={event.authorizationRole} />
            ) : null}
            <View className="flex-row items-center gap-[12px]">
              <ReportTile icon="FileText" tone="neutral" />
              <View className="min-w-0 flex-1">
                <Text className="text-muted-foreground" variant="caption">
                  Record
                </Text>
                <Text numberOfLines={1} variant="label">
                  {event.entityLabel ?? event.entityType}
                  {event.entityId ? ` · ${event.entityId.slice(0, 8)}` : ""}
                </Text>
                <Text className="text-muted-foreground" variant="small">
                  {new Date(event.occurredAt).toLocaleString("en-GB", {
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </Card>
          {query.isPlaceholderData ? (
            <DetailSkeleton rows={2} />
          ) : lines.length ? (
            <>
              <SectionHeader title="Evidence" value={String(lines.length)} />
              <Card>
                {lines.map((line) => (
                  <View className="flex-row items-start gap-[10px]" key={line}>
                    <Icon className="mt-[2px] size-[16px] text-primary" name="Check" />
                    <Text className="flex-1" variant="small">
                      {line}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
          {system ? (
            <View className="flex-row items-center gap-[8px]">
              <Icon className="size-[14px] text-muted-foreground" name="Settings" />
              <Text className="text-muted-foreground" variant="caption">
                Recorded automatically by HalaalVest.
              </Text>
            </View>
          ) : null}
      </View>
    </AppSheet>
  )
}
