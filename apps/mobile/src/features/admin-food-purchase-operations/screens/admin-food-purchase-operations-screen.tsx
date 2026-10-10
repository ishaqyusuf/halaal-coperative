import { CalendarDateField } from "@/components/app/calendar-date-field"
import { CalendarPickerSheet } from "@/components/app/calendar-picker-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
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
import { todayDateOnly } from "@/lib/date-only"
import { captureMobileError } from "@/lib/sentry"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect } from "@react-navigation/native"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Keyboard, Pressable, ScrollView, View } from "react-native"
import {
  completeFoodPurchaseCycle,
  createFoodPurchaseCycle,
  getFoodPurchaseApplicationDetail,
  getFoodPurchaseOperationsWorkspace,
  reviewFoodPurchaseAccounting,
  reviewFoodPurchaseApplication,
  submitFoodPurchaseAccounting,
  transitionFoodPurchaseCycle,
} from "../api/admin-food-purchase-operations-api"
import type {
  FoodPurchaseApplication,
  FoodPurchaseCycle,
  FoodPurchaseLane,
  FoodPurchaseWorkspace,
} from "../model/admin-food-purchase-operations-types"

const lanes: { label: string; value: FoodPurchaseLane }[] = [
  { label: "Applications", value: "applications" },
  { label: "Accounting", value: "accounting" },
  { label: "History", value: "history" },
]

type FormIntent =
  | { kind: "release" }
  | { application: FoodPurchaseApplication; kind: "reviewApplication" }
  | { cycle: FoodPurchaseCycle; kind: "submitAccounting" }
  | { cycle: FoodPurchaseCycle; kind: "reviewAccounting" }

