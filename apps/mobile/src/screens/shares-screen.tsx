import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import {
  createMobileMemberShareApplication,
  getMobileMemberShares,
  type MobileMemberSectionRow,
  type MobileMemberShareApplication,
  type MobileMemberShares,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { isMockSessionToken } from "@/lib/session-store"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"
import { DetailListScreen } from "./detail-list-screen"

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
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
  application,
  currencyCode,
}: {
  application: MobileMemberShareApplication
  currencyCode: string
}) {
  return (
    <View className="gap-3 rounded-md border border-border bg-card p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {application.requestedUnits} requested unit
            {application.requestedUnits === 1 ? "" : "s"}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatCurrency(application.shareValueSnapshot, currencyCode)} at{" "}
            {formatCurrency(application.unitAmountSnapshot, currencyCode)} per
            unit
          </Text>
        </View>
        <StatusBadge
          label={formatStatus(application.status)}
          tone={getStatusBadgeTone(application.status)}
        />
      </View>
      <Text className="text-xs font-medium text-muted-foreground">
        Requested {formatDate(application.createdAt)}
      </Text>
      {application.notes ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {application.notes}
        </Text>
      ) : null}
      {application.reviewNotes ? (
        <View className="gap-1 rounded-md border border-border p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Review note
          </Text>
          <Text className="text-sm leading-5 text-foreground">
            {application.reviewNotes}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export function SharesScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [shares, setShares] = useState<MobileMemberShares | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [requestedUnits, setRequestedUnits] = useState("1")
  const [notes, setNotes] = useState("")
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const canUseServerShares = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
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
  ]
  const stats = useMemo(
    () =>
      shares?.section.stats.map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      })) ?? [],
    [currencyCode, shares?.section.stats]
  )
  const message = stateMessage(shares)

  const loadShares = useCallback(() => {
    let mounted = true

    if (!canUseServerShares) {
      setShares(null)
      setError(null)
      setIsLoading(false)

      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileMemberShares()
      .then((response) => {
        if (mounted) {
          setShares(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Share self-service is unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerShares])

  useEffect(() => loadShares(), [loadShares])

  async function handleSubmit() {
    if (hasStaleShares) {
      setError("Refresh share data before submitting a request.")
      return
    }

    if (!canSubmit || isSubmitting) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMobileMemberShareApplication({
        notes: notes.trim() || undefined,
        requestedUnits: requestedUnitCount,
      })
      await clearShareDraft()
      setRequestedUnits("")
      setNotes("")
      setSuccess("Share request submitted for review.")
      setIsReviewingSubmit(false)
      loadShares()
    } catch {
      setError("Share request could not be submitted.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canUseServerShares) {
    return <DetailListScreen detailKey="shares" />
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">Shares</Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Review ownership, dividends, and optional share requests.
          </Text>
        </View>

        <CachedReadBanner cache={shares?.cache} label="share data" />

        {isLoading ? (
          <SectionCard icon="LoaderCircle" title="Share self-service">
            <LoadingSpinner />
          </SectionCard>
        ) : null}

        {stats.length > 0 ? (
          <View className="flex-row flex-wrap gap-3">
            {stats.map((item) => (
              <StatCard key={item.label} {...item} />
            ))}
          </View>
        ) : null}

        {message ? (
          <SectionCard icon="Info" title="Share requests">
            <Text className="text-sm leading-5 text-muted-foreground">
              {message}
            </Text>
          </SectionCard>
        ) : null}

        {shares?.section.rows.length ? (
          <SectionCard icon="PieChart" title="Current records">
            <View className="gap-3">
              {shares.section.rows.map((row) => {
                const formattedValue = formatRowValue(row, currencyCode)

                return (
                  <View className="flex-row items-start gap-3" key={row.key}>
                    <View className="h-8 w-8 items-center justify-center rounded-md bg-secondary">
                      <Icon
                        name={formattedValue ? "CircleDollarSign" : "Info"}
                        className="size-sm text-foreground"
                      />
                    </View>
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-start justify-between gap-3">
                        <Text className="flex-1 text-sm font-semibold text-foreground">
                          {row.label}
                        </Text>
                        {formattedValue ? (
                          <Text className="text-sm font-semibold text-foreground">
                            {formattedValue}
                          </Text>
                        ) : null}
                      </View>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        {row.detail}
                      </Text>
                      {row.status ? (
                        <Text className="text-xs font-medium text-muted-foreground">
                          {row.status}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )
              })}
            </View>
          </SectionCard>
        ) : null}

        {shares?.state === "available" && shares.position && shares.policy ? (
          <SectionCard icon="PlusCircle" title="Request optional shares">
            <View className="gap-3">
              <FormStateBanner
                hasDraft={hasShareDraft}
                isStale={hasStaleShares}
              />
              <View className="gap-1 rounded-md bg-secondary p-3">
                <Text className="text-sm font-semibold text-foreground">
                  {remainingOptionalUnits} optional unit
                  {remainingOptionalUnits === 1 ? "" : "s"} available
                </Text>
                <Text className="text-sm leading-5 text-muted-foreground">
                  {formatCurrency(shares.policy.unitAmount, currencyCode)} per
                  unit. Pending requests reserve units until finance review.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Units
                </Text>
                <Input
                  accessibilityLabel="Optional share units"
                  editable={!isSubmitting && remainingOptionalUnits > 0}
                  keyboardType="number-pad"
                  onChangeText={setRequestedUnits}
                  placeholder="Units"
                  value={requestedUnits}
                />
              </View>

              <View className="gap-1 rounded-md border border-border p-3">
                <Text className="text-xs font-medium text-muted-foreground">
                  Request value
                </Text>
                <Text className="text-lg font-semibold text-foreground">
                  {formatCurrency(requestedValue, currencyCode)}
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">
                  Request context
                </Text>
                <Textarea
                  accessibilityLabel="Optional share request context"
                  editable={!isSubmitting && remainingOptionalUnits > 0}
                  onChangeText={setNotes}
                  placeholder="Optional request context"
                  value={notes}
                />
              </View>

              {error ? (
                <Text className="text-sm font-medium text-destructive">
                  {error}
                </Text>
              ) : null}
              {success ? (
                <Text className="text-success text-sm font-medium">
                  {success}
                </Text>
              ) : null}

              <Button
                className="h-12"
                disabled={!canSubmit || isSubmitting}
                onPress={() => setIsReviewingSubmit(true)}
              >
                <Icon
                  name="Send"
                  className="size-base text-primary-foreground"
                />
                <Text>{isSubmitting ? "Submitting" : "Submit request"}</Text>
              </Button>
            </View>
          </SectionCard>
        ) : null}

        <SectionCard icon="ClipboardList" title="Request history">
          <VirtualizedCardList
            data={shares?.applications ?? []}
            empty={
              <EmptyState
                description="Optional share applications will appear here after submission."
                icon="PieChart"
                title="No optional share requests"
              />
            }
            estimatedItemSize={124}
            keyExtractor={(application) => application.id}
            renderItem={({ item: application }) => (
              <ApplicationRow
                application={application}
                currencyCode={currencyCode}
              />
            )}
          />
        </SectionCard>
      </ScrollView>
      <SubmissionReviewSheet
        description="Review this optional share request before sending it for finance review."
        isSubmitting={isSubmitting}
        onClose={() => setIsReviewingSubmit(false)}
        onConfirm={handleSubmit}
        rows={reviewRows}
        title="Review share request"
        visible={isReviewingSubmit}
      />
    </SafeArea>
  )
}
