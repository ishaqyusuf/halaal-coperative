import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { CalendarDateField } from "@/components/app/calendar-date-field"
import { useFormCalendar } from "@/hooks/use-form-calendar"
import { SectionCard } from "@/components/app/section-card"
import { ScreenHeader } from "@/components/app/screen-header"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { WorkflowDetailSheet } from "@/components/app/workflow-detail-sheet"
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
  createMemberReceipt,
  createReceiptSupportCase,
  getMemberReceiptDetail,
  getMemberReceipts,
} from "../api/member-receipts-api"
import type {
  MobileMemberReceipts,
  MobilePaymentReceipt,
  MobileReceiptAllocationCategory,
  MobileReceiptPeriodIntent,
  MobileReceiptTargetKind,
} from "../model/member-receipt-types"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Keyboard, Pressable, ScrollView, View } from "react-native"

type DraftAllocation = {
  amount: string
  category: MobileReceiptAllocationCategory
  id: string
  notes: string
  periodIntent: MobileReceiptPeriodIntent
  targetId: string
  targetMonth: string
}

const periodIntents: {
  label: string
  value: MobileReceiptPeriodIntent
}[] = [
  { label: "Current", value: "current_period" },
  { label: "Future", value: "future_period" },
  { label: "Back", value: "back_period" },
  { label: "Unspecified", value: "unspecified" },
]

function createDraftAllocation(): DraftAllocation {
  return {
    amount: "",
    category: "commitment",
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    notes: "",
    periodIntent: "current_period",
    targetId: "",
    targetMonth: new Date().toISOString().slice(0, 7),
  }
}

