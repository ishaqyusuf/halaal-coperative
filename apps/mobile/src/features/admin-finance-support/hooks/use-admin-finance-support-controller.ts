import {
  canUseMobileFeatureData,
  isMobileDevFixtureSession,
} from "@/dev/mobile-dev-session"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import {
  isUnrecoverableQueryError,
  readErrorCode,
} from "@/lib/app-query-policy"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Keyboard } from "react-native"
import {
  getAdminFinanceDesk,
  runAdminFinanceSupportCommand,
} from "../api/admin-finance-support-api"
import type { AdminFinanceActionDraft } from "../components/admin-finance-action-form"
import type { AdminFinanceOperationPath } from "../components/admin-finance-operations-grid"
import {
  adminFinanceActionNeedsLongForm,
  getAdminFinanceActionDecision,
  parseAdminFinancePositiveNumber,
  type AdminFinanceSupportReviewIntent,
} from "../model/admin-finance-support-action"
import {
  formatAdminFinanceCurrency,
  formatAdminFinanceStatus,
} from "../model/admin-finance-support-presentation"
import type {
  AdminFinanceSupportAction,
  AdminFinanceSupportItem,
} from "../model/admin-finance-support-types"
import {
  financeDeskItemKey,
  useAdminFinanceDesk,
} from "./use-admin-finance-desk"

const emptyDraft: AdminFinanceActionDraft = {
  adjustmentDecision: "approved",
  approvedAmount: "",
  approvedMonths: "",
  approvedStructure: null,
  approvedUnits: "",
  followUpStatus: "reminded",
  nextActionAt: "",
  note: "",
  priority: "normal",
  supportStatus: "in_progress",
}

type ReviewPhase = "form" | "review" | "submitting" | "success" | "error"
type CommandFailure = { message: string; conflict: boolean; retryable: boolean }

