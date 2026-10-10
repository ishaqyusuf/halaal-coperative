import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { SectionCard } from "@/components/app/section-card"
import { ScreenHeader } from "@/components/app/screen-header"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type { GeneratedReportFile } from "@/features/admin-reports-access/public/generated-report-file"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { resolveDisplayTextScale } from "@/lib/mobile-accessibility-layout"
import {
  type MemberActivityHistoryState,
  type MobileMemberSectionRow,
  type MobileMemberStatement,
  type MobileMemberStatementSection,
} from "../model/member-core-types"
import { MemberActivityHistory } from "../public/member-activity-history"
import {
  formatMobileMetricValue,
  formatMobileStatementDetail,
} from "@/lib/mobile-metrics"
import { formatMobileStatus } from "@/lib/format-mobile-status"
import { cn } from "@/lib/utils"
import type { MobileProfile } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type TextStyle,
} from "react-native"

function scaledTextStyle(
  accessibilityScale: number,
  fontSize: number,
  lineHeight: number,
  overrides?: Pick<
    TextStyle,
    "color" | "fontWeight" | "letterSpacing" | "textTransform"
  >
) {
  return {
    fontSize: fontSize * accessibilityScale,
    lineHeight: lineHeight * accessibilityScale,
    ...overrides,
  }
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function formatSupportingMetric(
  metric: MobileMemberStatement["stats"][number],
  currencyCode: string
) {
  if (metric.format !== "currency") {
    return formatMobileMetricValue(metric, currencyCode)
  }

  const currencySymbol =
    new Intl.NumberFormat("en-NG", {
      currency: currencyCode,
      style: "currency",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currencyCode
  const absoluteValue = Math.abs(metric.value)
  const compactValue =
    absoluteValue >= 1_000_000
      ? `${Number((metric.value / 1_000_000).toFixed(2))}m`
      : absoluteValue >= 1_000
        ? `${Number((metric.value / 1_000).toFixed(1))}k`
        : new Intl.NumberFormat("en-NG", {
            maximumFractionDigits: 0,
          }).format(metric.value)

  return `${currencySymbol}${compactValue}`
}

function formatSupportingLabel(value: string) {
  return value.replace(/^active\s+/i, "")
}

function formatLeadMetric(
  metric: MobileMemberStatement["stats"][number],
  currencyCode: string
) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(metric.value)
}

function formatLeadDetail(value: string) {
  const contributionCount = value.match(/^(\d+) posted contribution entries$/i)
  if (!contributionCount) return value

  const count = Number(contributionCount[1])
  return `${count} ${count === 1 ? "contribution" : "contributions"}`
}

function formatStatementEmptyState(
  sectionKey: MobileMemberStatementSection["key"],
  fallback: string
) {
  return (
    {
      charges: "No charges yet.",
      commitments: "No commitment records yet.",
      documents: "No documents yet.",
      financing: "No financing records yet.",
      ledger: "No ledger entries yet.",
      profile: "No profile records yet.",
      receipts: "No receipts yet.",
      shares: "No share records yet.",
      support: "No support requests yet.",
    }[sectionKey] ?? fallback
  )
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded"

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatRowValue(row: MobileMemberSectionRow, currencyCode: string) {
  if (row.value === null || !row.format) return null

  return formatMobileMetricValue(
    {
      detail: row.detail,
      format: row.format,
      key: row.key,
      label: row.label,
      value: row.value,
    },
    currencyCode
  )
}

function StatementSection({
  accessibilityScale,
  currencyCode,
  largeTextLayout,
  section,
}: {
  accessibilityScale: number
  currencyCode: string
  largeTextLayout: boolean
  section: MobileMemberStatementSection
}) {
  const colors = useColors()
  const displayRows = section.rows
    .filter((row) => !row.key.endsWith("-empty"))
    .filter(
      (row) =>
        !(
          section.key === "charges" &&
          row.key === "pending-workflow-charges" &&
          (row.value ?? 0) === 0
        )
    )
  const recordCount = displayRows.length

  return (
    <View className="gap-2">
      <View
        className={cn(
          "gap-1",
          largeTextLayout
            ? "items-start"
            : "flex-row items-baseline justify-between"
        )}
      >
        <Text
          allowFontScaling={false}
          className="text-lg font-extrabold text-foreground"
          style={scaledTextStyle(accessibilityScale, 18, 24, {
            color: colors.foreground,
            fontWeight: "800",
          })}
        >
          {section.title}
        </Text>
        {recordCount > 0 ? (
          <Text
            allowFontScaling={false}
            className="text-xs font-semibold text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 12, 16, {
              color: colors.mutedForeground,
              fontWeight: "600",
            })}
          >
            {recordCount} {recordCount === 1 ? "record" : "records"}
          </Text>
        ) : null}
      </View>
      <View className="border-y border-border">
        {displayRows.length > 0 ? (
          displayRows.map((row, index) => {
            const formattedValue = formatRowValue(row, currencyCode)
            const displayDetail = formatMobileStatementDetail(row.detail)
            const statusLabel =
              section.key === "profile" && row.key === "membership-dates"
                ? `${formatMobileStatus(row.status ?? "not_started")} KYC`
                : row.status
                  ? formatMobileStatus(row.status)
                  : null

            return (
              <View
                className={
                  index === displayRows.length - 1
                    ? "gap-2 py-4"
                    : "gap-2 border-b border-border py-4"
                }
                key={row.key}
              >
                <View
                  className={cn(
                    "gap-2",
                    largeTextLayout
                      ? "items-start"
                      : "flex-row items-start justify-between"
                  )}
                >
                  <View
                    className={cn(
                      "min-w-0 gap-1",
                      largeTextLayout ? "w-full" : "flex-1"
                    )}
                  >
                    <Text
                      allowFontScaling={false}
                      className="text-sm font-bold text-foreground"
                      style={scaledTextStyle(accessibilityScale, 14, 20, {
                        color: colors.foreground,
                        fontWeight: "700",
                      })}
                    >
                      {row.label}
                    </Text>
                    <Text
                      allowFontScaling={false}
                      accessibilityLabel={displayDetail}
                      className="text-sm leading-5 text-muted-foreground"
                      style={scaledTextStyle(accessibilityScale, 14, 20, {
                        color: colors.mutedForeground,
                      })}
                    >
                      {displayDetail}
                    </Text>
                  </View>
                  {formattedValue ? (
                    <Text
                      allowFontScaling={false}
                      className={cn(
                        "text-sm font-extrabold text-foreground",
                        largeTextLayout && "self-start"
                      )}
                      style={scaledTextStyle(accessibilityScale, 14, 20, {
                        color: colors.foreground,
                        fontWeight: "800",
                      })}
                    >
                      {formattedValue}
                    </Text>
                  ) : null}
                </View>
                {statusLabel ? (
                  <View className="items-start">
                    <StatusBadge
                      label={statusLabel}
                      textScale={largeTextLayout ? accessibilityScale : undefined}
                      tone={getStatusBadgeTone(row.status ?? statusLabel)}
                      wrap={largeTextLayout}
                    />
                  </View>
                ) : null}
              </View>
            )
          })
        ) : (
          <Text
            allowFontScaling={false}
            className="py-4 text-sm leading-5 text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.mutedForeground,
            })}
          >
            {formatStatementEmptyState(section.key, section.emptyState)}
          </Text>
        )}
      </View>
    </View>
  )
}

