import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { ScreenHeader } from "@/components/app/screen-header"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { WorkflowDetailSheet } from "@/components/app/workflow-detail-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import type { MobileMemberSectionRow } from "@/features/member-core/public/member-core-types"
import {
  createMemberFinancingRequest,
  getMemberFinancing,
  getMemberFinancingRequestDetail,
  getMemberFinancingRequestPage,
  quoteMemberFinancing,
} from "../api/member-financing-api"
import type {
  MobileFinancingProduct as MobileLoanProductOption,
  MobileFinancingQuote,
  MobileFinancingRequest as MobileMemberFinancingRequest,
  MobileMemberFinancing,
} from "../model/member-financing-types"
import { buildMemberFinancingPresentation } from "../model/member-financing-presentation"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { resolveDisplayTextScale } from "@/lib/mobile-accessibility-layout"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { cn } from "@/lib/utils"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ScrollView,
  TextInput as NativeTextInput,
  useWindowDimensions,
  View,
  type TextStyle,
} from "react-native"

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, "").trim())

  return Number.isFinite(amount) ? amount : 0
}

function parsePositiveInteger(value: string) {
  const amount = Number(value.trim())

  return Number.isInteger(amount) && amount > 0 ? amount : 0
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
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

function chargeCollectionDescription(collectionMode: string) {
  if (collectionMode === "deduct_from_savings") {
    return "Deducted from savings at submission"
  }
  if (collectionMode === "pay_separately") return "Paid separately"
  return "Collection method unavailable"
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

function ProductCard({
  accessibilityScale,
  isSelected,
  largeTextLayout,
  onPress,
  product,
}: {
  accessibilityScale: number
  isSelected: boolean
  largeTextLayout: boolean
  onPress: () => void
  product: MobileLoanProductOption
}) {
  const colors = useColors()

  return (
    <Pressable
      accessibilityLabel={`Select ${product.name}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={cn(
        "min-h-16 gap-3 border-b border-border py-3 active:bg-accent",
        largeTextLayout
          ? "items-start"
          : "flex-row items-center justify-between"
      )}
      haptic
      onPress={onPress}
    >
      <View
        className={cn(
          "min-w-0 flex-1 gap-3",
          largeTextLayout ? "items-start" : "flex-row items-center"
        )}
      >
        <View className="size-10 items-center justify-center rounded-xl bg-accent">
          <Icon className="size-sm text-accent-foreground" name="WalletCards" />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text
            allowFontScaling={false}
            className="text-sm font-semibold text-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.foreground,
              fontWeight: "600",
            })}
          >
            {product.name}
          </Text>
          <Text
            allowFontScaling={false}
            className="text-xs leading-5 text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 12, 20, {
              color: colors.mutedForeground,
            })}
          >
            {formatStatus(product.loanType)} · {product.termMonths} months ·{" "}
            {product.maxSavingsMultiple}× savings
          </Text>
        </View>
      </View>
      <View className={cn(largeTextLayout && "self-start pt-1")}>
        <Icon
          className={
            isSelected ? "size-sm text-brand" : "size-sm text-muted-foreground"
          }
          name={isSelected ? "CircleCheck" : "Circle"}
        />
      </View>
    </Pressable>
  )
}

function RequestCard({
  accessibilityScale,
  currencyCode,
  largeTextLayout,
  onPress,
  request,
}: {
  accessibilityScale: number
  currencyCode: string
  largeTextLayout: boolean
  onPress: (request: MobileMemberFinancingRequest) => void
  request: MobileMemberFinancingRequest
}) {
  const colors = useColors()

  return (
    <Pressable
      accessibilityLabel={`View ${request.loanProductName} financing request`}
      accessibilityRole="button"
      className="gap-2 border-b border-border py-4"
      onPress={() => onPress(request)}
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
          className={cn("min-w-0 flex-1 gap-1", largeTextLayout && "w-full")}
        >
          <Text
            allowFontScaling={false}
            className="text-sm font-semibold text-foreground"
            style={scaledTextStyle(accessibilityScale, 14, 20, {
              color: colors.foreground,
              fontWeight: "600",
            })}
          >
            {request.loanProductName}
          </Text>
          <Text
            allowFontScaling={false}
            className="text-xs leading-5 text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 12, 20, {
              color: colors.mutedForeground,
            })}
          >
            {formatCurrency(request.requestedAmount, currencyCode)} over{" "}
            {request.requestedTermMonths} months
          </Text>
        </View>
        <StatusBadge
          label={formatStatus(request.status)}
          textScale={largeTextLayout ? accessibilityScale : undefined}
          tone={getStatusBadgeTone(request.status)}
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
        Requested {formatDate(request.requestedAt)}
      </Text>
    </Pressable>
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
  const displayTextScale = resolveDisplayTextScale(accessibilityScale)

  return (
    <View
      className={cn(
        "gap-1 border-b border-border pb-2",
        largeTextLayout
          ? "items-start"
          : "flex-row items-baseline justify-between"
      )}
    >
      <Text
        allowFontScaling={false}
        className={cn(
          "text-xl font-extrabold text-foreground",
          !largeTextLayout && "tracking-tight"
        )}
        style={scaledTextStyle(displayTextScale, 20, 26, {
          color: colors.foreground,
          fontWeight: "800",
          letterSpacing: largeTextLayout ? 0 : -0.35,
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

function OverviewMetric({
  accessibilityScale,
  detail,
  label,
  largeTextLayout,
  position,
  value,
}: {
  accessibilityScale: number
  detail: string | null
  label: string
  largeTextLayout: boolean
  position: "first" | "last"
  value: string
}) {
  const colors = useColors()

  return (
    <View
      className={cn(
        "gap-1",
        largeTextLayout ? "py-4" : "flex-1 py-4",
        largeTextLayout && position === "first" && "border-b border-border",
        !largeTextLayout &&
          position === "first" &&
          "border-r border-border pr-4",
        !largeTextLayout && position === "last" && "pl-4"
      )}
    >
      <Text
        allowFontScaling={false}
        className="text-xs font-extrabold tracking-[1.1px] text-muted-foreground uppercase"
        style={scaledTextStyle(accessibilityScale, 12, 18, {
          color: colors.mutedForeground,
          fontWeight: "800",
          letterSpacing: 1.1,
        })}
      >
        {label}
      </Text>
      <Text
        allowFontScaling={false}
        className="text-[28px] leading-8 font-extrabold tracking-tight text-foreground"
        style={scaledTextStyle(accessibilityScale, 28, 32, {
          color: colors.foreground,
          fontWeight: "800",
          letterSpacing: -0.7,
        })}
      >
        {value}
      </Text>
      {detail ? (
        <Text
          allowFontScaling={false}
          className="text-xs leading-5 text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 20, {
            color: colors.mutedForeground,
          })}
        >
          {detail}
        </Text>
      ) : null}
    </View>
  )
}

export function FinancingScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const { profile } = useAuthContext()
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const accessibilityScale = Number.isFinite(fontScale)
    ? Math.max(fontScale, 1)
    : 1
  const [financing, setFinancing] = useState<MobileMemberFinancing | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isQuoting, setIsQuoting] = useState(false)
  const [quote, setQuote] = useState<MobileFinancingQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quoteRefreshVersion, setQuoteRefreshVersion] = useState(0)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedTermMonths, setRequestedTermMonths] = useState("")
  const [extraMonthlySavingsAmount, setExtraMonthlySavingsAmount] = useState("")
  const [purpose, setPurpose] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const queuedSuccessRef = useRef<string | null>(null)
  const requestedAmountRef = useRef<NativeTextInput>(null)
  const repaymentMonthsRef = useRef<NativeTextInput>(null)
  const extraSavingsRef = useRef<NativeTextInput>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const [selectedRequest, setSelectedRequest] =
    useState<MobileMemberFinancingRequest | null>(null)
  const canUseServerFinancing = canUseMobileFeatureData(profile, "member")
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleFinancing = isMobileReadCacheStale(financing?.cache)
  const selectedProduct = financing?.products.find(
    (product) => product.id === selectedProductId
  )
  const financingDraft = useMemo(
    () => ({
      extraMonthlySavingsAmount,
      purpose,
      requestedAmount,
      requestedTermMonths,
      selectedProductId,
    }),
    [
      extraMonthlySavingsAmount,
      purpose,
      requestedAmount,
      requestedTermMonths,
      selectedProductId,
    ]
  )
  const clearFinancingDraft = useMobileFormDraft({
    enabled: canUseServerFinancing,
    key: "member.financing.create",
    onHydrate: (draft) => {
      setSelectedProductId(draft.selectedProductId)
      setRequestedAmount(draft.requestedAmount)
      setRequestedTermMonths(draft.requestedTermMonths)
      setExtraMonthlySavingsAmount(draft.extraMonthlySavingsAmount)
      setPurpose(draft.purpose)
    },
    value: financingDraft,
  })
  const amount = parseAmount(requestedAmount)
  const termMonths = parsePositiveInteger(requestedTermMonths)
  const extraSavings = parseAmount(extraMonthlySavingsAmount)
  const canSubmit = Boolean(
    selectedProduct &&
    amount > 0 &&
    termMonths > 0 &&
    quote?.canSubmit &&
    quote.product.id === selectedProduct.id &&
    quote.requestedAmount === amount &&
    quote.requestedTermMonths === termMonths &&
    !hasStaleFinancing &&
    !isQuoting &&
    !isSubmitting
  )
  const hasFinancingDraft = Boolean(
    requestedAmount.trim() ||
    requestedTermMonths.trim() ||
    extraMonthlySavingsAmount.trim() ||
    purpose.trim()
  )
  const reviewRows = [
    {
      detail: selectedProduct?.name ?? "No product selected",
      icon: "WalletCards",
      label: "Product",
      value: selectedProduct ? formatStatus(selectedProduct.loanType) : "",
    },
    {
      detail: `${termMonths || 0} months`,
      icon: "CircleDollarSign",
      label: "Requested amount",
      value: amount ? formatCurrency(amount, currencyCode) : "Not set",
    },
    ...(extraSavings > 0
      ? [
          {
            detail: "Additional monthly savings commitment",
            icon: "WalletCards",
            label: "Extra monthly savings",
            value: formatCurrency(extraSavings, currencyCode),
          },
        ]
      : []),
    {
      detail: "Application charges",
      icon: "ReceiptText",
      label: "Charges",
      value: formatCurrency(quote?.feeTotal ?? 0, currencyCode),
    },
    ...(quote?.charges ?? []).map((charge) => ({
      detail: chargeCollectionDescription(charge.collectionMode),
      icon: "ReceiptText",
      label: charge.name,
      value: formatCurrency(charge.amount, currencyCode),
    })),
    {
      detail: `${termMonths || 0} month schedule`,
      icon: "CalendarClock",
      label: "Est. monthly principal",
      value: formatCurrency(
        quote?.estimatedMonthlyServicing ?? 0,
        currencyCode
      ),
    },
  ]
  const presentation = useMemo(
    () =>
      financing
        ? buildMemberFinancingPresentation(financing.section, currencyCode)
        : null,
    [currencyCode, financing]
  )

  const loadFinancing = useCallback(() => {
    let mounted = true

    if (!canUseServerFinancing) {
      setFinancing(null)
      setError(null)
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMemberFinancing()
      .then((response) => {
        if (mounted) {
          setFinancing(response)
          setSelectedProductId(
            (current) => current || response.products[0]?.id || ""
          )
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Financing is unavailable.")
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
  }, [canUseServerFinancing])

  useEffect(() => loadFinancing(), [loadFinancing])

  const openRequestDetail = useCallback(
    async (loanRequestId: string, fallback?: MobileMemberFinancingRequest) => {
      if (fallback) setSelectedRequest(fallback)
      const detail = await getMemberFinancingRequestDetail(loanRequestId)
      if (detail) setSelectedRequest(detail)
      return detail
    },
    []
  )

  useEffect(() => {
    if (
      !initialEntityId ||
      !canUseServerFinancing ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }

    handledNotificationEntityRef.current = initialEntityId
    let mounted = true
    setIsDestinationUnavailable(false)
    void openRequestDetail(initialEntityId)
      .then((detail) => {
        if (mounted && !detail) setIsDestinationUnavailable(true)
      })
      .catch(() => {
        if (mounted) setIsDestinationUnavailable(true)
      })

    return () => {
      mounted = false
    }
  }, [canUseServerFinancing, initialEntityId, openRequestDetail])

  useEffect(() => {
    let active = true
    if (
      !canUseServerFinancing ||
      !selectedProduct ||
      amount <= 0 ||
      termMonths <= 0
    ) {
      setQuote(null)
      setQuoteError(null)
      setIsQuoting(false)
      return () => {
        active = false
      }
    }

    setQuote(null)
    setQuoteError(null)
    setIsQuoting(true)
    const timer = setTimeout(() => {
      void quoteMemberFinancing({
        extraMonthlySavingsAmount: extraSavings || undefined,
        loanProductId: selectedProduct.id,
        requestedAmount: amount,
        requestedTermMonths: termMonths,
      })
        .then((response) => {
          if (active) setQuote(response)
        })
        .catch(() => {
          if (active) {
            setQuoteError("A server financing preview could not be prepared.")
          }
        })
        .finally(() => {
          if (active) setIsQuoting(false)
        })
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [
    amount,
    canUseServerFinancing,
    extraSavings,
    quoteRefreshVersion,
    selectedProduct,
    termMonths,
  ])

  async function handleSubmit() {
    if (hasStaleFinancing) {
      setError("Refresh financing data before submitting a request.")
      setIsReviewingSubmit(false)
      return
    }

    if (!selectedProduct || !canSubmit || !quote) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMemberFinancingRequest({
        chargeQuoteHash: quote.chargeQuoteHash,
        extraMonthlySavingsAmount: extraSavings || undefined,
        loanProductId: selectedProduct.id,
        purpose: purpose.trim() || undefined,
        requestedAmount: amount,
        requestedTermMonths: termMonths,
      })
      await clearFinancingDraft()
      queuedSuccessRef.current = "Financing request submitted."
      setIsReviewingSubmit(false)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Financing request could not be submitted."
      )
      setIsReviewingSubmit(false)
      setQuote(null)
      setQuoteRefreshVersion((current) => current + 1)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLoadMoreRequests() {
    if (!financing?.requestNextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    setError(null)

    try {
      const page = await getMemberFinancingRequestPage({
        cursor: financing.requestNextCursor,
      })
      setFinancing((current) => {
        if (!current) return current
        const seen = new Set(current.requests.map((request) => request.id))
        return {
          ...current,
          requestNextCursor: page.nextCursor,
          requests: [
            ...current.requests,
            ...page.data.filter((request) => !seen.has(request.id)),
          ],
        }
      })
    } catch {
      setError("More financing requests could not be loaded.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleQuickFill = useCallback(() => {
    const preset = mobileDevQuickFill.financing
    setSelectedProductId(financing?.products[0]?.id ?? selectedProductId)
    setRequestedAmount(preset.requestedAmount)
    setRequestedTermMonths(preset.requestedTermMonths)
    setExtraMonthlySavingsAmount(preset.extraMonthlySavingsAmount)
    setPurpose(preset.purpose)
  }, [financing?.products, selectedProductId])

  const handleOpenRequestPress = useCallback(
    (request: MobileMemberFinancingRequest) => {
      void openRequestDetail(request.id, request).catch(() =>
        setError("Financing details could not be loaded.")
      )
    },
    [openRequestDetail]
  )

  return (
    <SafeArea className="bg-background">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <ScreenHeader title="Financing" />

        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={() => setIsDestinationUnavailable(false)}
          />
        ) : null}

        {!canUseServerFinancing ? (
          <View className="border-b border-border pb-5">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to request and track
              financing.
            </Text>
          </View>
        ) : null}

        {canUseServerFinancing ? (
          <>
            <CachedReadBanner cache={financing?.cache} label="financing data" />

            {presentation?.outstanding && presentation.monthlyServicing ? (
              <View
                className={cn(
                  "border-y border-border",
                  !largeTextLayout && "flex-row"
                )}
              >
                <OverviewMetric
                  accessibilityScale={accessibilityScale}
                  detail={presentation.outstanding.summaryDetail}
                  label="Outstanding"
                  largeTextLayout={largeTextLayout}
                  position="first"
                  value={presentation.outstanding.value}
                />
                <OverviewMetric
                  accessibilityScale={accessibilityScale}
                  detail={presentation.monthlyServicing.detail}
                  label="Monthly"
                  largeTextLayout={largeTextLayout}
                  position="last"
                  value={presentation.monthlyServicing.value}
                />
              </View>
            ) : null}

            {error ? (
              <View className="border-l-2 border-destructive pl-3">
                <Text className="text-sm font-medium text-destructive">
                  {error}
                </Text>
              </View>
            ) : null}

            <View>
              <SectionHeading
                accessibilityScale={accessibilityScale}
                largeTextLayout={largeTextLayout}
                meta="Eligibility and available funds are checked in your quote"
                title="Financing products"
              />
              {isLoading ? (
                <LoadingSpinner />
              ) : financing?.products.length ? (
                <View>
                  {financing.products.map((product) => (
                    <ProductCard
                      accessibilityScale={accessibilityScale}
                      isSelected={product.id === selectedProductId}
                      key={product.id}
                      largeTextLayout={largeTextLayout}
                      onPress={() => setSelectedProductId(product.id)}
                      product={product}
                    />
                  ))}
                </View>
              ) : (
                <Text className="py-3 text-sm leading-5 text-muted-foreground">
                  No active financing products are available.
                </Text>
              )}

              <Button
                accessibilityHint="Opens a keyboard-safe financing request form"
                className="mt-3.5 min-h-12 py-3"
                disabled={!financing?.products.length}
                onPress={() => setIsFormVisible(true)}
              >
                <Text>
                  {hasFinancingDraft ? "Continue request" : "New request"}
                </Text>
              </Button>
            </View>

            <FullScreenFormSheet
              dirty={hasFinancingDraft}
              footer={
                <View className="flex-row items-center gap-3">
                  {(error ?? quoteError) || isReviewingSubmit ? null : (
                    <DevQuickFill
                      label="Quick fill financing request"
                      onPress={handleQuickFill}
                      placement="footer"
                      portal={false}
                    />
                  )}
                  <Button
                    className="min-h-12 flex-1 py-3"
                    disabled={!canSubmit}
                    onPress={() => setIsReviewingSubmit(true)}
                  >
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
              overlay={
                <SubmissionReviewSheet
                  description="This request is not approval. Monthly principal excludes the listed charges; final repayment dates and total payable require the cooperative's agreement."
                  isSubmitting={isSubmitting}
                  onClose={() => setIsReviewingSubmit(false)}
                  onConfirm={handleSubmit}
                  onDismissed={() => {
                    if (!queuedSuccessRef.current) return
                    setRequestedAmount("")
                    setRequestedTermMonths("")
                    setExtraMonthlySavingsAmount("")
                    setPurpose("")
                    setIsFormVisible(false)
                    loadFinancing()
                  }}
                  rows={reviewRows}
                  title="Review financing request"
                  visible={isReviewingSubmit}
                />
              }
              overlayActive={isReviewingSubmit}
              title="New financing request"
              visible={isFormVisible}
            >
              <View className="gap-3">
                {hasStaleFinancing ? (
                  <FormStateBanner hasDraft={false} isStale />
                ) : null}
                {selectedProduct ? (
                  <View className="gap-1 border-b border-border pb-4">
                    <Text className="text-xs font-semibold text-muted-foreground">
                      Product
                    </Text>
                    <Text className="text-base font-semibold text-foreground">
                      {selectedProduct.name}
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      {formatStatus(selectedProduct.loanType)} · up to{" "}
                      {selectedProduct.termMonths} months ·{" "}
                      {selectedProduct.maxSavingsMultiple}x savings
                    </Text>
                  </View>
                ) : null}
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Requested amount ({currencyCode})
                  </Text>
                  <Input
                    accessibilityLabel="Requested financing amount"
                    blurOnSubmit={false}
                    editable={!isSubmitting}
                    keyboardType="numeric"
                    onChangeText={setRequestedAmount}
                    onSubmitEditing={() => repaymentMonthsRef.current?.focus()}
                    placeholder="e.g. 500,000"
                    ref={requestedAmountRef}
                    returnKeyType="next"
                    value={requestedAmount}
                  />
                </View>
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Repayment months
                  </Text>
                  <Input
                    accessibilityLabel="Financing repayment months"
                    blurOnSubmit={false}
                    editable={!isSubmitting}
                    keyboardType="numeric"
                    onChangeText={setRequestedTermMonths}
                    onSubmitEditing={() => extraSavingsRef.current?.focus()}
                    placeholder={
                      selectedProduct
                        ? `Repayment months, max ${selectedProduct.termMonths}`
                        : "Repayment months"
                    }
                    ref={repaymentMonthsRef}
                    returnKeyType="next"
                    value={requestedTermMonths}
                  />
                </View>
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Extra monthly savings (optional)
                  </Text>
                  <Input
                    accessibilityLabel="Extra monthly savings amount"
                    blurOnSubmit
                    editable={!isSubmitting}
                    keyboardType="numeric"
                    onChangeText={setExtraMonthlySavingsAmount}
                    placeholder="e.g. 10,000"
                    ref={extraSavingsRef}
                    returnKeyType="done"
                    value={extraMonthlySavingsAmount}
                  />
                </View>
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Purpose note (optional)
                  </Text>
                  <Textarea
                    accessibilityLabel="Financing purpose note"
                    editable={!isSubmitting}
                    onChangeText={setPurpose}
                    placeholder="What will this financing support?"
                    value={purpose}
                  />
                </View>
                {isQuoting ? (
                  <View className="items-start py-2">
                    <LoadingSpinner />
                  </View>
                ) : null}
                {quoteError ? (
                  <Text className="text-sm font-medium text-destructive">
                    {quoteError}
                  </Text>
                ) : null}
                {error ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    className="text-sm font-medium text-destructive"
                  >
                    {error}
                  </Text>
                ) : null}
                {quote ? (
                  <View className="gap-3 border-y border-border py-4">
                    <View
                      className={cn(
                        "gap-2",
                        largeTextLayout
                          ? "items-start"
                          : "flex-row items-center justify-between"
                      )}
                    >
                      <Text className="text-xs font-medium text-muted-foreground">
                        Financing preview
                      </Text>
                      <Text className="text-sm font-semibold text-foreground">
                        {quote.canSubmit
                          ? "Can submit request"
                          : "Needs attention"}
                      </Text>
                    </View>
                    <View
                      className={cn(
                        largeTextLayout ? "gap-0" : "flex-row flex-wrap gap-3"
                      )}
                    >
                      <View
                        className={cn(
                          "gap-1 border-b border-border pb-2",
                          largeTextLayout
                            ? "w-full py-3"
                            : "min-w-[120px] flex-1"
                        )}
                      >
                        <Text className="text-xs text-muted-foreground">
                          Eligibility limit
                        </Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {formatCurrency(quote.eligibleAmount, currencyCode)}
                        </Text>
                      </View>
                      <View
                        className={cn(
                          "gap-1 border-b border-border pb-2",
                          largeTextLayout
                            ? "w-full py-3"
                            : "min-w-[120px] flex-1"
                        )}
                      >
                        <Text className="text-xs text-muted-foreground">
                          Cycle capacity
                        </Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {formatCurrency(
                            quote.capacityRemaining,
                            currencyCode
                          )}
                        </Text>
                      </View>
                      <View
                        className={cn(
                          "gap-1 border-b border-border pb-2",
                          largeTextLayout
                            ? "w-full py-3"
                            : "min-w-[120px] flex-1"
                        )}
                      >
                        <Text className="text-xs text-muted-foreground">
                          Est. monthly principal
                        </Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {formatCurrency(
                            quote.estimatedMonthlyServicing,
                            currencyCode
                          )}
                        </Text>
                      </View>
                      <View
                        className={cn(
                          "gap-1 border-b border-border pb-2",
                          largeTextLayout
                            ? "w-full py-3"
                            : "min-w-[120px] flex-1"
                        )}
                      >
                        <Text className="text-xs text-muted-foreground">
                          Charges
                        </Text>
                        <Text className="text-sm font-semibold text-foreground">
                          {formatCurrency(quote.feeTotal, currencyCode)}
                        </Text>
                      </View>
                    </View>
                    {quote.charges.map((charge) => (
                      <View
                        className={cn(
                          "gap-1",
                          largeTextLayout
                            ? "w-full"
                            : "flex-row justify-between gap-3"
                        )}
                        key={charge.id}
                      >
                        <View className="min-w-0 flex-1 gap-1">
                          <Text className="text-xs text-muted-foreground">
                            {charge.name}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {chargeCollectionDescription(charge.collectionMode)}
                          </Text>
                        </View>
                        <Text className="text-xs font-medium text-foreground">
                          {formatCurrency(charge.amount, currencyCode)}
                        </Text>
                      </View>
                    ))}
                    <Text className="text-xs leading-5 text-muted-foreground">
                      This principal estimate excludes the listed charges.
                      Approval, repayment dates and total payable depend on the
                      cooperative&apos;s final agreement.
                    </Text>
                    {quote.blockers.map((blocker) => (
                      <Text
                        className="text-sm font-medium text-destructive"
                        key={blocker.key}
                      >
                        {blocker.message}
                      </Text>
                    ))}
                    {quote.warnings.map((warning) => (
                      <Text
                        className="text-sm leading-5 text-muted-foreground"
                        key={warning.key}
                      >
                        {warning.message}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            </FullScreenFormSheet>

            <View className="gap-2">
              <SectionHeading
                accessibilityScale={accessibilityScale}
                largeTextLayout={largeTextLayout}
                meta={presentation?.outstanding ? "Active" : undefined}
                title="Current financing"
              />
              {isLoading ? (
                <LoadingSpinner />
              ) : presentation?.outstanding ? (
                <View>
                  <View
                    className={cn(
                      "gap-2 border-b border-border py-4",
                      largeTextLayout
                        ? "items-start"
                        : "flex-row items-start justify-between"
                    )}
                  >
                    <View
                      className={cn(
                        "min-w-0 flex-1 gap-1",
                        largeTextLayout && "w-full"
                      )}
                    >
                      <Text
                        allowFontScaling={false}
                        className="text-sm font-semibold text-foreground"
                        style={scaledTextStyle(accessibilityScale, 14, 20, {
                          color: colors.foreground,
                          fontWeight: "600",
                        })}
                      >
                        Active financing
                      </Text>
                      <Text
                        allowFontScaling={false}
                        className="text-xs leading-5 text-muted-foreground"
                        style={scaledTextStyle(accessibilityScale, 12, 20, {
                          color: colors.mutedForeground,
                        })}
                      >
                        {presentation.outstanding.summaryDetail}
                      </Text>
                    </View>
                    {presentation.monthlyServicing ? (
                      <View
                        className={cn("gap-1", !largeTextLayout && "items-end")}
                      >
                        <Text
                          allowFontScaling={false}
                          className="text-sm font-extrabold text-foreground"
                          style={scaledTextStyle(accessibilityScale, 14, 20, {
                            color: colors.foreground,
                            fontWeight: "800",
                          })}
                        >
                          {presentation.monthlyServicing.value}
                        </Text>
                        <Text
                          allowFontScaling={false}
                          className="text-xs font-medium text-muted-foreground"
                          style={scaledTextStyle(accessibilityScale, 12, 18, {
                            color: colors.mutedForeground,
                            fontWeight: "500",
                          })}
                        >
                          Monthly
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {presentation.activeRows.map((row) => {
                    const formattedValue = formatRowValue(row, currencyCode)

                    return (
                      <View
                        className={cn(
                          "gap-2 border-b border-border py-4",
                          largeTextLayout
                            ? "items-start"
                            : "flex-row items-start justify-between"
                        )}
                        key={row.key}
                      >
                        <View className="min-w-0 flex-1 gap-1">
                          <Text className="text-sm font-semibold text-foreground">
                            {row.label}
                          </Text>
                          <Text className="text-xs leading-5 text-muted-foreground">
                            {row.detail}
                          </Text>
                        </View>
                        {formattedValue ? (
                          <Text className="text-sm font-semibold text-foreground">
                            {formattedValue}
                          </Text>
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              ) : (
                <View className="border-b border-border py-4">
                  <Text className="text-sm font-semibold text-foreground">
                    No active financing
                  </Text>
                </View>
              )}
            </View>

            <View className="gap-2">
              <SectionHeading
                accessibilityScale={accessibilityScale}
                largeTextLayout={largeTextLayout}
                meta={
                  financing ? `${financing.requests.length} total` : undefined
                }
                title="Requests"
              />
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <View className="gap-3">
                  <VirtualizedCardList
                    data={financing?.requests ?? []}
                    empty={
                      <View className="border-b border-border py-4">
                        <Text className="text-sm font-semibold text-foreground">
                          No requests yet
                        </Text>
                      </View>
                    }
                    estimatedItemSize={104}
                    keyExtractor={(request) => request.id}
                    renderItem={({ item: request }) => (
                      <RequestCard
                        accessibilityScale={accessibilityScale}
                        currencyCode={currencyCode}
                        largeTextLayout={largeTextLayout}
                        onPress={handleOpenRequestPress}
                        request={request}
                      />
                    )}
                  />
                  {financing?.requestNextCursor ? (
                    <Button
                      disabled={isLoadingMore}
                      onPress={handleLoadMoreRequests}
                      variant="secondary"
                    >
                      <Text>
                        {isLoadingMore ? "Loading" : "Load more requests"}
                      </Text>
                    </Button>
                  ) : null}
                </View>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
      <SubmissionSuccessSheet
        description={success ?? "Your financing request has been sent."}
        onClose={() => setSuccess(null)}
        title="Financing request sent"
        visible={Boolean(success)}
      />
      <WorkflowDetailSheet
        onClose={() => setSelectedRequest(null)}
        rows={
          selectedRequest
            ? [
                {
                  detail: `Requested ${formatDate(selectedRequest.requestedAt)}`,
                  icon: "HandCoins",
                  label: "Status",
                  value: formatStatus(selectedRequest.status),
                },
                {
                  detail: `${selectedRequest.requestedTermMonths} month term`,
                  icon: "CircleDollarSign",
                  label: "Requested amount",
                  value: formatCurrency(
                    selectedRequest.requestedAmount,
                    currencyCode
                  ),
                },
                {
                  detail: `${selectedRequest.guarantorApprovals.length} guarantor request${selectedRequest.guarantorApprovals.length === 1 ? "" : "s"}`,
                  icon: "Users",
                  label: "Monthly servicing",
                  value: formatCurrency(
                    selectedRequest.estimatedMonthlyServicing,
                    currencyCode
                  ),
                },
                ...selectedRequest.charges.map((charge) => ({
                  detail: `${chargeCollectionDescription(charge.collectionMode)} · ${formatStatus(charge.status)}`,
                  icon: "ReceiptText",
                  label: charge.name,
                  value: formatCurrency(charge.amount, currencyCode),
                })),
                ...(selectedRequest.purpose
                  ? [
                      {
                        detail: selectedRequest.purpose,
                        icon: "MessageSquareText",
                        label: "Purpose",
                      },
                    ]
                  : []),
                ...(selectedRequest.reviewNotes
                  ? [
                      {
                        detail: selectedRequest.reviewNotes,
                        icon: "FileCheck2",
                        label: "Review note",
                      },
                    ]
                  : []),
              ]
            : []
        }
        title={selectedRequest?.loanProductName ?? "Financing request"}
        visible={Boolean(selectedRequest)}
      />
    </SafeArea>
  )
}
