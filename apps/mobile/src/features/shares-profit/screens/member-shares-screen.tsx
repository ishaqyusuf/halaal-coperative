import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { MemberActivityHistory } from "@/features/member-core/public/member-activity-history"
import type {
  MemberActivityHistoryState,
  MobileMemberSectionRow,
} from "@/features/member-core/public/member-core-types"
import { ScreenHeader } from "@/components/app/screen-header"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import {
  type MobileMemberShareApplication,
  type MobileMemberShareApplicationCreateInput,
  type MobileMemberShares,
} from "../model/member-shares-types"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import type { MobileProfile } from "@/lib/session-store"
import { cn } from "@/lib/utils"
import { useMemo, useRef, useState } from "react"
import {
  Keyboard,
  ScrollView,
  useWindowDimensions,
  View,
  type TextStyle,
} from "react-native"
import {
  describeOptionalShareUnits,
  formatShareUnitCount,
} from "../model/member-shares-presentation"

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function scaledTextStyle(
  accessibilityScale: number,
  fontSize: number,
  lineHeight: number,
  overrides?: Pick<TextStyle, "color" | "fontWeight" | "letterSpacing">
) {
  return {
    fontSize: fontSize * accessibilityScale,
    lineHeight: lineHeight * accessibilityScale,
    ...overrides,
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
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

function stateMessage(shares: MobileMemberShares | null) {
  if (!shares) return null

  if (shares.state === "database_unavailable") {
    return "Share self-service needs the database runtime."
  }

  if (shares.state === "member_profile_missing") {
    return "Your account is not linked to a member profile yet."
  }

  if (shares.state === "unit_model_inactive") {
    return "Optional unit share requests are available only when the cooperative selects unit-based shareholding."
  }

  return null
}

function ApplicationRow({
  accessibilityScale,
  application,
  currencyCode,
  largeTextLayout,
}: {
  accessibilityScale: number
  application: MobileMemberShareApplication
  currencyCode: string
  largeTextLayout: boolean
}) {
  const colors = useColors()

  return (
    <View className="gap-2 border-b border-border py-4">
      <View
        className={cn(
          "gap-2",
          largeTextLayout
            ? "items-start"
            : "flex-row items-start justify-between"
        )}
      >
        <View
          className={cn("min-w-0 gap-1", largeTextLayout ? "w-full" : "flex-1")}
        >
          <Text
            allowFontScaling={false}
            className="text-sm font-semibold text-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.foreground,
              fontWeight: "600",
            })}
          >
            {formatShareUnitCount(application.requestedUnits)} requested
          </Text>
          <Text
            allowFontScaling={false}
            className="text-sm leading-5 text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.mutedForeground,
            })}
          >
            {formatCurrency(application.shareValueSnapshot, currencyCode)} ·{" "}
            {formatCurrency(application.unitAmountSnapshot, currencyCode)} each
          </Text>
        </View>
        <StatusBadge
          label={formatStatus(application.status)}
          textScale={largeTextLayout ? accessibilityScale : undefined}
          tone={getStatusBadgeTone(application.status)}
          wrap={largeTextLayout}
        />
      </View>
      <Text
        allowFontScaling={false}
        className="text-xs font-medium text-muted-foreground"
        style={scaledTextStyle(accessibilityScale, 12, 18, {
          color: colors.mutedForeground,
          fontWeight: "500",
        })}
      >
        Requested {formatDate(application.createdAt)}
      </Text>
      {application.notes ? (
        <Text
          allowFontScaling={false}
          className="text-sm leading-5 text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.mutedForeground,
          })}
        >
          {application.notes}
        </Text>
      ) : null}
      {application.reviewNotes ? (
        <View className="border-brand gap-1 border-l-2 pl-3">
          <Text
            allowFontScaling={false}
            className="text-xs font-medium text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 12, 18, {
              color: colors.mutedForeground,
              fontWeight: "500",
            })}
          >
            Review note
          </Text>
          <Text
            allowFontScaling={false}
            className="text-sm leading-5 text-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.foreground,
            })}
          >
            {application.reviewNotes}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function SectionHeading({
  accessibilityScale,
  largeTextLayout,
  meta,
  title,
}: {
  accessibilityScale: number
  largeTextLayout: boolean
  meta?: string
  title: string
}) {
  const colors = useColors()

  return (
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
        className="text-xl font-extrabold tracking-tight text-foreground"
        style={scaledTextStyle(accessibilityScale, 20, 26, {
          color: colors.foreground,
          fontWeight: "800",
          letterSpacing: -0.35,
        })}
      >
        {title}
      </Text>
      {meta ? (
        <Text
          allowFontScaling={false}
          className="text-xs font-semibold text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 18, {
            color: colors.mutedForeground,
            fontWeight: "600",
          })}
        >
          {meta}
        </Text>
      ) : null}
    </View>
  )
}