export type StatementScreenProps = {
  activity: MemberActivityHistoryState
  canUseServerStatement: boolean
  error: string | null
  exportEnabled: boolean
  generatedFile: GeneratedReportFile | null
  isLoading: boolean
  onCancelExport: () => void
  onGenerateExport: () => void
  onRetryExport: () => void
  onShareExport: () => void
  profile: MobileProfile
  statement: MobileMemberStatement | null
}

function statementFileStatus(status: GeneratedReportFile["status"]) {
  return {
    cancelled: { label: "Cancelled", tone: "bg-muted-foreground" },
    expired: { label: "Expired", tone: "bg-warn" },
    failed: { label: "Failed", tone: "bg-destructive" },
    pending: { label: "Generating", tone: "bg-brand" },
    ready: { label: "Ready", tone: "bg-success" },
  }[status]
}

function StatementExportRow({
  accessibilityScale,
  file,
  largeTextLayout,
  onPress,
}: {
  accessibilityScale: number
  file: GeneratedReportFile
  largeTextLayout: boolean
  onPress: () => void
}) {
  const colors = useColors()
  const status = statementFileStatus(file.status)
  return (
    <Pressable
      accessibilityLabel={`Member statement file. ${status.label}.`}
      accessibilityRole="button"
      className={cn(
        "min-h-[68px] gap-3 border-y border-border py-3 active:bg-secondary/60",
        largeTextLayout ? "items-start" : "flex-row items-center"
      )}
      onPress={onPress}
    >
      <View className={cn("size-2.5 rounded-full", status.tone)} />
      <View
        className={cn(
          "min-w-0 gap-0.5",
          largeTextLayout ? "w-full" : "flex-1"
        )}
      >
        <Text
          allowFontScaling={false}
          className="text-sm font-extrabold text-foreground"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "800",
          })}
        >
          Statement file
        </Text>
        <Text
          allowFontScaling={false}
          className="text-xs text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 16, {
            color: colors.mutedForeground,
          })}
        >
          {status.label}
          {file.rowCount !== null ? ` · ${file.rowCount} rows` : ""}
        </Text>
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

