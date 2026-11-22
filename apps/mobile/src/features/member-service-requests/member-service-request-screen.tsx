import { useIsFocused } from "@react-navigation/native"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenShell } from "@/components/app/screen-shell"
import {
  canUseMobileFeatureData,
  isMobileDevFixtureSession,
} from "@/dev/mobile-dev-session"
import { getMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import {
  appQueryKey,
  useAppInfiniteQuery,
  useAppQuery,
  useInvalidateAppQueries,
} from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useDebounce } from "@/hooks/use-debounce"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { BackHandler, Keyboard, View } from "react-native"
import {
  ServiceRequestDetail,
  ServiceRequestSuccess,
} from "./service-request-detail"
import { ServiceRequestEditor } from "./service-request-editor"
import {
  requestGate,
  requestLoadErrorGate,
  requestPayLink,
} from "./service-request-gate"
import {
  matchesRequestFilter,
  restoreServiceDraft,
  serviceDesign,
  validateRequest,
  type RequestDraft,
  type RequestFilter,
  type ServiceAdapter,
  type ServiceQaState,
  type ServiceQuote,
  type ServiceRequest,
  type ServiceRequestPage,
} from "./service-request-model"
import {
  ServiceRequestOverview,
  type RequestLane,
  type ServiceNotice,
} from "./service-request-overview"

const EMPTY_REQUESTS: ServiceRequest[] = []

function blankDraft(): RequestDraft {
  return {
    amount: "",
    cycleId: "",
    months: "",
    name: "",
    notes: "",
    secondary: "",
    structure: "undecided",
    submissionKey: createClientSubmissionKey(),
  }
}

function wasRejectedBeforeCommit(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return false
  const data = error.data
  if (!data || typeof data !== "object" || !("code" in data)) return false
  return [
    "BAD_REQUEST",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "PRECONDITION_FAILED",
    "UNPROCESSABLE_CONTENT",
  ].some((code) => code === data.code)
}

function wasQuoteChanged(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Project financing charges changed.")
  )
}