export function useAdminFinanceSupportController({
  initialEntityId,
}: {
  initialEntityId: string | null
}) {
  const router = useRouter()
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const canUseFinance = canUseMobileFeatureData(profile, "admin")
  const offline = runtime.state.connectivity !== "online"
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const desk = useAdminFinanceDesk(canUseFinance, offline)
  const blocked = desk.stale || offline || desk.error

  const [selectedItem, setSelectedItem] =
    useState<AdminFinanceSupportItem | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const [intent, setIntent] = useState<AdminFinanceSupportReviewIntent | null>(
    null
  )
  const [phase, setPhase] = useState<ReviewPhase>("form")
  const [draft, setDraft] = useState(emptyDraft)
  const [commandId, setCommandId] = useState(createClientSubmissionKey)
  const [restored, setRestored] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [failure, setFailure] = useState<CommandFailure | null>(null)
  const pendingAction = useRef<AdminFinanceSupportReviewIntent | null>(null)
  const handledNotification = useRef<string | null>(null)
  const submitting = useRef(false)
  const focused = useRef(true)

  const destination = useAppQuery({
    enabled: canUseFinance && !offline && initialEntityId !== null,
    placeholderData: undefined,
    queryKey: financeDeskItemKey(initialEntityId),
    queryFn: () =>
      getAdminFinanceDesk({ entityId: initialEntityId ?? undefined, limit: 1 }),
    refetchOnScreenFocus: false,
  })

  const openItem = useCallback((item: AdminFinanceSupportItem) => {
    setSelectedItem(item)
    setDetailVisible(true)
  }, [])

  useEffect(() => {
    if (!initialEntityId || handledNotification.current === initialEntityId)
      return
    const item = destination.isSuccess
      ? destination.data.items[0]
      : offline
        ? desk.allItems.find((entry) => entry.id === initialEntityId)
        : null
    if (item) {
      handledNotification.current = initialEntityId
      setIsDestinationUnavailable(false)
      openItem(item)
    } else if (destination.isSuccess || destination.isError) {
      handledNotification.current = initialEntityId
      setIsDestinationUnavailable(true)
    }
  }, [
    desk.allItems,
    destination.data,
    destination.isError,
    destination.isSuccess,
    initialEntityId,
    offline,
    openItem,
  ])

  useFocusEffect(
    useCallback(() => {
      focused.current = true
      return () => {
        focused.current = false
        Keyboard.dismiss()
        pendingAction.current = null
        setDetailVisible(false)
        setSelectedItem(null)
        setIntent(null)
      }
    }, [])
  )

  const persistedDraft = useMemo(
    () => ({ draft, commandId }),
    [draft, commandId]
  )
  const clearDraft = useMobileFormDraft({
    enabled: canUseFinance && Boolean(intent),
    freezeAfterClear: true,
    key: `admin.finance-desk.${intent?.item.queueKey}.${intent?.item.id}.${intent?.action.key}`,
    onHydrate: (value) => {
      setDraft(value.draft)
      // Keep the command ID only when retrying the same decision for this record.
      setCommandId(value.commandId)
      setRestored(true)
    },
    value: persistedDraft,
  })

  const showAction = (next: AdminFinanceSupportReviewIntent) => {
    const starting = next.action.key === "mark_under_review"
    setDraft(
      starting
        ? { ...emptyDraft, note: "Review ownership accepted." }
        : emptyDraft
    )
    setCommandId(createClientSubmissionKey())
    setFormError(null)
    setFailure(null)
    setRestored(false)
    setPhase(starting ? "review" : "form")
    setIntent(next)
  }

  const changeDraft = <K extends keyof AdminFinanceActionDraft>(
    key: K,
    value: AdminFinanceActionDraft[K]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setFormError(null)
  }

  const approvedAmount = parseAdminFinancePositiveNumber(draft.approvedAmount)
  const approvedMonths = parseAdminFinancePositiveNumber(draft.approvedMonths)
  const approvedUnits = parseAdminFinancePositiveNumber(draft.approvedUnits)
  const needsFields = Boolean(intent && adminFinanceActionNeedsLongForm(intent))
  const project = intent?.item.queueKey === "projectFinancing"
  const monthsApply =
    !project || draft.approvedStructure === "repayable_facility"

  const validateAndReview = () => {
    if (!intent || blocked) return
    const message =
      intent.action.requiresEvidence && draft.note.trim().length < 2
        ? intent.action.key === "reply"
          ? "Enter a reply before continuing."
          : "Add review evidence before continuing."
        : needsFields && approvedAmount === null
          ? "Approved amount must be a positive number."
          : needsFields &&
              monthsApply &&
              (approvedMonths === null ||
                (approvedMonths !== undefined &&
                  !Number.isInteger(approvedMonths)))
            ? "Approved months must be a positive whole number."
            : needsFields &&
                (approvedUnits === null ||
                  (approvedUnits !== undefined &&
                    !Number.isInteger(approvedUnits)))
              ? "Approved units must be a positive whole number."
              : needsFields && project && !draft.approvedStructure
                ? "Choose a financing structure."
                : null
    if (message) {
      setFormError(message)
      return
    }
    Keyboard.dismiss()
    setPhase("review")
  }

  const { invalidate } = desk
  const confirmReview = async () => {
    if (!intent || blocked || submitting.current) return
    const { action, item } = intent
    submitting.current = true
    setPhase("submitting")
    setFailure(null)
    try {
      const decision =
        action.key === "record_follow_up"
          ? draft.followUpStatus
          : action.key === "review_financial_adjustment"
            ? draft.adjustmentDecision
            : action.key === "update_support_status"
              ? draft.supportStatus
              : getAdminFinanceActionDecision(action.key)
      await runtime.runOnlineOperation(
        item.queueKey === "support" || item.queueKey === "collections"
          ? "command"
          : "financial-command",
        () =>
          runAdminFinanceSupportCommand({
            actionKey: action.key,
            approvedAmount: needsFields
              ? (approvedAmount ?? undefined)
              : undefined,
            approvedMonths:
              needsFields && monthsApply
                ? (approvedMonths ?? undefined)
                : undefined,
            approvedStructure:
              needsFields && project
                ? (draft.approvedStructure ?? undefined)
                : undefined,
            approvedUnits: needsFields
              ? (approvedUnits ?? undefined)
              : undefined,
            commandId,
            decision,
            expectedApprovalStatus:
              item.financialAdjustmentApprovalStatus === "pending"
                ? "pending"
                : undefined,
            expectedState: item.state,
            itemId: item.id,
            nextActionAt: draft.nextActionAt || undefined,
            note: draft.note.trim() || undefined,
            priority: draft.priority,
            queueKey: item.queueKey,
          })
      )
      void clearDraft().catch(() => undefined)
      void invalidate()
      if (focused.current) {
        desk.setLane(item.queueKey)
        setPhase("success")
      }
    } catch (error) {
      if (!focused.current) return
      const code = readErrorCode(error)
      setFailure({
        conflict: code === "CONFLICT" || code === "NOT_FOUND",
        message:
          error instanceof Error
            ? error.message
            : "Try again when you’re connected.",
        retryable: !isUnrecoverableQueryError(error),
      })
      setPhase("error")
    } finally {
      submitting.current = false
    }
  }

  const reviewRows = intent
    ? [
        {
          label: "Member",
          value: [intent.item.title, intent.item.member?.number]
            .filter(Boolean)
            .join(" · "),
        },
        {
          label: "Action",
          value:
            intent.action.key === "record_follow_up"
              ? formatAdminFinanceStatus(draft.followUpStatus)
              : intent.action.key === "update_support_status"
                ? formatAdminFinanceStatus(draft.supportStatus)
                : intent.action.key === "review_financial_adjustment"
                  ? formatAdminFinanceStatus(draft.adjustmentDecision)
                  : intent.action.label,
        },
        ...(needsFields && approvedAmount
          ? [
              {
                label: "Approved amount",
                value: formatAdminFinanceCurrency(approvedAmount, currencyCode),
              },
            ]
          : []),
        ...(needsFields && monthsApply && approvedMonths
          ? [{ label: "Approved months", value: String(approvedMonths) }]
          : []),
        ...(needsFields && approvedUnits
          ? [{ label: "Approved units", value: String(approvedUnits) }]
          : []),
        ...(needsFields && project && draft.approvedStructure
          ? [
              {
                label: "Structure",
                value: formatAdminFinanceStatus(draft.approvedStructure),
              },
            ]
          : []),
        ...(intent.action.key === "record_follow_up"
          ? [
              {
                label: "Priority",
                value: formatAdminFinanceStatus(draft.priority),
              },
              ...(draft.nextActionAt
                ? [{ label: "Next action", value: draft.nextActionAt }]
                : []),
            ]
          : []),
        ...(draft.note.trim()
          ? [
              {
                label: intent.action.key === "reply" ? "Reply" : "Evidence",
                value: draft.note.trim(),
              },
            ]
          : []),
      ]
    : []

  const closeAction = () => {
    if (submitting.current) return
    setIntent(null)
  }
  const quickFill = () => {
    if (!intent) return
    setDraft((current) => ({
      ...current,
      note:
        intent.action.key === "reply"
          ? mobileDevQuickFill.adminSupport.reply
          : mobileDevQuickFill.adminFinance.note,
      ...(needsFields && intent.item.queueKey === "shares"
        ? { approvedUnits: "2" }
        : {}),
      ...(needsFields && intent.item.queueKey !== "shares"
        ? {
            approvedAmount: String(intent.item.amount ?? ""),
            approvedMonths: "6",
          }
        : {}),
      ...(project && needsFields
        ? { approvedStructure: "repayable_facility" }
        : {}),
    }))
    setFormError(null)
  }

  const nextItem =
    intent && phase === "success"
      ? [...desk.laneItems(intent.item.queueKey), ...desk.allItems].find(
          (item) =>
            item.id !== intent.item.id && item.queueKey === intent.item.queueKey
        )
      : undefined

  return {
    actionStack: {
      blocked,
      currencyCode,
      draft,
      error: formError,
      failure,
      intent,
      nextItem,
      nextCount: nextItem
        ? Math.max(
            1,
            (desk.summary?.queueCounts.find(
              ({ key }) => key === nextItem.queueKey
            )?.count ?? 0) -
              Number(
                desk.allItems.some(
                  (item) =>
                    item.id === intent?.item.id &&
                    item.queueKey === intent.item.queueKey
                )
              )
          )
        : 0,
      onChange: changeDraft,
      onClose: closeAction,
      onConfirm: () => void confirmReview(),
      onEdit: () => setPhase("form"),
      onNext: () => {
        if (!nextItem) return
        setIntent(null)
        desk.setLane(nextItem.queueKey)
        openItem(nextItem)
      },
      onQuickFill: quickFill,
      onReload: () => {
        setIntent(null)
        desk.refresh()
      },
      onReview: validateAndReview,
      phase,
      restored,
      reviewRows,
    },
    detailSheet: {
      blocked,
      currencyCode,
      item: selectedItem,
      onAction: (action: AdminFinanceSupportAction) => {
        if (!selectedItem || blocked) return
        pendingAction.current = { action, item: selectedItem }
        setDetailVisible(false)
      },
      onClose: () => setDetailVisible(false),
      onDismissed: () => {
        const next = pendingAction.current
        pendingAction.current = null
        setSelectedItem(null)
        if (next && !blocked) showAction(next)
      },
      visible: detailVisible,
    },
    dismissDestinationNotice: () => setIsDestinationUnavailable(false),
    isDestinationUnavailable,
    queue: {
      currencyCode,
      desk,
      offline,
      onOpenItem: openItem,
      onOpenOperation: (href: AdminFinanceOperationPath) => router.push(href),
      tenantName: isMobileDevFixtureSession()
        ? "Amana Savings Cooperative"
        : (profile?.tenant.name ?? "Your cooperative"),
    },
  }
}