function StatementExportSheet({
  enabled,
  file,
  onCancel,
  onClose,
  onGenerate,
  onRetry,
  onShare,
  visible,
}: {
  enabled: boolean
  file: GeneratedReportFile | null
  onCancel: () => void
  onClose: () => void
  onGenerate: () => void
  onRetry: () => void
  onShare: () => void
  visible: boolean
}) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const retryable = file && ["cancelled", "expired", "failed"].includes(file.status)
  const status = file ? statementFileStatus(file.status) : null
  return (
    <FloatingBottomSheet
      accessibilityLabel="Member statement export"
      footer={
        <View
          className={cn(
            "gap-3 px-5 py-4",
            largeTextLayout ? "flex-col" : "flex-row"
          )}
        >
          {!file ? (
            <Button
              className={cn(!largeTextLayout && "flex-1")}
              disabled={!enabled}
              onPress={onGenerate}
            >
              <Icon className="size-sm" name="Download" />
              <Text
                allowFontScaling={false}
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.primaryForeground,
                  fontWeight: "500",
                })}
              >
                Generate
              </Text>
            </Button>
          ) : null}
          {file?.status === "pending" ? (
            <Button
              className={cn(!largeTextLayout && "flex-1")}
              onPress={onCancel}
              variant="outline"
            >
              <Text
                allowFontScaling={false}
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.foreground,
                  fontWeight: "500",
                })}
              >
                Cancel
              </Text>
            </Button>
          ) : null}
          {file?.status === "ready" ? (
            <Button
              className={cn(!largeTextLayout && "flex-1")}
              onPress={onShare}
            >
              <Icon className="size-sm" name="Share2" />
              <Text
                allowFontScaling={false}
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.primaryForeground,
                  fontWeight: "500",
                })}
              >
                Share
              </Text>
            </Button>
          ) : null}
          {retryable ? (
            <Button
              className={cn(!largeTextLayout && "flex-1")}
              disabled={!enabled}
              onPress={onRetry}
            >
              <Icon className="size-sm" name="RefreshCw" />
              <Text
                allowFontScaling={false}
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.primaryForeground,
                  fontWeight: "500",
                })}
              >
                Retry
              </Text>
            </Button>
          ) : null}
          <Button
            className={cn(!largeTextLayout && "flex-1")}
            onPress={onClose}
            variant="outline"
          >
            <Text
              allowFontScaling={false}
              style={scaledTextStyle(accessibilityScale, 14, 20, {
                color: colors.foreground,
                fontWeight: "500",
              })}
            >
              Close
            </Text>
          </Button>
        </View>
      }
      onClose={onClose}
      presentation="compact"
      scrollable="auto"
      title="Export statement"
      visible={visible}
    >
      <View className="gap-4 px-5 pb-3">
        {status ? (
          <View
            className={cn(
              "gap-2 border-y border-border py-4",
              largeTextLayout ? "items-start" : "flex-row items-center"
            )}
          >
            <View className={cn("size-2.5 rounded-full", status.tone)} />
            <Text
              allowFontScaling={false}
              className="text-sm font-extrabold text-foreground"
              style={scaledTextStyle(accessibilityScale, 14, 20, {
                color: colors.foreground,
                fontWeight: "800",
              })}
            >
              {status.label}
            </Text>
            {file?.rowCount !== null ? (
              <Text
                allowFontScaling={false}
                className="text-sm text-muted-foreground"
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.mutedForeground,
                })}
              >
                · {file?.rowCount} rows
              </Text>
            ) : null}
          </View>
        ) : null}
        {file?.status === "pending" ? <LoadingSpinner /> : null}
        {file?.error ? (
          <Text
            allowFontScaling={false}
            className="text-sm leading-5 text-destructive"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.destructive,
            })}
          >
            {file.error}
          </Text>
        ) : null}
        <Text
          allowFontScaling={false}
          className="text-xs leading-5 text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 20, {
            color: colors.mutedForeground,
          })}
        >
          {file?.status === "ready"
            ? "Expires in 15 minutes."
            : file?.status === "expired"
              ? "Generate a new file to continue."
              : file?.status === "failed"
                ? "No file was saved."
                : file?.status === "cancelled"
                  ? "No file was saved."
                  : "Saved privately on this device."}
        </Text>
      </View>
    </FloatingBottomSheet>
  )
}

