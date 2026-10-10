import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import type { MobileMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  getMemberGuarantorApprovals,
  respondMemberGuarantorApproval,
} from "../api/member-guarantor-api"
import type {
  MobileGuarantorDecision,
  MobileGuarantorRequest,
  MobileMemberGuarantorSnapshot,
} from "../model/member-guarantor-types"
import {
  formatGuarantorCurrency,
  presentGuarantorApproval,
} from "../model/member-guarantor-presentation"
import {
  getGuarantorResponseRestriction,
  presentMemberGuarantorApprovalsForQa,
} from "../model/member-guarantor-qa"

type PendingDecision = {
  approvalId: string
  decision: MobileGuarantorDecision
}

export function useMemberGuarantorApprovalsController({
  initialEntityId,
  qaState,
}: {
  initialEntityId: string | null
  qaState: MobileMemberCooperativeServiceQaState | null
}) {
  const { profile } = useAuthContext()
  const [snapshot, setSnapshot] =
    useState<MobileMemberGuarantorSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submittingApprovalId, setSubmittingApprovalId] = useState<
    string | null
  >(null)
  const [notesByApprovalId, setNotesByApprovalId] = useState<
    Record<string, string>
  >({})
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(
    null
  )
  const [detailApproval, setDetailApproval] =
    useState<MobileGuarantorRequest | null>(null)
  const [pendingDecision, setPendingDecision] =
    useState<PendingDecision | null>(null)
  const [isResponseVisible, setIsResponseVisible] = useState(false)
  const [responseError, setResponseError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingSuccess, setPendingSuccess] = useState<string | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const queuedDecisionRef = useRef<PendingDecision | null>(null)
  const queuedResponseReopenRef = useRef(false)
  const queuedSuccessRef = useRef<{
    approvalId: string
    message: string
  } | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadRequestRef = useRef(0)

  const canUseServerApprovals = canUseMobileFeatureData(profile, "member")
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleApprovals = isMobileReadCacheStale(snapshot?.cache)
  const responseRestriction = getGuarantorResponseRestriction(qaState)
  const isActionBlocked = Boolean(
    hasStaleApprovals || responseRestriction || submittingApprovalId
  )
  const pendingApprovals = useMemo(
    () =>
      snapshot?.approvals.filter((approval) => approval.status === "pending") ??
      [],
    [snapshot?.approvals]
  )
  const resolvedApprovals = useMemo(
    () =>
      snapshot?.approvals.filter((approval) => approval.status !== "pending") ??
      [],
    [snapshot?.approvals]
  )
  const selectedApproval = snapshot?.approvals.find(
    (approval) => approval.id === selectedApprovalId
  )
  const responseNote = selectedApprovalId
    ? (notesByApprovalId[selectedApprovalId] ?? "")
    : ""
  const hasDraft = Object.values(notesByApprovalId).some((note) => note.trim())
  const draft = useMemo(() => ({ notesByApprovalId }), [notesByApprovalId])
  const clearDraft = useMobileFormDraft({
    enabled: canUseServerApprovals,
    key: "member.guarantor-approvals.respond",
    onHydrate: (savedDraft) =>
      setNotesByApprovalId(savedDraft.notesByApprovalId),
    value: draft,
  })
  const reviewRows = useMemo(() => {
    const approval = snapshot?.approvals.find(
      (item) => item.id === pendingDecision?.approvalId
    )
    if (!approval) return []

    const row = presentGuarantorApproval(approval, currencyCode)
    const note = notesByApprovalId[approval.id]?.trim()
    return [
      {
        detail: row.borrowerContext,
        icon: "UserRoundCheck",
        label: row.borrower,
        value: pendingDecision?.decision === "approved" ? "Approve" : "Reject",
      },
      {
        detail: `${row.monthlyServicing} monthly · ${row.term}`,
        icon: "CircleDollarSign",
        label: "Requested amount",
        value: row.requestedAmount,
      },
      ...(note
        ? [
            {
              detail: note,
              icon: "MessageSquareText",
              label: "Response note",
              value: undefined,
            },
          ]
        : []),
    ]
  }, [currencyCode, notesByApprovalId, pendingDecision, snapshot?.approvals])

  const loadApprovals = useCallback(async () => {
    const requestId = loadRequestRef.current + 1
    loadRequestRef.current = requestId

    if (!canUseServerApprovals) {
      setSnapshot(null)
      setError(null)
      setIsLoading(false)
      return
    }

    if (qaState === "error") {
      setSnapshot(null)
      setError("Guarantor approvals could not load. No response was changed.")
      setIsLoading(false)
      return
    }

    if (qaState === "loading") {
      setSnapshot(null)
      setError(null)
      setIsLoading(true)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await getMemberGuarantorApprovals()
      if (loadRequestRef.current !== requestId) return
      setSnapshot(presentMemberGuarantorApprovalsForQa(response, qaState))
    } catch {
      if (loadRequestRef.current === requestId) {
        setError("Guarantor approvals are unavailable.")
      }
    } finally {
      if (loadRequestRef.current === requestId) setIsLoading(false)
    }
  }, [canUseServerApprovals, qaState])

  useEffect(() => {
    void loadApprovals()
    return () => {
      loadRequestRef.current += 1
    }
  }, [loadApprovals, refreshKey])

  useEffect(() => {
    if (
      !initialEntityId ||
      !snapshot ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }

    handledNotificationEntityRef.current = initialEntityId
    const approval = snapshot.approvals.find(
      (item) => item.id === initialEntityId
    )
    if (approval) {
      setIsDestinationUnavailable(false)
      setDetailApproval(approval)
      return
    }
    setIsDestinationUnavailable(true)
  }, [initialEntityId, snapshot])

  useEffect(
    () => () => {
      if (successTimerRef.current !== null) {
        clearTimeout(successTimerRef.current)
      }
    },
    []
  )

  useEffect(() => {
    if (!pendingSuccess || isResponseVisible || pendingDecision) return
    if (successTimerRef.current !== null) {
      clearTimeout(successTimerRef.current)
    }

    successTimerRef.current = setTimeout(() => {
      setSuccess(pendingSuccess)
      setPendingSuccess(null)
      successTimerRef.current = null
    }, 600)
  }, [isResponseVisible, pendingDecision, pendingSuccess])

  function openResponse(approvalId: string) {
    if (isActionBlocked) return
    setError(null)
    setResponseError(null)
    setSelectedApprovalId(approvalId)
    setIsResponseVisible(true)
  }

  function closeResponse() {
    setResponseError(null)
    setIsResponseVisible(false)
  }

  function handleResponseDismissed() {
    const decision = queuedDecisionRef.current
    if (!decision) return
    queuedDecisionRef.current = null
    setPendingDecision(decision)
  }

  function changeResponseNote(value: string) {
    if (!selectedApprovalId) return
    setResponseError(null)
    setNotesByApprovalId((current) => ({
      ...current,
      [selectedApprovalId]: value,
    }))
  }

  function quickFill(note: string) {
    changeResponseNote(note)
  }

  function queueDecision(decision: MobileGuarantorDecision) {
    if (!selectedApprovalId || isActionBlocked) return
    if (decision === "rejected" && !responseNote.trim()) {
      setResponseError("Add a reason before rejecting this request.")
      return
    }

    setResponseError(null)
    queuedDecisionRef.current = {
      approvalId: selectedApprovalId,
      decision,
    }
    setIsResponseVisible(false)
  }

  function closeReview() {
    queuedResponseReopenRef.current = true
    setPendingDecision(null)
  }

  async function submitDecision() {
    if (!pendingDecision || submittingApprovalId) return
    if (hasStaleApprovals || responseRestriction) {
      setError("Refresh guarantor approval data before responding.")
      return
    }

    const { approvalId, decision } = pendingDecision
    setError(null)
    setSuccess(null)
    setSubmittingApprovalId(approvalId)

    try {
      await respondMemberGuarantorApproval({
        decisionConfirmed: true,
        guarantorApprovalId: approvalId,
        notes: notesByApprovalId[approvalId]?.trim() || undefined,
        status: decision,
      })
      await clearDraft()
      queuedSuccessRef.current = {
        approvalId,
        message: `Guarantor request ${decision}.`,
      }
      queuedResponseReopenRef.current = false
      setPendingDecision(null)
    } catch (submissionError) {
      setResponseError(
        submissionError instanceof Error
          ? submissionError.message
          : "Guarantor response could not be saved."
      )
      queuedResponseReopenRef.current = true
      setPendingDecision(null)
    } finally {
      setSubmittingApprovalId(null)
    }
  }

  function handleReviewDismissed() {
    const queuedSuccess = queuedSuccessRef.current
    if (queuedSuccess) {
      queuedSuccessRef.current = null
      setNotesByApprovalId((current) => ({
        ...current,
        [queuedSuccess.approvalId]: "",
      }))
      setSelectedApprovalId(null)
      setPendingSuccess(queuedSuccess.message)
      void loadApprovals()
      return
    }

    if (queuedResponseReopenRef.current) {
      queuedResponseReopenRef.current = false
      setIsResponseVisible(true)
    }
  }

  const detailRows = detailApproval
    ? (() => {
        const row = presentGuarantorApproval(detailApproval, currencyCode)
        return [
          {
            detail: row.borrowerContext,
            icon: "UserRoundCheck",
            label: row.borrower,
            value: row.status,
          },
          {
            detail: `${row.monthlyServicing} monthly · ${row.term}`,
            icon: "CircleDollarSign",
            label: "Requested amount",
            value: row.requestedAmount,
          },
          ...(row.purpose
            ? [
                {
                  detail: row.purpose,
                  icon: "ClipboardList",
                  label: "Purpose",
                  value: undefined,
                },
              ]
            : []),
          ...(row.responseNotes
            ? [
                {
                  detail: row.responseNotes,
                  icon: "MessageSquareText",
                  label: "Response note",
                  value: undefined,
                },
              ]
            : []),
        ]
      })()
    : []

  return {
    canUseServerApprovals,
    changeResponseNote,
    closeDetail: () => setDetailApproval(null),
    closeResponse,
    closeReview,
    currencyCode,
    detailApproval,
    detailRows,
    dismissDestinationUnavailable: () => setIsDestinationUnavailable(false),
    error,
    handleResponseDismissed,
    handleReviewDismissed,
    hasDraft,
    hasStaleApprovals,
    isActionBlocked,
    isDestinationUnavailable,
    isLoading,
    isResponseVisible,
    openDetail: setDetailApproval,
    openResponse,
    pendingApprovals,
    pendingDecision,
    queueDecision,
    quickFill,
    refresh: () => setRefreshKey((value) => value + 1),
    resolvedApprovals,
    responseError,
    responseNote,
    responseRestriction,
    reviewRows,
    selectedApproval: selectedApproval ?? null,
    setSuccess,
    snapshot,
    submitDecision,
    submittingApprovalId,
    success,
    selectedAmount: selectedApproval
      ? formatGuarantorCurrency(
          selectedApproval.loanRequest.requestedAmount,
          currencyCode
        )
      : null,
  }
}
