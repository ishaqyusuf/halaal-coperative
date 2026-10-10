import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { CalendarDateField } from "@/components/app/calendar-date-field"
import { useFormCalendar } from "@/hooks/use-form-calendar"
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
import { useDebounce } from "@/hooks/use-debounce"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { captureMobileError } from "@/lib/sentry"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import { Keyboard, Pressable, ScrollView, View } from "react-native"
import {
  getRepaymentFacility,
  getRepaymentOperationsWorkspace,
  postRepaymentOperation,
  recordCollectionFollowUpOperation,
} from "../api/admin-repayment-operations-api"
import type {
  RepaymentFacility,
  RepaymentLane,
  RepaymentWorkspace,
  RepaymentWorkspaceItem,
} from "../model/admin-repayment-operations-types"

const lanes: { label: string; value: RepaymentLane }[] = [
  { label: "Due", value: "due" },
  { label: "Collections", value: "collections" },
  { label: "Posted", value: "posted" },
]

type FormIntent =
  | { facility: RepaymentFacility; kind: "repayment" }
  | {
      facility: RepaymentFacility
      kind: "followUp"
      scheduleItem: NonNullable<RepaymentFacility["nextDue"]>
    }

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatCompactCurrency(value: number, currencyCode: string) {
  if (Math.abs(value) < 1_000) return formatCurrency(value, currencyCode)
  const divisor = Math.abs(value) >= 999_500 ? 1_000_000 : 1_000
  const suffix = divisor === 1_000_000 ? "m" : "k"
  return `${new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value / divisor)}${suffix}`
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10)
}

