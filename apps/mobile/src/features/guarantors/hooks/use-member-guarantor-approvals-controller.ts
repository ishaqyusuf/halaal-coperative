import {
  canUseMobileFeatureData,
  isMobileDevFixtureSession,
} from "@/dev/mobile-dev-session"
import type { MobileMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import {
  appQueryKey,
  useAppInfiniteQuery,
  useAppQuery,
} from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useDebounce } from "@/hooks/use-debounce"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { useIsOnline } from "@/lib/online-status"
import { removeCachedMobileQuery } from "@/lib/read-cache"
import { type InfiniteData, useQueryClient } from "@tanstack/react-query"
import { TRPCClientError } from "@trpc/client"
import { useEffect, useMemo, useRef, useState } from "react"
import { matchesGuarantorSearch } from "../model/member-guarantor-presentation"
import {
  getMemberGuarantorApprovals,
  getMemberGuarantorRequest,
  GUARANTOR_CACHE_KEY,
  respondMemberGuarantorApproval,
} from "../api/member-guarantor-api"
import {
  getGuarantorResponseRestriction,
  presentMemberGuarantorApprovalsForQa,
} from "../model/member-guarantor-qa"
import type {
  MobileGuarantorCursor,
  MobileGuarantorDecision,
  MobileGuarantorRequest,
  MobileMemberGuarantorSnapshot,
} from "../model/member-guarantor-types"

type DecisionFlow = {
  approval: MobileGuarantorRequest
  decision: MobileGuarantorDecision
  phase: "note" | "confirm" | "success" | "error" | "conflict"
  editingNote?: boolean
  hadNote?: boolean
}

export type GuarantorQaOutcome = "conflict" | "error"

export const GUARANTOR_NOTE_MAX = 500

type ApprovalPages = InfiniteData<
  MobileMemberGuarantorSnapshot,
  MobileGuarantorCursor | null
>