export function StatementScreen({
  activity,
  canUseServerStatement,
  error,
  exportEnabled,
  generatedFile,
  isLoading,
  onCancelExport,
  onGenerateExport,
  onRetryExport,
  onShareExport,
  profile,
  statement,
}: StatementScreenProps) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const router = useRouter()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const displayTextScale = resolveDisplayTextScale(fontScale)
  const [exportVisible, setExportVisible] = useState(false)
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const summary = useMemo(() => {
    const metrics = statement?.stats ?? []
    const leadMetric =
      metrics.find((metric) =>
        metric.label.toLowerCase().includes("savings")
      ) ?? metrics[0]

    return {
      lead: leadMetric
        ? {
            ...leadMetric,
            displayValue: formatLeadMetric(leadMetric, currencyCode),
          }
        : null,
      supporting: metrics
        .filter((metric) => metric.key !== leadMetric?.key)
        .slice(0, 3)
        .map((metric) => ({
          ...metric,
          displayLabel: formatSupportingLabel(metric.label),
          displayValue: formatSupportingMetric(metric, currencyCode),
        })),
    }
  }, [currencyCode, statement?.stats])

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <ScreenHeader
          action={
            canUseServerStatement ? (
              <Button
                accessibilityLabel="Open statement export"
                onPress={() => setExportVisible(true)}
                size="icon"
                variant="outline"
              >
                <Icon className="size-base text-foreground" name="Download" />
              </Button>
            ) : undefined
          }
          leading={<ScreenBackButton onPress={() => router.back()} />}
          title="Statement"
        />

        {!canUseServerStatement ? (
          <SectionCard icon="FileText" title="Statement">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to view your statement.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerStatement ? (
          <>
            <CachedReadBanner cache={statement?.cache} label="statement data" />

            {generatedFile ? (
              <StatementExportRow
                accessibilityScale={accessibilityScale}
                file={generatedFile}
                largeTextLayout={largeTextLayout}
                onPress={() => setExportVisible(true)}
              />
            ) : null}

            {summary.lead ? (
              <View className="gap-2 border-b border-border pb-5">
                <Text
                  allowFontScaling={false}
                  className="text-xs font-extrabold tracking-[0.6px] text-muted-foreground uppercase"
                  style={scaledTextStyle(accessibilityScale, 12, 16, {
                    color: colors.mutedForeground,
                    fontWeight: "800",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                  })}
                >
                  {summary.lead.label}
                </Text>
                <Text
                  allowFontScaling={false}
                  className="text-[40px] leading-[44px] font-black tracking-[-1.2px] text-foreground"
                  style={{
                    color: colors.foreground,
                    fontSize: 40 * displayTextScale,
                    fontWeight: "900",
                    lineHeight: 44 * displayTextScale,
                  }}
                >
                  {summary.lead.displayValue}
                </Text>
                <Text
                  allowFontScaling={false}
                  className="text-sm leading-5 text-muted-foreground"
                  style={scaledTextStyle(accessibilityScale, 14, 20, {
                    color: colors.mutedForeground,
                  })}
                >
                  {formatLeadDetail(summary.lead.detail)}
                </Text>
              </View>
            ) : null}

            {summary.supporting.length > 0 ? (
              <View
                className={cn(
                  "border-b border-border",
                  largeTextLayout ? "border-t" : "flex-row"
                )}
              >
                {summary.supporting.map((metric, index) => (
                  <View
                    className={cn(
                      "min-w-0 gap-1 py-3",
                      largeTextLayout
                        ? index < summary.supporting.length - 1 &&
                            "border-b border-border"
                        : index === 0
                          ? "flex-1 pr-3"
                          : "flex-1 border-l border-border px-3"
                    )}
                    key={metric.key}
                  >
                    <Text
                      allowFontScaling={false}
                      className="text-[10px] font-extrabold tracking-[0.45px] text-muted-foreground uppercase"
                      numberOfLines={largeTextLayout ? undefined : 1}
                      style={scaledTextStyle(accessibilityScale, 10, 14, {
                        color: colors.mutedForeground,
                        fontWeight: "800",
                        letterSpacing: 0.45,
                        textTransform: "uppercase",
                      })}
                    >
                      {metric.displayLabel}
                    </Text>
                    <Text
                      allowFontScaling={false}
                      className="text-base font-extrabold text-foreground"
                      numberOfLines={largeTextLayout ? undefined : 1}
                      style={scaledTextStyle(accessibilityScale, 16, 22, {
                        color: colors.foreground,
                        fontWeight: "800",
                      })}
                    >
                      {metric.displayValue}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {statement?.member ? (
              <View
                className={cn(
                  "gap-3 border-b border-border py-4",
                  largeTextLayout ? "items-start" : "flex-row items-center"
                )}
              >
                <View className="size-11 items-center justify-center rounded-full bg-accent">
                  <Text
                    allowFontScaling={false}
                    className="text-sm font-extrabold text-accent-foreground"
                    style={scaledTextStyle(accessibilityScale, 14, 20, {
                      color: colors.accentForeground,
                      fontWeight: "800",
                    })}
                  >
                    {getInitials(statement.member.name)}
                  </Text>
                </View>
                <View
                  className={cn(
                    "min-w-0 gap-1",
                    largeTextLayout ? "w-full" : "flex-1"
                  )}
                >
                  <Text
                    allowFontScaling={false}
                    className="font-extrabold text-foreground"
                    style={scaledTextStyle(accessibilityScale, 16, 24, {
                      color: colors.foreground,
                      fontWeight: "800",
                    })}
                  >
                    {statement.member.name}
                  </Text>
                  <Text
                    allowFontScaling={false}
                    className="text-xs leading-5 text-muted-foreground"
                    style={scaledTextStyle(accessibilityScale, 12, 20, {
                      color: colors.mutedForeground,
                    })}
                  >
                    {statement.member.memberNumber} · joined{" "}
                    {formatDate(statement.member.joinedAt)}
                  </Text>
                </View>
                <View
                  className={cn(
                    "gap-1.5",
                    largeTextLayout
                      ? "w-full flex-row flex-wrap items-start"
                      : "items-end"
                  )}
                >
                  <StatusBadge
                    label={formatStatus(statement.member.status)}
                    textScale={largeTextLayout ? accessibilityScale : undefined}
                    tone={getStatusBadgeTone(statement.member.status)}
                    wrap={largeTextLayout}
                  />
                  <StatusBadge
                    label={`${formatStatus(statement.member.kycStatus)} KYC`}
                    textScale={largeTextLayout ? accessibilityScale : undefined}
                    tone={getStatusBadgeTone(statement.member.kycStatus)}
                    wrap={largeTextLayout}
                  />
                </View>
              </View>
            ) : null}

            {error ? (
              <Text
                allowFontScaling={false}
                className="text-sm font-medium text-destructive"
                style={scaledTextStyle(accessibilityScale, 14, 20, {
                  color: colors.destructive,
                  fontWeight: "500",
                })}
              >
                {error}
              </Text>
            ) : null}

            {statement ? (
              <MemberActivityHistory
                compactEmpty
                currencyCode={currencyCode}
                emptyDescription="Posted ledger activity will appear here."
                flat
                history={activity}
                inline
                title="Recent activity"
              />
            ) : null}

            {isLoading ? (
              <SectionCard icon="LoaderCircle" title="Statement">
                <LoadingSpinner />
              </SectionCard>
            ) : statement?.sections.length ? (
              statement.sections.map((section) => (
                <StatementSection
                  accessibilityScale={accessibilityScale}
                  currencyCode={currencyCode}
                  key={section.key}
                  largeTextLayout={largeTextLayout}
                  section={section}
                />
              ))
            ) : (
              <SectionCard icon="FileText" title="Statement">
                <EmptyState
                  description="Statement sections will appear here when member records are available."
                  icon="FileText"
                  title="No statement detail"
                />
              </SectionCard>
            )}

          </>
        ) : null}
      </ScrollView>
      <StatementExportSheet
        enabled={exportEnabled}
        file={generatedFile}
        onCancel={onCancelExport}
        onClose={() => setExportVisible(false)}
        onGenerate={onGenerateExport}
        onRetry={onRetryExport}
        onShare={onShareExport}
        visible={exportVisible}
      />
    </SafeArea>
  )
}
