import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { SectionCard } from "@/components/app/section-card"
import { ScreenHeader } from "@/components/app/screen-header"
import { ScreenBackButton } from "@/components/app/screen-back-button"
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
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import {
  createMobileMemberProjectFinancingRequest,
  getMobileMemberProjectFinancingChargeQuote,
  getMobileMemberProjectFinancing,
  getMobileMemberProjectFinancingRequest,
  getMobileMemberProjectFinancingRequests,
} from "@/features/project-financing/api/member-project-financing-api"
import type {
  MobileMemberProjectFinancing,
  MobileProjectFinancingChargeQuote,
  MobileProjectFinancingRequest,
  MobileProjectFinancingStructure,
} from "@/features/project-financing/model/member-project-financing-types"
import {
  CooperativeServiceFreshness,
  CooperativeServiceStateNotice,
} from "@/features/member-cooperative-services/public/cooperative-service-state-notice"
import type { MobileMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { presentMemberProjectFinancingForQa } from "@/features/project-financing/model/member-project-financing-qa"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { formatCount } from "@/lib/format-count"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Keyboard, Pressable, ScrollView, View } from "react-native"

const projectFinancingStructures: {
  detail: string
  label: string
  value: MobileProjectFinancingStructure
}[] = [
  {
    detail: "Let finance clarify the structure during review",
    label: "Undecided",
    value: "undecided",
  },
  {
    detail: "Principal payback facility for a defined project",
    label: "Repayable",
    value: "repayable_facility",
  },
  {
    detail: "Investment-style partnership with separate accounting",
    label: "Partnership",
    value: "investment_partnership",
  },
  {
    detail: "Profit-sharing arrangement to be reviewed",
    label: "Profit sharing",
    value: "profit_sharing",
  },
]

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
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value)
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

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isRepayableRequest(request: MobileProjectFinancingRequest) {
  return (
    (request.approvedStructure ?? request.proposedStructure) ===
    "repayable_facility"
  )
}

function MobileChargeSummary({
  charges,
  feeTotal,
  currencyCode,
}: {
  charges: MobileProjectFinancingChargeQuote["charges"]
  feeTotal: number
  currencyCode: string
}) {
  return (
    <View className="gap-2 rounded-lg bg-secondary p-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-semibold text-foreground">
          Estimated submission charges
        </Text>
        <Text className="text-sm font-semibold text-foreground">
          {formatCurrency(feeTotal, currencyCode)}
        </Text>
      </View>
      {charges.map((charge) => (
        <View
          className="flex-row items-center justify-between gap-3"
          key={`${charge.id}-${charge.collectionMode}`}
        >
          <Text className="flex-1 text-xs text-muted-foreground">
            {charge.name} - {formatStatus(charge.collectionMode)}
          </Text>
          <Text className="text-xs font-medium text-foreground">
            {formatCurrency(charge.amount, currencyCode)}
          </Text>
        </View>
      ))}
      {charges.length === 0 ? (
        <Text className="text-xs leading-5 text-muted-foreground">
          No submission charges in this quote.
        </Text>
      ) : null}
      <Text className="text-xs leading-5 text-muted-foreground">
        Final charges are assessed from the cooperative settings when you
        submit.
      </Text>
    </View>
  )
}