type ReviewIntent =
  | FormIntent
  | {
      cycle: FoodPurchaseCycle
      kind: "cycleTransition"
      transition:
        | "cancel"
        | "close_intake"
        | "complete"
        | "open_intake"
        | "reopen_intake"
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
  return `${new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value / divisor)}${divisor === 1_000_000 ? "m" : "k"}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    year: "numeric",
  }).format(new Date(value))
}

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function monthStartDateOnly() {
  return `${todayDateOnly().slice(0, 8)}01`
}

function getCycleTransitionSuccessMessage(
  transition: "cancel" | "close_intake" | "open_intake" | "reopen_intake"
) {
  if (transition === "cancel") return "Foodstuff Purchase cycle cancelled."
  if (transition === "close_intake") return "Application intake closed."
  if (transition === "open_intake") return "Application intake opened."
  return "Application intake reopened."
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

function ApplicationRow({
  application,
  currencyCode,
  onPress,
}: {
  application: FoodPurchaseApplication
  currencyCode: string
  onPress: () => void
}) {
  const amount = application.approvedAmount ?? application.requestedAmount
  return (
    <Pressable
      accessibilityLabel={`${application.member.fullName}, ${formatCurrency(amount, currencyCode)}, ${labelize(application.status)}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`food-purchase-application-${application.id}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {application.member.fullName}
          </Text>
          <Text className="text-sm font-extrabold text-foreground">
            {formatCurrency(amount, currencyCode)}
          </Text>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {application.itemDescription ?? "Foodstuff Purchase"} ·{" "}
          {application.approvedPaybackMonths ??
            application.requestedPaybackMonths}{" "}
          months
        </Text>
        <View className="flex-row items-center gap-2">
          <View
            className={`size-2 rounded-full ${application.status === "approved" ? "bg-success" : application.status === "rejected" ? "bg-destructive" : application.status === "under_review" ? "bg-primary" : "bg-warn"}`}
          />
          <Text className="text-xs font-medium text-muted-foreground">
            {application.status === "approved"
              ? `${formatCurrency(application.outstandingAmount, currencyCode)} outstanding`
              : labelize(application.status)}
          </Text>
        </View>
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

export function AdminFoodPurchaseOperationsScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const runtime = useMobileRuntime()
  const [lane, setLane] = useState<FoodPurchaseLane>("applications")
  const [searchDraft, setSearchDraft] = useState("")
  const search = useDebounce(searchDraft.trim(), 350)
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>()
  const [workspace, setWorkspace] = useState<FoodPurchaseWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detail, setDetail] = useState<FoodPurchaseApplication | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [formIntent, setFormIntent] = useState<FormIntent | null>(null)
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null)
  const [calendarIntent, setCalendarIntent] = useState<
    "period" | "release" | null
  >(null)
  const [periodMonth, setPeriodMonth] = useState(monthStartDateOnly())
  const [releasedAt, setReleasedAt] = useState(todayDateOnly())
  const [releasedAmount, setReleasedAmount] = useState("")
  const [decision, setDecision] = useState<
    "approved" | "rejected" | "under_review"
  >("approved")
  const [approvedAmount, setApprovedAmount] = useState("")
  const [approvedMonths, setApprovedMonths] = useState("")
  const [salesAmount, setSalesAmount] = useState("")
  const [purchaseCostAmount, setPurchaseCostAmount] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const queuedFormRef = useRef<FormIntent | null>(null)
  const queuedReviewRef = useRef<ReviewIntent | null>(null)
  const queuedSuccessRef = useRef<string | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      setWorkspace(
        await getFoodPurchaseOperationsWorkspace({
          cycleId: selectedCycleId,
          lane,
          search: search || undefined,
        })
      )
    } catch (error) {
      captureMobileError(error, "mobile.food_purchase_operations")
      setLoadError(
        error instanceof Error
          ? error.message
          : "Foodstuff Purchase operations could not be loaded."
      )
    } finally {
      setIsLoading(false)
    }
  }, [lane, search, selectedCycleId])

  useFocusEffect(useCallback(() => void loadWorkspace(), [loadWorkspace]))

  const loadMoreApplications = useCallback(async () => {
    const cursor = workspace?.nextApplicationCursor
    if (!cursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const next = await getFoodPurchaseOperationsWorkspace({
        cursor,
        cycleId: selectedCycleId,
        lane,
        search: search || undefined,
      })
      setWorkspace((current) =>
        current
          ? {
              ...next,
              applications: [...current.applications, ...next.applications],
            }
          : next
      )
    } catch (error) {
      captureMobileError(error, "mobile.food_purchase_operations")
      setLoadError(
        error instanceof Error
          ? error.message
          : "More Foodstuff Purchase applications could not be loaded."
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, lane, search, selectedCycleId, workspace])

  const openDetail = useCallback(async (
    applicationId: string,
    origin: "list" | "notification" = "list"
  ) => {
    setDetailVisible(true)
    setIsDetailLoading(true)
    setIsDestinationUnavailable(false)
    try {
      setDetail(
        (await getFoodPurchaseApplicationDetail(
          applicationId
        )) as FoodPurchaseApplication
      )
    } catch (error) {
      captureMobileError(error, "mobile.food_purchase_operations")
      if (origin === "notification") {
        setIsDestinationUnavailable(true)
      } else {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Application details could not be loaded."
        )
      }
      setDetailVisible(false)
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (
      !initialEntityId ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }
    handledNotificationEntityRef.current = initialEntityId
    void openDetail(initialEntityId, "notification")
  }, [initialEntityId, openDetail])

  const commandsBlocked = runtime.state.connectivity !== "online"
  const currencyCode = workspace?.currencyCode ?? "NGN"
  const cycle = workspace?.selectedCycle ?? null

  const prepareForm = (intent: FormIntent) => {
    setFormError(null)
    setNotes("")
    setCalendarIntent(null)
    if (intent.kind === "release") {
      setPeriodMonth(monthStartDateOnly())
      setReleasedAt(todayDateOnly())
      setReleasedAmount("")
    } else if (intent.kind === "reviewApplication") {
      setDecision("approved")
      setApprovedAmount(String(intent.application.requestedAmount))
      setApprovedMonths(String(intent.application.requestedPaybackMonths))
    } else if (intent.kind === "submitAccounting") {
      setSalesAmount(String(intent.cycle.salesAmount ?? ""))
      setPurchaseCostAmount(String(intent.cycle.purchaseCostAmount ?? ""))
      setExpenseAmount(String(intent.cycle.operatingExpenseAmount ?? 0))
      setNotes(intent.cycle.accountingNotes ?? "")
    } else {
      setDecision("approved")
    }
    setFormIntent(intent)
  }

  const openFormFromDetail = (intent: FormIntent) => {
    queuedFormRef.current = intent
    setDetailVisible(false)
  }

  const validateForm = () => {
    setFormError(null)
    if (!formIntent) return
    if (formIntent.kind === "release" && Number(releasedAmount) <= 0) {
      setFormError("Enter the committee release amount.")
      return
    }
    if (
      formIntent.kind === "reviewApplication" &&
      decision === "approved" &&
      (Number(approvedAmount) <= 0 || Number(approvedMonths) <= 0)
    ) {
      setFormError("Enter the approved amount and payback months.")
      return
    }
    if (
      formIntent.kind === "reviewApplication" &&
      decision !== "under_review" &&
      notes.trim().length < 2
    ) {
      setFormError("Record the review evidence for a final decision.")
      return
    }
    if (
      formIntent.kind === "submitAccounting" &&
      [salesAmount, purchaseCostAmount, expenseAmount].some(
        (value) => !value || Number(value) < 0
      )
    ) {
      setFormError("Enter valid sales, purchase cost, and expense totals.")
      return
    }
    if (
      formIntent.kind === "reviewAccounting" &&
      decision === "rejected" &&
      notes.trim().length < 2
    ) {
      setFormError("Explain the correction required.")
      return
    }
    queuedReviewRef.current = formIntent
    setFormIntent(null)
  }

  const runCommand = async () => {
    if (!reviewIntent) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      if (reviewIntent.kind === "release") {
        await createFoodPurchaseCycle({
          commandId: createClientSubmissionKey(),
          periodMonth: `${periodMonth.slice(0, 8)}01`,
          releasedAmount: Number(releasedAmount),
          releasedAt,
          releaseNotes: notes.trim() || undefined,
        })
        queuedSuccessRef.current =
          "Release evidence recorded as a draft cycle. No cash ledger posting was created."
      } else if (reviewIntent.kind === "reviewApplication") {
        await reviewFoodPurchaseApplication({
          applicationId: reviewIntent.application.id,
          approvedAmount:
            decision === "approved" ? Number(approvedAmount) : undefined,
          approvedPaybackMonths:
            decision === "approved" ? Number(approvedMonths) : undefined,
          commandId: createClientSubmissionKey(),
          expectedState: reviewIntent.application.status as
            | "submitted"
            | "under_review",
          notes: notes.trim() || undefined,
          status: decision,
        })
        queuedSuccessRef.current =
          "Application decision recorded against the cycle and policy snapshot."
      } else if (reviewIntent.kind === "submitAccounting") {
        await submitFoodPurchaseAccounting({
          commandId: createClientSubmissionKey(),
          cycleId: reviewIntent.cycle.id,
          expectedState: reviewIntent.cycle.status as
            | "accounting_rejected"
            | "intake_closed",
          notes: notes.trim() || undefined,
          operatingExpenseAmount: Number(expenseAmount),
          purchaseCostAmount: Number(purchaseCostAmount),
          salesAmount: Number(salesAmount),
        })
        queuedSuccessRef.current =
          "Accounting evidence submitted for independent finance review. Profit was not distributed."
      } else if (reviewIntent.kind === "reviewAccounting") {
        await reviewFoodPurchaseAccounting({
          commandId: createClientSubmissionKey(),
          cycleId: reviewIntent.cycle.id,
          decision: decision === "approved" ? "approved" : "rejected",
          expectedState: "accounting_submitted",
          notes: notes.trim() || undefined,
        })
        queuedSuccessRef.current =
          decision === "approved"
            ? "Accounting accepted as governance evidence. No profit allocation was created."
            : "Accounting returned to the committee for correction."
      } else if (reviewIntent.transition === "complete") {
        await completeFoodPurchaseCycle({
          commandId: createClientSubmissionKey(),
          cycleId: reviewIntent.cycle.id,
          expectedState: "accounting_approved",
          notes: notes.trim() || undefined,
          transition: "complete",
        })
        queuedSuccessRef.current =
          "Foodstuff Purchase cycle completed without creating a profit distribution."
      } else {
        await transitionFoodPurchaseCycle({
          commandId: createClientSubmissionKey(),
          cycleId: reviewIntent.cycle.id,
          expectedState: reviewIntent.cycle.status,
          notes: notes.trim() || undefined,
          transition: reviewIntent.transition,
        })
        queuedSuccessRef.current = getCycleTransitionSuccessMessage(
          reviewIntent.transition
        )
      }
      setReviewIntent(null)
      await loadWorkspace()
    } catch (error) {
      captureMobileError(error, "mobile.food_purchase_operations")
      setFormError(
        error instanceof Error
          ? error.message
          : "The Foodstuff Purchase command could not be completed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const cycleAction = useMemo(() => {
    if (!cycle) return null
    if (cycle.status === "draft")
      return { label: "Open intake", transition: "open_intake" as const }
    if (cycle.status === "open")
      return { label: "Close intake", transition: "close_intake" as const }
    if (cycle.status === "intake_closed")
      return { label: "Reopen intake", transition: "reopen_intake" as const }
    if (cycle.status === "accounting_approved")
      return { label: "Complete cycle", transition: "complete" as const }
    return null
  }, [cycle])

  const reviewRows = useMemo(() => {
    if (!reviewIntent) return []
    if (reviewIntent.kind === "release")
      return [
        { label: "Cycle", value: formatMonth(`${periodMonth}T12:00:00.000Z`) },
        {
          label: "Release amount",
          value: formatCurrency(Number(releasedAmount || 0), currencyCode),
        },
        {
          label: "Release date",
          value: formatDate(`${releasedAt}T12:00:00.000Z`),
        },
        {
          label: "Effect",
          value: "Operational evidence only; no cash posting",
        },
      ]
    if (reviewIntent.kind === "reviewApplication")
      return [
        { label: "Member", value: reviewIntent.application.member.fullName },
        { label: "Decision", value: labelize(decision) },
        {
          label: "Approved amount",
          value:
            decision === "approved"
              ? formatCurrency(Number(approvedAmount || 0), currencyCode)
              : "Not applicable",
        },
        {
          label: "Payback",
          value:
            decision === "approved"
              ? `${approvedMonths} months`
              : "Not applicable",
        },
      ]
    if (reviewIntent.kind === "submitAccounting") {
      const profit =
        Number(salesAmount || 0) -
        Number(purchaseCostAmount || 0) -
        Number(expenseAmount || 0)
      return [
        {
          label: "Sales",
          value: formatCurrency(Number(salesAmount || 0), currencyCode),
        },
        {
          label: "Purchase cost",
          value: formatCurrency(Number(purchaseCostAmount || 0), currencyCode),
        },
        {
          label: "Expenses",
          value: formatCurrency(Number(expenseAmount || 0), currencyCode),
        },
        {
          label: "Calculated profit",
          value: formatCurrency(profit, currencyCode),
        },
        { label: "Effect", value: "Governance evidence only; no distribution" },
      ]
    }
    if (reviewIntent.kind === "reviewAccounting")
      return [
        { label: "Cycle", value: formatMonth(reviewIntent.cycle.periodMonth) },
        {
          label: "Decision",
          value:
            decision === "approved"
              ? "Accept accounting"
              : "Request correction",
        },
        {
          label: "Recorded profit",
          value: formatCurrency(
            reviewIntent.cycle.profitAmount ?? 0,
            currencyCode
          ),
        },
        { label: "Effect", value: "No member or dividend posting" },
      ]
    return [
      { label: "Cycle", value: formatMonth(reviewIntent.cycle.periodMonth) },
      { label: "Current state", value: labelize(reviewIntent.cycle.status) },
      { label: "Action", value: labelize(reviewIntent.transition) },
    ]
  }, [
    approvedAmount,
    approvedMonths,
    currencyCode,
    decision,
    expenseAmount,
    periodMonth,
    purchaseCostAmount,
    releasedAmount,
    releasedAt,
    reviewIntent,
    salesAmount,
  ])

  const formDirty = Boolean(
    notes ||
    releasedAmount ||
    approvedAmount ||
    approvedMonths ||
    salesAmount ||
    purchaseCostAmount ||
    expenseAmount
  )

  return (
    <SafeArea className="flex-1 bg-background">
      <AppKeyboardAwareScrollView
        bottomOffset={140}
        contentContainerClassName="gap-5 px-5 pb-28 pt-4"
        keyboardShouldPersistTaps="handled"
        testID="admin-food-purchase-operations-screen"
      >
        <ScreenHeader
          action={
            <Button
              accessibilityLabel="Refresh Foodstuff Purchase operations"
              disabled={isLoading}
              onPress={loadWorkspace}
              size="icon"
              variant="secondary"
            >
              <Icon className="size-base text-primary" name="RefreshCw" />
            </Button>
          }
          title="Foodstuff Purchase"
        />
        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={() => setIsDestinationUnavailable(false)}
          />
        ) : null}
        <View className="flex-row items-center gap-2 border-b border-border pb-4">
          <View
            className={`size-2 rounded-full ${loadError ? "bg-destructive" : "bg-success"}`}
          />
          <Text
            className={`text-xs font-bold ${loadError ? "text-destructive" : "text-success"}`}
          >
            {loadError ? "Refresh required" : "Live cycle data"}
          </Text>
        </View>
        {loadError ? <ErrorBanner message={loadError} /> : null}
        {commandsBlocked ? (
          <ErrorBanner message="Records remain readable offline. Cycle, review, and accounting commands require live data." />
        ) : null}

        {cycle ? (
          <View className="gap-4 border-b border-border pb-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                  {formatMonth(cycle.periodMonth)}
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  {formatCompactCurrency(cycle.releasedAmount, currencyCode)}{" "}
                  committee release · {formatDate(cycle.releasedAt)}
                </Text>
              </View>
              <View className="rounded-full bg-primary/10 px-3 py-2">
                <Text className="text-xs font-extrabold text-primary">
                  {labelize(cycle.status)}
                </Text>
              </View>
            </View>
            <View className="flex-row border-y border-border">
              {[
                ["1", "Release", true],
                ["2", "Applications", cycle.status !== "draft"],
                [
                  "3",
                  "Accounting",
                  cycle.status.startsWith("accounting") ||
                    ["completed", "closed"].includes(cycle.status),
                ],
                [
                  "4",
                  "Complete",
                  ["completed", "closed"].includes(cycle.status),
                ],
              ].map(([number, label, active], index) => (
                <View
                  className={`flex-1 items-center gap-1 py-3 ${index ? "border-l border-border" : ""}`}
                  key={String(label)}
                >
                  <View
                    className={`size-7 items-center justify-center rounded-full ${active ? "bg-primary" : "bg-muted"}`}
                  >
                    <Text
                      className={`text-xs font-extrabold ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {String(number)}
                    </Text>
                  </View>
                  <Text className="text-[10px] font-bold text-muted-foreground">
                    {String(label)}
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-row divide-x divide-border">
              <View className="flex-1 gap-1 pr-4">
                <Text className="text-lg font-extrabold text-foreground">
                  {formatCompactCurrency(
                    workspace?.summary.approvedAmount ?? 0,
                    currencyCode
                  )}
                </Text>
                <Text className="text-xs text-muted-foreground">Approved</Text>
              </View>
              <View className="flex-1 gap-1 px-4">
                <Text className="text-lg font-extrabold text-foreground">
                  {formatCompactCurrency(
                    workspace?.summary.paidAmount ?? 0,
                    currencyCode
                  )}
                </Text>
                <Text className="text-xs text-muted-foreground">Paid</Text>
              </View>
              <View className="flex-1 gap-1 pl-4">
                <Text className="text-lg font-extrabold text-foreground">
                  {formatCompactCurrency(
                    workspace?.summary.availableAmount ?? 0,
                    currencyCode
                  )}
                </Text>
                <Text className="text-xs text-muted-foreground">Available</Text>
              </View>
            </View>
            {(workspace?.summary.allocationShortfallAmount ?? 0) > 0 ? (
              <View className="border-warn/30 flex-row items-start gap-3 border-y py-3">
                <Icon
                  className="size-sm text-warn mt-0.5"
                  name="AlertTriangle"
                />
                <Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
                  Approved applications exceed the recorded committee release by{" "}
                  {formatCurrency(
                    workspace?.summary.allocationShortfallAmount ?? 0,
                    currencyCode
                  )}
                  . Available funds are shown as zero; review the historical
                  release and approval evidence before continuing.
                </Text>
              </View>
            ) : null}
            <View className="flex-row gap-2">
              {cycleAction ? (
                <Button
                  className="h-11 flex-1"
                  disabled={
                    commandsBlocked || !workspace?.capabilities.releaseFunds
                  }
                  onPress={() =>
                    setReviewIntent({
                      cycle,
                      kind: "cycleTransition",
                      transition: cycleAction.transition,
                    })
                  }
                  variant="secondary"
                >
                  <Text>{cycleAction.label}</Text>
                </Button>
              ) : null}
              {cycle.status === "intake_closed" ||
              cycle.status === "accounting_rejected" ? (
                <Button
                  className="h-11 flex-1"
                  disabled={
                    commandsBlocked || !workspace?.capabilities.submitAccounting
                  }
                  onPress={() =>
                    prepareForm({ cycle, kind: "submitAccounting" })
                  }
                >
                  <Text>
                    {cycle.status === "accounting_rejected"
                      ? "Correct accounting"
                      : "Submit accounting"}
                  </Text>
                </Button>
              ) : null}
              {cycle.status === "accounting_submitted" ? (
                <Button
                  className="h-11 flex-1"
                  disabled={
                    commandsBlocked || !workspace?.capabilities.reviewAccounting
                  }
                  onPress={() =>
                    prepareForm({ cycle, kind: "reviewAccounting" })
                  }
                >
                  <Text>Review accounting</Text>
                </Button>
              ) : null}
            </View>
          </View>
        ) : (
          <EmptyState
            description="Record committee release evidence to start a monthly cycle."
            icon="ShoppingBasket"
            title="No Foodstuff Purchase cycle"
          />
        )}

        <ScrollView
          horizontal
          contentContainerClassName="gap-2"
          showsHorizontalScrollIndicator={false}
        >
          {workspace?.cycles.map((item) => (
            <Button
              className="h-10 px-3"
              key={item.id}
              onPress={() => setSelectedCycleId(item.id)}
              variant={cycle?.id === item.id ? "secondary" : "ghost"}
            >
              <Text>{formatMonth(item.periodMonth)}</Text>
            </Button>
          ))}
          {workspace?.capabilities.releaseFunds ? (
            <Button
              accessibilityLabel="Record committee release"
              className="h-10 px-3"
              disabled={commandsBlocked}
              onPress={() => prepareForm({ kind: "release" })}
              variant="outline"
            >
              <Icon className="size-sm mr-1 text-foreground" name="Plus" />
              <Text>New cycle</Text>
            </Button>
          ) : null}
        </ScrollView>

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
              testID={`food-purchase-lane-${item.value}`}
              variant={lane === item.value ? "secondary" : "ghost"}
            >
              <Text>
                {item.label}
                {item.value === "applications" && workspace
                  ? ` · ${workspace.summary.totalApplications}`
                  : ""}
              </Text>
            </Button>
          ))}
        </ScrollView>

        {lane === "applications" ? (
          <>
            <View className="flex-row gap-2">
              <Input
                accessibilityLabel="Search Foodstuff Purchase applications"
                className="min-w-0 flex-1"
                onChangeText={setSearchDraft}
                onSubmitEditing={Keyboard.dismiss}
                placeholder="Search member or item"
                returnKeyType="search"
                testID="food-purchase-search-input"
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
            <View>
              <View className="flex-row items-end justify-between gap-3 border-b border-border pb-3">
                <Text className="text-lg font-extrabold text-foreground">
                  Applications
                </Text>
                <Text className="text-xs font-medium text-muted-foreground">
                  {workspace?.summary.pendingApplications ?? 0} need review
                </Text>
              </View>
              {isLoading && !workspace ? (
                <View className="items-center py-16">
                  <LoadingSpinner />
                </View>
              ) : (
                <VirtualizedCardList
                  data={workspace?.applications ?? []}
                  empty={
                    <EmptyState
                      description="No applications match this cycle and search."
                      icon="ClipboardList"
                      title="No applications"
                    />
                  }
                  estimatedItemSize={92}
                  keyExtractor={(application) => application.id}
                  maxHeight={552}
                  renderItem={({ item: application }) => (
                    <ApplicationRow
                      application={application}
                      currencyCode={currencyCode}
                      onPress={() => void openDetail(application.id)}
                    />
                  )}
                />
              )}
              {workspace?.nextApplicationCursor ? (
                <Button
                  className="mt-3 h-11"
                  disabled={isLoadingMore}
                  onPress={() => void loadMoreApplications()}
                  variant="secondary"
                >
                  {isLoadingMore ? (
                    <LoadingSpinner />
                  ) : (
                    <Text>Load more applications</Text>
                  )}
                </Button>
              ) : null}
            </View>
          </>
        ) : lane === "accounting" ? (
          <View className="gap-3">
            <View className="flex-row items-end justify-between border-b border-border pb-3">
              <Text className="text-lg font-extrabold text-foreground">
                Accounting evidence
              </Text>
              <Text className="text-xs text-muted-foreground">
                Governance record
              </Text>
            </View>
            {cycle?.accountingSubmittedAt ? (
              <>
                {[
                  ["Sales", cycle.salesAmount ?? 0],
                  ["Purchase cost", cycle.purchaseCostAmount ?? 0],
                  ["Operating expenses", cycle.operatingExpenseAmount ?? 0],
                  ["Recorded profit", cycle.profitAmount ?? 0],
                ].map(([label, value]) => (
                  <View
                    className="flex-row items-center justify-between border-b border-border py-3"
                    key={String(label)}
                  >
                    <Text className="text-sm text-muted-foreground">
                      {String(label)}
                    </Text>
                    <Text className="text-sm font-extrabold text-foreground">
                      {formatCurrency(Number(value), currencyCode)}
                    </Text>
                  </View>
                ))}
                <Text className="text-xs leading-5 text-muted-foreground">
                  {cycle.accountingNotes ?? "No accounting note"}
                </Text>
              </>
            ) : (
              <EmptyState
                description="Close application intake before the committee submits month-end accounting."
                icon="ReceiptText"
                title="Accounting not submitted"
              />
            )}
          </View>
        ) : (
          <View>
            <View className="flex-row items-end justify-between border-b border-border pb-3">
              <Text className="text-lg font-extrabold text-foreground">
                Cycle history
              </Text>
              <Text className="text-xs text-muted-foreground">
                Newest first
              </Text>
            </View>
            {workspace?.cycles.map((item) => (
              <Pressable
                accessibilityHint="Opens the released cycle details"
                accessibilityLabel={`${formatMonth(item.periodMonth)} cycle, ${labelize(item.status)}, released ${formatCurrency(item.releasedAmount, currencyCode)}`}
                accessibilityRole="button"
                className="flex-row items-center gap-3 border-b border-border py-4"
                key={item.id}
                onPress={() => setSelectedCycleId(item.id)}
              >
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    {formatMonth(item.periodMonth)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {labelize(item.status)} · released{" "}
                    {formatDate(item.releasedAt)}
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-foreground">
                  {formatCurrency(item.releasedAmount, currencyCode)}
                </Text>
                <Icon
                  className="size-sm text-muted-foreground"
                  name="ChevronRight"
                />
              </Pressable>
            ))}
          </View>
        )}

        <View className="flex-row items-start gap-3 border-t border-border pt-4">
          <Icon className="size-sm text-warn mt-0.5" name="ShieldCheck" />
          <Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
            Committee release, settlement, and accounting are operational
            evidence. This workspace does not post cash or distribute Foodstuff
            Purchase profit.
          </Text>
        </View>
      </AppKeyboardAwareScrollView>

      <FloatingBottomSheet
        accessibilityLabel={
          detail
            ? `${detail.member.fullName} Foodstuff Purchase application`
            : "Foodstuff Purchase application"
        }
        hideHandle
        onClose={() => setDetailVisible(false)}
        onDismissed={() => {
          const queued = queuedFormRef.current
          queuedFormRef.current = null
          if (queued) prepareForm(queued)
          else setDetail(null)
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
                {detail?.member.fullName ?? "Loading application"}
              </Text>
              {detail ? (
                <Text className="text-sm text-muted-foreground">
                  {detail.member.memberNumber} ·{" "}
                  {detail.itemDescription ?? "Foodstuff Purchase"}
                </Text>
              ) : null}
            </View>
            <Button
              accessibilityLabel="Close application"
              onPress={() => setDetailVisible(false)}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="X" />
            </Button>
          </View>
          {isDetailLoading || !detail ? (
            <View className="items-center py-20">
              <LoadingSpinner />
            </View>
          ) : (
            <>
              <View className="flex-row items-end justify-between border-b border-border pb-4">
                <View>
                  <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                    {formatCurrency(
                      detail.approvedAmount ?? detail.requestedAmount,
                      currencyCode
                    )}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {detail.approvedPaybackMonths ??
                      detail.requestedPaybackMonths}{" "}
                    months · {labelize(detail.status)}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-primary">
                  {detail.policyMaximumPaybackMonths} month cap
                </Text>
              </View>
              <View className="gap-1 border-b border-border pb-4">
                <Text className="text-sm font-bold text-foreground">
                  Settlement
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  {formatCurrency(detail.paidAmount, currencyCode)} paid ·{" "}
                  {formatCurrency(detail.outstandingAmount, currencyCode)}{" "}
                  outstanding
                </Text>
              </View>
              <View className="gap-1 border-b border-border pb-4">
                <Text className="text-sm font-bold text-foreground">
                  Policy snapshot
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Maximum {detail.policyMaximumPaybackMonths} months ·
                  commitment reduction{" "}
                  {detail.allowsCommitmentReductionDuringPayback
                    ? "allowed"
                    : "locked"}
                </Text>
              </View>
              {detail.status === "submitted" ||
              detail.status === "under_review" ? (
                <Button
                  className="h-12"
                  disabled={
                    commandsBlocked ||
                    !workspace?.capabilities.reviewApplications ||
                    cycle?.status !== "open"
                  }
                  onPress={() =>
                    openFormFromDetail({
                      application: detail,
                      kind: "reviewApplication",
                    })
                  }
                >
                  <Text>Review application</Text>
                </Button>
              ) : null}
            </>
          )}
        </View>
      </FloatingBottomSheet>

      <FullScreenFormSheet
        dirty={formIntent?.kind === "release" && formDirty}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              label="Quick fill committee release"
              onPress={() => {
                setPeriodMonth(monthStartDateOnly())
                setReleasedAt(todayDateOnly())
                setReleasedAmount("1200000")
                setNotes("Committee release evidence verified by finance.")
              }}
              placement="footer"
              portal={false}
            />
            <Button className="h-12 flex-1" onPress={validateForm}>
              <Text>Review release</Text>
            </Button>
          </View>
        }
        onClose={() => {
          setCalendarIntent(null)
          setFormIntent(null)
        }}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        overlay={
          <CalendarPickerSheet
            label={calendarIntent === "period" ? "Cycle month" : "Release date"}
            onChange={
              calendarIntent === "period" ? setPeriodMonth : setReleasedAt
            }
            onClose={() => setCalendarIntent(null)}
            testID={
              calendarIntent === "period"
                ? "food-purchase-period-calendar"
                : "food-purchase-release-calendar"
            }
            value={calendarIntent === "period" ? periodMonth : releasedAt}
            visible={Boolean(calendarIntent)}
          />
        }
        title="Record committee release"
        visible={formIntent?.kind === "release"}
      >
        <Text className="text-sm leading-5 text-muted-foreground">
          Record separately governed release evidence. This does not post cash
          or a general-ledger transaction.
        </Text>
        <FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />
        {formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Cycle month">
          <CalendarDateField
            accessibilityLabel="Cycle month"
            onPress={() => setCalendarIntent("period")}
            testID="food-purchase-period-input"
            value={periodMonth}
          />
        </Field>
        <Field label="Release amount">
          <Input
            keyboardType="decimal-pad"
            onChangeText={setReleasedAmount}
            placeholder="1200000"
            testID="food-purchase-release-amount-input"
            value={releasedAmount}
          />
        </Field>
        <Field label="Release date">
          <CalendarDateField
            accessibilityLabel="Release date"
            onPress={() => setCalendarIntent("release")}
            testID="food-purchase-release-date-input"
            value={releasedAt}
          />
        </Field>
        <Field label="Release evidence note (optional)">
          <Textarea
            onChangeText={setNotes}
            placeholder="Record the committee authorization evidence checked."
            testID="food-purchase-release-notes-input"
            value={notes}
          />
        </Field>
      </FullScreenFormSheet>

      <FullScreenFormSheet
        dirty={formIntent?.kind === "reviewApplication" && formDirty}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              label="Quick fill application review"
              onPress={() => {
                setDecision("approved")
                setApprovedAmount(
                  String(
                    formIntent?.kind === "reviewApplication"
                      ? formIntent.application.requestedAmount
                      : 180000
                  )
                )
                setApprovedMonths(
                  String(
                    formIntent?.kind === "reviewApplication"
                      ? formIntent.application.requestedPaybackMonths
                      : 4
                  )
                )
                setNotes(
                  "Approved within cycle capacity and the member obligation policy."
                )
              }}
              placement="footer"
              portal={false}
            />
            <Button className="h-12 flex-1" onPress={validateForm}>
              <Text>Review decision</Text>
            </Button>
          </View>
        }
        onClose={() => setFormIntent(null)}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        title="Review application"
        visible={formIntent?.kind === "reviewApplication"}
      >
        <FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />
        {formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Decision">
          <View className="flex-row gap-2">
            {(["approved", "under_review", "rejected"] as const).map(
              (value) => (
                <Button
                  className="flex-1"
                  key={value}
                  onPress={() => setDecision(value)}
                  variant={decision === value ? "secondary" : "outline"}
                >
                  <Text>{labelize(value)}</Text>
                </Button>
              )
            )}
          </View>
        </Field>
        {decision === "approved" ? (
          <>
            <Field label="Approved amount">
              <Input
                keyboardType="decimal-pad"
                onChangeText={setApprovedAmount}
                placeholder="180000"
                testID="food-purchase-approved-amount-input"
                value={approvedAmount}
              />
            </Field>
            <Field label="Approved payback months">
              <Input
                keyboardType="number-pad"
                onChangeText={setApprovedMonths}
                placeholder="4"
                testID="food-purchase-approved-months-input"
                value={approvedMonths}
              />
            </Field>
          </>
        ) : null}
        <Field label="Review evidence">
          <Textarea
            onChangeText={setNotes}
            placeholder="Record the policy and decision evidence."
            testID="food-purchase-review-notes-input"
            value={notes}
          />
        </Field>
      </FullScreenFormSheet>

      <FullScreenFormSheet
        dirty={formIntent?.kind === "submitAccounting" && formDirty}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              label="Quick fill cycle accounting"
              onPress={() => {
                setSalesAmount("1386500")
                setPurchaseCostAmount("1120000")
                setExpenseAmount("80000")
                setNotes(
                  "Committee sales, supplier cost, and operating expense evidence reconciled."
                )
              }}
              placement="footer"
              portal={false}
            />
            <Button className="h-12 flex-1" onPress={validateForm}>
              <Text>Review accounting</Text>
            </Button>
          </View>
        }
        onClose={() => setFormIntent(null)}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        title="Submit cycle accounting"
        visible={formIntent?.kind === "submitAccounting"}
      >
        <Text className="text-sm leading-5 text-muted-foreground">
          These totals are governance evidence. Submission does not distribute
          the calculated profit.
        </Text>
        <FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />
        {formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Sales total">
          <Input
            keyboardType="decimal-pad"
            onChangeText={setSalesAmount}
            placeholder="1386500"
            testID="food-purchase-sales-input"
            value={salesAmount}
          />
        </Field>
        <Field label="Purchase cost">
          <Input
            keyboardType="decimal-pad"
            onChangeText={setPurchaseCostAmount}
            placeholder="1120000"
            testID="food-purchase-cost-input"
            value={purchaseCostAmount}
          />
        </Field>
        <Field label="Operating expenses">
          <Input
            keyboardType="decimal-pad"
            onChangeText={setExpenseAmount}
            placeholder="80000"
            testID="food-purchase-expense-input"
            value={expenseAmount}
          />
        </Field>
        <Field label="Accounting evidence note (optional)">
          <Textarea
            onChangeText={setNotes}
            placeholder="Record the evidence reconciled by the committee."
            testID="food-purchase-accounting-notes-input"
            value={notes}
          />
        </Field>
      </FullScreenFormSheet>

      <FullScreenFormSheet
        dirty={formIntent?.kind === "reviewAccounting" && formDirty}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              label="Quick fill accounting review"
              onPress={() => {
                setDecision("approved")
                setNotes(
                  "Accounting totals and evidence reconciled against the committee submission."
                )
              }}
              placement="footer"
              portal={false}
            />
            <Button className="h-12 flex-1" onPress={validateForm}>
              <Text>Review decision</Text>
            </Button>
          </View>
        }
        onClose={() => setFormIntent(null)}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        title="Review cycle accounting"
        visible={formIntent?.kind === "reviewAccounting"}
      >
        <Text className="text-sm leading-5 text-muted-foreground">
          Acceptance records governance evidence only. It does not create member
          obligations or allocate profit.
        </Text>
        <FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />
        {formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Decision">
          <View className="flex-row gap-2">
            <Button
              className="flex-1"
              onPress={() => setDecision("approved")}
              variant={decision === "approved" ? "secondary" : "outline"}
            >
              <Text>Accept</Text>
            </Button>
            <Button
              className="flex-1"
              onPress={() => setDecision("rejected")}
              variant={decision === "rejected" ? "secondary" : "outline"}
            >
              <Text>Request correction</Text>
            </Button>
          </View>
        </Field>
        <Field
          label={
            decision === "rejected"
              ? "Correction required"
              : "Review note (optional)"
          }
        >
          <Textarea
            onChangeText={setNotes}
            placeholder={
              decision === "rejected"
                ? "Explain what the committee must correct."
                : "Record the evidence reviewed."
            }
            testID="food-purchase-accounting-review-notes-input"
            value={notes}
          />
        </Field>
      </FullScreenFormSheet>

      <SubmissionReviewSheet
        confirmLabel={
          reviewIntent?.kind === "cycleTransition"
            ? reviewIntent.transition === "complete"
              ? "Complete cycle"
              : labelize(reviewIntent.transition)
            : reviewIntent?.kind === "release"
              ? "Record release"
              : reviewIntent?.kind === "reviewApplication"
                ? "Confirm decision"
                : reviewIntent?.kind === "submitAccounting"
                  ? "Submit accounting"
                  : "Confirm accounting review"
        }
        description="The server will verify the current tenant, permission, and expected record state before applying this command."
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
          reviewIntent?.kind === "release"
            ? "Review committee release"
            : reviewIntent?.kind === "reviewApplication"
              ? "Review application decision"
              : reviewIntent?.kind === "submitAccounting"
                ? "Review cycle accounting"
                : reviewIntent?.kind === "reviewAccounting"
                  ? "Review accounting decision"
                  : "Review cycle action"
        }
        visible={Boolean(reviewIntent)}
      />
      <SubmissionSuccessSheet
        description={
          success ?? "The Foodstuff Purchase operation was confirmed."
        }
        onClose={() => setSuccess(null)}
        title="Operation recorded"
        visible={Boolean(success)}
      />
    </SafeArea>
  )
}
