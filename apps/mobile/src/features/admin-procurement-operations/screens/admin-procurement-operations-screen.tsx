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
import {
  addMonthsDateOnly,
  compareDateOnly,
  formatDateOnly,
  isValidDateOnly,
  todayDateOnly,
} from "@/lib/date-only"
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
  activateProcurementOperation,
  getProcurementOperationDetail,
  getProcurementOperationsWorkspace,
  reviewProcurementOperation,
  submitProcurementPayment,
} from "../api/admin-procurement-operations-api"
import type {
  ProcurementLane,
  ProcurementOperation,
  ProcurementScheduleItem,
  ProcurementWorkspace,
} from "../model/admin-procurement-operations-types"

const lanes: { label: string; value: ProcurementLane }[] = [
  { label: "Review", value: "review" },
  { label: "Activate", value: "activate" },
  { label: "Servicing", value: "servicing" },
  { label: "Completed", value: "completed" },
]

type FormIntent =
  | { kind: "review"; request: ProcurementOperation }
  | { kind: "activate"; request: ProcurementOperation }
  | {
      kind: "payment"
      request: ProcurementOperation
      scheduleItem: ProcurementScheduleItem
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
    style: "currency",
  }).format(value / divisor)}${suffix}`
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function plusMonthDateOnly() {
  return addMonthsDateOnly(todayDateOnly(), 1)
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
      <Icon className="mt-0.5 size-sm text-destructive" name="AlertCircle" />
      <Text className="min-w-0 flex-1 text-sm leading-5 font-medium text-destructive">
        {message}
      </Text>
    </View>
  )
}

function OperationRow({
  currencyCode,
  item,
  onPress,
}: {
  currencyCode: string
  item: ProcurementOperation
  onPress: () => void
}) {
  const critical = item.overdueCount > 0
  const amount = item.lane === "servicing" ? item.outstandingAmount : item.approvedCost ?? item.requestedCost
  return (
    <Pressable
      accessibilityHint="Opens procurement evidence, policy snapshot, and legal actions"
      accessibilityLabel={`${item.member.fullName}, ${item.itemName}, ${formatCurrency(amount, currencyCode)}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`procurement-operation-${item.lane}-${item.id}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {item.member.fullName}
          </Text>
          <Text className="text-sm font-extrabold text-foreground">
            {formatCurrency(amount, currencyCode)}
          </Text>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {item.itemName} · {item.approvedRepaymentMonths ?? item.requestedRepaymentMonths} months
        </Text>
        <View className="flex-row items-center gap-2">
          <View className={`size-2 rounded-full ${critical ? "bg-destructive" : item.lane === "completed" ? "bg-success" : item.lane === "activate" ? "bg-primary" : "bg-warn"}`} />
          <Text className={`text-xs font-medium ${critical ? "text-destructive" : "text-muted-foreground"}`}>
            {critical
              ? `${item.overdueCount} overdue installment${item.overdueCount === 1 ? "" : "s"}`
              : item.lane === "activate"
                ? item.vendorName
                  ? "Approved · purchase evidence required"
                  : "Approved · vendor evidence required"
                : labelize(item.status)}
          </Text>
        </View>
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

export function AdminProcurementOperationsScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const runtime = useMobileRuntime()
  const [lane, setLane] = useState<ProcurementLane>("review")
  const [searchDraft, setSearchDraft] = useState("")
  const search = useDebounce(searchDraft.trim(), 350)
  const [workspace, setWorkspace] = useState<ProcurementWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProcurementOperation | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [formIntent, setFormIntent] = useState<FormIntent | null>(null)
  const [reviewIntent, setReviewIntent] = useState<FormIntent | null>(null)
  const [decision, setDecision] = useState<"approved" | "rejected" | "under_review">("approved")
  const [approvedCost, setApprovedCost] = useState("")
  const [approvedMonths, setApprovedMonths] = useState("")
  const [notes, setNotes] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [firstDueDate, setFirstDueDate] = useState("")
  const [purchaseReference, setPurchaseReference] = useState("")
  const [amount, setAmount] = useState("")
  const [paidAt, setPaidAt] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [calendarIntent, setCalendarIntent] = useState<
    "purchase" | "firstDue" | "payment" | null
  >(null)
  const queuedFormRef = useRef<FormIntent | null>(null)
  const queuedReviewRef = useRef<FormIntent | null>(null)
  const queuedSuccessRef = useRef<string | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      setWorkspace(
        await getProcurementOperationsWorkspace({
          lane,
          search: search || undefined,
        })
      )
    } catch (error) {
      captureMobileError(error, "mobile.procurement_operations")
      setLoadError(error instanceof Error ? error.message : "Procurement operations could not be loaded.")
    } finally {
      setIsLoading(false)
    }
  }, [lane, search])

  useFocusEffect(useCallback(() => void loadWorkspace(), [loadWorkspace]))

  const openDetail = useCallback(async (
    id: string,
    origin: "list" | "notification" = "list"
  ) => {
    setDetailVisible(true)
    setIsDetailLoading(true)
    setIsDestinationUnavailable(false)
    try {
      setDetail(await getProcurementOperationDetail(id))
    } catch (error) {
      captureMobileError(error, "mobile.procurement_operations")
      if (origin === "notification") {
        setIsDestinationUnavailable(true)
      } else {
        setLoadError(error instanceof Error ? error.message : "Procurement details could not be loaded.")
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
  const actionCount = (workspace?.summary.pendingRequests ?? 0) +
    (workspace?.summary.approvedRequests ?? 0) +
    (workspace?.summary.overdueScheduleItems ?? 0)

  const prepareForm = (intent: FormIntent) => {
    setCalendarIntent(null)
    setFormError(null)
    setNotes("")
    if (intent.kind === "review") {
      setDecision("approved")
      setApprovedCost(String(intent.request.requestedCost))
      setApprovedMonths(String(intent.request.requestedRepaymentMonths))
    } else if (intent.kind === "activate") {
      setPurchaseDate(todayDateOnly())
      setFirstDueDate(plusMonthDateOnly())
      setPurchaseReference("")
    } else {
      setAmount(String(intent.scheduleItem.outstandingAmount))
      setPaidAt(todayDateOnly())
      setPaymentReference("")
    }
    setFormIntent(intent)
  }

  const openFormFromDetail = (intent: FormIntent) => {
    queuedFormRef.current = intent
    setDetailVisible(false)
  }

  const validateForm = () => {
    if (!formIntent) return
    if (commandsBlocked) {
      setFormError("Reconnect and refresh live data before submitting this operation.")
      return
    }
    if (formIntent.kind === "review") {
      if (decision === "approved") {
        const cost = Number(approvedCost.replace(/,/g, ""))
        const months = Number(approvedMonths)
        if (!Number.isFinite(cost) || cost <= 0) return setFormError("Enter a valid approved cost.")
        if (!Number.isInteger(months) || months <= 0 || months > formIntent.request.policyMaximumPaybackMonths) {
          return setFormError(`Approved months must be between 1 and ${formIntent.request.policyMaximumPaybackMonths}.`)
        }
      }
      if (decision !== "under_review" && notes.trim().length < 2) return setFormError("Add review evidence before the final decision.")
    } else if (formIntent.kind === "activate") {
      if (!isValidDateOnly(purchaseDate) || !isValidDateOnly(firstDueDate)) {
        return setFormError("Choose the purchase date and first repayment due date.")
      }
      if (compareDateOnly(firstDueDate, purchaseDate) < 0) {
        return setFormError("First repayment due date cannot be before the purchase date.")
      }
      if (purchaseReference.trim().length < 2) return setFormError("Add the supplier invoice or purchase reference.")
    } else {
      const value = Number(amount.replace(/,/g, ""))
      if (!Number.isFinite(value) || value <= 0 || value > formIntent.scheduleItem.outstandingAmount) return setFormError("Payment must be within the selected installment balance.")
      if (!isValidDateOnly(paidAt)) return setFormError("Choose the payment date.")
      if (paymentReference.trim().length < 2) return setFormError("Add the payment reference.")
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
      if (reviewIntent.kind === "review") {
        await reviewProcurementOperation({
          approvedCost: decision === "approved" ? Number(approvedCost.replace(/,/g, "")) : undefined,
          approvedRepaymentMonths: decision === "approved" ? Number(approvedMonths) : undefined,
          commandId: createClientSubmissionKey(),
          expectedState: reviewIntent.request.status as "submitted" | "under_review",
          notes: notes.trim() || undefined,
          procurementRequestId: reviewIntent.request.id,
          status: decision,
        })
        queuedSuccessRef.current = `Procurement request ${labelize(decision).toLowerCase()} and confirmed by the server.`
      } else if (reviewIntent.kind === "activate") {
        await activateProcurementOperation({
          commandId: createClientSubmissionKey(),
          expectedState: "approved",
          firstDueDate,
          procurementRequestId: reviewIntent.request.id,
          purchaseDate,
          purchaseNotes: notes.trim() || undefined,
          purchaseReference: purchaseReference.trim(),
        })
        queuedSuccessRef.current = "Purchase activated and the approved repayment schedule was created."
      } else {
        await submitProcurementPayment({
          amount: Number(amount.replace(/,/g, "")),
          commandId: createClientSubmissionKey(),
          expectedState: reviewIntent.scheduleItem.status as "due" | "overdue" | "partially_paid" | "pending",
          memberId: reviewIntent.request.member.id,
          notes: notes.trim() || undefined,
          paidAt,
          paymentReference: paymentReference.trim(),
          procurementRepaymentScheduleItemId: reviewIntent.scheduleItem.id,
        })
        queuedSuccessRef.current = "Payment receipt submitted for independent finance review. No balance changed yet."
      }
      setReviewIntent(null)
      await loadWorkspace()
    } catch (error) {
      captureMobileError(error, "mobile.procurement_operations")
      setFormError(error instanceof Error ? error.message : "The procurement command could not be completed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formDirty = Boolean(
    notes || approvedCost || approvedMonths || purchaseReference || amount || paymentReference
  )
  const reviewRows = useMemo(() => {
    if (!reviewIntent) return []
    if (reviewIntent.kind === "review") return [
      { label: "Member", value: reviewIntent.request.member.fullName },
      { label: "Decision", value: labelize(decision) },
      { label: "Approved cost", value: decision === "approved" ? formatCurrency(Number(approvedCost || 0), currencyCode) : "Not applicable" },
      { label: "Approved term", value: decision === "approved" ? `${approvedMonths} months` : "Not applicable" },
    ]
    if (reviewIntent.kind === "activate") return [
      { label: "Member", value: reviewIntent.request.member.fullName },
      { label: "Purchase reference", value: purchaseReference },
      { label: "Purchase date", value: formatDateOnly(purchaseDate) },
      { label: "First due date", value: formatDateOnly(firstDueDate) },
      { label: "Schedule", value: `${reviewIntent.request.approvedRepaymentMonths} installments from approved policy snapshot` },
    ]
    return [
      { label: "Member", value: reviewIntent.request.member.fullName },
      { label: "Installment", value: String(reviewIntent.scheduleItem.installmentNumber) },
      { label: "Amount", value: formatCurrency(Number(amount || 0), currencyCode) },
      { label: "Reference", value: paymentReference },
      { label: "Effect", value: "Receipt review required before settlement" },
    ]
  }, [amount, approvedCost, approvedMonths, currencyCode, decision, firstDueDate, paymentReference, purchaseDate, purchaseReference, reviewIntent])

  return (
    <SafeArea className="flex-1 bg-background">
      <AppKeyboardAwareScrollView
        bottomOffset={140}
        contentContainerClassName="gap-5 px-5 pb-28 pt-4"
        keyboardShouldPersistTaps="handled"
        testID="admin-procurement-operations-screen"
      >
        <ScreenHeader
          action={<Button accessibilityLabel="Refresh procurement operations" disabled={isLoading} onPress={loadWorkspace} size="icon" variant="secondary"><Icon className="size-base text-primary" name="RefreshCw" /></Button>}
          title="Procurement operations"
        />
        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={() => setIsDestinationUnavailable(false)}
          />
        ) : null}
        <View className="flex-row items-center gap-2 border-b border-border pb-4">
          <View className={`size-2 rounded-full ${loadError ? "bg-destructive" : "bg-success"}`} />
          <Text className={`text-xs font-bold ${loadError ? "text-destructive" : "text-success"}`}>
            {loadError ? "Refresh required" : "Live fulfillment data"}
          </Text>
        </View>
        {loadError ? <ErrorBanner message={loadError} /> : null}
        {commandsBlocked ? <ErrorBanner message="Showing readable records offline. Review, activation, and payment commands require live data." /> : null}
        <View className="gap-4 border-b border-border pb-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                {formatCompactCurrency(workspace?.summary.outstandingAmount ?? 0, currencyCode)} outstanding
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                {workspace?.summary.activeRequests ?? 0} active obligations · {workspace?.summary.dueScheduleItems ?? 0} due installments
              </Text>
            </View>
            {actionCount ? <View className="rounded-full bg-warn/15 px-3 py-2"><Text className="text-xs font-extrabold text-warn">{actionCount} need action</Text></View> : null}
          </View>
          <View className="flex-row divide-x divide-border">
            <View className="flex-1 gap-1 pr-4"><Text className="text-lg font-extrabold text-foreground">{workspace?.summary.pendingRequests ?? 0}</Text><Text className="text-xs text-muted-foreground">Needs review</Text></View>
            <View className="flex-1 gap-1 px-4"><Text className="text-lg font-extrabold text-foreground">{workspace?.summary.approvedRequests ?? 0}</Text><Text className="text-xs text-muted-foreground">Ready to activate</Text></View>
            <View className="flex-1 gap-1 pl-4"><Text className="text-lg font-extrabold text-destructive">{workspace?.summary.overdueScheduleItems ?? 0}</Text><Text className="text-xs text-muted-foreground">Overdue</Text></View>
          </View>
        </View>
        <View className="flex-row gap-2">
          <Input accessibilityLabel="Search procurement operations" className="min-w-0 flex-1" onChangeText={setSearchDraft} onSubmitEditing={Keyboard.dismiss} placeholder="Search member or request" returnKeyType="search" testID="procurement-search-input" value={searchDraft} />
          <Button accessibilityLabel="Search" onPress={Keyboard.dismiss} size="icon" variant="secondary"><Icon className="size-base text-foreground" name="Search" /></Button>
        </View>
        <ScrollView horizontal contentContainerClassName="gap-2" keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false}>
          {lanes.map((item) => <Button className="h-10 px-3" key={item.value} onPress={() => setLane(item.value)} testID={`procurement-lane-${item.value}`} variant={lane === item.value ? "secondary" : "ghost"}><Text>{item.label}{lane === item.value && workspace ? ` · ${workspace.items.length}` : ""}</Text></Button>)}
        </ScrollView>
        <View>
          <View className="flex-row items-end justify-between gap-3 border-b border-border pb-3">
            <Text className="text-lg font-extrabold text-foreground">{lane === "review" ? "Needs review" : lane === "activate" ? "Ready for fulfillment" : lane === "servicing" ? "Active obligations" : "Closed records"}</Text>
            <Text className="text-xs font-medium text-muted-foreground">{lane === "servicing" ? "Exceptions first" : "Newest first"}</Text>
          </View>
          {isLoading && !workspace ? <View className="items-center py-16"><LoadingSpinner /></View> : (workspace?.items.length ? workspace.items.map((item) => <OperationRow currencyCode={currencyCode} item={item} key={item.id} onPress={() => void openDetail(item.id)} />) : <EmptyState description="No procurement records match this lane and search." icon="ShoppingBag" title="No fulfillment work" />)}
        </View>
        <View className="gap-3 border-t border-border pt-4">
          <View className="flex-row items-center justify-between gap-3"><Text className="text-lg font-extrabold text-foreground">Fulfillment guard</Text><Text className="text-xs font-semibold text-muted-foreground">Separate legal states</Text></View>
          <View className="flex-row items-start gap-3"><Icon className="mt-0.5 size-sm text-warn" name="ShieldCheck" /><Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">Approval freezes the policy snapshot. Purchase activation creates the schedule once. Staff-entered payments remain receipts until independent review posts them.</Text></View>
        </View>
      </AppKeyboardAwareScrollView>

      <FloatingBottomSheet accessibilityLabel={detail ? `${detail.member.fullName} procurement record` : "Procurement record"} hideHandle onClose={() => setDetailVisible(false)} onDismissed={() => { const queued = queuedFormRef.current; queuedFormRef.current = null; if (queued) prepareForm(queued); else setDetail(null) }} presentation="large" scrollable visible={detailVisible}>
        <View className="gap-5 px-5 pt-5 pb-8">
          <View className="flex-row items-start gap-3 border-b border-border pb-4"><View className="min-w-0 flex-1 gap-1"><Text accessibilityRole="header" className="text-2xl font-extrabold tracking-tight text-foreground">{detail?.itemName ?? "Loading record"}</Text>{detail ? <Text className="text-sm text-muted-foreground">{detail.member.fullName} · {detail.member.memberNumber}</Text> : null}</View><Button accessibilityLabel="Close record" onPress={() => setDetailVisible(false)} size="icon" variant="ghost"><Icon className="size-base text-foreground" name="X" /></Button></View>
          {isDetailLoading || !detail ? <View className="items-center py-20"><LoadingSpinner /></View> : <>
            <View className="gap-4 border-b border-border pb-5"><View className="flex-row items-end justify-between gap-3"><View><Text className="text-3xl font-extrabold tracking-tight text-foreground">{formatCurrency(detail.approvedCost ?? detail.requestedCost, currencyCode)}</Text><Text className="mt-1 text-xs text-muted-foreground">{detail.vendorName ?? "Vendor not recorded"} · {detail.approvedRepaymentMonths ?? detail.requestedRepaymentMonths} months</Text></View><Text className="text-xs font-bold text-primary">{labelize(detail.status)}</Text></View></View>
            <View className="gap-2"><View className="flex-row items-end justify-between border-b border-border pb-2"><Text className="text-lg font-extrabold text-foreground">Evidence timeline</Text><Text className="text-xs text-muted-foreground">Server record</Text></View>
              <View className="gap-1 border-b border-border py-3"><Text className="text-sm font-bold text-foreground">Request submitted</Text><Text className="text-xs leading-5 text-muted-foreground">{detail.itemDescription ?? "No purpose note"}</Text><Text className="text-xs text-muted-foreground">{formatDate(detail.requestedAt)} · {detail.member.fullName}</Text></View>
              {detail.reviewedAt ? <View className="gap-1 border-b border-border py-3"><Text className="text-sm font-bold text-foreground">Finance review {labelize(detail.status === "approved" || detail.lane === "servicing" ? "approved" : detail.status)}</Text><Text className="text-xs leading-5 text-muted-foreground">{detail.reviewNotes ?? "No review note"}</Text><Text className="text-xs text-muted-foreground">{formatDate(detail.reviewedAt)} · {detail.reviewedByUser?.fullName ?? "Finance reviewer"}</Text></View> : null}
              {detail.purchasedAt ? <View className="gap-1 border-b border-border py-3"><Text className="text-sm font-bold text-foreground">Purchase activated</Text><Text className="text-xs leading-5 text-muted-foreground">{detail.purchaseReference ?? "No reference"} · {detail.purchaseNotes ?? "No note"}</Text><Text className="text-xs text-muted-foreground">{formatDate(detail.purchasedAt)}</Text></View> : null}
            </View>
            {detail.repaymentScheduleItems.length ? <View className="gap-2"><View className="flex-row items-end justify-between border-b border-border pb-2"><Text className="text-lg font-extrabold text-foreground">Repayment schedule</Text><Text className="text-xs text-muted-foreground">{detail.repaymentScheduleItems.length} installments</Text></View>{detail.repaymentScheduleItems.map((item) => <View className="flex-row items-center gap-3 border-b border-border py-3" key={item.id}><View className={`size-2 rounded-full ${item.status === "overdue" ? "bg-destructive" : item.status === "paid" ? "bg-success" : "bg-warn"}`} /><View className="min-w-0 flex-1"><Text className="text-sm font-bold text-foreground">Installment {item.installmentNumber}</Text><Text className="text-xs text-muted-foreground">{formatDate(item.dueDate)} · {labelize(item.status)}</Text></View><Text className="text-sm font-extrabold text-foreground">{formatCurrency(item.outstandingAmount || item.amount, currencyCode)}</Text></View>)}</View> : null}
            <View className="flex-row gap-2 pt-2">
              {detail.lane === "review" ? <Button className="h-12 flex-1" disabled={!workspace?.capabilities.review || commandsBlocked} onPress={() => openFormFromDetail({ kind: "review", request: detail })}><Text>Review request</Text></Button> : null}
              {detail.lane === "activate" ? <Button className="h-12 flex-1" disabled={!workspace?.capabilities.activate || commandsBlocked} onPress={() => openFormFromDetail({ kind: "activate", request: detail })}><Text>Record purchase</Text></Button> : null}
              {detail.lane === "servicing" && detail.nextDue ? <Button className="h-12 flex-1" disabled={!workspace?.capabilities.submitPayment || commandsBlocked} onPress={() => openFormFromDetail({ kind: "payment", request: detail, scheduleItem: detail.nextDue as ProcurementScheduleItem })}><Text>Record payment</Text></Button> : null}
            </View>
          </>}
        </View>
      </FloatingBottomSheet>

      <FullScreenFormSheet dirty={formIntent?.kind === "review" && formDirty} footer={<View className="flex-row items-center gap-3"><DevQuickFill label="Quick fill procurement review" onPress={() => { setDecision("approved"); setApprovedCost(String(formIntent?.request.requestedCost ?? 480000)); setApprovedMonths(String(Math.min(formIntent?.request.requestedRepaymentMonths ?? 12, formIntent?.request.policyMaximumPaybackMonths ?? 12))); setNotes("Approved within the cooperative policy and affordability limits.") }} placement="footer" portal={false} /><Button className="h-12 flex-1" onPress={validateForm}><Text>Review decision</Text></Button></View>} onClose={() => setFormIntent(null)} onDismissed={() => { const queued = queuedReviewRef.current; queuedReviewRef.current = null; if (queued) setReviewIntent(queued) }} title="Review procurement" visible={formIntent?.kind === "review"}>
        <Text className="text-sm leading-5 text-muted-foreground">Approve the cost and repayment term against the current tenant policy. The approved values become the purchase snapshot.</Text><FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />{formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Decision"><View className="flex-row gap-2">{(["approved", "under_review", "rejected"] as const).map((value) => <Button className="flex-1" key={value} onPress={() => setDecision(value)} variant={decision === value ? "secondary" : "outline"}><Text>{labelize(value)}</Text></Button>)}</View></Field>
        {decision === "approved" ? <><Field label="Approved cost"><Input keyboardType="decimal-pad" onChangeText={setApprovedCost} placeholder="480000" testID="procurement-approved-cost-input" value={approvedCost} /></Field><Field label={`Approved repayment months (max ${formIntent?.request.policyMaximumPaybackMonths ?? 12})`}><Input keyboardType="number-pad" onChangeText={setApprovedMonths} placeholder="12" testID="procurement-approved-months-input" value={approvedMonths} /></Field></> : null}
        <Field label="Review evidence"><Textarea onChangeText={setNotes} placeholder="Record the decision evidence and policy basis." testID="procurement-review-notes-input" value={notes} /></Field>
      </FullScreenFormSheet>

      <FullScreenFormSheet dirty={formIntent?.kind === "activate" && formDirty} footer={<View className="flex-row items-center gap-3"><DevQuickFill label="Quick fill purchase activation" onPress={() => { setPurchaseDate(todayDateOnly()); setFirstDueDate(plusMonthDateOnly()); setPurchaseReference(`QA-PO-${Date.now().toString().slice(-6)}`); setNotes("Supplier invoice and delivered item verified by the procurement officer.") }} placement="footer" portal={false} /><Button className="h-12 flex-1" onPress={validateForm}><Text>Review activation</Text></Button></View>} onClose={() => { setCalendarIntent(null); setFormIntent(null) }} onDismissed={() => { const queued = queuedReviewRef.current; queuedReviewRef.current = null; if (queued) setReviewIntent(queued) }} overlay={<CalendarPickerSheet label={calendarIntent === "firstDue" ? "First repayment due date" : "Purchase date"} minimumDate={calendarIntent === "firstDue" ? purchaseDate : undefined} onChange={calendarIntent === "firstDue" ? setFirstDueDate : setPurchaseDate} onClose={() => setCalendarIntent(null)} testID={calendarIntent === "firstDue" ? "procurement-first-due-calendar" : "procurement-purchase-date-calendar"} value={calendarIntent === "firstDue" ? firstDueDate : purchaseDate} visible={calendarIntent === "purchase" || calendarIntent === "firstDue"} />} title="Record purchase" visible={formIntent?.kind === "activate"}>
        <Text className="text-sm leading-5 text-muted-foreground">Confirm supplier evidence and dates. This action creates the repayment schedule exactly once from the approved snapshot.</Text><FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />{formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Purchase date"><CalendarDateField accessibilityLabel="Purchase date" onPress={() => setCalendarIntent("purchase")} testID="procurement-purchase-date-input" value={purchaseDate} /></Field><Field label="First repayment due date"><CalendarDateField accessibilityLabel="First repayment due date" onPress={() => setCalendarIntent("firstDue")} testID="procurement-first-due-input" value={firstDueDate} /></Field><Field label="Supplier invoice or purchase reference"><Input autoCapitalize="characters" onChangeText={setPurchaseReference} placeholder="INV-012345" testID="procurement-purchase-reference-input" value={purchaseReference} /></Field><Field label="Purchase evidence note (optional)"><Textarea onChangeText={setNotes} placeholder="Record the vendor and delivery evidence checked." testID="procurement-purchase-notes-input" value={notes} /></Field>
      </FullScreenFormSheet>

      <FullScreenFormSheet dirty={formIntent?.kind === "payment" && formDirty} footer={<View className="flex-row items-center gap-3"><DevQuickFill label="Quick fill procurement payment" onPress={() => { setAmount(String(formIntent?.kind === "payment" ? formIntent.scheduleItem.outstandingAmount : 40000)); setPaidAt(todayDateOnly()); setPaymentReference(`QA-PAY-${Date.now().toString().slice(-6)}`); setNotes("Payment evidence received at the cooperative office.") }} placement="footer" portal={false} /><Button className="h-12 flex-1" onPress={validateForm}><Text>Review payment</Text></Button></View>} onClose={() => { setCalendarIntent(null); setFormIntent(null) }} onDismissed={() => { const queued = queuedReviewRef.current; queuedReviewRef.current = null; if (queued) setReviewIntent(queued) }} overlay={<CalendarPickerSheet label="Payment date" onChange={setPaidAt} onClose={() => setCalendarIntent(null)} testID="procurement-payment-date-calendar" value={paidAt} visible={calendarIntent === "payment"} />} title="Record payment receipt" visible={formIntent?.kind === "payment"}>
        <Text className="text-sm leading-5 text-muted-foreground">This creates a receipt for finance review. The installment balance changes only after approval.</Text><FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />{formError ? <ErrorBanner message={formError} /> : null}<Field label="Amount"><Input keyboardType="decimal-pad" onChangeText={setAmount} placeholder="40000" testID="procurement-payment-amount-input" value={amount} /></Field><Field label="Payment date"><CalendarDateField accessibilityLabel="Payment date" onPress={() => setCalendarIntent("payment")} testID="procurement-payment-date-input" value={paidAt} /></Field><Field label="Payment reference"><Input autoCapitalize="characters" onChangeText={setPaymentReference} placeholder="TRF-012345" testID="procurement-payment-reference-input" value={paymentReference} /></Field><Field label="Evidence note (optional)"><Textarea onChangeText={setNotes} placeholder="Record the payment evidence received." testID="procurement-payment-notes-input" value={notes} /></Field>
      </FullScreenFormSheet>

      <SubmissionReviewSheet confirmLabel={reviewIntent?.kind === "review" ? "Confirm decision" : reviewIntent?.kind === "activate" ? "Activate purchase" : "Submit receipt"} description={reviewIntent?.kind === "activate" ? "The server will claim the approved request and create its frozen schedule once." : reviewIntent?.kind === "payment" ? "The receipt enters independent finance review; it does not settle the schedule yet." : "Confirm the review evidence and expected request state."} error={formError} isSubmitting={isSubmitting} onClose={() => setReviewIntent(null)} onConfirm={() => void runCommand()} onDismissed={() => { const message = queuedSuccessRef.current; queuedSuccessRef.current = null; if (message) setSuccess(message) }} rows={reviewRows} title={reviewIntent?.kind === "review" ? "Review procurement decision" : reviewIntent?.kind === "activate" ? "Review purchase activation" : "Review payment receipt"} visible={Boolean(reviewIntent)} />
      <SubmissionSuccessSheet description={success ?? "The procurement operation was confirmed."} onClose={() => setSuccess(null)} title={success?.startsWith("Purchase") ? "Purchase activated" : success?.startsWith("Payment") ? "Receipt submitted" : "Decision recorded"} visible={Boolean(success)} />
    </SafeArea>
  )
}
