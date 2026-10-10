import type { ConfirmationRowProps } from "@/components/app/confirmation-row"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Keyboard } from "react-native"
import {
  getAdminFinanceSupportOverview,
  runAdminFinanceSupportCommand,
} from "../api/admin-finance-support-api"
import type { AdminFinanceOperationPath } from "../components/admin-finance-operations-sheet"
import type { AdminFinanceActionDraft } from "../components/admin-finance-action-form"
import {
  adminFinanceActionNeedsLongForm,
  getAdminFinanceActionDecision,
  parseAdminFinancePositiveNumber,
  type AdminFinanceSupportReviewIntent,
} from "../model/admin-finance-support-action"
import { formatAdminFinanceStatus } from "../model/admin-finance-support-presentation"
import type {
  AdminFinanceSupportAction,
  AdminFinanceSupportItem,
  AdminFinanceSupportOverview,
  AdminFinanceSupportQueueKey,
} from "../model/admin-finance-support-types"

export function useAdminFinanceSupportController({
  initialEntityId,
}: {
  initialEntityId: string | null
}) {
  const router = useRouter()
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const [overview, setOverview] = useState<AdminFinanceSupportOverview | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")
  const [queueFilter, setQueueFilter] = useState<
    "all" | AdminFinanceSupportQueueKey
  >("all")
  const [selectedItem, setSelectedItem] =
    useState<AdminFinanceSupportItem | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [operationsVisible, setOperationsVisible] = useState(false)
  const [nextActionCalendarVisible, setNextActionCalendarVisible] =
    useState(false)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const [intent, setIntent] = useState<AdminFinanceSupportReviewIntent | null>(
    null
  )
  const [compactVisible, setCompactVisible] = useState(false)
  const [fullVisible, setFullVisible] = useState(false)
  const [reviewVisible, setReviewVisible] = useState(false)
  const [successVisible, setSuccessVisible] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [note, setNote] = useState("")
  const [approvedAmount, setApprovedAmount] = useState("")
  const [approvedMonths, setApprovedMonths] = useState("")
  const [approvedUnits, setApprovedUnits] = useState("")
  const [approvedStructure, setApprovedStructure] =
    useState<AdminFinanceActionDraft["approvedStructure"]>("repayable_facility")
  const [priority, setPriority] =
    useState<AdminFinanceActionDraft["priority"]>("normal")
  const [nextActionAt, setNextActionAt] = useState("")
  const [supportStatus, setSupportStatus] =
    useState<AdminFinanceActionDraft["supportStatus"]>("in_progress")
  const [followUpStatus, setFollowUpStatus] =
    useState<AdminFinanceActionDraft["followUpStatus"]>("reminded")
  const [adjustmentDecision, setAdjustmentDecision] =
    useState<AdminFinanceActionDraft["adjustmentDecision"]>("approved")
  const [commandId, setCommandId] = useState(createClientSubmissionKey)

  const handledNotificationEntityRef = useRef<string | null>(null)
  const pendingOperationRef = useRef<AdminFinanceOperationPath | null>(null)
  const showReviewAfterFormRef = useRef(false)
  const showSuccessAfterReviewRef = useRef(false)
  const reopenIntentRef = useRef<AdminFinanceSupportReviewIntent | null>(null)
  const actionAfterDetailRef = useRef<AdminFinanceSupportReviewIntent | null>(
    null
  )
  const loadRequestRef = useRef(0)

  const canUseFinance = canUseMobileFeatureData(profile, "admin")
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const tenantName = profile?.tenant.name ?? "Your cooperative"
  const stale = isMobileReadCacheStale(overview?.cache)
  const offline = runtime.state.connectivity !== "online"
  const isBlocked = stale || offline

  const actionDraft = useMemo<AdminFinanceActionDraft>(
    () => ({
      adjustmentDecision,
      approvedAmount,
      approvedMonths,
      approvedStructure,
      approvedUnits,
      followUpStatus,
      nextActionAt,
      note,
      priority,
      supportStatus,
    }),
    [
      adjustmentDecision,
      approvedAmount,
      approvedMonths,
      approvedStructure,
      approvedUnits,
      followUpStatus,
      nextActionAt,
      note,
      priority,
      supportStatus,
    ]
  )

  const persistedDraft = useMemo(
    () => ({ ...actionDraft, commandId }),
    [actionDraft, commandId]
  )
  const clearDraft = useMobileFormDraft({
    enabled: canUseFinance,
    key: "admin.finance-support.review",
    onHydrate: (value) => {
      setApprovedAmount(value.approvedAmount)
      setApprovedMonths(value.approvedMonths)
      setApprovedStructure(value.approvedStructure)
      setApprovedUnits(value.approvedUnits)
      setCommandId(value.commandId)
      setNextActionAt(value.nextActionAt)
      setNote(value.note)
      setPriority(value.priority)
      setSupportStatus(value.supportStatus)
      setFollowUpStatus(value.followUpStatus)
      setAdjustmentDecision(value.adjustmentDecision)
    },
    value: persistedDraft,
  })
  const hasDraft = Boolean(
    note.trim() ||
    approvedAmount.trim() ||
    approvedMonths.trim() ||
    approvedUnits.trim() ||
    nextActionAt.trim()
  )

  const loadOverview = useCallback(async () => {
    const requestId = loadRequestRef.current + 1
    loadRequestRef.current = requestId

    if (!canUseFinance) {
      setOverview(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await getAdminFinanceSupportOverview({
        limit: 20,
        queueKey: queueFilter === "all" ? undefined : queueFilter,
        search: search || undefined,
      })
      if (loadRequestRef.current === requestId) setOverview(response)
    } catch (loadError) {
      if (loadRequestRef.current === requestId) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "The work queue is unavailable."
        )
      }
    } finally {
      if (loadRequestRef.current === requestId) setIsLoading(false)
    }
  }, [canUseFinance, queueFilter, search])

  useEffect(() => {
    void loadOverview()
    return () => {
      loadRequestRef.current += 1
    }
  }, [loadOverview])

  useEffect(() => {
    if (
      !initialEntityId ||
      !overview ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }

    handledNotificationEntityRef.current = initialEntityId
    const item = overview.items.find(
      (candidate) => candidate.id === initialEntityId
    )
    if (item) {
      setIsDestinationUnavailable(false)
      setSelectedItem(item)
      setDetailVisible(true)
      return
    }
    setIsDestinationUnavailable(true)
  }, [initialEntityId, overview])

  useFocusEffect(
    useCallback(
      () => () => {
        Keyboard.dismiss()
        actionAfterDetailRef.current = null
        pendingOperationRef.current = null
        reopenIntentRef.current = null
        showReviewAfterFormRef.current = false
        showSuccessAfterReviewRef.current = false
        setDetailVisible(false)
        setOperationsVisible(false)
        setNextActionCalendarVisible(false)
        setCompactVisible(false)
        setFullVisible(false)
        setReviewVisible(false)
        setSuccessVisible(false)
        setSelectedItem(null)
        setIntent(null)
      },
      []
    )
  )

  const resetForm = useCallback(() => {
    setNote("")
    setApprovedAmount("")
    setApprovedMonths("")
    setApprovedUnits("")
    setApprovedStructure("repayable_facility")
    setPriority("normal")
    setNextActionAt("")
    setSupportStatus("in_progress")
    setFollowUpStatus("reminded")
    setAdjustmentDecision("approved")
    setCommandId(createClientSubmissionKey())
  }, [])

  const beginAction = useCallback(
    (item: AdminFinanceSupportItem, action: AdminFinanceSupportAction) => {
      if (isBlocked) {
        setError(
          stale
            ? "Refresh the work queue before opening a review."
            : "Reconnect before opening a financial or operational command."
        )
        return
      }

      const nextIntent = { action, item }
      setIntent(nextIntent)
      setError(null)
      if (action.key === "mark_under_review") {
        setNote(
          "Review ownership accepted after checking the current queue state."
        )
        showReviewAfterFormRef.current = true
        setCompactVisible(true)
        return
      }
      if (adminFinanceActionNeedsLongForm(nextIntent)) setFullVisible(true)
      else setCompactVisible(true)
    },
    [isBlocked, stale]
  )

  const openItem = useCallback((item: AdminFinanceSupportItem) => {
    setSelectedItem(item)
    setDetailVisible(true)
  }, [])

  const selectOperation = useCallback((path: AdminFinanceOperationPath) => {
    pendingOperationRef.current = path
    setOperationsVisible(false)
  }, [])

  const operationsDismissed = useCallback(() => {
    const path = pendingOperationRef.current
    pendingOperationRef.current = null
    if (path) router.push(path)
  }, [router])

  const chooseDetailAction = useCallback(
    (action: AdminFinanceSupportAction) => {
      if (!selectedItem) return
      actionAfterDetailRef.current = { action, item: selectedItem }
      setDetailVisible(false)
    },
    [selectedItem]
  )

  const detailDismissed = useCallback(() => {
    const nextIntent = actionAfterDetailRef.current
    actionAfterDetailRef.current = null
    if (nextIntent) {
      beginAction(nextIntent.item, nextIntent.action)
      return
    }
    setSelectedItem(null)
  }, [beginAction])

  const quickFill = useCallback(() => {
    setNote(
      intent?.action.key === "reply"
        ? mobileDevQuickFill.adminSupport.reply
        : mobileDevQuickFill.adminFinance.note
    )
    if (intent?.item.amount) setApprovedAmount(String(intent.item.amount))
    setApprovedMonths("6")
    setApprovedUnits("2")
    setNextActionAt(
      new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
    )
    setPriority("high")
  }, [intent])

  const validateAndReview = useCallback(() => {
    if (!intent) return
    const amount = parseAdminFinancePositiveNumber(approvedAmount)
    const months = parseAdminFinancePositiveNumber(approvedMonths)
    const units = parseAdminFinancePositiveNumber(approvedUnits)
    if (intent.action.requiresEvidence && note.trim().length < 2) {
      setError("Add review evidence before continuing.")
      return
    }
    if (approvedAmount.trim() && amount === null) {
      setError("Approved amount must be a positive number.")
      return
    }
    if (
      approvedMonths.trim() &&
      (months === null || !Number.isInteger(months))
    ) {
      setError("Approved months must be a positive whole number.")
      return
    }
    if (approvedUnits.trim() && (units === null || !Number.isInteger(units))) {
      setError("Approved units must be a positive whole number.")
      return
    }

    setError(null)
    showReviewAfterFormRef.current = true
    setNextActionCalendarVisible(false)
    setCompactVisible(false)
    setFullVisible(false)
  }, [approvedAmount, approvedMonths, approvedUnits, intent, note])

  const formDismissed = useCallback(() => {
    if (!showReviewAfterFormRef.current) return
    showReviewAfterFormRef.current = false
    setReviewVisible(true)
  }, [])

  const confirmReview = useCallback(async () => {
    if (!intent || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const decision =
        intent.action.key === "record_follow_up"
          ? followUpStatus
          : intent.action.key === "review_financial_adjustment"
            ? adjustmentDecision
            : intent.action.key === "update_support_status"
              ? supportStatus
              : intent.action.key === "reply"
                ? "approved"
                : getAdminFinanceActionDecision(intent.action.key)

      await runtime.runOnlineOperation(
        intent.item.queueKey === "support" ||
          intent.item.queueKey === "collections"
          ? "command"
          : "financial-command",
        () =>
          runAdminFinanceSupportCommand({
            actionKey: intent.action.key,
            approvedAmount:
              parseAdminFinancePositiveNumber(approvedAmount) ?? undefined,
            approvedMonths:
              parseAdminFinancePositiveNumber(approvedMonths) ?? undefined,
            approvedStructure,
            approvedUnits:
              parseAdminFinancePositiveNumber(approvedUnits) ?? undefined,
            commandId,
            decision,
            expectedApprovalStatus:
              (intent.item.financialAdjustmentApprovalStatus as
                | "pending"
                | undefined) ?? undefined,
            expectedState: intent.item.state,
            itemId: intent.item.id,
            nextActionAt: nextActionAt || undefined,
            note: note.trim() || undefined,
            priority,
            queueKey: intent.item.queueKey,
          })
      )
      setSuccessMessage(`${intent.action.label} was confirmed by the server.`)
      await clearDraft()
      resetForm()
      showSuccessAfterReviewRef.current = true
      setReviewVisible(false)
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The command could not be completed."
      )
      reopenIntentRef.current = intent
      setReviewVisible(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    adjustmentDecision,
    approvedAmount,
    approvedMonths,
    approvedStructure,
    approvedUnits,
    clearDraft,
    commandId,
    followUpStatus,
    intent,
    isSubmitting,
    nextActionAt,
    note,
    priority,
    resetForm,
    runtime,
    supportStatus,
  ])

  const reviewDismissed = useCallback(() => {
    if (showSuccessAfterReviewRef.current) {
      showSuccessAfterReviewRef.current = false
      void loadOverview()
      setSuccessVisible(true)
      return
    }
    const reopen = reopenIntentRef.current
    reopenIntentRef.current = null
    if (reopen) {
      if (adminFinanceActionNeedsLongForm(reopen)) setFullVisible(true)
      else setCompactVisible(true)
    }
  }, [loadOverview])

  const reviewRows = useMemo<ConfirmationRowProps[]>(
    () => [
      {
        label: "Member",
        value: intent?.item.member?.name ?? intent?.item.title ?? "",
      },
      {
        label: "Action",
        value:
          intent?.action.key === "record_follow_up"
            ? formatAdminFinanceStatus(followUpStatus)
            : intent?.action.key === "update_support_status"
              ? formatAdminFinanceStatus(supportStatus)
              : intent?.action.key === "review_financial_adjustment"
                ? formatAdminFinanceStatus(adjustmentDecision)
                : (intent?.action.label ?? ""),
      },
      {
        label: "Expected state",
        value: intent ? formatAdminFinanceStatus(intent.item.state) : "",
      },
      {
        label: "Evidence",
        value: note.trim() || "Review ownership accepted",
      },
    ],
    [adjustmentDecision, followUpStatus, intent, note, supportStatus]
  )

  const submitSearch = useCallback(() => {
    setSearch(searchDraft.trim())
  }, [searchDraft])

  const closeCompactForm = useCallback(() => {
    setNextActionCalendarVisible(false)
    setCompactVisible(false)
  }, [])

  const closeReview = useCallback(() => {
    reopenIntentRef.current = intent
    setReviewVisible(false)
  }, [intent])

  const closeSuccess = useCallback(() => {
    setSuccessVisible(false)
    setIntent(null)
  }, [])

  return {
    actionStack: {
      compactVisible,
      draft: actionDraft,
      error,
      fullVisible,
      hasDraft,
      intent,
      isBlocked,
      isSubmitting,
      nextActionCalendarVisible,
      onAdjustmentDecisionChange: setAdjustmentDecision,
      onApprovedAmountChange: setApprovedAmount,
      onApprovedMonthsChange: setApprovedMonths,
      onApprovedStructureChange: setApprovedStructure,
      onApprovedUnitsChange: setApprovedUnits,
      onCalendarClose: () => setNextActionCalendarVisible(false),
      onCalendarOpen: () => setNextActionCalendarVisible(true),
      onCompactClose: closeCompactForm,
      onConfirmReview: () => void confirmReview(),
      onFollowUpStatusChange: setFollowUpStatus,
      onFormDismissed: formDismissed,
      onFullClose: () => setFullVisible(false),
      onNextActionAtChange: setNextActionAt,
      onNoteChange: setNote,
      onPriorityChange: setPriority,
      onQuickFill: quickFill,
      onReviewClose: closeReview,
      onReviewDismissed: reviewDismissed,
      onSuccessClose: closeSuccess,
      onSupportStatusChange: setSupportStatus,
      onValidateAndReview: validateAndReview,
      reviewRows,
      reviewVisible,
      successMessage,
      successVisible,
    },
    detailSheet: {
      currencyCode,
      item: selectedItem,
      onAction: chooseDetailAction,
      onClose: () => setDetailVisible(false),
      onDismissed: detailDismissed,
      visible: detailVisible,
    },
    dismissDestinationNotice: () => setIsDestinationUnavailable(false),
    isDestinationUnavailable,
    operationsSheet: {
      onClose: () => setOperationsVisible(false),
      onDismissed: operationsDismissed,
      onSelect: selectOperation,
      overview,
      visible: operationsVisible,
    },
    queue: {
      currencyCode,
      error: intent ? null : error,
      isLoading,
      offline,
      onOpenItem: openItem,
      onOpenOperations: () => setOperationsVisible(true),
      onQueueFilterChange: setQueueFilter,
      onRefresh: () => void loadOverview(),
      onSearch: submitSearch,
      onSearchDraftChange: setSearchDraft,
      overview,
      queueFilter,
      searchDraft,
      tenantName,
    },
  }
}