function plusDaysDateOnly(days: number) {
  const value = new Date()
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function displayState(item: { agingDays: number; state: string }) {
  return item.agingDays > 0 &&
    !["paid", "posted", "waived"].includes(item.state)
    ? "overdue"
    : item.state
}

function RepaymentRow({
  currencyCode,
  item,
  onPress,
}: {
  currencyCode: string
  item: RepaymentWorkspaceItem
  onPress: () => void
}) {
  const state = displayState(item)
  const critical = state === "overdue"
  return (
    <Pressable
      accessibilityHint="Opens the financing schedule, payments, and collection evidence"
      accessibilityLabel={`${item.member.name}, ${formatCurrency(item.amount, currencyCode)}, ${labelize(state)}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`repayment-operation-${item.lane}-${item.id}`}
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
          {item.loan.productName}
          {item.installmentNumber
            ? ` · installment ${item.installmentNumber}`
            : ""}
        </Text>
        <View className="flex-row items-center gap-2">
          <View
            className={`size-2 rounded-full ${critical ? "bg-destructive" : state === "posted" ? "bg-success" : "bg-warn"}`}
          />
          <Text
            className={`text-xs font-medium ${critical ? "text-destructive" : "text-muted-foreground"}`}
          >
            {critical
              ? `${item.agingDays} days overdue`
              : item.lane === "posted"
                ? `${formatDate(item.dueAt)}${item.reference ? ` · ${item.reference}` : ""}`
                : `${labelize(state)} · due ${formatDate(item.dueAt)}`}
          </Text>
        </View>
      </View>
      <View className="items-end gap-1">
        <Text className="text-xs font-semibold text-muted-foreground">
          {formatCompactCurrency(item.loan.outstandingPrincipal, currencyCode)}{" "}
          left
        </Text>
        <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      </View>
    </Pressable>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-foreground">{label}</Text>
      {children}
    </View>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View className="flex-row items-start gap-3 rounded-lg bg-destructive/10 p-3">
      <Icon className="size-sm mt-0.5 text-destructive" name="AlertCircle" />
      <Text className="min-w-0 flex-1 text-sm leading-5 font-medium text-destructive">
        {message}
      </Text>
    </View>
  )
}

export function AdminRepaymentOperationsScreen() {
  const runtime = useMobileRuntime()
  const [lane, setLane] = useState<RepaymentLane>("due")
  const [searchDraft, setSearchDraft] = useState("")
  const search = useDebounce(searchDraft.trim(), 350)
  const [workspace, setWorkspace] = useState<RepaymentWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [facility, setFacility] = useState<RepaymentFacility | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [formIntent, setFormIntent] = useState<FormIntent | null>(null)
  const [reviewIntent, setReviewIntent] = useState<FormIntent | null>(null)
  const [amount, setAmount] = useState("")
  const [paidAt, setPaidAt] = useState("")
  const repaymentCalendar = useFormCalendar(formIntent?.kind === "repayment")
  const followUpCalendar = useFormCalendar(formIntent?.kind === "followUp")
  const [reference, setReference] = useState("")
  const [followUpStatus, setFollowUpStatus] = useState<
    "promise_to_pay" | "reminded" | "settled" | "unreachable"
  >("reminded")
  const [priority, setPriority] = useState<"high" | "low" | "normal">("normal")
  const [nextActionAt, setNextActionAt] = useState("")
  const [promiseToPayAt, setPromiseToPayAt] = useState("")
  const [note, setNote] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const queuedFormRef = useRef<FormIntent | null>(null)
  const queuedReviewRef = useRef<FormIntent | null>(null)
  const queuedSuccessRef = useRef<string | null>(null)
  const workspaceRequestRef = useRef(0)
  const pageRequestRef = useRef<number | null>(null)
  const facilityRequestRef = useRef(0)

  const loadWorkspace = useCallback(
    async (cursor?: string) => {
      if (cursor && pageRequestRef.current !== null) return
      const request = ++workspaceRequestRef.current
      pageRequestRef.current = cursor ? request : null
      setIsLoading(true)
      setLoadError(null)
      try {
        const nextWorkspace = await getRepaymentOperationsWorkspace({
          cursor,
          lane,
          search: search || undefined,
        })
        if (request === workspaceRequestRef.current)
          setWorkspace((current) => {
            if (!cursor) return nextWorkspace
            if (!current || current.nextCursor !== cursor) return current
            const seen = new Set(current.items.map((item) => item.id))
            return {
              ...nextWorkspace,
              items: [
                ...current.items,
                ...nextWorkspace.items.filter((item) => !seen.has(item.id)),
              ],
            }
          })
      } catch (error) {
        if (request !== workspaceRequestRef.current) return
        captureMobileError(error, "mobile.repayment_operations")
        setLoadError(
          error instanceof Error
            ? error.message
            : "Repayment operations could not be loaded."
        )
      } finally {
        if (pageRequestRef.current === request) pageRequestRef.current = null
        if (request === workspaceRequestRef.current) setIsLoading(false)
      }
    },
    [lane, search]
  )

  useFocusEffect(
    useCallback(() => {
      setWorkspace(null)
      void loadWorkspace()
      return () => {
        workspaceRequestRef.current += 1
        pageRequestRef.current = null
        facilityRequestRef.current += 1
      }
    }, [loadWorkspace])
  )

  const openFacility = useCallback(async (loanId: string) => {
    const request = ++facilityRequestRef.current
    setFacility(null)
    setIsDetailLoading(true)
    setDetailVisible(true)
    try {
      const nextFacility = await getRepaymentFacility(loanId)
      if (request === facilityRequestRef.current) setFacility(nextFacility)
    } catch (error) {
      if (request !== facilityRequestRef.current) return
      captureMobileError(error, "mobile.repayment_operations")
      setLoadError(
        error instanceof Error
          ? error.message
          : "Facility details could not be loaded."
      )
      setDetailVisible(false)
    } finally {
      if (request === facilityRequestRef.current) setIsDetailLoading(false)
    }
  }, [])

  const offline = runtime.state.connectivity !== "online"
  const stale = isMobileReadCacheStale(workspace?.cache)
  const commandsBlocked = offline || stale
  const currencyCode = workspace?.currencyCode ?? "NGN"
  const actionCount =
    workspace?.items.filter((item) => item.agingDays > 0).length ?? 0
  const progress = workspace?.summary.principal
    ? Math.max(
        0,
        Math.min(
          100,
          (workspace.summary.paidPrincipal / workspace.summary.principal) * 100
        )
      )
    : 0

  const openFormFromDetail = (intent: FormIntent) => {
    queuedFormRef.current = intent
    setDetailVisible(false)
  }

  const prepareForm = (intent: FormIntent) => {
    setFormError(null)
    if (intent.kind === "repayment") {
      setAmount(intent.facility.nextDue?.outstandingAmount.toFixed(0) ?? "")
      setPaidAt(todayDateOnly())
      setReference("")
    } else {
      setFollowUpStatus("reminded")
      setPriority(intent.scheduleItem.agingDays >= 30 ? "high" : "normal")
      setNextActionAt(plusDaysDateOnly(2))
      setPromiseToPayAt("")
      setNote("")
    }
    setFormIntent(intent)
  }

  const validateForm = () => {
    if (!formIntent) return
    if (commandsBlocked) {
      setFormError(
        "Reconnect and refresh live data before submitting this operation."
      )
      return
    }
    if (formIntent.kind === "repayment") {
      const value = Number(amount.replace(/,/g, ""))
      if (!Number.isFinite(value) || value <= 0) {
        setFormError("Enter a valid repayment amount.")
        return
      }
      if (value > formIntent.facility.outstandingPrincipal) {
        setFormError("The repayment cannot exceed the outstanding principal.")
        return
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
        setFormError("Use YYYY-MM-DD for the repayment date.")
        return
      }
      if (reference.trim().length < 2) {
        setFormError("Enter the payment reference before review.")
        return
      }
    } else {
      if (note.trim().length < 4) {
        setFormError("Record the collection evidence before review.")
        return
      }
      if (nextActionAt && !/^\d{4}-\d{2}-\d{2}$/.test(nextActionAt)) {
        setFormError("Use YYYY-MM-DD for the next action date.")
        return
      }
      if (promiseToPayAt && !/^\d{4}-\d{2}-\d{2}$/.test(promiseToPayAt)) {
        setFormError("Use YYYY-MM-DD for the promise date.")
        return
      }
    }
    setFormError(null)
    queuedReviewRef.current = formIntent
    setFormIntent(null)
  }

  const runCommand = async () => {
    if (!reviewIntent) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      if (reviewIntent.kind === "repayment") {
        await postRepaymentOperation({
          amount: Number(amount.replace(/,/g, "")),
          commandId: createClientSubmissionKey(),
          expectedOutstandingPrincipal:
            reviewIntent.facility.outstandingPrincipal,
          expectedState: reviewIntent.facility.state as "active" | "disbursed",
          loanId: reviewIntent.facility.id,
          paidAt,
          reference: reference.trim(),
        })
        queuedSuccessRef.current = `Repayment posted. ${reference.trim()} is now linked to the server-confirmed financial record.`
      } else {
        await recordCollectionFollowUpOperation({
          caseStage:
            followUpStatus === "settled"
              ? "resolved"
              : followUpStatus === "promise_to_pay"
                ? "promise_tracking"
                : priority === "high"
                  ? "escalated"
                  : "active",
          commandId: createClientSubmissionKey(),
          expectedState: reviewIntent.scheduleItem.state as
            | "due"
            | "overdue"
            | "partially_paid"
            | "pending",
          nextActionAt: nextActionAt || null,
          note: note.trim(),
          priority,
          promiseToPayAt: promiseToPayAt || null,
          repaymentScheduleItemId: reviewIntent.scheduleItem.id,
          status: followUpStatus,
        })
        queuedSuccessRef.current =
          "Collection follow-up recorded. The outstanding principal was not changed."
      }
      await loadWorkspace()
      setReviewIntent(null)
    } catch (error) {
      captureMobileError(error, "mobile.repayment_operations")
      setFormError(
        error instanceof Error
          ? error.message
          : "The operation could not be confirmed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const repaymentDirty =
    formIntent?.kind === "repayment" &&
    (amount !==
      (formIntent.facility.nextDue?.outstandingAmount.toFixed(0) ?? "") ||
      paidAt !== todayDateOnly() ||
      Boolean(reference.trim()))
  const followUpDirty = Boolean(note || promiseToPayAt)
  const reviewRows = useMemo(() => {
    if (!reviewIntent) return []
    if (reviewIntent.kind === "repayment") {
      return [
        { label: "Member", value: reviewIntent.facility.member.name },
        {
          label: "Amount",
          value: formatCurrency(Number(amount || 0), currencyCode),
        },
        { label: "Date", value: paidAt },
        { label: "Reference", value: reference.trim() },
        {
          label: "Outstanding after",
          value: formatCurrency(
            reviewIntent.facility.outstandingPrincipal - Number(amount || 0),
            currencyCode
          ),
        },
      ]
    }
    return [
      { label: "Member", value: reviewIntent.facility.member.name },
      { label: "Status", value: labelize(followUpStatus) },
      { label: "Priority", value: labelize(priority) },
      { label: "Next action", value: nextActionAt || "Not scheduled" },
      { label: "Financial effect", value: "None" },
    ]
  }, [
    amount,
    currencyCode,
    followUpStatus,
    nextActionAt,
    paidAt,
    priority,
    reference,
    reviewIntent,
  ])

  return (
    <SafeArea className="bg-background">
      <AppKeyboardAwareScrollView
        bottomOffset={140}
        contentContainerClassName="gap-5 px-5 pb-28 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          action={
            <Button
              accessibilityLabel="Refresh repayment operations"
              onPress={() => void loadWorkspace()}
              size="icon"
              variant="secondary"
            >
              <Icon className="size-base text-primary" name="RefreshCw" />
            </Button>
          }
          title="Repayment operations"
        />

        <View className="flex-row items-center gap-2 border-b border-border pb-4">
          <View
            className={`size-2 rounded-full ${loadError ? "bg-destructive" : workspace ? "bg-success" : "bg-muted"}`}
          />
          <Text
            className={`text-xs font-bold ${loadError ? "text-destructive" : workspace ? "text-success" : "text-muted-foreground"}`}
          >
            {loadError
              ? "Refresh required"
              : workspace
                ? "Servicing data available"
                : "Servicing data unavailable"}
          </Text>
        </View>

        {workspace?.cache ? (
          <CachedReadBanner
            cache={workspace.cache}
            label="repayment operations"
          />
        ) : null}
        {offline && !workspace?.cache ? (
          <View className="bg-warn/10 flex-row items-start gap-3 rounded-lg p-3">
            <Icon className="size-sm text-warn mt-0.5" name="WifiOff" />
            <Text className="text-warn min-w-0 flex-1 text-sm leading-5">
              Commands are unavailable while offline. Reconnect and refresh live
              data.
            </Text>
          </View>
        ) : null}
        {loadError ? <ErrorBanner message={loadError} /> : null}

        {workspace ? (
          <View className="gap-4 border-b border-border pb-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="gap-1">
                <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                  {formatCompactCurrency(
                    workspace.summary.outstanding,
                    currencyCode
                  )}{" "}
                  left
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  {formatCompactCurrency(
                    workspace.summary.paidPrincipal,
                    currencyCode
                  )}{" "}
                  principal cleared · {workspace.summary.activeFacilities}{" "}
                  active facilities
                </Text>
              </View>
              {actionCount ? (
                <View className="bg-warn/15 rounded-full px-3 py-2">
                  <Text className="text-warn text-xs font-extrabold">
                    {actionCount} need action
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </View>
            <View className="flex-row divide-x divide-border">
              <View className="flex-1 gap-1 pr-4">
                <Text className="text-lg font-extrabold text-foreground">
                  {formatCompactCurrency(
                    workspace.summary.dueThisMonth,
                    currencyCode
                  )}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Due this month
                </Text>
              </View>
              <View className="flex-1 gap-1 pl-4">
                <Text className="text-lg font-extrabold text-foreground">
                  {formatCompactCurrency(
                    workspace.summary.overdue,
                    currencyCode
                  )}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Overdue principal
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View className="flex-row gap-2">
          <Input
            accessibilityLabel="Search repayment operations"
            className="min-w-0 flex-1"
            onChangeText={setSearchDraft}
            onSubmitEditing={Keyboard.dismiss}
            placeholder="Search member or number"
            returnKeyType="search"
            testID="repayment-search-input"
            value={searchDraft}
          />
          <Button
            accessibilityLabel="Search"
            onPress={Keyboard.dismiss}
            size="icon"
            variant="secondary"
          >
            <Icon className="size-base text-foreground" name="Search" />
          </Button>
        </View>

        <ScrollView
          horizontal
          contentContainerClassName="gap-2"
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
        >
          {lanes.map((item) => (
            <Button
              className="h-10 px-3"
              key={item.value}
              onPress={() => setLane(item.value)}
              testID={`repayment-lane-${item.value}`}
              variant={lane === item.value ? "secondary" : "ghost"}
            >
              <Text>
                {item.label}
                {lane === item.value && workspace
                  ? ` · ${workspace.items.length}`
                  : ""}
              </Text>
            </Button>
          ))}
        </ScrollView>

        <View>
          <View className="flex-row items-end justify-between gap-3 border-b border-border pb-3">
            <Text className="text-lg font-extrabold text-foreground">
              {lane === "due"
                ? "Due and upcoming"
                : lane === "collections"
                  ? "Collection follow-ups"
                  : "Posted repayments"}
            </Text>
            <Text className="text-xs font-medium text-muted-foreground">
              {lane === "posted" ? "Newest first" : "Earliest obligation first"}
            </Text>
          </View>
          {isLoading && !workspace ? (
            <View className="items-center py-16">
              <LoadingSpinner />
            </View>
          ) : !workspace ? (
            <EmptyState
              description="Refresh to load the cooperative's repayment position."
              icon="CircleAlert"
              title="Repayment data unavailable"
            />
          ) : (
            <VirtualizedCardList
              data={workspace.items}
              empty={
                <EmptyState
                  description="No repayment records match this lane and search."
                  icon="ReceiptText"
                  title="No servicing work"
                />
              }
              estimatedItemSize={92}
              keyExtractor={(item) => `${item.lane}-${item.id}`}
              maxHeight={560}
              renderItem={({ item }) => (
                <RepaymentRow
                  currencyCode={currencyCode}
                  item={item}
                  onPress={() => void openFacility(item.loan.id)}
                />
              )}
            />
          )}
          {workspace?.nextCursor ? (
            <Button
              className="mt-4"
              accessibilityState={{ busy: isLoading }}
              disabled={isLoading || offline || stale}
              onPress={() =>
                void loadWorkspace(workspace.nextCursor ?? undefined)
              }
              variant="ghost"
            >
              <Text>{isLoading ? "Loading…" : "Load more"}</Text>
            </Button>
          ) : null}
        </View>

        <View className="gap-3 border-t border-border pt-4">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-lg font-extrabold text-foreground">
              Posting guard
            </Text>
            <Text className="text-xs font-semibold text-muted-foreground">
              Separate workflows
            </Text>
          </View>
          <View className="flex-row items-start gap-3">
            <Icon className="size-sm text-warn mt-0.5" name="ShieldCheck" />
            <Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
              Repayments change principal only after review and server
              confirmation. Collection follow-ups keep contact evidence without
              changing money.
            </Text>
          </View>
        </View>
      </AppKeyboardAwareScrollView>

      <FloatingBottomSheet
        accessibilityLabel={
          facility
            ? `${facility.member.name} repayment facility`
            : "Repayment facility"
        }
        hideHandle
        onClose={() => {
          facilityRequestRef.current += 1
          setIsDetailLoading(false)
          setDetailVisible(false)
        }}
        onDismissed={() => {
          const queued = queuedFormRef.current
          queuedFormRef.current = null
          if (queued) prepareForm(queued)
          else setFacility(null)
        }}
        presentation="large"
        scrollable
        visible={detailVisible}
      >
        <View className="gap-5 px-5 pt-5 pb-8">
          <View className="flex-row items-start gap-3 border-b border-border pb-4">
            <View className="min-w-0 flex-1 gap-1">
              <Text
                accessibilityRole="header"
                className="text-2xl font-extrabold tracking-tight text-foreground"
              >
                {facility?.member.name ?? "Loading facility"}
              </Text>
              {facility ? (
                <Text className="text-sm text-muted-foreground">
                  {facility.member.number} · {facility.productName}
                </Text>
              ) : null}
            </View>
            <Button
              accessibilityLabel="Close facility"
              onPress={() => setDetailVisible(false)}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="X" />
            </Button>
          </View>
          {isDetailLoading || !facility ? (
            <View className="items-center py-20">
              <LoadingSpinner />
            </View>
          ) : (
            <>
              <View className="gap-4 border-b border-border pb-5">
                <View className="flex-row items-end justify-between gap-3">
                  <View>
                    <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                      {formatCurrency(
                        facility.outstandingPrincipal,
                        currencyCode
                      )}{" "}
                      left
                    </Text>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      {formatCurrency(facility.paidPrincipal, currencyCode)}{" "}
                      paid of{" "}
                      {formatCurrency(facility.principalAmount, currencyCode)}{" "}
                      principal
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-primary">
                    {labelize(facility.state)}
                  </Text>
                </View>
                {facility.nextDue ? (
                  <View className="flex-row divide-x divide-border">
                    <View className="flex-1 gap-1 pr-4">
                      <Text className="text-base font-extrabold text-foreground">
                        {formatCurrency(
                          facility.nextDue.outstandingAmount,
                          currencyCode
                        )}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        Next obligation
                      </Text>
                    </View>
                    <View className="flex-1 gap-1 pl-4">
                      <Text className="text-base font-extrabold text-foreground">
                        {facility.nextDue.agingDays
                          ? `${facility.nextDue.agingDays} days`
                          : formatDate(facility.nextDue.dueAt)}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {facility.nextDue.agingDays
                          ? "Current aging"
                          : "Due date"}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>

              <View className="gap-2">
                <View className="flex-row items-end justify-between border-b border-border pb-2">
                  <Text className="text-lg font-extrabold text-foreground">
                    Schedule
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {facility.schedule.length} installments
                  </Text>
                </View>
                {facility.schedule.map((item) => (
                  <View
                    className="flex-row items-center gap-3 border-b border-border py-3"
                    key={item.id}
                  >
                    <View
                      className={`size-2 rounded-full ${displayState(item) === "overdue" ? "bg-destructive" : item.state === "paid" ? "bg-success" : "bg-warn"}`}
                    />
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-bold text-foreground">
                        Installment {item.installmentNumber}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {formatDate(item.dueAt)} ·{" "}
                        {labelize(displayState(item))}
                      </Text>
                    </View>
                    <Text className="text-sm font-extrabold text-foreground">
                      {formatCurrency(
                        item.outstandingAmount || item.totalDue,
                        currencyCode
                      )}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="gap-2">
                <View className="flex-row items-end justify-between border-b border-border pb-2">
                  <Text className="text-lg font-extrabold text-foreground">
                    Posted repayments
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {facility.repayments.length} records
                  </Text>
                </View>
                {facility.repayments.length ? (
                  facility.repayments.map((item) => (
                    <View
                      className="flex-row items-center gap-3 border-b border-border py-3"
                      key={item.id}
                    >
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-bold text-foreground">
                          {item.reference ?? "No reference"}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {formatDate(item.paidAt)} · Received by{" "}
                          {item.receivedByName}
                        </Text>
                      </View>
                      <Text className="text-sm font-extrabold text-foreground">
                        {formatCurrency(item.amount, currencyCode)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="py-3 text-sm text-muted-foreground">
                    No repayments have been posted.
                  </Text>
                )}
              </View>

              <View className="gap-2">
                <View className="flex-row items-end justify-between border-b border-border pb-2">
                  <Text className="text-lg font-extrabold text-foreground">
                    Collection evidence
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Non-financial
                  </Text>
                </View>
                {facility.collectionFollowUps.length ? (
                  facility.collectionFollowUps.map((item) => (
                    <View
                      className="gap-1 border-b border-border py-3"
                      key={item.id}
                    >
                      <View className="flex-row justify-between gap-3">
                        <Text className="text-sm font-bold text-foreground">
                          {labelize(item.status)}
                        </Text>
                        <Text className="text-xs font-semibold text-muted-foreground">
                          {labelize(item.priority)}
                        </Text>
                      </View>
                      <Text className="text-xs leading-5 text-muted-foreground">
                        {item.note}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)} · Recorded by{" "}
                        {item.actorName}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="py-3 text-sm text-muted-foreground">
                    No collection follow-up has been recorded.
                  </Text>
                )}
              </View>

              <View className="flex-row gap-2 pt-2">
                <Button
                  className="h-12 flex-1"
                  disabled={
                    !workspace?.capabilities.followUp ||
                    !facility.nextDue ||
                    commandsBlocked
                  }
                  onPress={() =>
                    facility.nextDue &&
                    openFormFromDetail({
                      facility,
                      kind: "followUp",
                      scheduleItem: facility.nextDue,
                    })
                  }
                  variant="outline"
                >
                  <Text>Follow up</Text>
                </Button>
                <Button
                  className="h-12 flex-1"
                  disabled={
                    !workspace?.capabilities.post ||
                    commandsBlocked ||
                    facility.outstandingPrincipal <= 0
                  }
                  onPress={() =>
                    openFormFromDetail({ facility, kind: "repayment" })
                  }
                >
                  <Text>Post repayment</Text>
                </Button>
              </View>
            </>
          )}
        </View>
      </FloatingBottomSheet>

      <CompactFormSheet
        dirty={formIntent?.kind === "repayment" && repaymentDirty}
        overlay={repaymentCalendar.overlay}
        isSubmitting={isSubmitting}
        overlayActive={repaymentCalendar.isOpen}
        footer={
          <View className="flex-row items-center gap-3 px-5 pt-3 pb-5">
            <DevQuickFill
              label="Quick fill repayment"
              onPress={() => {
                setAmount(
                  formIntent?.kind === "repayment"
                    ? String(
                        formIntent.facility.nextDue?.outstandingAmount ?? 25_000
                      )
                    : "25000"
                )
                setPaidAt(todayDateOnly())
                setReference(`QA-REP-${Date.now().toString().slice(-6)}`)
              }}
              placement="footer"
              portal={false}
            />
            <Button className="h-12 flex-1" onPress={validateForm}>
              <Text>Review repayment</Text>
            </Button>
          </View>
        }
        onClose={() => setFormIntent(null)}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        title="Post repayment"
        visible={formIntent?.kind === "repayment"}
      >
        <Text className="text-sm leading-5 text-muted-foreground">
          Payments settle the earliest unpaid instalment first.
        </Text>
        <FormStateBanner hasDraft={repaymentDirty} isStale={commandsBlocked} />
        {formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Amount">
          <Input
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="25000"
            testID="repayment-amount-input"
            value={amount}
          />
        </Field>
        <Field label="Payment date">
          <CalendarDateField
            accessibilityLabel="Repayment date"
            onPress={() =>
              repaymentCalendar.open({
                label: "Payment date",
                value: paidAt,
                onChange: setPaidAt,
                maximumDate: todayDateOnly(),
              })
            }
            testID="repayment-date-input"
            value={paidAt}
          />
        </Field>
        <Field label="Reference">
          <Input
            autoCapitalize="characters"
            onChangeText={setReference}
            placeholder="TRF-012345"
            returnKeyType="done"
            testID="repayment-reference-input"
            value={reference}
          />
        </Field>
      </CompactFormSheet>

      <FullScreenFormSheet
        dirty={formIntent?.kind === "followUp" && followUpDirty}
        overlay={followUpCalendar.overlay}
        overlayActive={followUpCalendar.isOpen}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              label="Quick fill collection follow-up"
              onPress={() => {
                setFollowUpStatus("promise_to_pay")
                setPriority("high")
                setNextActionAt(plusDaysDateOnly(2))
                setPromiseToPayAt(plusDaysDateOnly(2))
                setNote(
                  "Member confirmed a transfer and requested a two-day follow-up window."
                )
              }}
              placement="footer"
              portal={false}
            />
            <Button className="h-12 flex-1" onPress={validateForm}>
              <Text>Review follow-up</Text>
            </Button>
          </View>
        }
        onClose={() => setFormIntent(null)}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        title="Record follow-up"
        visible={formIntent?.kind === "followUp"}
      >
        <Text className="text-sm leading-5 text-muted-foreground">
          A follow-up does not record a payment.
        </Text>
        <FormStateBanner hasDraft={followUpDirty} isStale={commandsBlocked} />
        {formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Outcome">
          <ScrollView
            horizontal
            contentContainerClassName="gap-2"
            keyboardShouldPersistTaps="always"
            showsHorizontalScrollIndicator={false}
          >
            {(
              ["reminded", "promise_to_pay", "unreachable", "settled"] as const
            ).map((value) => (
              <Button
                key={value}
                onPress={() => setFollowUpStatus(value)}
                variant={followUpStatus === value ? "secondary" : "outline"}
              >
                <Text>{labelize(value)}</Text>
              </Button>
            ))}
          </ScrollView>
        </Field>
        <Field label="Priority">
          <View className="flex-row gap-2">
            {(["low", "normal", "high"] as const).map((value) => (
              <Button
                className="flex-1"
                key={value}
                onPress={() => setPriority(value)}
                variant={priority === value ? "secondary" : "outline"}
              >
                <Text>{labelize(value)}</Text>
              </Button>
            ))}
          </View>
        </Field>
        <Field label="Next action date (optional)">
          <CalendarDateField
            accessibilityLabel="Next action date"
            onPress={() =>
              followUpCalendar.open({
                label: "Next action date",
                value: nextActionAt,
                onChange: setNextActionAt,
              })
            }
            testID="follow-up-next-action-input"
            value={nextActionAt}
          />
          {nextActionAt ? (
            <Button onPress={() => setNextActionAt("")} variant="ghost">
              <Text>Clear next action date</Text>
            </Button>
          ) : null}
        </Field>
        <Field label="Promise date (optional)">
          <CalendarDateField
            accessibilityLabel="Promise date"
            onPress={() =>
              followUpCalendar.open({
                label: "Promise date",
                value: promiseToPayAt,
                onChange: setPromiseToPayAt,
              })
            }
            testID="follow-up-promise-input"
            value={promiseToPayAt}
          />
          {promiseToPayAt ? (
            <Button onPress={() => setPromiseToPayAt("")} variant="ghost">
              <Text>Clear promise date</Text>
            </Button>
          ) : null}
        </Field>
        <Field label="Notes">
          <Textarea
            onChangeText={setNote}
            placeholder="Record what happened and the agreed next action."
            testID="follow-up-note-input"
            value={note}
          />
        </Field>
      </FullScreenFormSheet>

      <SubmissionReviewSheet
        confirmLabel={
          reviewIntent?.kind === "repayment"
            ? "Post repayment"
            : "Record follow-up"
        }
        description={
          reviewIntent?.kind === "repayment"
            ? "Confirm the financial evidence. The server will allocate the amount and return the final receipt."
            : "Confirm the collection evidence. This action cannot post or imply a repayment."
        }
        error={formError}
        isSubmitting={isSubmitting}
        onClose={() => setReviewIntent(null)}
        onConfirm={() => void runCommand()}
        onDismissed={() => {
          const message = queuedSuccessRef.current
          queuedSuccessRef.current = null
          if (message) setSuccess(message)
        }}
        rows={reviewRows}
        title={
          reviewIntent?.kind === "repayment"
            ? "Review repayment"
            : "Review follow-up"
        }
        visible={Boolean(reviewIntent)}
      />

      <SubmissionSuccessSheet
        description={success ?? "The operation was confirmed."}
        onClose={() => setSuccess(null)}
        title={
          success?.startsWith("Repayment")
            ? "Repayment posted"
            : "Follow-up recorded"
        }
        visible={Boolean(success)}
      />
    </SafeArea>
  )
}