function StructureButton({
  isSelected,
  onPress,
  structure,
}: {
  isSelected: boolean
  onPress: () => void
  structure: (typeof projectFinancingStructures)[number]
}) {
  return (
    <Pressable
      accessibilityLabel={`${structure.label}. ${structure.detail}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      className="min-h-16 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent"
      onPress={onPress}
    >
      <View
        className={
          isSelected
            ? "h-6 w-6 items-center justify-center rounded-full bg-primary"
            : "h-6 w-6 items-center justify-center rounded-full border border-border"
        }
      >
        {isSelected ? (
          <Icon name="Check" className="size-xs text-primary-foreground" />
        ) : null}
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-foreground">
          {structure.label}
        </Text>
        <Text className="text-xs leading-4 text-muted-foreground">
          {structure.detail}
        </Text>
      </View>
    </Pressable>
  )
}

function ProjectFinancingRequestCard({
  currencyCode,
  isFirst,
  onPress,
  request,
}: {
  currencyCode: string
  isFirst: boolean
  onPress: () => void
  request: MobileProjectFinancingRequest
}) {
  const outstandingAmount = Math.max(
    (request.approvedAmount ?? 0) - request.paidAmount,
    0
  )
  const resolvedStructure =
    request.approvedStructure ?? request.proposedStructure
  const isRepayable = isRepayableRequest(request)

  return (
    <Pressable
      accessibilityLabel={`View ${request.businessName} project financing details`}
      accessibilityRole="button"
      className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {request.businessName}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatStatus(resolvedStructure)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <StatusBadge
            label={formatStatus(request.status)}
            tone={getStatusBadgeTone(request.status)}
          />
          <Icon name="ChevronRight" className="size-sm text-muted-foreground" />
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2 border-y border-border">
        <View className="min-w-[120px] flex-1 gap-1 px-1 py-2">
          <Text className="text-xs font-medium text-muted-foreground">
            Requested
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(request.requestedAmount, currencyCode)}
          </Text>
        </View>
        <View className="min-w-[120px] flex-1 gap-1 border-l border-border px-3 py-2">
          <Text className="text-xs font-medium text-muted-foreground">
            {request.approvedAmount ? "Approved" : "Structure"}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {request.approvedAmount
              ? formatCurrency(request.approvedAmount, currencyCode)
              : formatStatus(resolvedStructure)}
          </Text>
        </View>
      </View>

      {isRepayable && request.estimatedMonthlyPayback ? (
        <Text className="text-sm leading-5 text-foreground">
          Estimated monthly payback{" "}
          {formatCurrency(request.estimatedMonthlyPayback, currencyCode)}
        </Text>
      ) : null}

      {request.projectPurpose ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.projectPurpose}
        </Text>
      ) : null}

      {request.businessDescription ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.businessDescription}
        </Text>
      ) : null}

      {request.approvedAmount ? (
        <Text className="text-sm leading-5 text-foreground">
          Approved {formatCurrency(request.approvedAmount, currencyCode)}
          {request.approvedStructure
            ? ` as ${formatStatus(request.approvedStructure)}`
            : ""}
          {isRepayable && request.approvedPaybackMonths
            ? ` over ${formatCount(request.approvedPaybackMonths, "month")}`
            : ""}
          .
        </Text>
      ) : null}

      {request.disbursedAt ? (
        <Text className="text-sm leading-5 text-foreground">
          Disbursed {formatDate(request.disbursedAt)}
          {request.disbursementReference
            ? ` - ${request.disbursementReference}`
            : ""}
        </Text>
      ) : null}

      {isRepayable && outstandingAmount > 0 ? (
        <Text className="text-sm leading-5 text-foreground">
          Outstanding {formatCurrency(outstandingAmount, currencyCode)}
        </Text>
      ) : null}

      <Text className="text-xs font-medium text-muted-foreground">
        Requested {formatDate(request.requestedAt)}
      </Text>

      {request.reviewNotes ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.reviewNotes}
        </Text>
      ) : null}

      {request.disbursementNotes ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.disbursementNotes}
        </Text>
      ) : null}
    </Pressable>
  )
}

export function MemberProjectFinancingScreen({
  initialEntityId = null,
  qaState = null,
}: {
  initialEntityId?: string | null
  qaState?: MobileMemberCooperativeServiceQaState | null
}) {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [projectFinancing, setProjectFinancing] =
    useState<MobileMemberProjectFinancing | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isQuoting, setIsQuoting] = useState(false)
  const [chargeQuote, setChargeQuote] =
    useState<MobileProjectFinancingChargeQuote | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [businessName, setBusinessName] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("")
  const [proposedStructure, setProposedStructure] =
    useState<MobileProjectFinancingStructure>("undecided")
  const [projectPurpose, setProjectPurpose] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [submissionKey, setSubmissionKey] = useState(createClientSubmissionKey)
  const [error, setError] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingSuccess, setPendingSuccess] = useState<string | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const queuedSuccessRef = useRef<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const currentRequestedAmountRef = useRef(0)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const [selectedRequest, setSelectedRequest] =
    useState<MobileProjectFinancingRequest | null>(null)
  const canUseServerProjectFinancing = canUseMobileFeatureData(
    profile,
    "member"
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleProjectFinancing = isMobileReadCacheStale(
    projectFinancing?.cache
  )
  const canStartProjectFinancingRequest = Boolean(
    projectFinancing?.canCreateRequest && !hasStaleProjectFinancing
  )
  const projectFinancingDraft = useMemo(
    () => ({
      businessDescription,
      businessName,
      projectPurpose,
      proposedStructure,
      requestedAmount,
      requestedPaybackMonths,
      submissionKey,
    }),
    [
      businessDescription,
      businessName,
      projectPurpose,
      proposedStructure,
      requestedAmount,
      requestedPaybackMonths,
      submissionKey,
    ]
  )
  const clearProjectFinancingDraft = useMobileFormDraft({
    enabled: canUseServerProjectFinancing,
    key: "member.project-financing.create",
    onHydrate: (draft) => {
      setBusinessName(draft.businessName)
      setRequestedAmount(draft.requestedAmount)
      setRequestedPaybackMonths(draft.requestedPaybackMonths)
      setProposedStructure(draft.proposedStructure)
      setProjectPurpose(draft.projectPurpose)
      setBusinessDescription(draft.businessDescription)
      setSubmissionKey(draft.submissionKey || createClientSubmissionKey())
    },
    value: projectFinancingDraft,
  })
  const amount = parseAmount(requestedAmount)
  currentRequestedAmountRef.current = amount
  const paybackMonths = parsePositiveInteger(requestedPaybackMonths)
  const selectedStructurePolicy = projectFinancing?.eligibleStructures.find(
    (structure) => structure.value === proposedStructure
  )
  const availableProjectFinancingStructures = useMemo(
    () =>
      projectFinancingStructures.filter((structure) =>
        projectFinancing?.eligibleStructures.some(
          (eligible) => eligible.value === structure.value
        )
      ),
    [projectFinancing?.eligibleStructures]
  )
  const hasInvalidPayback =
    (requestedPaybackMonths.trim().length > 0 && paybackMonths === 0) ||
    (selectedStructurePolicy?.requiresPaybackMonths && paybackMonths === 0) ||
    (selectedStructurePolicy?.requiresPaybackMonths === false &&
      requestedPaybackMonths.trim().length > 0)
  const canSubmit = Boolean(
    projectFinancing?.canCreateRequest &&
    businessName.trim().length >= 2 &&
    amount > 0 &&
    !hasInvalidPayback &&
    !hasStaleProjectFinancing &&
    !isSubmitting
  )
  const hasProjectFinancingDraft = Boolean(
    businessName.trim() ||
    requestedAmount.trim() ||
    requestedPaybackMonths.trim() ||
    proposedStructure !== "undecided" ||
    projectPurpose.trim() ||
    businessDescription.trim()
  )
  const reviewedChargeQuote =
    chargeQuote?.requestedAmount === amount ? chargeQuote : null
  const reviewRows = [
    {
      detail: formatStatus(proposedStructure),
      icon: "BriefcaseBusiness",
      label: businessName.trim() || "Project request",
      value: amount ? formatCurrency(amount, currencyCode) : "Not set",
    },
    ...(proposedStructure === "repayable_facility"
      ? [
          {
            detail: "Principal-only requested payback term",
            icon: "CalendarClock",
            label: "Payback months",
            value: paybackMonths ? String(paybackMonths) : "Not set",
          },
        ]
      : []),
    ...(reviewedChargeQuote
      ? [
          {
            detail:
              reviewedChargeQuote.charges.length > 0
                ? "Server quote; checked again on submission"
                : "No charges in the current server quote",
            icon: "ReceiptText",
            label: "Submission charges",
            value: formatCurrency(reviewedChargeQuote.feeTotal, currencyCode),
          },
          ...reviewedChargeQuote.charges.map((charge) => ({
            detail: formatStatus(charge.collectionMode),
            icon: "ReceiptText",
            label: charge.name,
            value: formatCurrency(charge.amount, currencyCode),
          })),
        ]
      : []),
  ]
  const loadProjectFinancing = useCallback(() => {
    let mounted = true

    if (!canUseServerProjectFinancing) {
      setProjectFinancing(null)
      setError(null)
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    if (qaState === "error") {
      setProjectFinancing(null)
      setError("Project financing could not load. No request was changed.")
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    if (qaState === "loading") {
      setProjectFinancing(null)
      setError(null)
      setIsLoading(true)
      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileMemberProjectFinancing()
      .then((response) => {
        if (mounted) {
          setProjectFinancing(
            presentMemberProjectFinancingForQa(response, qaState)
          )
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Project financing is unavailable.")
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
  }, [canUseServerProjectFinancing, qaState, refreshKey])

  useEffect(() => loadProjectFinancing(), [loadProjectFinancing])

  useEffect(() => {
    if (
      !initialEntityId ||
      !canUseServerProjectFinancing ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }

    handledNotificationEntityRef.current = initialEntityId
    let mounted = true
    setIsDestinationUnavailable(false)

    void getMobileMemberProjectFinancingRequest(initialEntityId)
      .then((detail) => {
        if (!mounted) return
        if (detail) {
          setSelectedRequest(detail)
          return
        }
        setIsDestinationUnavailable(true)
      })
      .catch(() => {
        if (mounted) setIsDestinationUnavailable(true)
      })

    return () => {
      mounted = false
    }
  }, [canUseServerProjectFinancing, initialEntityId])

  useEffect(
    () => () => {
      if (successTimerRef.current !== null) {
        clearTimeout(successTimerRef.current)
      }
    },
    []
  )

  useEffect(() => {
    if (!pendingSuccess || isFormVisible) return

    if (successTimerRef.current !== null) {
      clearTimeout(successTimerRef.current)
    }
    successTimerRef.current = setTimeout(() => {
      setSuccess(pendingSuccess)
      setPendingSuccess(null)
      successTimerRef.current = null
    }, 1_200)
  }, [isFormVisible, pendingSuccess])

  async function loadMoreRequests() {
    const cursor = projectFinancing?.requestNextCursor
    if (!cursor || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const page = await getMobileMemberProjectFinancingRequests({ cursor })
      setProjectFinancing((current) =>
        current
          ? {
              ...current,
              requestNextCursor: page.nextCursor,
              requests: [...current.requests, ...page.data],
            }
          : current
      )
    } catch {
      setError("More project financing requests could not be loaded.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function openRequestDetail(request: MobileProjectFinancingRequest) {
    setSelectedRequest(request)
    try {
      const detail = await getMobileMemberProjectFinancingRequest(request.id)
      if (detail) setSelectedRequest(detail)
    } catch {
      setError("Project financing request details could not be refreshed.")
    }
  }

  async function handleSubmit() {
    if (hasStaleProjectFinancing) {
      setError("Refresh project financing data before submitting a request.")
      return
    }

    if (!canSubmit || !reviewedChargeQuote) return

    setError(null)
    setSubmissionError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMobileMemberProjectFinancingRequest({
        businessDescription: businessDescription.trim() || undefined,
        businessName: businessName.trim(),
        chargeQuoteHash: reviewedChargeQuote.chargeQuoteHash,
        projectPurpose: projectPurpose.trim() || undefined,
        proposedStructure,
        requestedAmount: amount,
        requestedPaybackMonths: paybackMonths || undefined,
        submissionKey,
      })
      await clearProjectFinancingDraft()
      queuedSuccessRef.current = "Project financing request submitted."
      setIsReviewingSubmit(false)
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Project financing request could not be submitted."
      setError(message)
      setSubmissionError(message)
      setChargeQuote(null)
      setIsReviewingSubmit(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReview() {
    if (!canSubmit || isQuoting) return
    setIsQuoting(true)
    setError(null)
    setSubmissionError(null)
    setChargeQuote(null)
    try {
      const quote = await getMobileMemberProjectFinancingChargeQuote(amount)
      if (quote.requestedAmount !== currentRequestedAmountRef.current) {
        throw new Error(
          "Project amount changed. Review the current amount again."
        )
      }
      setChargeQuote(quote)
      setIsReviewingSubmit(true)
    } catch (quoteError) {
      setSubmissionError(
        quoteError instanceof Error
          ? quoteError.message
          : "Project financing charges could not be quoted. Try again."
      )
    } finally {
      setIsQuoting(false)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <ScreenHeader
          leading={<ScreenBackButton onPress={() => router.back()} />}
          title="Project financing"
        />
        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={() => setIsDestinationUnavailable(false)}
          />
        ) : null}
        {!canUseServerProjectFinancing ? (
          <SectionCard icon="BriefcaseBusiness" title="Project financing">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to request and track
              project financing.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerProjectFinancing ? (
          <>
            <CooperativeServiceFreshness
              cache={projectFinancing?.cache}
              label="project financing history"
              onRefresh={() => setRefreshKey((value) => value + 1)}
            />

            {error ? (
              <CooperativeServiceStateNotice
                actionLabel="Try again"
                description={error}
                onAction={() => setRefreshKey((value) => value + 1)}
                title="Project financing couldn’t load"
                tone="danger"
              />
            ) : null}

            {isLoading && !projectFinancing ? <LoadingSpinner /> : null}

            {projectFinancing ? (
              <>
                <View className="gap-3 border-b border-border pb-5">
                  <Text className="text-sm font-semibold text-muted-foreground">
                    Approved project funding
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    className="text-[40px] leading-[44px] font-black tracking-[-1.2px] text-foreground"
                    minimumFontScale={0.72}
                    numberOfLines={1}
                  >
                    {formatCurrency(
                      projectFinancing.summary.totalApprovedAmount,
                      currencyCode
                    )}
                  </Text>
                  <View className="flex-row border-y border-border">
                    <View className="flex-1 gap-1 py-3 pr-3">
                      <Text className="text-xs font-medium text-muted-foreground">
                        Requests
                      </Text>
                      <Text className="text-base font-extrabold text-foreground">
                        {projectFinancing.summary.totalRequests}
                      </Text>
                    </View>
                    <View className="flex-1 gap-1 border-l border-border px-3 py-3">
                      <Text className="text-xs font-medium text-muted-foreground">
                        Pending
                      </Text>
                      <Text className="text-base font-extrabold text-foreground">
                        {projectFinancing.summary.pendingRequests}
                      </Text>
                    </View>
                    <View className="flex-1 gap-1 border-l border-border py-3 pl-3">
                      <Text className="text-xs font-medium text-muted-foreground">
                        Active
                      </Text>
                      <Text className="text-base font-extrabold text-foreground">
                        {projectFinancing.summary.activeRequests}
                      </Text>
                    </View>
                  </View>
                </View>

                {canStartProjectFinancingRequest ? (
                  <Button
                    accessibilityHint="Opens a keyboard-safe project request form"
                    className="h-12"
                    onPress={() => setIsFormVisible(true)}
                  >
                    <Icon
                      name="BriefcaseBusiness"
                      className="size-base text-primary-foreground"
                    />
                    <Text>
                      {hasProjectFinancingDraft
                        ? "Continue project request"
                        : "New project request"}
                    </Text>
                  </Button>
                ) : !hasStaleProjectFinancing ? (
                  <CooperativeServiceStateNotice
                    description="Existing requests remain available below."
                    reasons={
                      projectFinancing.restrictionReasons.length
                        ? projectFinancing.restrictionReasons
                        : [
                            "New project financing requests are currently unavailable.",
                          ]
                    }
                    title="New request unavailable"
                  />
                ) : null}

                <View className="gap-4 border-b border-border pb-5">
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="text-xl font-extrabold tracking-[-0.4px] text-foreground">
                      Project requests
                    </Text>
                    <Text className="text-xs font-medium text-muted-foreground">
                      {projectFinancing.summary.totalRequests} request
                      {projectFinancing.summary.totalRequests === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <VirtualizedCardList
                    data={projectFinancing.requests}
                    empty={
                      <EmptyState
                        description="Submitted business funding requests will appear here."
                        icon="BriefcaseBusiness"
                        title="No project financing requests"
                      />
                    }
                    estimatedItemSize={200}
                    keyExtractor={(request) => request.id}
                    renderItem={({ index, item: request }) => (
                      <ProjectFinancingRequestCard
                        currencyCode={currencyCode}
                        isFirst={index === 0}
                        onPress={() => void openRequestDetail(request)}
                        request={request}
                      />
                    )}
                  />
                  {projectFinancing.requestNextCursor ? (
                    <Button
                      className="mt-3 h-11"
                      disabled={isLoadingMore}
                      onPress={() => void loadMoreRequests()}
                      variant="outline"
                    >
                      <Icon className="size-base text-foreground" name="Plus" />
                      <Text>
                        {isLoadingMore ? "Loading" : "Load more requests"}
                      </Text>
                    </Button>
                  ) : null}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <FullScreenFormSheet
        dirty={hasProjectFinancingDraft}
        footer={
          <View className="flex-row items-center gap-3">
            {!hasProjectFinancingDraft ? (
              <DevQuickFill
                label="Quick fill project financing request"
                onPress={() => {
                  const preset = mobileDevQuickFill.projectFinancing
                  setBusinessName(preset.businessName)
                  setRequestedAmount(preset.requestedAmount)
                  setRequestedPaybackMonths(preset.requestedPaybackMonths)
                  setProposedStructure("repayable_facility")
                  setProjectPurpose(preset.projectPurpose)
                  setBusinessDescription(preset.businessDescription)
                }}
                placement="footer"
                portal={false}
              />
            ) : null}
            <Button
              className="h-12 flex-1"
              disabled={!canSubmit || isSubmitting || isQuoting}
              onPress={() => {
                Keyboard.dismiss()
                void handleReview()
              }}
            >
              <Icon name="Send" className="size-base text-primary-foreground" />
              <Text>
                {isSubmitting
                  ? "Submitting"
                  : isQuoting
                    ? "Checking charges"
                    : "Review request"}
              </Text>
            </Button>
          </View>
        }
        isSubmitting={isSubmitting}
        onClose={() => setIsFormVisible(false)}
        overlay={
          <>
            <SubmissionReviewSheet
              description="Review this project financing request before sending it for structure and accounting review."
              error={submissionError}
              isSubmitting={isSubmitting}
              onClose={() => {
                setSubmissionError(null)
                setIsReviewingSubmit(false)
              }}
              onConfirm={handleSubmit}
              onDismissed={() => {
                const nextSuccess = queuedSuccessRef.current
                if (!nextSuccess) return

                queuedSuccessRef.current = null
                setBusinessName("")
                setRequestedAmount("")
                setRequestedPaybackMonths("")
                setProposedStructure("undecided")
                setProjectPurpose("")
                setBusinessDescription("")
                setSubmissionKey(createClientSubmissionKey())
                setPendingSuccess(nextSuccess)
                setIsFormVisible(false)
                loadProjectFinancing()
              }}
              rows={reviewRows}
              title="Review project request"
              visible={isReviewingSubmit}
            />
          </>
        }
        title="New project financing request"
        visible={isFormVisible}
      >
        <FormStateBanner
          hasDraft={hasProjectFinancingDraft}
          isStale={hasStaleProjectFinancing}
        />
        <View className="gap-1 border-b border-border pb-4">
          <Text className="text-sm font-semibold text-foreground">
            Choose a structure for finance to review
          </Text>
          <Text className="text-xs leading-5 text-muted-foreground">
            Repayable facilities, partnerships, and profit-sharing arrangements
            keep separate accounting treatment.
          </Text>
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Business name
          </Text>
          <Input
            accessibilityLabel="Project financing business name"
            editable={!isSubmitting}
            onChangeText={setBusinessName}
            placeholder="Business name"
            value={businessName}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Requested amount
          </Text>
          <Input
            accessibilityLabel="Project financing requested amount"
            editable={!isSubmitting}
            keyboardType="numeric"
            onChangeText={setRequestedAmount}
            placeholder="Requested amount"
            value={requestedAmount}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Payback months
          </Text>
          <Input
            accessibilityLabel="Project financing payback months"
            editable={!isSubmitting}
            keyboardType="numeric"
            onChangeText={setRequestedPaybackMonths}
            placeholder="Payback months, if repayable"
            value={requestedPaybackMonths}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Proposed structure
          </Text>
          {availableProjectFinancingStructures.map((structure) => (
            <StructureButton
              isSelected={structure.value === proposedStructure}
              key={structure.value}
              onPress={() => {
                setProposedStructure(structure.value)
                const policy = projectFinancing?.eligibleStructures.find(
                  (eligible) => eligible.value === structure.value
                )
                if (!policy?.requiresPaybackMonths) {
                  setRequestedPaybackMonths("")
                }
              }}
              structure={structure}
            />
          ))}
        </View>
        {selectedStructurePolicy?.requiresPaybackMonths && !paybackMonths ? (
          <Text className="text-xs leading-5 text-destructive">
            Repayable facilities require a payback term.
          </Text>
        ) : null}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Project purpose
          </Text>
          <Textarea
            accessibilityLabel="Project financing purpose"
            editable={!isSubmitting}
            onChangeText={setProjectPurpose}
            placeholder="Project purpose"
            value={projectPurpose}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Business description
          </Text>
          <Textarea
            accessibilityLabel="Project financing business description"
            editable={!isSubmitting}
            onChangeText={setBusinessDescription}
            placeholder="Business description"
            value={businessDescription}
          />
        </View>
        {reviewedChargeQuote ? (
          <MobileChargeSummary
            charges={reviewedChargeQuote.charges}
            feeTotal={reviewedChargeQuote.feeTotal}
            currencyCode={currencyCode}
          />
        ) : (
          <Text className="text-xs leading-5 text-muted-foreground">
            Submission charges, if any, will appear before you confirm this
            request.
          </Text>
        )}
        {submissionError && !isReviewingSubmit ? (
          <Text className="text-xs leading-5 text-destructive">
            {submissionError}
          </Text>
        ) : null}
      </FullScreenFormSheet>
      {success ? (
        <SubmissionSuccessSheet
          description={success}
          onClose={() => setSuccess(null)}
          title="Project request sent"
          visible
        />
      ) : null}
      <WorkflowDetailSheet
        onClose={() => setSelectedRequest(null)}
        onOpenNotifications={() => {
          setSelectedRequest(null)
          router.push("/notifications")
        }}
        onOpenReceipts={() => {
          setSelectedRequest(null)
          router.push("/(member)/receipts")
        }}
        rows={
          selectedRequest
            ? [
                {
                  detail: `Requested ${formatDate(selectedRequest.requestedAt)}`,
                  icon: "BriefcaseBusiness",
                  label: "Status",
                  value: formatStatus(selectedRequest.status),
                },
                {
                  detail: formatStatus(selectedRequest.proposedStructure),
                  icon: "CircleDollarSign",
                  label: "Requested amount",
                  value: formatCurrency(
                    selectedRequest.requestedAmount,
                    currencyCode
                  ),
                },
                ...(isRepayableRequest(selectedRequest)
                  ? [
                      {
                        detail: selectedRequest.requestedPaybackMonths
                          ? formatCount(
                              selectedRequest.requestedPaybackMonths,
                              "requested month"
                            )
                          : "Payback term pending finance review",
                        icon: "CalendarClock",
                        label: "Monthly estimate",
                        value: selectedRequest.estimatedMonthlyPayback
                          ? formatCurrency(
                              selectedRequest.estimatedMonthlyPayback,
                              currencyCode
                            )
                          : "Not set",
                      },
                    ]
                  : []),
                ...(selectedRequest.approvedAmount
                  ? [
                      {
                        detail: selectedRequest.approvedStructure
                          ? formatStatus(selectedRequest.approvedStructure)
                          : undefined,
                        icon: "BadgeCheck",
                        label: "Approved amount",
                        value: formatCurrency(
                          selectedRequest.approvedAmount,
                          currencyCode
                        ),
                      },
                    ]
                  : []),
                ...(selectedRequest.projectPurpose ||
                selectedRequest.businessDescription
                  ? [
                      {
                        detail:
                          selectedRequest.businessDescription ?? undefined,
                        icon: "ClipboardList",
                        label: "Project purpose",
                        value: selectedRequest.projectPurpose ?? "Not listed",
                      },
                    ]
                  : []),
                ...(selectedRequest.disbursedAt
                  ? [
                      {
                        detail:
                          selectedRequest.disbursementReference ??
                          "No disbursement reference",
                        icon: "ReceiptText",
                        label: "Disbursed",
                        value: formatDate(selectedRequest.disbursedAt),
                      },
                    ]
                  : []),
                ...(selectedRequest.reviewNotes
                  ? [
                      {
                        detail: selectedRequest.reviewNotes,
                        icon: "MessageSquareText",
                        label: "Review note",
                      },
                    ]
                  : []),
              ]
            : []
        }
        title={selectedRequest?.businessName ?? "Project financing"}
        visible={Boolean(selectedRequest)}
      />
    </SafeArea>
  )
}
