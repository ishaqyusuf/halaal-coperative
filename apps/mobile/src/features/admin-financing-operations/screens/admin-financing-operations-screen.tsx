import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { CalendarDateField } from "@/components/app/calendar-date-field"
import { useFormCalendar } from "@/hooks/use-form-calendar"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { AppKeyboardAwareScrollView } from "@/components/app/keyboard-aware-scroll-view"
import { ScreenHeader } from "@/components/app/screen-header"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useDebounce } from "@/hooks/use-debounce"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { captureMobileError } from "@/lib/sentry"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Keyboard, Pressable, ScrollView, View } from "react-native"
import {
  disburseFinancing,
  getFinancingOperationsWorkspace,
  reviewFinancingRequest,
  updateFinancingCycle,
} from "../api/admin-financing-operations-api"
import type {
  FinancingCycleState,
  FinancingItem,
  FinancingLane,
  FinancingWorkspace,
} from "../model/admin-financing-operations-types"

const lanes: { label: string; value: FinancingLane }[] = [
  { label: "Needs review", value: "review" },
  { label: "Disburse", value: "disbursement" },
  { label: "All activity", value: "activity" },
]

type FormIntent =
  | {
      kind: "cycle"
      target: "closed" | "open" | "paused"
    }
  | { item: FinancingItem; kind: "review" }
  | { item: FinancingItem; kind: "disburse" }

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatCompactCurrency(value: number, currencyCode: string) {
  if (Math.abs(value) < 1_000) return formatCurrency(value, currencyCode)
  const divisor = Math.abs(value) >= 1_000_000 ? 1_000_000 : 1_000
  const suffix = divisor === 1_000_000 ? "m" : "k"
  return `${new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value / divisor)}${suffix}`
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatAge(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000)
  )
  if (minutes < 60) return `${minutes}m waiting`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h waiting`
  return `${Math.floor(minutes / 1_440)}d waiting`
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function defaultCycleTarget(state: FinancingCycleState) {
  if (state === "missing" || state === "draft" || state === "paused")
    return "open" as const
  return "paused" as const
}

function cycleTargetsForState(
  state: FinancingCycleState
): readonly ("closed" | "open" | "paused")[] {
  if (state === "missing" || state === "draft") return ["open"]
  if (state === "paused") return ["open", "closed"]
  if (state === "open") return ["paused", "closed"]
  return []
}

function FinancingRow({
  currencyCode,
  item,
  onPress,
}: {
  currencyCode: string
  item: FinancingItem
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityHint="Opens financing evidence and permitted actions"
      accessibilityLabel={`${item.member.name}, ${formatCurrency(item.amount, currencyCode)}, ${labelize(item.state)}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`financing-operation-${item.kind}-${item.id}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {item.member.name}
          </Text>
          <Text className="text-sm font-extrabold text-foreground">
            {formatCurrency(item.amount, currencyCode)}
          </Text>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {item.productName} · {item.termMonths} months
        </Text>
        <View className="flex-row items-center gap-2">
          <View
            className={`size-2 rounded-full ${item.blockers.length ? "bg-warn" : "bg-success"}`}
          />
          <Text className="text-xs font-medium text-muted-foreground">
            {item.blockers[0] ?? item.evidence[0]}
          </Text>
        </View>
      </View>
      <View className="items-end gap-1">
        <Text className="text-xs font-medium text-muted-foreground">
          {formatAge(item.requestedAt)}
        </Text>
        <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      </View>
    </Pressable>
  )
}

export function AdminFinancingOperationsScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const runtime = useMobileRuntime()
  const [lane, setLane] = useState<FinancingLane>("review")
  const [searchDraft, setSearchDraft] = useState("")
  const search = useDebounce(searchDraft.trim(), 350)
  const [workspace, setWorkspace] = useState<FinancingWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FinancingItem | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [formIntent, setFormIntent] = useState<FormIntent | null>(null)
  const disbursementCalendar = useFormCalendar(formIntent?.kind === "disburse")
  const [reviewIntent, setReviewIntent] = useState<FormIntent | null>(null)
  const [reviewDecision, setReviewDecision] = useState<
    "approved" | "rejected" | "under_review"
  >("approved")
  const [cycleTarget, setCycleTarget] = useState<"closed" | "open" | "paused">(
    "paused"
  )
  const [notes, setNotes] = useState("")
  const [firstRepaymentDueAt, setFirstRepaymentDueAt] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const queuedFormRef = useRef<FormIntent | null>(null)
  const queuedReviewRef = useRef<FormIntent | null>(null)
  const queuedSuccessRef = useRef<string | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const workspaceRequestRef = useRef(0)
  const pageRequestRef = useRef<number | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)

  const loadWorkspace = useCallback(async (cursor?: string) => {
    if (cursor && pageRequestRef.current !== null) return
    const request = ++workspaceRequestRef.current
    pageRequestRef.current = cursor ? request : null
    setIsLoading(true)
    setLoadError(null)
    try {
      const nextWorkspace = await getFinancingOperationsWorkspace({
        cursor,
        lane,
        search: search || undefined,
      })
      if (request === workspaceRequestRef.current) setWorkspace((current) => {
        if (!cursor) return nextWorkspace
        if (!current || current.nextCursor !== cursor) return current
        const seen = new Set(current.items.map((item) => `${item.kind}-${item.id}`))
        const items = [...current.items, ...nextWorkspace.items.filter((item) => !seen.has(`${item.kind}-${item.id}`))]
        return {
          ...nextWorkspace,
          items,
          stats: {
            blocked: items.filter((item) => item.blockers.length > 0).length,
            count: items.length,
            totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
          },
        }
      })
    } catch (error) {
      if (request !== workspaceRequestRef.current) return
      captureMobileError(error, "mobile.financing_operations")
      setLoadError(
        error instanceof Error
          ? error.message
          : "Financing operations could not be loaded."
      )
    } finally {
      if (pageRequestRef.current === request) pageRequestRef.current = null
      if (request === workspaceRequestRef.current) setIsLoading(false)
    }
  }, [lane, search])

  useFocusEffect(
    useCallback(() => {
      setWorkspace(null)
      void loadWorkspace()
      return () => {
        workspaceRequestRef.current += 1
        pageRequestRef.current = null
      }
    }, [loadWorkspace])
  )

  const offline = runtime.state.connectivity !== "online"
  const stale = isMobileReadCacheStale(workspace?.cache)
  const currencyCode = workspace?.currencyCode ?? "NGN"
  const remaining = workspace
    ? workspace.cycle.quick.remainingAmount +
      workspace.cycle.normal.remainingAmount
    : 0
  const reserved = workspace
    ? workspace.cycle.quick.requestedReservedAmount +
      workspace.cycle.normal.requestedReservedAmount
    : 0
  const disbursed = workspace
    ? workspace.cycle.quick.disbursedAmount +
      workspace.cycle.normal.disbursedAmount
    : 0
  const usagePercentage = workspace?.cycle.totalCapacityAmount
    ? Math.min(
        100,
        Math.max(
          0,
          ((reserved + disbursed) / workspace.cycle.totalCapacityAmount) * 100
        )
      )
    : 0

  const openDetail = (item: FinancingItem) => {
    setSelected(item)
    setDetailVisible(true)
  }

  useFocusEffect(useCallback(() => {
    if (
      !initialEntityId ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }

    handledNotificationEntityRef.current = initialEntityId
    let mounted = true
    let settled = false
    setIsDestinationUnavailable(false)
    void Promise.all(
      (["review", "disbursement", "activity"] as const).map(
        async (candidateLane) => ({
          candidateLane,
          candidateWorkspace: await getFinancingOperationsWorkspace({
            entityId: initialEntityId,
            lane: candidateLane,
          }),
        })
      )
    )
      .then((candidates) => {
        if (!mounted) return
        settled = true
        for (const candidate of candidates) {
          const item = candidate.candidateWorkspace.items.find(
            (entry) =>
              entry.id === initialEntityId || entry.loanId === initialEntityId
          )
          if (!item) continue
          setLane(candidate.candidateLane)
          setSelected(item)
          setDetailVisible(true)
          return
        }
        setIsDestinationUnavailable(true)
      })
      .catch(() => {
        if (mounted) {
          settled = true
          setIsDestinationUnavailable(true)
        }
      })

    return () => {
      mounted = false
      if (!settled && handledNotificationEntityRef.current === initialEntityId) {
        handledNotificationEntityRef.current = null
      }
    }
  }, [initialEntityId]))

  const queueForm = (intent: FormIntent) => {
    queuedFormRef.current = intent
    setDetailVisible(false)
  }

  const openCycleForm = () => {
    const state = (workspace?.cycle.intakeStatus ??
      "missing") as FinancingCycleState
    const target = defaultCycleTarget(state)
    setCycleTarget(target)
    setNotes("")
    setFormError(null)
    setFormIntent({ kind: "cycle", target })
  }

  const prepareForm = (intent: FormIntent) => {
    setNotes("")
    setFirstRepaymentDueAt("")
    setFormError(null)
    if (intent.kind === "review") {
      setReviewDecision(
        intent.item.blockers.length ? "under_review" : "approved"
      )
    }
    if (intent.kind === "cycle") setCycleTarget(intent.target)
    setFormIntent(intent)
  }

  const validateForm = () => {
    if (!formIntent) return
    if (formIntent.kind === "cycle" && notes.trim().length < 4) {
      setFormError("Record a short cycle-control reason.")
      return
    }
    if (formIntent.kind === "review" && notes.trim().length < 4) {
      setFormError("Record the review evidence before continuing.")
      return
    }
    if (
      formIntent.kind === "review" &&
      reviewDecision === "approved" &&
      formIntent.item.blockers.length
    ) {
      setFormError("Resolve the recorded blockers before approval.")
      return
    }
    if (
      formIntent.kind === "disburse" &&
      firstRepaymentDueAt &&
      !isDateOnly(firstRepaymentDueAt)
    ) {
      setFormError("Use YYYY-MM-DD for the first repayment date.")
      return
    }
    setFormError(null)
    queuedReviewRef.current =
      formIntent.kind === "cycle"
        ? { kind: "cycle", target: cycleTarget }
        : formIntent
    setFormIntent(null)
  }

  const runCommand = async () => {
    if (!reviewIntent || !workspace) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      if (reviewIntent.kind === "cycle") {
        await updateFinancingCycle({
          commandId: createClientSubmissionKey(),
          expectedState: workspace.cycle.intakeStatus as FinancingCycleState,
          financingCycleId: workspace.cycle.id,
          status: reviewIntent.target,
          statusNote: notes.trim(),
        })
        queuedSuccessRef.current = `The financing cycle is now ${reviewIntent.target}. Its original capacity snapshot remains unchanged.`
      } else if (reviewIntent.kind === "review") {
        await reviewFinancingRequest({
          commandId: createClientSubmissionKey(),
          expectedState: reviewIntent.item.state,
          loanRequestId: reviewIntent.item.id,
          notes: notes.trim(),
          status: reviewDecision,
        })
        queuedSuccessRef.current = `The financing request is now ${labelize(reviewDecision)}. The command receipt and evidence were recorded.`
      } else {
        if (!reviewIntent.item.loanId)
          throw new Error("Loan identity is missing.")
        await disburseFinancing({
          commandId: createClientSubmissionKey(),
          expectedState: reviewIntent.item.state,
          firstRepaymentDueAt: firstRepaymentDueAt || null,
          loanId: reviewIntent.item.loanId,
        })
        queuedSuccessRef.current =
          "Financing was disbursed after a fresh deployable-funds check. Ledger, schedule, audit, and command receipt evidence were recorded."
      }
      setReviewIntent(null)
      await loadWorkspace()
    } catch (error) {
      captureMobileError(error, "mobile.financing_operations")
      setFormError(
        error instanceof Error
          ? error.message
          : "The command could not be completed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const reviewRows = useMemo(() => {
    if (!reviewIntent || !workspace) return []
    if (reviewIntent.kind === "cycle") {
      return [
        {
          label: "Current cycle",
          value: labelize(workspace.cycle.intakeStatus),
        },
        { label: "New cycle state", value: labelize(reviewIntent.target) },
        { detail: notes.trim(), label: "Control evidence" },
      ]
    }
    if (reviewIntent.kind === "review") {
      return [
        { label: "Member", value: reviewIntent.item.member.name },
        {
          label: "Request",
          value: formatCurrency(reviewIntent.item.amount, currencyCode),
        },
        { label: "Decision", value: labelize(reviewDecision) },
        { detail: notes.trim(), label: "Review evidence" },
      ]
    }
    return [
      { label: "Member", value: reviewIntent.item.member.name },
      {
        label: "Release amount",
        value: formatCurrency(reviewIntent.item.amount, currencyCode),
      },
      {
        label: "First repayment",
        value: firstRepaymentDueAt || "Automatic next-month date",
      },
      {
        detail:
          "The server performs a fresh deployable-funds check inside the disbursement transaction.",
        label: "Final liquidity gate",
      },
    ]
  }, [
    currencyCode,
    firstRepaymentDueAt,
    notes,
    reviewDecision,
    reviewIntent,
    workspace,
  ])

  const formFooter = formIntent ? (
    <View className="flex-row items-center gap-3 px-5 pt-3 pb-5">
      <DevQuickFill
        onPress={() => {
          if (formIntent.kind === "cycle") {
            setNotes(mobileDevQuickFill.adminFinancingOperations.cycleNote)
          } else if (formIntent.kind === "review") {
            setNotes(mobileDevQuickFill.adminFinancingOperations.reviewNote)
          } else {
            setFirstRepaymentDueAt(
              mobileDevQuickFill.adminFinancingOperations.firstRepaymentDueAt
            )
          }
        }}
        placement="footer"
        portal={false}
      />
      <Button
        className="h-11 flex-1"
        disabled={offline || stale}
        onPress={validateForm}
        testID="financing-operation-review-action"
      >
        <Text>Review action</Text>
      </Button>
    </View>
  ) : undefined

  return (
    <SafeArea className="flex-1 bg-background">
      <AppKeyboardAwareScrollView
        bottomOffset={144}
        contentContainerClassName="gap-4 px-5 pt-4 pb-32"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="admin-financing-operations-screen"
      >
        <ScreenHeader
          action={
            <Button
              accessibilityLabel="Refresh financing operations"
              disabled={isLoading}
              onPress={() => loadWorkspace()}
              size="icon"
              testID="financing-operations-refresh"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="RefreshCw" />
            </Button>
          }
          title="Financing operations"
        />

        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={() => setIsDestinationUnavailable(false)}
          />
        ) : null}

        {workspace?.cache ? (
          <CachedReadBanner
            cache={workspace.cache}
            label="financing operations"
          />
        ) : workspace ? (
          <View className="flex-row items-center gap-2">
            <View className="bg-success size-2 rounded-full" />
            <Text className="text-success text-xs font-medium">
              {new Intl.DateTimeFormat("en", {
                month: "long",
                year: "numeric",
              }).format(new Date(workspace.cycle.periodStart))}{" "}
              cycle · {labelize(workspace.cycle.intakeStatus)} · live data
            </Text>
          </View>
        ) : null}

        {offline ? (
          <View className="bg-warn/10 px-3 py-2">
            <Text className="text-warn text-sm leading-5">
              Read-only data remains visible offline. Cycle, approval, and
              disbursement commands require a fresh online connection.
            </Text>
          </View>
        ) : null}

        {loadError ? (
          <View className="gap-3 bg-destructive/10 px-3 py-3">
            <Text className="text-sm leading-5 text-destructive">
              {loadError}
            </Text>
            <Button
              className="self-start"
              disabled={isLoading}
              onPress={() => loadWorkspace()}
              variant="outline"
            >
              <Text>Retry</Text>
            </Button>
          </View>
        ) : null}

        {workspace ? (
          <View className="gap-4 border-y border-border py-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-2xl font-extrabold tracking-tight text-foreground">
                  {formatCompactCurrency(remaining, currencyCode)} left
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  {formatCompactCurrency(
                    workspace.cycle.totalCapacityAmount,
                    currencyCode
                  )}{" "}
                  snapshot · {formatCompactCurrency(reserved, currencyCode)}{" "}
                  reserved · {formatCompactCurrency(disbursed, currencyCode)}{" "}
                  disbursed
                </Text>
              </View>
              <View className="rounded-full bg-primary/10 px-3 py-1.5">
                <Text className="text-xs font-bold text-primary">
                  {labelize(workspace.cycle.intakeStatus)}
                </Text>
              </View>
            </View>
            <View className="h-2 overflow-hidden bg-muted">
              <View
                className="h-full bg-primary"
                style={{ width: `${usagePercentage}%` }}
              />
            </View>
            <View className="flex-row">
              <View className="min-w-0 flex-1 gap-1 pr-4">
                <Text className="text-base font-extrabold text-foreground">
                  {formatCompactCurrency(
                    workspace.cycle.quick.remainingAmount,
                    currencyCode
                  )}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Quick · {workspace.cycle.quickAllocationPercentage}%
                  allocation
                </Text>
              </View>
              <View className="min-w-0 flex-1 gap-1 border-l border-border pl-4">
                <Text className="text-base font-extrabold text-foreground">
                  {formatCompactCurrency(
                    workspace.cycle.normal.remainingAmount,
                    currencyCode
                  )}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Normal · {workspace.cycle.normalAllocationPercentage}%
                  allocation
                </Text>
              </View>
            </View>
            {workspace.capabilities.manageCycle &&
            workspace.cycle.intakeStatus !== "closed" ? (
              <Button
                className="h-10 self-start"
                disabled={offline || stale}
                onPress={openCycleForm}
                testID="review-financing-cycle-controls"
                variant="outline"
              >
                <Text>Review cycle controls</Text>
              </Button>
            ) : null}
          </View>
        ) : null}

        <View className="gap-3">
          <View className="flex-row gap-2">
            <Input
              accessibilityLabel="Search financing operations"
              className="flex-1"
              onChangeText={setSearchDraft}
              onSubmitEditing={() => Keyboard.dismiss()}
              placeholder="Search member or number"
              returnKeyType="search"
              testID="financing-operations-search"
              value={searchDraft}
            />
            <Button
              accessibilityLabel="Search"
              onPress={() => Keyboard.dismiss()}
              size="icon"
              variant="secondary"
            >
              <Icon className="size-base text-foreground" name="Search" />
            </Button>
          </View>
          <ScrollView
            horizontal
            contentContainerClassName="gap-2"
            showsHorizontalScrollIndicator={false}
          >
            {lanes.map((item) => (
              <Button
                className="h-10 px-3"
                key={item.value}
                onPress={() => setLane(item.value)}
                testID={`financing-lane-${item.value}`}
                variant={lane === item.value ? "secondary" : "ghost"}
              >
                <Text>
                  {item.label}
                  {lane === item.value && workspace
                    ? ` · ${workspace.stats.count}`
                    : ""}
                </Text>
              </Button>
            ))}
          </ScrollView>
        </View>

        <View>
          <View className="flex-row items-end justify-between gap-3 border-b border-border pb-3">
            <Text className="text-lg font-extrabold text-foreground">
              {lanes.find((item) => item.value === lane)?.label}
            </Text>
            <Text className="text-xs font-medium text-muted-foreground">
              {lane === "activity" ? "Newest first" : "Oldest first"}
            </Text>
          </View>
          {isLoading && !workspace ? (
            <View className="items-center py-16">
              <LoadingSpinner />
            </View>
          ) : (
            <VirtualizedCardList
              data={workspace?.items ?? []}
              empty={
                <EmptyState
                  description="No financing records match this lane and search."
                  icon="Landmark"
                  title="No financing work"
                />
              }
              estimatedItemSize={94}
              keyExtractor={(item) => `${item.kind}-${item.id}`}
              maxHeight={560}
              renderItem={({ item }) => (
                <FinancingRow
                  currencyCode={currencyCode}
                  item={item}
                  onPress={() => openDetail(item)}
                />
              )}
            />
          )}
          {workspace?.nextCursor ? (
            <Button
              className="mt-4"
              accessibilityState={{ busy: isLoading }}
              disabled={isLoading || offline || stale}
              onPress={() => void loadWorkspace(workspace.nextCursor ?? undefined)}
              variant="ghost"
            >
              <Text>{isLoading ? "Loading…" : "Load more"}</Text>
            </Button>
          ) : null}
        </View>

        {workspace?.cycle.warnings.length ? (
          <View className="gap-2 border-t border-border pt-4">
            <View className="flex-row items-end justify-between gap-3">
              <Text className="text-lg font-extrabold text-foreground">
                Operational exceptions
              </Text>
              <Text className="text-xs font-medium text-muted-foreground">
                {workspace.cycle.warnings.length} warning
                {workspace.cycle.warnings.length === 1 ? "" : "s"}
              </Text>
            </View>
            {workspace.cycle.warnings.map((warning) => (
              <View
                className="flex-row items-start gap-3 border-b border-border py-3"
                key={warning.key}
              >
                <Icon
                  className="size-sm text-warn mt-0.5"
                  name="AlertTriangle"
                />
                <Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
                  {warning.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </AppKeyboardAwareScrollView>

      <FloatingBottomSheet
        accessibilityLabel={
          selected
            ? `Financing record for ${selected.member.name}`
            : "Financing record"
        }
        hideHandle
        onClose={() => setDetailVisible(false)}
        onDismissed={() => {
          const queued = queuedFormRef.current
          queuedFormRef.current = null
          if (queued) prepareForm(queued)
          else setSelected(null)
        }}
        presentation="compact"
        scrollable="auto"
        visible={detailVisible}
      >
        <View className="gap-4 px-5 pt-5 pb-6">
          <View className="flex-row items-start gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-xl font-extrabold tracking-tight text-foreground">
                {selected?.member.name ?? "Financing record"}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {selected
                  ? `${selected.member.number} · ${selected.productName}`
                  : "Review current evidence."}
              </Text>
            </View>
            <Button
              accessibilityLabel="Close financing record"
              onPress={() => setDetailVisible(false)}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="X" />
            </Button>
          </View>
          {selected ? (
            <>
              <View className="flex-row items-end justify-between gap-3 border-y border-border py-4">
                <View className="gap-1">
                  <Text className="text-xs text-muted-foreground">State</Text>
                  <Text className="text-sm font-bold text-foreground">
                    {labelize(selected.state)} · {selected.termMonths} months
                  </Text>
                </View>
                <Text className="text-xl font-extrabold text-foreground">
                  {formatCurrency(selected.amount, currencyCode)}
                </Text>
              </View>
              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">
                  Policy evidence
                </Text>
                {selected.evidence.map((evidence) => (
                  <View className="flex-row items-start gap-2" key={evidence}>
                    <Icon
                      className="size-sm text-success mt-0.5"
                      name="Check"
                    />
                    <Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
                      {evidence}
                    </Text>
                  </View>
                ))}
              </View>
              {selected.blockers.length ? (
                <View className="bg-warn/10 gap-2 px-3 py-3">
                  <Text className="text-warn text-sm font-bold">Blockers</Text>
                  {selected.blockers.map((blocker) => (
                    <Text className="text-warn text-xs leading-5" key={blocker}>
                      {blocker}
                    </Text>
                  ))}
                </View>
              ) : null}
              {selected.actions.includes("review") ? (
                <Button
                  disabled={offline || stale}
                  onPress={() => queueForm({ item: selected, kind: "review" })}
                  testID="open-financing-review-form"
                >
                  <Text>Review request</Text>
                </Button>
              ) : null}
              {selected.actions.includes("disburse") ? (
                <Button
                  disabled={offline || stale || selected.blockers.length > 0}
                  onPress={() =>
                    queueForm({ item: selected, kind: "disburse" })
                  }
                  testID="open-financing-disbursement-form"
                >
                  <Text>Review disbursement</Text>
                </Button>
              ) : null}
            </>
          ) : null}
        </View>
      </FloatingBottomSheet>

      <CompactFormSheet
        dirty={Boolean(notes || firstRepaymentDueAt)}
        footer={formFooter}
        isSubmitting={isSubmitting}
        overlayActive={disbursementCalendar.isOpen}
        overlay={disbursementCalendar.overlay}
        onClose={() => setFormIntent(null)}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        title={
          formIntent?.kind === "cycle"
            ? "Cycle control"
            : formIntent?.kind === "review"
              ? "Review financing request"
              : "Disbursement details"
        }
        visible={Boolean(formIntent)}
      >
        <FormStateBanner
          hasDraft={Boolean(notes || firstRepaymentDueAt)}
          isStale={stale}
        />
        {formError ? (
          <View className="bg-destructive/10 px-3 py-2">
            <Text className="text-sm leading-5 text-destructive">
              {formError}
            </Text>
          </View>
        ) : null}
        {formIntent?.kind === "cycle" ? (
          <>
            <View className="gap-2">
              <Text className="text-sm font-bold text-foreground">
                New state
              </Text>
              <View className="flex-row gap-2">
                {cycleTargetsForState(
                  (workspace?.cycle.intakeStatus ??
                    "missing") as FinancingCycleState
                ).map((state) => (
                  <Button
                    className="h-10 flex-1"
                    key={state}
                    onPress={() => setCycleTarget(state)}
                    variant={cycleTarget === state ? "secondary" : "outline"}
                  >
                    <Text>{labelize(state)}</Text>
                  </Button>
                ))}
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-bold text-foreground">
                Control evidence
              </Text>
              <Textarea
                accessibilityLabel="Cycle control evidence"
                onChangeText={setNotes}
                placeholder="Why is this cycle state changing?"
                testID="financing-cycle-note-input"
                value={notes}
              />
            </View>
          </>
        ) : null}
        {formIntent?.kind === "review" ? (
          <>
            <View className="gap-2">
              <Text className="text-sm font-bold text-foreground">
                Decision
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {(["under_review", "approved", "rejected"] as const).map(
                  (decision) => (
                    <Button
                      className="h-10"
                      disabled={
                        decision === "approved" &&
                        formIntent.item.blockers.length > 0
                      }
                      key={decision}
                      onPress={() => setReviewDecision(decision)}
                      variant={
                        reviewDecision === decision ? "secondary" : "outline"
                      }
                    >
                      <Text>{labelize(decision)}</Text>
                    </Button>
                  )
                )}
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-bold text-foreground">
                Review evidence
              </Text>
              <Textarea
                accessibilityLabel="Financing review evidence"
                onChangeText={setNotes}
                placeholder="Record the evidence behind this decision"
                testID="financing-review-note-input"
                value={notes}
              />
            </View>
          </>
        ) : null}
        {formIntent?.kind === "disburse" ? (
          <View className="gap-2">
            <Text className="text-sm font-bold text-foreground">
              First repayment date (optional)
            </Text>
            <CalendarDateField
              accessibilityLabel="First repayment date"
              onPress={() =>
                disbursementCalendar.open({
                  label: "First repayment date",
                  value: firstRepaymentDueAt,
                  onChange: setFirstRepaymentDueAt,
                })
              }
              placeholder="Use scheduled date"
              testID="financing-first-repayment-input"
              value={firstRepaymentDueAt}
            />
            <Text className="text-xs leading-5 text-muted-foreground">
              Leave blank for the scheduled date.
            </Text>
            {firstRepaymentDueAt ? (
              <Button
                onPress={() => setFirstRepaymentDueAt("")}
                variant="ghost"
              >
                <Text>Use scheduled date</Text>
              </Button>
            ) : null}
          </View>
        ) : null}
      </CompactFormSheet>

      <SubmissionReviewSheet
        confirmLabel={
          reviewIntent?.kind === "disburse"
            ? "Confirm disbursement"
            : "Confirm action"
        }
        description={
          reviewIntent?.kind === "disburse"
            ? "Approval is not a guarantee of release. The server will recheck liquidity and expected state before posting money."
            : "Confirm the evidence and expected state before this governed command is sent."
        }
        error={formError}
        isSubmitting={isSubmitting}
        onClose={() => setReviewIntent(null)}
        onConfirm={runCommand}
        onDismissed={() => {
          const queued = queuedSuccessRef.current
          queuedSuccessRef.current = null
          if (queued) setSuccess(queued)
        }}
        rows={reviewRows}
        title="Confirm financing action"
        visible={Boolean(reviewIntent)}
      />

      <SubmissionSuccessSheet
        description={success ?? "The financing command was recorded."}
        onClose={() => setSuccess(null)}
        title="Financing operation complete"
        visible={Boolean(success)}
      />
    </SafeArea>
  )
}