function matchesLoadedSearch(row: ServiceRequest, search: string) {
  return (
    !search ||
    `${row.title} ${row.subtitle ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )
}

export function MemberServiceRequestScreen({
  adapter,
}: {
  adapter: ServiceAdapter
}) {
  const { profile } = useAuthContext()
  const scope = getMobilePersistenceScope()?.key
  const { notificationEntityId, qaState, qaView } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
    qaState?: string | string[]
    qaView?: string
  }>()
  const design = serviceDesign[adapter.kind]
  if (!scope || !canUseMobileFeatureData(profile, "member")) {
    return (
      <ScreenShell back title={design.title}>
        <EmptyState
          description="Sign in with your member account to view cooperative requests."
          title="Member account required"
        />
      </ScreenShell>
    )
  }
  const fixture = isMobileDevFixtureSession(profile?.token)
  const state: ServiceQaState =
    fixture && (qaState === "no-cycle" || qaState === "quote-error")
      ? qaState
      : getMemberCooperativeServiceQaState(qaState)
  return (
    <ScopedServiceRequestScreen
      adapter={adapter}
      currency={profile?.tenant.currencyCode ?? "NGN"}
      fixture={fixture}
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
      key={`${scope}:${adapter.kind}:${state}:${qaView ?? ""}:${notificationEntityId ?? ""}`}
      qaState={state}
      qaView={fixture ? qaView : undefined}
      scope={scope}
    />
  )
}

function ScopedServiceRequestScreen({
  adapter,
  currency,
  fixture,
  initialEntityId,
  qaState,
  qaView,
  scope,
}: {
  adapter: ServiceAdapter
  currency: string
  fixture: boolean
  initialEntityId: string | null
  qaState: ServiceQaState
  qaView?: string
  scope: string
}) {
  const focused = useIsFocused()
  const { kind } = adapter
  const design = serviceDesign[kind]
  const router = useRouter()
  const { retry, runOnlineOperation, state } = useMobileRuntime()
  const offline = qaState === "offline" || state.connectivity === "offline"
  const [draft, setDraft] = useState(blankDraft)
  const [draftRestored, setDraftRestored] = useState(false)
  const [phase, setPhase] = useState<"form" | "review" | null>(null)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [reviewedQuote, setReviewedQuote] = useState<ServiceQuote>()
  const [success, setSuccess] = useState<ServiceRequest | null>(null)
  const [submitted, setSubmitted] = useState<ServiceRequest | null>(null)
  const [detailId, setDetailId] = useState(initialEntityId)
  const [filter, setFilter] = useState<RequestFilter>("all")
  const [search, setSearch] = useState("")
  const submitInFlight = useRef(false)
  const invalidate = useInvalidateAppQueries()

  const clearDraft = useMobileFormDraft<unknown>({
    enabled: !qaView || qaView === "overview",
    key: `member.${kind}.create`,
    onHydrate: (saved) =>
      setDraft((clean) => restoreServiceDraft(kind, saved, clean)),
    value: draft,
  })
  const workspaceKey = appQueryKey(kind, scope, "workspace", qaState)
  const workspaceQuery = useAppQuery({
    enabled: qaState !== "loading",
    networkMode: "always",
    placeholderData: undefined,
    queryFn: async () => {
      if (qaState === "error")
        throw new Error("Check your connection and try again.")
      const result = await adapter.list(qaState)
      if (result.state === "database_unavailable")
        throw new Error("Check your connection and try again.")
      return result
    },
    queryKey: workspaceKey,
    ...(qaState === "error" ? { retry: false } : {}),
  })
  const workspace = workspaceQuery.data
  const stale =
    isMobileReadCacheStale(workspace?.cache) || workspaceQuery.isError
  const canStart = Boolean(workspace?.canCreate && !offline && !stale)
  const ready = workspace?.state === "available"
  const remoteSearch = useDebounce(search.trim(), 250)
  const fullList = filter === "all" && !remoteSearch
  const pageKey = appQueryKey(
    kind,
    scope,
    "requests",
    qaState,
    filter,
    remoteSearch,
    fullList ? workspace?.nextCursor : null
  )
  const pages = useAppInfiniteQuery<
    ServiceRequestPage,
    ServiceRequest,
    Error,
    ReturnType<typeof appQueryKey>,
    string | null
  >({
    enabled:
      ready &&
      !fixture &&
      !offline &&
      (!fullList || Boolean(workspace.nextCursor)),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    placeholderData: undefined,
    queryFn: ({ pageParam }) =>
      fullList && pageParam === null
        ? Promise.resolve({
            requests: [],
            nextCursor: workspace?.nextCursor ?? null,
          })
        : adapter.page({
            cursor: pageParam ?? undefined,
            filter,
            search: remoteSearch || undefined,
          }),
    queryKey: pageKey,
    selectItems: (page) => page.requests,
    refetchOnScreenFocus: false,
  })
  const head = workspace?.requests ?? EMPTY_REQUESTS
  const active =
    workspace?.activeRequest ?? head.find((row) => row.status === "active")
  const detailSeed =
    (active?.id === detailId ? active : undefined) ??
    head.find((row) => row.id === detailId) ??
    pages.items.find((row) => row.id === detailId) ??
    (submitted?.id === detailId ? submitted : undefined)
  const detail = useAppQuery({
    enabled: Boolean(detailId && !detailSeed && !offline),
    placeholderData: undefined,
    queryFn: () => adapter.detail(detailId ?? ""),
    queryKey: appQueryKey(kind, scope, "request", detailId),
  })
  const quoteAmount = Number(draft.amount)
  const debouncedAmount = useDebounce(quoteAmount, 300)
  const quoteQuery = useAppQuery({
    enabled: Boolean(
      adapter.quote &&
      phase &&
      !offline &&
      !stale &&
      debouncedAmount > 0 &&
      Number.isFinite(debouncedAmount)
    ),
    placeholderData: undefined,
    queryFn: () => {
      if (qaState === "quote-error") throw new Error("Couldn’t check charges.")
      return adapter.quote!(debouncedAmount)
    },
    queryKey: appQueryKey(kind, scope, "quote", debouncedAmount, qaState),
    refetchOnScreenFocus: false,
    refetchOnWindowFocus: false,
    retry: false,
  })
  const quote =
    quoteQuery.data?.requestedAmount === quoteAmount
      ? quoteQuery.data
      : undefined
  const reviewQuote =
    phase === "review"
      ? (reviewedQuote ?? (draft.awaitingConfirmation ? quote : undefined))
      : quote
  const quoting = Boolean(
    adapter.quote &&
    quoteAmount > 0 &&
    !offline &&
    !stale &&
    !reviewedQuote &&
    (debouncedAmount !== quoteAmount || quoteQuery.isFetching)
  )
  const quoteError = Boolean(
    adapter.quote &&
    quoteAmount > 0 &&
    debouncedAmount === quoteAmount &&
    !reviewQuote &&
    quoteQuery.isError
  )
  const charges = adapter.quote
    ? (reviewQuote?.charges ?? [])
    : (workspace?.chargeOptions ?? []).map((charge) => ({
        ...charge,
        amount:
          charge.chargeValueType === "percentage"
            ? Math.round(quoteAmount * charge.amount) / 100
            : charge.amount,
      }))

  const dismissDetail = useCallback(() => setDetailId(null), [])
  const done = useCallback(() => setSuccess(null), [])
  useFocusEffect(
    useCallback(() => {
      if (!detailId && !success) return
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (phase) return false
          if (success) done()
          else dismissDetail()
          return true
        }
      )
      return () => subscription.remove()
    }, [detailId, dismissDetail, done, phase, success])
  )

  const hasDraft = Boolean(
    draft.name.trim() ||
    draft.secondary.trim() ||
    draft.notes.trim() ||
    draft.amount ||
    draft.months ||
    draft.structure !== "undecided"
  )

  function startForm() {
    if (!canStart) return
    if (draft.awaitingConfirmation) {
      setSubmissionError(
        "We couldn’t confirm the previous submission. Retry to check its status."
      )
      setPhase("review")
      return
    }
    setDraftRestored(hasDraft)
    setDraft((current) => ({
      ...current,
      cycleId: workspace?.cycles?.some(({ id }) => id === current.cycleId)
        ? current.cycleId
        : (workspace?.cycles?.[0]?.id ?? ""),
    }))
    setShowErrors(false)
    setPhase("form")
  }

  function fillDraft() {
    setDraft((current) => ({
      ...current,
      ...adapter.quickFill,
      cycleId: workspace?.cycles?.[0]?.id ?? "",
    }))
  }

  const hasOpenedFixture = useRef(false)
  useEffect(() => {
    if (!qaView || !ready || hasOpenedFixture.current) return
    hasOpenedFixture.current = true
    if (qaView === "detail") {
      setDetailId(
        head.find((row) => row.status === "active")?.id ?? head[0]?.id ?? null
      )
    } else if (qaView === "form" || qaView === "filled") {
      setDraft((current) => ({
        ...blankDraft(),
        submissionKey: current.submissionKey,
        ...(qaView === "filled" ? adapter.quickFill : {}),
        cycleId: workspace.cycles?.[0]?.id ?? "",
      }))
      setPhase("form")
    }
  }, [adapter, head, qaView, ready, workspace])

  function changeDraft<T extends keyof RequestDraft>(
    key: T,
    value: RequestDraft[T]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "structure" && value !== "repayable_facility"
        ? { months: "" }
        : {}),
    }))
  }

  function refresh() {
    if (qaState === "offline") return
    if (offline) void retry().catch(() => undefined)
    else {
      void workspaceQuery.refetch()
      if (!fullList) void pages.refetch()
    }
  }

  const errors = validateRequest(draft, kind, workspace)
  function review() {
    setShowErrors(true)
    if (
      Object.keys(errors).length ||
      !canStart ||
      (adapter.quote && (!quote || quoting))
    )
      return
    Keyboard.dismiss()
    setSubmissionError(null)
    setReviewedQuote(quote)
    setPhase("review")
  }

  function edit() {
    if (draft.awaitingConfirmation) {
      setPhase(null)
      return
    }
    setSubmissionError(null)
    setReviewedQuote(undefined)
    setPhase("form")
  }

  async function submit() {
    if (submitInFlight.current || !canStart || Object.keys(errors).length)
      return
    submitInFlight.current = true
    if (adapter.quote && !reviewQuote) {
      submitInFlight.current = false
      return
    }
    setSubmitting(true)
    setDraft((current) => ({ ...current, awaitingConfirmation: true }))
    setSubmissionError(null)
    try {
      const created = await runOnlineOperation("financial-command", () =>
        adapter.submit(draft, reviewQuote)
      )
      setSubmitted(created)
      setSuccess(created)
      setPhase(null)
      setReviewedQuote(undefined)
      setDraft(blankDraft())
      setDraftRestored(false)
      await clearDraft().catch(() => undefined)
      void invalidate(workspaceKey, pageKey)
    } catch (error) {
      if (wasQuoteChanged(error)) {
        setDraft((current) => ({ ...current, awaitingConfirmation: false }))
        const refreshed = await quoteQuery.refetch()
        setReviewedQuote(refreshed.isError ? undefined : refreshed.data)
        setSubmissionError(
          refreshed.isError
            ? "Charges changed. Try checking the quote again."
            : "Charges changed. Review the updated total before submitting."
        )
      } else if (wasRejectedBeforeCommit(error)) {
        setDraft((current) => ({ ...current, awaitingConfirmation: false }))
        setSubmissionError(
          error instanceof Error
            ? error.message
            : "The office couldn’t accept the request."
        )
      } else {
        setSubmissionError(
          "We couldn’t confirm the submission. Retry to check its status."
        )
      }
    } finally {
      setSubmitting(false)
      submitInFlight.current = false
    }
  }

  function requote() {
    void quoteQuery.refetch().then((result) => {
      if (phase === "review" && !result.isError) setReviewedQuote(result.data)
    })
  }

  const gate = workspace
    ? requestGate(kind, design, workspace, currency)
    : workspaceQuery.isError
      ? requestLoadErrorGate(design)
      : null
  const onGateAction = () =>
    gate?.action.kind === "retry" ? refresh() : router.push("/(member)/support")
  const notice: ServiceNotice | undefined =
    offline || (workspace && stale)
      ? {
          action: { label: offline ? "Check" : "Refresh", onPress: refresh },
          description: offline
            ? `Reconnect to start a ${design.noun}.`
            : `Refresh before starting a ${design.noun}.`,
          icon: offline ? "WifiOff" : "Clock",
          title: offline ? "You’re offline" : "Saved data",
          tone: "warning",
        }
      : undefined

  function getLane(lane: RequestFilter): RequestLane {
    const isCurrent = lane === filter
    const localOnly = offline || fixture
    const base =
      isCurrent && (fullList || localOnly) ? [...head, ...pages.items] : head
    const rows =
      isCurrent && !fullList && !localOnly && pages.data
        ? pages.items
        : base.filter(
            (row) =>
              matchesRequestFilter(row, lane) &&
              matchesLoadedSearch(row, remoteSearch)
          )
    const visible =
      submitted &&
      matchesRequestFilter(submitted, lane) &&
      matchesLoadedSearch(submitted, remoteSearch) &&
      !rows.some((row) => row.id === submitted.id)
        ? [submitted, ...rows]
        : rows
    const more =
      isCurrent && !localOnly && pages.hasNextPage
        ? pages.onEndReached
        : undefined
    return {
      rows: [...new Map(visible.map((row) => [row.id, row])).values()],
      isLoading:
        isCurrent && !fullList && !localOnly && !pages.data && pages.isFetching,
      isPaging: isCurrent && pages.isFetchingNextPage,
      error:
        isCurrent && pages.isError
          ? "Couldn’t load these requests. Try again."
          : null,
      more,
      retry:
        isCurrent && pages.isError
          ? () => {
              void pages.refetch()
            }
          : undefined,
    }
  }

  return (
    <View className="flex-1 bg-background">
      {success ? (
        <ServiceRequestSuccess
          currency={currency}
          design={design}
          onDone={done}
          onOpen={() => {
            setDetailId(success.id)
            done()
          }}
          row={success}
        />
      ) : detailId ? (
        <ServiceRequestDetail
          currency={currency}
          design={design}
          loading={!detailSeed && detail.isFetching}
          onBack={dismissDetail}
          payable={kind !== "project-financing"}
          payLink={requestPayLink(kind, detailSeed ?? detail.data)}
          onRetry={
            !offline && detail.isError
              ? () => {
                  void detail.refetch()
                }
              : undefined
          }
          onStart={canStart ? startForm : undefined}
          row={detailSeed ?? detail.data ?? null}
          unavailable={detail.isSuccess && !detail.data}
        />
      ) : workspace?.state === "member_profile_missing" ? (
        <ScreenShell back title={design.title}>
          <EmptyState
            action={{
              label: "Ask the office",
              onPress: () => router.push("/(member)/support"),
            }}
            description="Ask the cooperative office to link your member record to this account."
            icon="UserRound"
            title="Your member profile isn’t linked yet"
            tone="warning"
          />
        </ScreenShell>
      ) : (
        <ServiceRequestOverview
          active={active}
          canStart={canStart}
          currency={currency}
          design={design}
          draft={
            hasDraft
              ? draft.name ||
                workspace?.cycles?.find((cycle) => cycle.id === draft.cycleId)
                  ?.label ||
                `New ${design.noun}`
              : null
          }
          error={
            !workspace && workspaceQuery.isError
              ? "Check your connection and try again."
              : null
          }
          filter={filter}
          gate={gate}
          onGateAction={onGateAction}
          payLink={requestPayLink(kind, active)}
          getLane={getLane}
          loading={
            !workspace && (workspaceQuery.isPending || qaState === "loading")
          }
          notice={notice}
          onFilter={setFilter}
          onOpen={(row) => setDetailId(row.id)}
          onRefresh={refresh}
          onSearch={(value) => setSearch(value.slice(0, 100))}
          onStart={startForm}
          refreshing={workspaceQuery.isRefetching}
          search={search}
          workspace={workspace}
        />
      )}
      <ServiceRequestEditor
        charges={charges}
        currency={currency}
        gate={gate}
        design={design}
        draft={draft}
        draftRestored={draftRestored}
        errors={showErrors ? errors : {}}
        isOffline={offline}
        isStale={stale}
        kind={kind}
        onBack={edit}
        onChange={changeDraft}
        onClose={() => {
          setPhase(null)
          setReviewedQuote(undefined)
        }}
        onQuickFill={qaView && qaView !== "overview" ? undefined : fillDraft}
        onRefresh={refresh}
        onRequote={requote}
        onReview={review}
        onStartOver={() => {
          setDraft({
            ...blankDraft(),
            cycleId: workspace?.cycles?.[0]?.id ?? "",
          })
          setDraftRestored(false)
          setShowErrors(false)
        }}
        onSubmit={() => {
          void submit()
        }}
        phase={focused ? phase : null}
        quoteError={quoteError}
        quoted={Boolean(reviewQuote)}
        quoting={quoting}
        submissionError={submissionError}
        submitting={submitting}
        workspace={workspace}
      />
    </View>
  )
}
