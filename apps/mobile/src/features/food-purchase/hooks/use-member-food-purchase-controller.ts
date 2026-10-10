import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  createMobileMemberFoodPurchaseApplication,
  getMobileMemberFoodPurchase,
  getMobileMemberFoodPurchaseApplication,
  getMobileMemberFoodPurchaseApplications,
} from "../api/member-food-purchase-api"
import type { MobileMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { presentMemberFoodPurchaseForQa } from "../model/member-food-purchase-qa"
import type {
  MobileFoodPurchaseApplication,
  MobileMemberFoodPurchase,
} from "../model/member-food-purchase-types"
import {
  formatFoodPurchaseCurrency,
  formatFoodPurchaseMonth,
  parseFoodPurchaseAmount,
  parseFoodPurchasePositiveInteger,
  presentFoodPurchaseCharges,
} from "../model/member-food-purchase-presentation"

export function useMemberFoodPurchaseController({
  initialEntityId,
  qaState,
}: {
  initialEntityId: string | null
  qaState: MobileMemberCooperativeServiceQaState | null
}) {
  const { profile } = useAuthContext()
  const [foodPurchase, setFoodPurchase] =
    useState<MobileMemberFoodPurchase | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [cycleId, setCycleId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("1")
  const [itemDescription, setItemDescription] = useState("")
  const [requestNotes, setRequestNotes] = useState("")
  const [submissionKey, setSubmissionKey] = useState(createClientSubmissionKey)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingSuccess, setPendingSuccess] = useState<string | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const [selectedApplication, setSelectedApplication] =
    useState<MobileFoodPurchaseApplication | null>(null)
  const queuedSuccessRef = useRef<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const loadRequestRef = useRef(0)

  const canUseServerFoodPurchase = canUseMobileFeatureData(profile, "member")
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleFoodPurchase = isMobileReadCacheStale(foodPurchase?.cache)
  const canStartApplication = Boolean(
    foodPurchase?.canCreateApplication && !hasStaleFoodPurchase
  )
  const foodPurchaseDraft = useMemo(
    () => ({
      cycleId,
      itemDescription,
      requestedAmount,
      requestedPaybackMonths,
      requestNotes,
      submissionKey,
    }),
    [
      cycleId,
      itemDescription,
      requestedAmount,
      requestedPaybackMonths,
      requestNotes,
      submissionKey,
    ]
  )
  const clearFoodPurchaseDraft = useMobileFormDraft({
    enabled: canUseServerFoodPurchase,
    key: "member.food-purchase.create",
    onHydrate: (draft) => {
      setCycleId(draft.cycleId)
      setRequestedAmount(draft.requestedAmount)
      setRequestedPaybackMonths(draft.requestedPaybackMonths)
      setItemDescription(draft.itemDescription)
      setRequestNotes(draft.requestNotes)
      setSubmissionKey(draft.submissionKey || createClientSubmissionKey())
    },
    value: foodPurchaseDraft,
  })
  const openCycles = useMemo(
    () => foodPurchase?.cycles.filter((cycle) => cycle.status === "open") ?? [],
    [foodPurchase?.cycles]
  )
  const activeObligation = useMemo(
    () =>
      foodPurchase?.applications.find((application) => {
        const approvedAmount = application.approvedAmount ?? 0
        return approvedAmount > application.paidAmount
      }) ?? null,
    [foodPurchase?.applications]
  )
  const amount = parseFoodPurchaseAmount(requestedAmount)
  const paybackMonths = parseFoodPurchasePositiveInteger(requestedPaybackMonths)
  const canSubmit = Boolean(
    foodPurchase?.canCreateApplication &&
    cycleId &&
    amount > 0 &&
    paybackMonths > 0 &&
    paybackMonths <= (foodPurchase?.policy.maximumPaybackMonths ?? 0) &&
    !hasStaleFoodPurchase &&
    !isSubmitting
  )
  const selectedCycle = foodPurchase?.cycles.find(
    (cycle) => cycle.id === cycleId
  )
  const hasDraft = Boolean(
    requestedAmount.trim() ||
    requestedPaybackMonths.trim() !== "1" ||
    itemDescription.trim() ||
    requestNotes.trim()
  )
  const chargeEstimate = presentFoodPurchaseCharges(
    foodPurchase?.chargeOptions ?? [],
    amount
  )
  const reviewRows = [
    {
      detail: selectedCycle
        ? `${formatFoodPurchaseMonth(selectedCycle.periodMonth)} cycle`
        : "No open cycle selected",
      icon: "ShoppingBasket",
      label: "Amount",
      value: amount
        ? formatFoodPurchaseCurrency(amount, currencyCode)
        : "Not set",
    },
    {
      icon: "CalendarClock",
      label: "Payback",
      value: paybackMonths ? `${paybackMonths} months` : "Not set",
    },
    ...(itemDescription.trim()
      ? [
          {
            detail: requestNotes.trim() || "No additional note",
            icon: "ClipboardList",
            label: "Items requested",
            value: itemDescription.trim(),
          },
        ]
      : []),
    ...(chargeEstimate.total > 0
      ? [
          {
            icon: "ReceiptText",
            label: "Charges",
            value: formatFoodPurchaseCurrency(
              chargeEstimate.total,
              currencyCode
            ),
          },
        ]
      : []),
  ]

  const loadFoodPurchase = useCallback(async () => {
    const requestId = loadRequestRef.current + 1
    loadRequestRef.current = requestId

    if (!canUseServerFoodPurchase) {
      setFoodPurchase(null)
      setError(null)
      setIsLoading(false)
      return
    }

    if (qaState === "error") {
      setFoodPurchase(null)
      setError("Foodstuff Purchase could not load. No application was changed.")
      setIsLoading(false)
      return
    }

    if (qaState === "loading") {
      setFoodPurchase(null)
      setError(null)
      setIsLoading(true)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await getMobileMemberFoodPurchase()
      if (loadRequestRef.current !== requestId) return

      const presented = presentMemberFoodPurchaseForQa(response, qaState)
      setFoodPurchase(presented)
      setCycleId((currentCycleId) => {
        if (
          currentCycleId &&
          presented.cycles.some(
            (cycle) => cycle.id === currentCycleId && cycle.status === "open"
          )
        ) {
          return currentCycleId
        }

        return (
          presented.cycles.find((cycle) => cycle.status === "open")?.id ?? ""
        )
      })
    } catch {
      if (loadRequestRef.current === requestId) {
        setError("Foodstuff Purchase is unavailable.")
      }
    } finally {
      if (loadRequestRef.current === requestId) setIsLoading(false)
    }
  }, [canUseServerFoodPurchase, qaState])

  useEffect(() => {
    void loadFoodPurchase()
    return () => {
      loadRequestRef.current += 1
    }
  }, [loadFoodPurchase, refreshKey])

  useEffect(() => {
    if (
      !initialEntityId ||
      !canUseServerFoodPurchase ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }

    handledNotificationEntityRef.current = initialEntityId
    let mounted = true
    setIsDestinationUnavailable(false)

    void getMobileMemberFoodPurchaseApplication(initialEntityId)
      .then((detail) => {
        if (!mounted) return
        if (detail) {
          setSelectedApplication(detail)
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
  }, [canUseServerFoodPurchase, initialEntityId])

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
    }, 600)
  }, [isFormVisible, pendingSuccess])

  async function loadMoreApplications() {
    const cursor = foodPurchase?.applicationNextCursor
    if (!cursor || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const page = await getMobileMemberFoodPurchaseApplications({ cursor })
      setFoodPurchase((current) =>
        current
          ? {
              ...current,
              applicationNextCursor: page.nextCursor,
              applications: [...current.applications, ...page.data],
            }
          : current
      )
    } catch {
      setError("More Foodstuff Purchase applications could not be loaded.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function openApplicationDetail(
    application: MobileFoodPurchaseApplication
  ) {
    setSelectedApplication(application)
    try {
      const detail = await getMobileMemberFoodPurchaseApplication(
        application.id
      )
      if (detail) setSelectedApplication(detail)
    } catch {
      setError("Foodstuff Purchase application details could not be refreshed.")
    }
  }

  async function submitApplication() {
    if (hasStaleFoodPurchase) {
      setError("Refresh Foodstuff Purchase data before submitting.")
      return
    }
    if (!canSubmit) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMobileMemberFoodPurchaseApplication({
        cycleId,
        itemDescription: itemDescription.trim() || undefined,
        requestedAmount: amount,
        requestedPaybackMonths: paybackMonths,
        requestNotes: requestNotes.trim() || undefined,
        submissionKey,
      })
      await clearFoodPurchaseDraft()
      queuedSuccessRef.current = "Foodstuff Purchase application submitted."
      setIsReviewingSubmit(false)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Foodstuff Purchase application could not be submitted."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReviewDismissed() {
    const nextSuccess = queuedSuccessRef.current
    if (!nextSuccess) return

    queuedSuccessRef.current = null
    setRequestedAmount("")
    setRequestedPaybackMonths("1")
    setItemDescription("")
    setRequestNotes("")
    setSubmissionKey(createClientSubmissionKey())
    setPendingSuccess(nextSuccess)
    setIsFormVisible(false)
    void loadFoodPurchase()
  }

  function quickFill() {
    const preset = mobileDevQuickFill.foodPurchase
    setCycleId(openCycles[0]?.id ?? cycleId)
    setRequestedAmount(preset.requestedAmount)
    setRequestedPaybackMonths(preset.requestedPaybackMonths)
    setItemDescription(preset.itemDescription)
    setRequestNotes(preset.requestNotes)
  }

  return {
    activeObligation,
    amount,
    canStartApplication,
    canSubmit,
    canUseServerFoodPurchase,
    currencyCode,
    cycleId,
    dismissDestinationUnavailable: () => setIsDestinationUnavailable(false),
    error,
    foodPurchase,
    handleReviewDismissed,
    hasDraft,
    hasStaleFoodPurchase,
    isDestinationUnavailable,
    isFormVisible,
    isLoading,
    isLoadingMore,
    isReviewingSubmit,
    isSubmitting,
    itemDescription,
    loadMoreApplications,
    openApplicationDetail,
    openCycles,
    paybackMonths,
    quickFill,
    refresh: () => setRefreshKey((value) => value + 1),
    requestNotes,
    requestedAmount,
    requestedPaybackMonths,
    reviewRows,
    selectedApplication,
    setCycleId,
    setIsFormVisible,
    setIsReviewingSubmit,
    setItemDescription,
    setRequestNotes,
    setRequestedAmount,
    setRequestedPaybackMonths,
    setSelectedApplication,
    setSuccess,
    submitApplication,
    success,
  }
}