function PositionRow({
  accessibilityScale,
  detail,
  label,
  largeTextLayout,
  value,
}: {
  accessibilityScale: number
  detail: string
  label: string
  largeTextLayout: boolean
  value: string
}) {
  const colors = useColors()

  return (
    <View
      className={cn(
        "gap-2 border-b border-border py-4",
        largeTextLayout
          ? "items-start"
          : "min-h-16 flex-row items-center justify-between"
      )}
    >
      <View
        className={cn("min-w-0 gap-0.5", largeTextLayout ? "w-full" : "flex-1")}
      >
        <Text
          allowFontScaling={false}
          className="text-sm font-semibold text-foreground"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "600",
          })}
        >
          {label}
        </Text>
        <Text
          allowFontScaling={false}
          className="text-xs leading-5 text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 20, {
            color: colors.mutedForeground,
          })}
        >
          {detail}
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        className="text-base font-extrabold text-foreground"
        style={scaledTextStyle(accessibilityScale, 16, 22, {
          color: colors.foreground,
          fontWeight: "800",
        })}
      >
        {value}
      </Text>
    </View>
  )
}

function EvidenceRow({
  accessibilityScale,
  currencyCode,
  largeTextLayout,
  row,
}: {
  accessibilityScale: number
  currencyCode: string
  largeTextLayout: boolean
  row: MobileMemberSectionRow
}) {
  const colors = useColors()
  const formattedValue = formatRowValue(row, currencyCode)

  return (
    <View className="gap-1.5 border-b border-border py-4">
      <View
        className={cn(
          "gap-2",
          largeTextLayout
            ? "items-start"
            : "flex-row items-start justify-between"
        )}
      >
        <Text
          allowFontScaling={false}
          className={cn(
            "min-w-0 text-sm font-semibold text-foreground",
            largeTextLayout ? "w-full" : "flex-1"
          )}
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "600",
          })}
        >
          {row.label}
        </Text>
        {formattedValue ? (
          <Text
            allowFontScaling={false}
            className="text-sm font-extrabold text-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.foreground,
              fontWeight: "800",
            })}
          >
            {formattedValue}
          </Text>
        ) : null}
      </View>
      <Text
        allowFontScaling={false}
        className="text-xs leading-5 text-muted-foreground"
        style={scaledTextStyle(accessibilityScale, 12, 20, {
          color: colors.mutedForeground,
        })}
      >
        {row.detail}
      </Text>
      {row.status ? (
        <View className="items-start pt-1">
          <StatusBadge
            label={formatStatus(row.status)}
            textScale={largeTextLayout ? accessibilityScale : undefined}
            tone={getStatusBadgeTone(row.status)}
            wrap={largeTextLayout}
          />
        </View>
      ) : null}
    </View>
  )
}