export function useMemberGuarantorApprovalsController({
  initialEntityId,
  qaHistory,
  qaOutcome,
  qaState,
}: {
  initialEntityId: string | null
  qaHistory: boolean
  qaOutcome: GuarantorQaOutcome | null
  qaState: MobileMemberCooperativeServiceQaState | null
}) {
  const { profile } = useAuthContext()
  const queryClient = useQueryClient()
  const online = useIsOnline()
  const canRead = canUseMobileFeatureData(profile, "member")
  const scope = profile
    ? `${profile.tenant.id}:${profile.user.id}:${profile.activeMembershipId}`
    : "guest"
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const [search, setSearch] = useState("")
  const offline = !online || qaState === "offline"
  const term = useDebounce(search.trim().slice(0, 100), 275)
  const queryTerm = offline ? "" : term
  const [detail, setDetail] = useState<MobileGuarantorRequest | null>(null)
  const [flow, setFlow] = useState<DecisionFlow | null>(null)
  const [notesByApprovalId, setNotesByApprovalId] = useState<
    Record<string, string>
  >({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const pressLock = useRef(false)
  const handledEntity = useRef<string | null>(null)
  const [missingDestination, setMissingDestination] = useState(false)
  const baseKey = appQueryKey("guarantor-approvals", scope, "")
  const listKey = appQueryKey("guarantor-approvals", scope, queryTerm)
  const lookupKey = (id: string | null) =>
    appQueryKey("guarantor-request", scope, id)
  const list = useAppInfiniteQuery({
    enabled: canRead && qaState !== "error" && qaState !== "loading",
    initialPageParam: null as MobileGuarantorCursor | null,
    networkMode: "always",
    placeholderData: undefined,
    queryKey: listKey,
    queryFn: ({ pageParam }) =>
      getMemberGuarantorApprovals({ cursor: pageParam, search: queryTerm }),
    getNextPageParam: (page) =>
      page.cache?.status === "stale"
        ? undefined
        : (page.nextCursor ?? undefined),
    selectItems: (page) => page.approvals,
  })
  const simulatedUnavailable = qaState === "error" || qaState === "loading"
  const firstPage = simulatedUnavailable ? undefined : list.data?.pages[0]
  const snapshot =
    firstPage && presentMemberGuarantorApprovalsForQa(firstPage, qaState)
  const stale =
    snapshot?.cache?.status === "stale" || (list.isError && Boolean(snapshot))
  const restriction = getGuarantorResponseRestriction(qaState)
  const blocked = offline || stale || Boolean(restriction) || submitting
  const rows = [
    ...new Map(list.items.map((approval) => [approval.id, approval])).values(),
  ].filter(
    (approval) =>
      !simulatedUnavailable &&
      qaState !== "empty" &&
      (!qaHistory || approval.status !== "pending") &&
      (!offline || !term || matchesGuarantorSearch(approval, term))
  )

  const initialApproval = rows.find(
    (approval) => approval.id === initialEntityId
  )
  const lookup = useAppQuery({
    enabled:
      canRead &&
      !offline &&
      !initialApproval &&
      Boolean(initialEntityId) &&
      handledEntity.current !== initialEntityId,
    placeholderData: undefined,
    queryKey: lookupKey(initialEntityId),
    queryFn: () =>
      initialEntityId ? getMemberGuarantorRequest(initialEntityId) : null,
  })

  useEffect(() => {
    if (!initialEntityId || handledEntity.current === initialEntityId) return
    const approval = initialApproval ?? lookup.data
    if (
      approval ||
      lookup.isSuccess ||
      lookup.isError ||
      (offline && snapshot)
    ) {
      handledEntity.current = initialEntityId
      if (approval) setDetail(approval)
      else setMissingDestination(true)
    }
  }, [
    initialApproval,
    initialEntityId,
    lookup.data,
    lookup.isError,
    lookup.isSuccess,
    offline,
    snapshot,
  ])

  const draft = useMemo(() => ({ notesByApprovalId }), [notesByApprovalId])
  useMobileFormDraft({
    enabled: canRead,
    key: "member.guarantor-approvals.respond",
    onHydrate: (saved) =>
      setNotesByApprovalId((current) => ({
        ...saved.notesByApprovalId,
        ...current,
      })),
    value: draft,
  })

  const noteKey = flow ? `${flow.approval.id}:${flow.decision}` : null
  const note =
    noteKey && flow
      ? (notesByApprovalId[noteKey] ??
        notesByApprovalId[flow.approval.id] ??
        "")
      : ""

  function setNote(value: string) {
    if (!noteKey) return
    setFormError(null)
    setNotesByApprovalId((current) => ({ ...current, [noteKey]: value }))
  }

  function openDecision(
    approval: MobileGuarantorRequest,
    decision: MobileGuarantorDecision
  ) {
    if (
      blocked ||
      approval.status !== "pending" ||
      approval.loanRequest.status === "approved"
    )
      return
    setFormError(null)
    setFlow({
      approval,
      decision,
      phase: decision === "approved" ? "confirm" : "note",
    })
  }

  function editNote() {
    if (flow)
      setFlow({
        ...flow,
        editingNote: true,
        hadNote: Boolean(note.trim()),
        phase: "note",
      })
  }

  function closeNote() {
    setFormError(null)
    setFlow(flow?.editingNote ? { ...flow, phase: "confirm" } : null)
  }

  function review() {
    if (!flow || blocked) return
    if (flow.decision === "rejected" && !note.trim()) {
      setFormError("Add a reason before declining.")
      return
    }
    setFlow({ ...flow, phase: "confirm" })
  }

  async function recordUpdatedApproval(approval: MobileGuarantorRequest) {
    const detailKey = lookupKey(approval.id)
    const affectedKeys = queryTerm
      ? [baseKey, listKey, detailKey]
      : [baseKey, detailKey]
    await Promise.all(
      affectedKeys.map((queryKey) =>
        queryClient.cancelQueries({ queryKey, exact: true })
      )
    )
    for (const queryKey of queryTerm ? [baseKey, listKey] : [baseKey]) {
      queryClient.setQueryData<ApprovalPages>(queryKey, (current) => {
        if (
          !current ||
          !current.pages.some((page) =>
            page.approvals.some(
              (row) => row.id === approval.id && row.status === "pending"
            )
          )
        )
          return current
        const pages = current.pages.map((page) => ({
          ...page,
          approvals: page.approvals.filter((row) => row.id !== approval.id),
          summary: {
            ...page.summary,
            pendingApprovals: Math.max(0, page.summary.pendingApprovals - 1),
            approvedApprovals:
              page.summary.approvedApprovals +
              Number(approval.status === "approved"),
            rejectedApprovals:
              page.summary.rejectedApprovals +
              Number(approval.status === "rejected"),
          },
        }))
        // Put the answer in history immediately. The server refresh restores its
        // canonical position and page boundaries on the next screen focus.
        const lastPending = pages.findLastIndex((page) =>
          page.approvals.some((row) => row.status === "pending")
        )
        const target = pages[Math.max(0, lastPending)]
        if (target) {
          const index = target.approvals.findIndex(
            (row) => row.status !== "pending"
          )
          target.approvals.splice(
            index === -1 ? target.approvals.length : index,
            0,
            approval
          )
        }
        return { ...current, pages }
      })
    }
    queryClient.setQueryData(detailKey, approval)
    await Promise.all(
      affectedKeys.map((queryKey) =>
        queryClient.invalidateQueries({
          exact: true,
          queryKey,
          refetchType: "none",
        })
      )
    )
    await removeCachedMobileQuery(GUARANTOR_CACHE_KEY).catch(() => undefined)
  }

  async function submit() {
    if (
      !flow ||
      blocked ||
      pressLock.current ||
      (flow.decision === "rejected" && !note.trim())
    )
      return
    pressLock.current = true
    setSubmitting(true)

    try {
      if (qaOutcome === "error" && isMobileDevFixtureSession())
        throw new Error("Fixture submit error")
      const approval = await respondMemberGuarantorApproval({
        decisionConfirmed: true,
        guarantorApprovalId: flow.approval.id,
        notes: note.trim() || undefined,
        status: flow.decision,
      })
      const conflict = qaOutcome === "conflict" && isMobileDevFixtureSession()
      await recordUpdatedApproval(
        conflict ? { ...approval, answeredByMember: false } : approval
      )
      setNotesByApprovalId((current) => {
        const next = { ...current }
        delete next[approval.id]
        delete next[`${approval.id}:approved`]
        delete next[`${approval.id}:rejected`]
        return next
      })
      setFlow({
        ...flow,
        approval: conflict
          ? { ...approval, answeredByMember: false }
          : approval,
        phase: conflict ? "conflict" : "success",
      })
    } catch (error) {
      if (error instanceof TRPCClientError && error.data?.code === "CONFLICT") {
        const latest = await getMemberGuarantorRequest(flow.approval.id).catch(
          () => null
        )
        if (latest && latest.status !== "pending") {
          await recordUpdatedApproval(latest)
          setFlow({ ...flow, approval: latest, phase: "conflict" })
          return
        }
        if (error.message.includes("verification")) {
          setDetail(flow.approval)
          setFlow(null)
          setFormError(
            "Your cooperative needs to verify your membership before you can answer."
          )
          return
        }
      }
      setFlow({ ...flow, phase: "error" })
    } finally {
      pressLock.current = false
      setSubmitting(false)
    }
  }

  function refresh() {
    // Refresh the bounded first page instead of refetching all loaded pages.
    queryClient.setQueryData<ApprovalPages>(listKey, (current) =>
      current
        ? {
            pages: current.pages.slice(0, 1),
            pageParams: current.pageParams.slice(0, 1),
          }
        : current
    )
    void list.refetch()
  }

  return {
    blocked,
    canRead,
    closeDetail: () => {
      setDetail(null)
      setFormError(null)
    },
    closeFlow: () => {
      if (submitting) return
      if (flow?.phase === "success" || flow?.phase === "conflict")
        setDetail(null)
      setFlow(null)
    },
    closeNote,
    currencyCode,
    detail: detail && (rows.find((row) => row.id === detail.id) ?? detail),
    dismissDestinationUnavailable: () => setMissingDestination(false),
    editNote,
    error:
      qaState === "error" || list.isError
        ? "No answer was changed. Check your connection and try again."
        : null,
    flow,
    formError,
    isFetchingNextPage: list.isFetchingNextPage,
    isLoading:
      qaState === "loading" ||
      (list.isPending && canRead && qaState !== "error"),
    missingDestination,
    note,
    offline,
    onEndReached: offline || stale ? undefined : list.onEndReached,
    openDecision,
    openDetail: setDetail,
    refresh,
    refreshing: list.isRefetching,
    restriction,
    review,
    rows,
    search,
    setNote,
    setSearch,
    snapshot,
    stale,
    submit,
    submitting,
  }
}