function allocationTargetPayload(
  targetKind: MobileReceiptTargetKind,
  targetId: string
) {
  if (!targetKind || !targetId) return {}
  return { [targetKind]: targetId }
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, "").trim())

  return Number.isFinite(amount) ? amount : 0
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function parsePaidAt(value: string) {
  const trimmed = value.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`)

  return Number.isNaN(date.getTime()) ? null : date
}

export function ReceiptsScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [receipts, setReceipts] = useState<MobileMemberReceipts | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingSuccess, setPendingSuccess] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState("")
  const [paidAt, setPaidAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [paymentReference, setPaymentReference] = useState("")
  const [proofDocumentUrl, setProofDocumentUrl] = useState("")
  const [memberNotes, setMemberNotes] = useState("")
  const [supportReceiptId, setSupportReceiptId] = useState<string | null>(null)
  const [supportDescription, setSupportDescription] = useState("")
  const [supportError, setSupportError] = useState<string | null>(null)
  const [isCreatingSupport, setIsCreatingSupport] = useState(false)
  const [isReceiptFormVisible, setIsReceiptFormVisible] = useState(false)
  const receiptCalendar = useFormCalendar(isReceiptFormVisible)
  const [isSupportFormVisible, setIsSupportFormVisible] = useState(false)
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const queuedReceiptSuccessRef = useRef<string | null>(null)
  const queuedSupportSuccessRef = useRef<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedReceipt, setSelectedReceipt] =
    useState<MobilePaymentReceipt | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const [allocations, setAllocations] = useState<DraftAllocation[]>(() => [
    createDraftAllocation(),
  ])
  const canUseServerReceipts = canUseMobileFeatureData(profile, "member")
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleReceipts = isMobileReadCacheStale(receipts?.cache)
  const allocationTotal = useMemo(
    () =>
      allocations.reduce(
        (sum, allocation) => sum + parseAmount(allocation.amount),
        0
      ),
    [allocations]
  )
  const receiptAmount = parseAmount(totalAmount)
  const receiptDraft = useMemo(
    () => ({
      allocations,
      memberNotes,
      paidAt,
      paymentReference,
      proofDocumentUrl,
      supportDescription,
      supportReceiptId,
      totalAmount,
    }),
    [
      allocations,
      memberNotes,
      paidAt,
      paymentReference,
      proofDocumentUrl,
      supportDescription,
      supportReceiptId,
      totalAmount,
    ]
  )
  const clearReceiptDraft = useMobileFormDraft({
    enabled: canUseServerReceipts,
    key: "member.receipts.create",
    onHydrate: (draft) => {
      setTotalAmount(draft.totalAmount)
      setPaidAt(draft.paidAt)
      setPaymentReference(draft.paymentReference)
      setProofDocumentUrl(draft.proofDocumentUrl)
      setMemberNotes(draft.memberNotes)
      setSupportReceiptId(draft.supportReceiptId)
      setSupportDescription(draft.supportDescription)
      if (draft.allocations.length > 0) {
        setAllocations(draft.allocations)
      }
    },
    value: receiptDraft,
  })
  const canSubmit = Boolean(
    receipts?.canCreateReceipt &&
    receiptAmount > 0 &&
    Math.abs(receiptAmount - allocationTotal) < 0.005 &&
    allocations.every((allocation) => parseAmount(allocation.amount) > 0) &&
    allocations.every((allocation) => {
      const option = receipts?.categories.find(
        (item) => item.value === allocation.category
      )
      return !option?.requiresTarget || Boolean(allocation.targetId)
    }) &&
    parsePaidAt(paidAt) &&
    !hasStaleReceipts
  )
  const hasReceiptDraft = Boolean(
    totalAmount.trim() ||
    paymentReference.trim() ||
    proofDocumentUrl.trim() ||
    memberNotes.trim() ||
    allocations.some(
      (allocation) => allocation.amount.trim() || allocation.notes.trim()
    )
  )
  const hasSupportDraft = Boolean(supportDescription.trim())
  const latestReceipt = receipts?.receipts[0] ?? null
  const reviewRows = [
    {
      detail: `${allocations.length} allocation${allocations.length === 1 ? "" : "s"} totaling ${formatCurrency(allocationTotal, currencyCode)}`,
      icon: "ReceiptText",
      label: "Receipt total",
      value: receiptAmount
        ? formatCurrency(receiptAmount, currencyCode)
        : "Not set",
    },
    {
      detail: paymentReference.trim() || "No reference entered",
      icon: "CalendarClock",
      label: "Paid date",
      value: paidAt || "Not set",
    },
    {
      detail: proofDocumentUrl.trim()
        ? "Proof link will be submitted"
        : "No proof link entered",
      icon: "FileCheck",
      label: "Proof",
      value: proofDocumentUrl.trim() ? "Linked" : "Missing",
    },
  ]
  const loadReceipts = useCallback(() => {
    let mounted = true

    if (!canUseServerReceipts) {
      setReceipts(null)
      setError(null)
      setIsLoading(false)

      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMemberReceipts()
      .then((response) => {
        if (mounted) {
          setReceipts(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Receipts are unavailable.")
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
  }, [canUseServerReceipts])

  useEffect(() => loadReceipts(), [loadReceipts])

  useEffect(() => {
    if (
      !initialEntityId ||
      !canUseServerReceipts ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }

    handledNotificationEntityRef.current = initialEntityId
    let mounted = true
    setIsDestinationUnavailable(false)
    void getMemberReceiptDetail(initialEntityId)
      .then((detail) => {
        if (!mounted) return
        if (detail) {
          setSelectedReceipt(detail)
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
  }, [canUseServerReceipts, initialEntityId])

  useEffect(
    () => () => {
      if (successTimerRef.current !== null) {
        clearTimeout(successTimerRef.current)
      }
    },
    []
  )

  useEffect(() => {
    if (
      !pendingSuccess ||
      isReceiptFormVisible ||
      isSupportFormVisible ||
      isReviewingSubmit
    ) {
      return
    }

    if (successTimerRef.current !== null) {
      clearTimeout(successTimerRef.current)
    }
    successTimerRef.current = setTimeout(() => {
      setSuccess(pendingSuccess)
      setPendingSuccess(null)
      successTimerRef.current = null
    }, 1_200)
  }, [
    isReceiptFormVisible,
    isReviewingSubmit,
    isSupportFormVisible,
    pendingSuccess,
  ])

  async function handleLoadMore() {
    const cursor = receipts?.nextCursor
    if (!cursor || isLoadingMore) return

    setIsLoadingMore(true)
    setError(null)
    try {
      const response = await getMemberReceipts(cursor)
      setReceipts((current) => {
        if (!current) return response
        const receiptsById = new Map(
          current.receipts.map((item) => [item.id, item])
        )
        response.receipts.forEach((item) => receiptsById.set(item.id, item))
        return {
          ...response,
          receipts: Array.from(receiptsById.values()),
          summary: current.summary,
        }
      })
    } catch {
      setError("More receipts could not be loaded.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  function updateAllocation(
    id: string,
    patch: Partial<Omit<DraftAllocation, "id">>
  ) {
    setAllocations((current) =>
      current.map((allocation) =>
        allocation.id === id ? { ...allocation, ...patch } : allocation
      )
    )
  }

  async function handleCreateReceiptSupport(receiptId: string) {
    if (!receipts?.canCreateSupportCase) {
      const message = "New support cases are unavailable for this cooperative."
      setError(message)
      setSupportError(message)
      return
    }
    if (supportDescription.trim().length < 5 || isCreatingSupport) return
    if (hasStaleReceipts) {
      const message =
        "Refresh receipts before opening a money-impact support case."
      setError(message)
      setSupportError(message)
      return
    }

    setError(null)
    setSubmissionError(null)
    setSupportError(null)
    setSuccess(null)
    setIsCreatingSupport(true)

    try {
      await createReceiptSupportCase({
        description: supportDescription.trim(),
        receiptId,
      })
      await clearReceiptDraft()
      queuedSupportSuccessRef.current = "Receipt support case opened."
      setIsSupportFormVisible(false)
    } catch {
      const message = "Receipt support case could not be opened."
      setError(message)
      setSupportError(message)
    } finally {
      setIsCreatingSupport(false)
    }
  }

  async function handleSubmit() {
    const paidDate = parsePaidAt(paidAt)

    if (hasStaleReceipts) {
      setError("Refresh receipts before submitting payment proof.")
      return
    }

    if (!canSubmit || !paidDate || isSubmitting) return

    setError(null)
    setSubmissionError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMemberReceipt({
        allocations: allocations.map((allocation) => ({
          amount: parseAmount(allocation.amount),
          category: allocation.category,
          ...allocationTargetPayload(
            receipts?.categories.find(
              (item) => item.value === allocation.category
            )?.targetKind ?? null,
            allocation.targetId
          ),
          notes: allocation.notes.trim() || undefined,
          periodIntent: allocation.periodIntent,
          targetPeriodStart:
            allocation.periodIntent !== "unspecified" &&
            /^\d{4}-\d{2}$/.test(allocation.targetMonth)
              ? `${allocation.targetMonth}-01T00:00:00.000Z`
              : undefined,
        })),
        memberNotes: memberNotes.trim() || undefined,
        paidAt: paidDate.toISOString(),
        paymentReference: paymentReference.trim() || undefined,
        proofDocumentUrl: proofDocumentUrl.trim() || undefined,
        totalAmount: receiptAmount,
      })
      await clearReceiptDraft()
      queuedReceiptSuccessRef.current = "Receipt submitted for finance review."
      setIsReviewingSubmit(false)
    } catch {
      const message = "Receipt could not be submitted."
      setError(message)
      setSubmissionError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <ScreenHeader
          leading={<ScreenBackButton onPress={() => router.back()} />}
          title="Receipts"
        />

        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={() => setIsDestinationUnavailable(false)}
          />
        ) : null}

        {!canUseServerReceipts ? (
          <SectionCard icon="ReceiptText" title="Receipts">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to submit and track
              receipts.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerReceipts ? (
          <>
            <CachedReadBanner cache={receipts?.cache} label="receipt data" />

            {latestReceipt ? (
              <View className="gap-3 border-b border-border pb-5">
                <Text className="text-xs font-extrabold tracking-[0.7px] text-muted-foreground uppercase">
                  Latest payment proof
                </Text>
                <Text
                  adjustsFontSizeToFit
                  className="text-[40px] leading-[44px] font-black tracking-[-1.2px] text-foreground"
                  minimumFontScale={0.72}
                  numberOfLines={1}
                >
                  {formatCurrency(latestReceipt.totalAmount, currencyCode)}
                </Text>
                <Text className="text-sm leading-5 text-muted-foreground">
                  {latestReceipt.paymentReference ??
                    formatDate(latestReceipt.paidAt)}
                  {" · submitted "}
                  {formatDate(latestReceipt.submittedAt)}
                </Text>
                <View className="flex-row items-center justify-between gap-3 border-t border-border pt-3">
                  <Text className="flex-1 text-sm font-semibold text-foreground">
                    {latestReceipt.status === "correction_requested"
                      ? "Finance needs a correction"
                      : latestReceipt.status === "approved"
                        ? "Finance approved this receipt"
                        : "Finance review in progress"}
                  </Text>
                  <StatusBadge
                    label={formatStatus(latestReceipt.status)}
                    tone={getStatusBadgeTone(latestReceipt.status)}
                  />
                </View>
              </View>
            ) : null}

            <View className="flex-row border-y border-border">
              <View className="flex-1 gap-1 py-3 pr-3">
                <Text className="text-[10px] font-extrabold tracking-[0.5px] text-muted-foreground uppercase">
                  Pending
                </Text>
                <Text className="text-base font-extrabold text-foreground">
                  {receipts?.summary.pendingReviewReceipts ?? "—"}
                </Text>
              </View>
              <View className="flex-1 gap-1 border-l border-border px-3 py-3">
                <Text className="text-[10px] font-extrabold tracking-[0.5px] text-muted-foreground uppercase">
                  Corrections
                </Text>
                <Text className="text-base font-extrabold text-foreground">
                  {receipts?.summary.correctionRequestedReceipts ?? "—"}
                </Text>
              </View>
              <View className="flex-1 gap-1 border-l border-border py-3 pl-3">
                <Text className="text-[10px] font-extrabold tracking-[0.5px] text-muted-foreground uppercase">
                  Approved
                </Text>
                <Text className="text-base font-extrabold text-foreground">
                  {receipts?.summary.approvedReceipts ?? "—"}
                </Text>
              </View>
            </View>

            {receipts?.canCreateReceipt ? (
              <>
                <Button
                  accessibilityHint="Opens a keyboard-safe receipt form"
                  className="h-12"
                  onPress={() => setIsReceiptFormVisible(true)}
                >
                  <Icon
                    name="ReceiptText"
                    className="size-base text-primary-foreground"
                  />
                  <Text>
                    {hasReceiptDraft ? "Continue receipt" : "Submit receipt"}
                  </Text>
                </Button>
                <FullScreenFormSheet
                  dirty={hasReceiptDraft}
                  footer={
                    <View className="flex-row items-center gap-3">
                      {!hasReceiptDraft ? (
                        <DevQuickFill
                          label="Quick fill receipt"
                          onPress={() => {
                            const preset = mobileDevQuickFill.receipt
                            setTotalAmount(preset.totalAmount)
                            setPaidAt(preset.paidAt)
                            setPaymentReference(preset.paymentReference)
                            setProofDocumentUrl(preset.proofDocumentUrl)
                            setMemberNotes(preset.memberNotes)
                            setAllocations([
                              {
                                amount: preset.allocationAmount,
                                category: "commitment",
                                id: `quick-fill-${Date.now()}`,
                                notes: "August monthly commitment and savings",
                                periodIntent: "current_period",
                                targetId:
                                  receipts.categories.find(
                                    (item) => item.value === "commitment"
                                  )?.targets[0]?.id ?? "",
                                targetMonth: preset.paidAt.slice(0, 7),
                              },
                            ])
                          }}
                          placement="footer"
                          portal={false}
                        />
                      ) : null}
                      <Button
                        className="h-12 flex-1"
                        disabled={!canSubmit || isSubmitting}
                        onPress={() => {
                          Keyboard.dismiss()
                          setSubmissionError(null)
                          setIsReviewingSubmit(true)
                        }}
                      >
                        <Icon
                          name="Send"
                          className="size-base text-primary-foreground"
                        />
                        <Text>
                          {isSubmitting ? "Submitting" : "Review receipt"}
                        </Text>
                      </Button>
                    </View>
                  }
                  isSubmitting={isSubmitting}
                  onClose={() => setIsReceiptFormVisible(false)}
                  overlayActive={receiptCalendar.isOpen || isReviewingSubmit}
                  overlay={
                    receiptCalendar.isOpen ? (
                      receiptCalendar.overlay
                    ) : isReviewingSubmit ||
                      queuedReceiptSuccessRef.current !== null ? (
                      <SubmissionReviewSheet
                        description="Finance will review this receipt before posting."
                        error={submissionError}
                        isSubmitting={isSubmitting}
                        onClose={() => {
                          setSubmissionError(null)
                          setIsReviewingSubmit(false)
                        }}
                        onConfirm={handleSubmit}
                        onDismissed={() => {
                          const nextSuccess = queuedReceiptSuccessRef.current
                          if (!nextSuccess) return

                          queuedReceiptSuccessRef.current = null
                          setTotalAmount("")
                          setPaymentReference("")
                          setProofDocumentUrl("")
                          setMemberNotes("")
                          setAllocations([createDraftAllocation()])
                          setPendingSuccess(nextSuccess)
                          setIsReceiptFormVisible(false)
                          loadReceipts()
                        }}
                        rows={reviewRows}
                        title="Review receipt"
                        visible={isReviewingSubmit}
                      />
                    ) : null
                  }
                  title="Submit receipt"
                  visible={isReceiptFormVisible}
                >
                  <View className="gap-3">
                    <FormStateBanner
                      hasDraft={hasReceiptDraft}
                      isStale={hasStaleReceipts}
                    />
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Total amount
                      </Text>
                      <Input
                        accessibilityLabel="Receipt total amount"
                        editable={!isSubmitting}
                        keyboardType="numeric"
                        onChangeText={setTotalAmount}
                        placeholder="Total amount"
                        value={totalAmount}
                      />
                    </View>
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Payment reference
                      </Text>
                      <Input
                        accessibilityLabel="Receipt payment reference"
                        autoCapitalize="none"
                        editable={!isSubmitting}
                        onChangeText={setPaymentReference}
                        placeholder="Payment reference"
                        value={paymentReference}
                      />
                    </View>
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Paid date
                      </Text>
                      <CalendarDateField
                        accessibilityLabel="Receipt paid date"
                        disabled={isSubmitting}
                        onPress={() =>
                          receiptCalendar.open({
                            label: "Paid date",
                            value: paidAt,
                            onChange: setPaidAt,
                            maximumDate: new Date().toISOString().slice(0, 10),
                          })
                        }
                        value={paidAt}
                      />
                    </View>
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Proof link
                      </Text>
                      <Input
                        accessibilityLabel="Receipt proof link"
                        autoCapitalize="none"
                        editable={!isSubmitting}
                        onChangeText={setProofDocumentUrl}
                        placeholder="Proof link"
                        value={proofDocumentUrl}
                      />
                    </View>

                    <View className="gap-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-semibold text-foreground">
                          Allocations
                        </Text>
                        <Button
                          className="h-9"
                          onPress={() =>
                            setAllocations((current) => [
                              ...current,
                              createDraftAllocation(),
                            ])
                          }
                          variant="outline"
                        >
                          <Icon
                            name="Plus"
                            className="size-sm text-foreground"
                          />
                          <Text>Add split</Text>
                        </Button>
                      </View>

                      {allocations.map((allocation, index) => (
                        <View
                          className="gap-3 border-b border-border pb-4"
                          key={allocation.id}
                        >
                          <View className="flex-row items-center justify-between">
                            <Text className="text-sm font-semibold text-foreground">
                              Allocation {index + 1}
                            </Text>
                            {allocations.length > 1 ? (
                              <Button
                                className="h-8 px-2"
                                onPress={() =>
                                  setAllocations((current) =>
                                    current.filter(
                                      (item) => item.id !== allocation.id
                                    )
                                  )
                                }
                                variant="ghost"
                              >
                                <Icon
                                  name="Trash2"
                                  className="size-sm text-destructive"
                                />
                              </Button>
                            ) : null}
                          </View>
                          <View className="flex-row flex-wrap gap-2">
                            {receipts.categories.map((item) => {
                              const isActive =
                                item.value === allocation.category

                              return (
                                <Button
                                  className="h-9"
                                  key={item.value}
                                  onPress={() =>
                                    updateAllocation(allocation.id, {
                                      category: item.value,
                                      targetId: item.targets[0]?.id ?? "",
                                    })
                                  }
                                  variant={isActive ? "secondary" : "outline"}
                                >
                                  <Text>{item.label}</Text>
                                </Button>
                              )
                            })}
                          </View>
                          {(() => {
                            const option = receipts.categories.find(
                              (item) => item.value === allocation.category
                            )
                            if (!option) return null
                            return (
                              <View className="gap-2">
                                {option.targets.map((target) => (
                                  <Button
                                    className="min-h-10 justify-start"
                                    key={target.id}
                                    onPress={() =>
                                      updateAllocation(allocation.id, {
                                        targetId: target.id,
                                      })
                                    }
                                    variant={
                                      allocation.targetId === target.id
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    <Text>{target.label}</Text>
                                  </Button>
                                ))}
                                {option.requiresTarget &&
                                option.targets.length === 0 ? (
                                  <Text className="text-sm font-medium text-destructive">
                                    No payable target is currently available.
                                  </Text>
                                ) : null}
                                {!option.postable ? (
                                  <Text className="text-sm leading-5 text-muted-foreground">
                                    Finance can review this staged allocation,
                                    but it cannot post until a dedicated ledger
                                    exists.
                                  </Text>
                                ) : null}
                              </View>
                            )
                          })()}
                          <Input
                            accessibilityLabel={`Allocation ${index + 1} amount`}
                            editable={!isSubmitting}
                            keyboardType="numeric"
                            onChangeText={(value) =>
                              updateAllocation(allocation.id, { amount: value })
                            }
                            placeholder="Allocation amount"
                            value={allocation.amount}
                          />
                          <View className="flex-row flex-wrap gap-2">
                            {periodIntents.map((item) => {
                              const isActive =
                                item.value === allocation.periodIntent

                              return (
                                <Button
                                  className="h-9"
                                  key={item.value}
                                  onPress={() =>
                                    updateAllocation(allocation.id, {
                                      periodIntent: item.value,
                                    })
                                  }
                                  variant={isActive ? "secondary" : "outline"}
                                >
                                  <Text>{item.label}</Text>
                                </Button>
                              )
                            })}
                          </View>
                          {allocation.periodIntent !== "unspecified" ? (
                            <CalendarDateField
                              accessibilityLabel={`Allocation ${index + 1} target month`}
                              disabled={isSubmitting}
                              precision="month"
                              placeholder="Choose target month"
                              onPress={() =>
                                receiptCalendar.open({
                                  label: "Allocation month",
                                  value: `${allocation.targetMonth}-01`,
                                  selectionMode: "month",
                                  onChange: (value) =>
                                    updateAllocation(allocation.id, {
                                      targetMonth: value.slice(0, 7),
                                    }),
                                })
                              }
                              value={allocation.targetMonth}
                            />
                          ) : null}
                          <Input
                            accessibilityLabel={`Allocation ${index + 1} notes`}
                            editable={!isSubmitting}
                            onChangeText={(value) =>
                              updateAllocation(allocation.id, { notes: value })
                            }
                            placeholder="Allocation notes"
                            value={allocation.notes}
                          />
                        </View>
                      ))}
                    </View>

                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-foreground">
                        Member notes
                      </Text>
                      <Textarea
                        accessibilityLabel="Receipt member notes"
                        editable={!isSubmitting}
                        onChangeText={setMemberNotes}
                        placeholder="Member notes"
                        value={memberNotes}
                      />
                    </View>
                    <Text className="text-sm text-muted-foreground">
                      Allocation total:{" "}
                      {formatCurrency(allocationTotal, currencyCode)}
                    </Text>
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
                  </View>
                </FullScreenFormSheet>
              </>
            ) : receipts ? (
              <View className="gap-1 border-y border-border py-4">
                <Text className="font-semibold text-foreground">
                  New receipt submissions are unavailable
                </Text>
                <Text className="text-sm leading-5 text-muted-foreground">
                  Your cooperative currently keeps receipt history readable but
                  does not allow new member submissions.
                </Text>
              </View>
            ) : null}

            <View className="gap-4 border-b border-border pb-5">
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="text-xl font-extrabold tracking-[-0.4px] text-foreground">
                  Receipt history
                </Text>
                <Text className="text-xs font-medium text-muted-foreground">
                  {receipts?.receipts.length ?? 0} receipt
                  {(receipts?.receipts.length ?? 0) === 1 ? "" : "s"}
                </Text>
              </View>
              {isLoading ? (
                <LoadingSpinner />
              ) : !receipts ? (
                <View className="items-center gap-4 py-8">
                  <EmptyState
                    description="Receipt records could not be loaded."
                    icon="ReceiptText"
                    title="Receipts unavailable"
                  />
                  <Button onPress={loadReceipts} variant="outline">
                    <Text>Try again</Text>
                  </Button>
                </View>
              ) : (
                <>
                  <VirtualizedCardList
                    data={receipts?.receipts ?? []}
                    empty={
                      <EmptyState
                        description="Submitted payment evidence will appear here before finance review."
                        icon="ReceiptText"
                        title="No payment receipts"
                      />
                    }
                    estimatedItemSize={196}
                    inline
                    keyExtractor={(receipt) => receipt.id}
                    renderItem={({ item: receipt }) => (
                      <View
                        className="gap-2 border-b border-border pb-4"
                        key={receipt.id}
                      >
                        <Pressable
                          accessibilityLabel={`View ${receipt.paymentReference ?? "receipt"} details`}
                          accessibilityRole="button"
                          className="gap-3 active:opacity-70"
                          onPress={() => setSelectedReceipt(receipt)}
                        >
                          <View className="flex-row items-start justify-between gap-3">
                            <View className="min-w-0 flex-1 gap-1">
                              <Text className="font-semibold text-foreground">
                                {receipt.paymentReference ??
                                  formatDate(receipt.paidAt)}
                              </Text>
                              <Text className="text-xs leading-5 text-muted-foreground">
                                Submitted {formatDate(receipt.submittedAt)}
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                              <StatusBadge
                                label={formatStatus(receipt.status)}
                                tone={getStatusBadgeTone(receipt.status)}
                              />
                              <Icon
                                name="ChevronRight"
                                className="size-sm text-muted-foreground"
                              />
                            </View>
                          </View>
                          <View className="flex-row border-y border-border">
                            <View className="flex-1 gap-1 py-2 pr-3">
                              <Text className="text-[10px] font-extrabold tracking-[0.5px] text-muted-foreground uppercase">
                                Amount
                              </Text>
                              <Text className="text-sm font-extrabold text-foreground">
                                {formatCurrency(
                                  receipt.totalAmount,
                                  currencyCode
                                )}
                              </Text>
                            </View>
                            <View className="flex-1 gap-1 border-l border-border py-2 pl-3">
                              <Text className="text-[10px] font-extrabold tracking-[0.5px] text-muted-foreground uppercase">
                                Allocations
                              </Text>
                              <Text className="text-sm font-extrabold text-foreground">
                                {receipt.allocations.length}
                              </Text>
                            </View>
                          </View>
                          {receipt.reviewNotes ? (
                            <Text className="text-xs leading-5 text-muted-foreground">
                              {receipt.reviewNotes}
                            </Text>
                          ) : null}
                        </Pressable>
                        {receipts?.canCreateSupportCase &&
                        supportReceiptId === receipt.id ? (
                          <>
                            <Button
                              className="h-10 self-start"
                              disabled={hasStaleReceipts || isCreatingSupport}
                              onPress={() => setIsSupportFormVisible(true)}
                              variant="outline"
                            >
                              <Icon
                                name="MessageCirclePlus"
                                className="size-base"
                              />
                              <Text>Continue support case</Text>
                            </Button>
                            <CompactFormSheet
                              dirty={hasSupportDraft}
                              isSubmitting={isCreatingSupport}
                              onClose={() => {
                                setSupportError(null)
                                setIsSupportFormVisible(false)
                              }}
                              onDismissed={() => {
                                const nextSuccess =
                                  queuedSupportSuccessRef.current
                                if (!nextSuccess) return

                                queuedSupportSuccessRef.current = null
                                setSupportReceiptId(null)
                                setSupportDescription("")
                                setSupportError(null)
                                setPendingSuccess(nextSuccess)
                                loadReceipts()
                              }}
                              title="Open receipt support case"
                              visible={isSupportFormVisible}
                            >
                              <Textarea
                                accessibilityLabel="Receipt support issue"
                                editable={!isCreatingSupport}
                                onChangeText={setSupportDescription}
                                placeholder="Describe the payment issue"
                                value={supportDescription}
                              />
                              {supportError ? (
                                <Text className="text-sm font-medium text-destructive">
                                  {supportError}
                                </Text>
                              ) : null}
                              <View className="flex-row items-center gap-3">
                                {!hasSupportDraft ? (
                                  <DevQuickFill
                                    label="Quick fill issue"
                                    onPress={() =>
                                      setSupportDescription(
                                        mobileDevQuickFill.receiptSupport
                                          .description
                                      )
                                    }
                                    placement="footer"
                                    portal={false}
                                  />
                                ) : null}
                                <Button
                                  className="h-11 flex-1"
                                  disabled={
                                    supportDescription.trim().length < 5 ||
                                    hasStaleReceipts ||
                                    isCreatingSupport
                                  }
                                  onPress={() =>
                                    handleCreateReceiptSupport(receipt.id)
                                  }
                                >
                                  <Icon
                                    name="Send"
                                    className="size-base text-primary-foreground"
                                  />
                                  <Text>
                                    {isCreatingSupport
                                      ? "Opening"
                                      : "Open case"}
                                  </Text>
                                </Button>
                              </View>
                            </CompactFormSheet>
                          </>
                        ) : receipts?.canCreateSupportCase ? (
                          <Button
                            className="h-10 self-start"
                            disabled={hasStaleReceipts || isCreatingSupport}
                            onPress={() => {
                              setSelectedReceipt(null)
                              setSupportReceiptId(receipt.id)
                              setSupportDescription("")
                              setSupportError(null)
                              setIsSupportFormVisible(true)
                              setError(null)
                              setSuccess(null)
                            }}
                            variant="ghost"
                          >
                            <Icon
                              name="MessageCirclePlus"
                              className="size-base"
                            />
                            <Text>Open support case</Text>
                          </Button>
                        ) : (
                          <Text className="text-xs leading-5 text-muted-foreground">
                            Existing receipts remain readable. New support cases
                            are disabled by your cooperative.
                          </Text>
                        )}
                      </View>
                    )}
                  />
                  {receipts?.nextCursor ? (
                    <Button
                      className="mt-4 h-11"
                      disabled={isLoadingMore}
                      onPress={handleLoadMore}
                      variant="outline"
                    >
                      <Text>
                        {isLoadingMore ? "Loading" : "Load more receipts"}
                      </Text>
                    </Button>
                  ) : null}
                </>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
      {success ? (
        <SubmissionSuccessSheet
          description={success}
          onClose={() => setSuccess(null)}
          title={
            success.includes("support") ? "Support case opened" : "Receipt sent"
          }
          visible
        />
      ) : null}
      <WorkflowDetailSheet
        onClose={() => setSelectedReceipt(null)}
        rows={
          selectedReceipt
            ? [
                {
                  detail: `Submitted ${formatDate(selectedReceipt.submittedAt)}`,
                  icon: "ReceiptText",
                  label: "Status",
                  value: formatStatus(selectedReceipt.status),
                },
                {
                  detail: `Paid ${formatDate(selectedReceipt.paidAt)}`,
                  icon: "CalendarClock",
                  label: selectedReceipt.paymentReference ?? "Payment receipt",
                  value: formatCurrency(
                    selectedReceipt.totalAmount,
                    currencyCode
                  ),
                },
                {
                  detail: selectedReceipt.allocations
                    .map((allocation) => formatStatus(allocation.category))
                    .join(" · "),
                  icon: "CircleDollarSign",
                  label: "Allocations",
                  value: String(selectedReceipt.allocations.length),
                },
                {
                  detail:
                    selectedReceipt.proofDocumentName ??
                    (selectedReceipt.proofDocumentUrl
                      ? "Payment proof link attached"
                      : "No payment proof link attached"),
                  icon: "FileCheck",
                  label: "Proof",
                  value: selectedReceipt.proofDocumentUrl
                    ? "Attached"
                    : "Not attached",
                },
                ...(selectedReceipt.reviewNotes
                  ? [
                      {
                        detail: selectedReceipt.reviewNotes,
                        icon: "MessageSquareText",
                        label: "Finance note",
                        value: "Review update",
                      },
                    ]
                  : []),
              ]
            : []
        }
        title={
          selectedReceipt?.paymentReference ??
          (selectedReceipt ? formatDate(selectedReceipt.paidAt) : "Receipt")
        }
        visible={Boolean(selectedReceipt)}
      />
    </SafeArea>
  )
}