function FormSummaryMetric({
  accessibilityScale,
  label,
  largeTextLayout,
  position,
  value,
}: {
  accessibilityScale: number
  label: string
  largeTextLayout: boolean
  position: "first" | "middle" | "last"
  value: string
}) {
  const colors = useColors()

  return (
    <View
      className={cn(
        "gap-1",
        largeTextLayout ? "py-3" : "flex-1 py-1",
        position !== "last" && largeTextLayout && "border-b border-border",
        position === "first" &&
          !largeTextLayout &&
          "border-r border-border pr-3",
        position === "middle" &&
          !largeTextLayout &&
          "border-r border-border px-3",
        position === "last" && !largeTextLayout && "pl-3"
      )}
    >
      <Text
        allowFontScaling={false}
        className="text-xs font-medium text-muted-foreground"
        style={scaledTextStyle(accessibilityScale, 12, 18, {
          color: colors.mutedForeground,
          fontWeight: "500",
        })}
      >
        {label}
      </Text>
      <Text
        allowFontScaling={false}
        className="text-lg font-extrabold text-foreground"
        style={scaledTextStyle(accessibilityScale, 18, 24, {
          color: colors.foreground,
          fontWeight: "800",
        })}
      >
        {value}
      </Text>
    </View>
  )
}

export type SharesScreenProps = {
  activity: MemberActivityHistoryState
  applicationHistoryError: string | null
  canUseServerShares: boolean
  error: string | null
  hasMoreApplications: boolean
  isLoading: boolean
  isLoadingMoreApplications: boolean
  isSubmitting: boolean
  onLoadMoreApplications: () => Promise<void>
  onSubmit: (input: MobileMemberShareApplicationCreateInput) => Promise<unknown>
  profile: MobileProfile
  shares: MobileMemberShares | null
}

export function SharesScreen({
  activity,
  applicationHistoryError,
  canUseServerShares,
  error,
  hasMoreApplications,
  isLoading,
  isLoadingMoreApplications,
  isSubmitting,
  onLoadMoreApplications,
  onSubmit,
  profile,
  shares,
}: SharesScreenProps) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [requestedUnits, setRequestedUnits] = useState("1")
  const [notes, setNotes] = useState("")
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const queuedSuccessRef = useRef<string | null>(null)
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleShares = isMobileReadCacheStale(shares?.cache)
  const shareDraft = useMemo(
    () => ({
      notes,
      requestedUnits,
    }),
    [notes, requestedUnits]
  )
  const clearShareDraft = useMobileFormDraft({
    enabled: canUseServerShares,
    key: "member.shares.create",
    onHydrate: (draft) => {
      setRequestedUnits(draft.requestedUnits)
      setNotes(draft.notes)
    },
    value: shareDraft,
  })
  const requestedUnitCount = Number(requestedUnits.trim())
  const remainingOptionalUnits = shares?.position?.remainingOptionalUnits ?? 0
  const canRequestOptionalShares = Boolean(
    shares?.state === "available" &&
    shares.position &&
    shares.policy &&
    remainingOptionalUnits > 0
  )
  const canSubmit = Boolean(
    canRequestOptionalShares &&
    Number.isInteger(requestedUnitCount) &&
    requestedUnitCount > 0 &&
    requestedUnitCount <= remainingOptionalUnits &&
    !hasStaleShares
  )
  const requestedValue =
    canSubmit && shares?.policy
      ? requestedUnitCount * shares.policy.unitAmount
      : 0
  const hasShareDraft = Boolean(requestedUnits.trim() !== "1" || notes.trim())
  const reviewRows = [
    {
      detail: "Optional share units",
      icon: "PieChart",
      label: "Requested units",
      value: Number.isInteger(requestedUnitCount)
        ? String(requestedUnitCount)
        : "Not set",
    },
    {
      detail: "Calculated from server-provided unit amount",
      icon: "CircleDollarSign",
      label: "Request value",
      value: formatCurrency(requestedValue, currencyCode),
    },
    ...(notes.trim()
      ? [
          {
            detail: "Context sent with this request",
            icon: "MessageSquareText",
            label: "Request context",
            value: notes.trim(),
          },
        ]
      : []),
  ]
  const publishedDividendRows =
    shares?.section.rows.filter((row) => row.key.startsWith("dividend-")) ?? []
  const message = stateMessage(shares)

  async function handleSubmit() {
    if (hasStaleShares) {
      setLocalError("Refresh share data before submitting a request.")
      return
    }

    if (!canSubmit || isSubmitting) return

    setLocalError(null)
    setSuccess(null)

    try {
      await onSubmit({
        notes: notes.trim() || undefined,
        requestedUnits: requestedUnitCount,
      })
      await clearShareDraft()
      queuedSuccessRef.current = "Share request submitted for review."
      setIsReviewingSubmit(false)
    } catch (submissionError) {
      setLocalError(
        submissionError instanceof Error
          ? submissionError.message
          : "Share request could not be submitted."
      )
      setIsReviewingSubmit(false)
    }
  }

  if (!canUseServerShares) {
    return (
      <SafeArea style={{ backgroundColor: colors.background }}>
        <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
          <ScreenHeader title="Shares" />
          <EmptyState
            description="Your share position is unavailable in this session."
            icon="CircleAlert"
            title="Shares unavailable"
          />
        </ScrollView>
      </SafeArea>
    )
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <ScreenHeader title="Shares" />

        <CachedReadBanner cache={shares?.cache} label="share data" />

        {isLoading ? <LoadingSpinner /> : null}

        {(message ?? error) ? (
          <View className="flex-row items-start gap-3 border-y border-border py-4">
            <View className="size-9 items-center justify-center rounded-full bg-accent">
              <Icon className="size-sm text-accent-foreground" name="Info" />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-semibold text-foreground">
                Share requests
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {message ?? error}
              </Text>
            </View>
          </View>
        ) : null}

        {shares?.position ? (
          <>
            <View className="gap-4 border-y border-border py-4">
              <View className="gap-2">
                <Text
                  allowFontScaling={false}
                  className="text-xs font-extrabold tracking-[1.2px] text-muted-foreground uppercase"
                  style={scaledTextStyle(accessibilityScale, 12, 18, {
                    color: colors.mutedForeground,
                    fontWeight: "800",
                    letterSpacing: 1.2,
                  })}
                >
                  Approved share capital
                </Text>
                <Text
                  allowFontScaling={false}
                  className="text-[36px] leading-[40px] font-extrabold tracking-tight text-foreground"
                  style={scaledTextStyle(accessibilityScale, 36, 40, {
                    color: colors.foreground,
                    fontWeight: "800",
                    letterSpacing: -1.2,
                  })}
                >
                  {formatCurrency(
                    shares.position.totalApprovedValue,
                    currencyCode
                  )}
                </Text>
              </View>
              <View
                className={cn(
                  "gap-2",
                  largeTextLayout
                    ? "items-start"
                    : "flex-row items-center justify-between"
                )}
              >
                <Text
                  allowFontScaling={false}
                  className="text-sm font-semibold text-muted-foreground"
                  style={scaledTextStyle(accessibilityScale, 14, 20, {
                    color: colors.mutedForeground,
                    fontWeight: "600",
                  })}
                >
                  {formatShareUnitCount(shares.position.totalApprovedUnits)}
                  {" approved"}
                </Text>
                <StatusBadge
                  label="Posted"
                  textScale={largeTextLayout ? accessibilityScale : undefined}
                  tone="success"
                  wrap={largeTextLayout}
                />
              </View>
            </View>

            <View className="gap-2">
              <SectionHeading
                accessibilityScale={accessibilityScale}
                largeTextLayout={largeTextLayout}
                meta={`Maximum ${shares.position.maximumUnits}`}
                title="Your position"
              />
              <View className="border-t border-border">
                <PositionRow
                  accessibilityScale={accessibilityScale}
                  detail="Required ownership"
                  label="Compulsory units"
                  largeTextLayout={largeTextLayout}
                  value={String(shares.position.compulsoryUnits)}
                />
                <PositionRow
                  accessibilityScale={accessibilityScale}
                  detail={describeOptionalShareUnits(
                    shares.position.pendingOptionalUnits
                  )}
                  label="Optional units"
                  largeTextLayout={largeTextLayout}
                  value={String(shares.position.approvedOptionalUnits)}
                />
              </View>
            </View>
          </>
        ) : null}

        {shares?.state === "available" && shares.position && shares.policy ? (
          <>
            <Button
              accessibilityHint="Opens a keyboard-safe optional share form"
              className="h-12"
              onPress={() => setIsFormVisible(true)}
            >
              <Text>
                {hasShareDraft
                  ? "Continue share request"
                  : "Request optional shares"}
              </Text>
            </Button>
            <FullScreenFormSheet
              dirty={hasShareDraft}
              footer={
                <View className="flex-row items-center gap-3">
                  {(localError ?? error) || isReviewingSubmit ? null : (
                    <DevQuickFill
                      label="Quick fill share request"
                      onPress={() => {
                        setRequestedUnits(
                          mobileDevQuickFill.shareRequest.requestedUnits
                        )
                        setNotes(mobileDevQuickFill.shareRequest.notes)
                      }}
                      placement="footer"
                      portal={false}
                    />
                  )}
                  <Button
                    className="h-12 flex-1"
                    disabled={!canSubmit || isSubmitting}
                    onPress={() => {
                      Keyboard.dismiss()
                      setIsReviewingSubmit(true)
                    }}
                  >
                    <Icon
                      name="Send"
                      className="size-base text-primary-foreground"
                    />
                    <Text>
                      {isSubmitting ? "Submitting" : "Review request"}
                    </Text>
                  </Button>
                </View>
              }
              isSubmitting={isSubmitting}
              onClose={() => setIsFormVisible(false)}
              onDismissed={() => {
                if (!queuedSuccessRef.current) return
                setSuccess(queuedSuccessRef.current)
                queuedSuccessRef.current = null
              }}
              overlayActive={isReviewingSubmit}
              overlay={
                <SubmissionReviewSheet
                  confirmLabel="Submit request"
                  description="Confirm the units and request value."
                  isSubmitting={isSubmitting}
                  onClose={() => setIsReviewingSubmit(false)}
                  onConfirm={handleSubmit}
                  onDismissed={() => {
                    if (!queuedSuccessRef.current) return
                    setRequestedUnits("1")
                    setNotes("")
                    setIsFormVisible(false)
                  }}
                  rows={reviewRows}
                  title="Review share request"
                  visible={isReviewingSubmit}
                />
              }
              title="Request optional shares"
              visible={isFormVisible}
            >
              <View className="gap-5">
                {hasStaleShares ? (
                  <View className="border-warn border-l-2 pl-3">
                    <Text className="text-warn text-sm leading-5 font-semibold">
                      Refresh share data before submitting this request.
                    </Text>
                  </View>
                ) : null}
                {(localError ?? error) ? (
                  <View className="border-l-2 border-destructive pl-3">
                    <Text className="text-sm leading-5 font-semibold text-destructive">
                      {localError ?? error}
                    </Text>
                  </View>
                ) : null}

                <View
                  className={cn(
                    "border-y border-border",
                    largeTextLayout ? "py-1" : "flex-row py-3"
                  )}
                >
                  <FormSummaryMetric
                    accessibilityScale={accessibilityScale}
                    label="Available"
                    largeTextLayout={largeTextLayout}
                    position="first"
                    value={String(remainingOptionalUnits)}
                  />
                  <FormSummaryMetric
                    accessibilityScale={accessibilityScale}
                    label="Per unit"
                    largeTextLayout={largeTextLayout}
                    position="middle"
                    value={formatCurrency(
                      shares.policy.unitAmount,
                      currencyCode
                    )}
                  />
                  <FormSummaryMetric
                    accessibilityScale={accessibilityScale}
                    label="Pending"
                    largeTextLayout={largeTextLayout}
                    position="last"
                    value={String(shares.position.pendingOptionalUnits)}
                  />
                </View>

                <View className="gap-2">
                  <View
                    className={cn(
                      "gap-1",
                      largeTextLayout
                        ? "items-start"
                        : "flex-row items-center justify-between"
                    )}
                  >
                    <Text className="text-sm font-semibold text-foreground">
                      Units
                    </Text>
                    <Text className="text-xs font-medium text-muted-foreground">
                      1–{remainingOptionalUnits}
                    </Text>
                  </View>
                  <Input
                    accessibilityLabel="Optional share units"
                    editable={!isSubmitting && remainingOptionalUnits > 0}
                    keyboardType="number-pad"
                    onChangeText={setRequestedUnits}
                    placeholder="Units"
                    returnKeyType="next"
                    value={requestedUnits}
                  />
                </View>

                <View
                  className={cn(
                    "gap-2 border-b border-border pb-4",
                    largeTextLayout
                      ? "items-start"
                      : "flex-row items-center justify-between"
                  )}
                >
                  <Text className="text-sm font-medium text-muted-foreground">
                    Request value
                  </Text>
                  <Text
                    allowFontScaling={false}
                    className="text-xl font-extrabold text-foreground"
                    style={scaledTextStyle(accessibilityScale, 20, 26, {
                      color: colors.foreground,
                      fontWeight: "800",
                    })}
                  >
                    {formatCurrency(requestedValue, currencyCode)}
                  </Text>
                </View>

                <View className="gap-2">
                  <View
                    className={cn(
                      "gap-1",
                      largeTextLayout
                        ? "items-start"
                        : "flex-row items-center justify-between"
                    )}
                  >
                    <Text className="text-sm font-semibold text-foreground">
                      Request context
                    </Text>
                    <Text className="text-xs font-medium text-muted-foreground">
                      Optional
                    </Text>
                  </View>
                  <Textarea
                    accessibilityLabel="Optional share request context"
                    editable={!isSubmitting && remainingOptionalUnits > 0}
                    onChangeText={setNotes}
                    placeholder="Add context for the finance reviewer"
                    value={notes}
                  />
                </View>
              </View>
            </FullScreenFormSheet>
          </>
        ) : null}

        <View className="gap-2 border-b border-border pb-5">
          <SectionHeading
            accessibilityScale={accessibilityScale}
            largeTextLayout={largeTextLayout}
            title="Published profit"
          />
          {publishedDividendRows.length > 0 ? (
            <View className="border-t border-border">
              {publishedDividendRows.map((row) => (
                <EvidenceRow
                  accessibilityScale={accessibilityScale}
                  currencyCode={currencyCode}
                  key={row.key}
                  largeTextLayout={largeTextLayout}
                  row={row}
                />
              ))}
            </View>
          ) : (
            <View
              className={cn(
                "gap-2 border-y border-border py-4",
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
                <Text className="text-sm font-semibold text-foreground">
                  Current allocation
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  No profit has been published
                </Text>
              </View>
              <Text className="text-sm font-extrabold text-foreground">
                {formatCurrency(0, currencyCode)}
              </Text>
            </View>
          )}
        </View>

        <View className="gap-2 border-b border-border pb-5">
          <SectionHeading
            accessibilityScale={accessibilityScale}
            largeTextLayout={largeTextLayout}
            meta={shares ? `${shares.applicationTotal} total` : undefined}
            title="Requests"
          />
          <View className="gap-3">
            <VirtualizedCardList
              data={shares?.applications ?? []}
              empty={
                <View className="gap-1 border-y border-border py-4">
                  <Text className="text-sm font-semibold text-foreground">
                    No requests yet
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    Optional share requests will appear here.
                  </Text>
                </View>
              }
              estimatedItemSize={124}
              inline
              keyExtractor={(application) => application.id}
              renderItem={({ item: application }) => (
                <ApplicationRow
                  accessibilityScale={accessibilityScale}
                  application={application}
                  currencyCode={currencyCode}
                  largeTextLayout={largeTextLayout}
                />
              )}
            />
            {applicationHistoryError ? (
              <Text className="text-sm font-medium text-destructive">
                {applicationHistoryError}
              </Text>
            ) : null}
            {hasMoreApplications ? (
              <Button
                disabled={isLoadingMoreApplications}
                onPress={onLoadMoreApplications}
                variant="secondary"
              >
                <Text>
                  {isLoadingMoreApplications ? "Loading" : "Load more requests"}
                </Text>
              </Button>
            ) : null}
          </View>
        </View>

        <MemberActivityHistory
          compactEmpty
          currencyCode={currencyCode}
          emptyDescription="Posted share ledger movements will appear here."
          flat
          history={activity}
          inline
          title="Ownership record"
        />
      </ScrollView>
      <SubmissionSuccessSheet
        description={success ?? "Your optional share request has been sent."}
        onClose={() => setSuccess(null)}
        title="Share request sent"
        visible={Boolean(success)}
      />
    </SafeArea>
  )
}
