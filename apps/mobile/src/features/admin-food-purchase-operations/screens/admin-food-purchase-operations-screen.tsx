import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Elevated } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { shortDate , ServiceOpsDetailSheet , ServiceOpsLanes , useOpsLane } from "@/features/admin-service-operations/public/service-ops"
import {
  OpsContextCard,
  ServiceOpsFlowSheet,
  type OpsFlowStep,

  OpsLaneState,
  OpsResult,
  OpsReviewSpec} from "@/features/admin-service-operations/public/service-ops"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import {
  appQueryKey,
  useAppQuery,
  useInvalidateAppQueries,
} from "@/hooks/use-app-query"
import { useColors } from "@/hooks/use-color"
import { useDebounce } from "@/hooks/use-debounce"
import { readErrorCode } from "@/lib/app-query-policy"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { formatCompactMoney, formatMoney } from "@/lib/money"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { captureMobileError } from "@/lib/sentry"
import { cn } from "@/lib/utils"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { MobileOfflineOperationError } from "@/runtime/mobile-runtime-state"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useEffect, useRef, useState } from "react"
import { Pressable, View } from "react-native"
import {
  completeFoodPurchaseCycle,
  createFoodPurchaseCycle,
  getFoodPurchaseApplicationDetail,
  getFoodPurchaseApplicationPage,
  getFoodPurchaseOverview,
  reviewFoodPurchaseAccounting,
  reviewFoodPurchaseApplication,
  submitFoodPurchaseAccounting,
  transitionFoodPurchaseCycle,
} from "../api/admin-food-purchase-operations-api"
import type {
  FoodPurchaseApplication,
  FoodPurchaseApplicationPage,
  FoodPurchaseCycle,
  FoodPurchaseLane,
} from "../model/admin-food-purchase-operations-types"
import {
  accountingStatuses,
  applicationDetail,
  applicationRow,
  cycleAction,
  cycleActionLabel,
  cycleDetail,
  cycleMonth,
  cycleRow,
  cycleStatusPill,
  foodPurchaseHero,
  foodPurchaseLanes,
  historyStatuses,
  intakeTransition,
} from "../model/food-purchase-ops-presentation"

type Kind = "acct" | "acctrev" | "app" | "complete" | "cycle" | "intake"
type Decision = "approved" | "rejected" | "under_review"

const feature = "admin-food-purchase"

/** The next six cycle months as YYYY-MM-01. */
function upcomingMonths() {
  const today = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() + index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
  })
}

function staticLane(items: OpsLaneState["items"], loading: boolean, error: boolean, refetch: () => void, refreshing: boolean): OpsLaneState {
  return {
    error,
    fetchingNext: false,
    hasData: !loading,
    hasNext: false,
    items,
    loading,
    nextPage: () => undefined,
    refetch,
    refreshing,
    updating: false,
  }
}

export function AdminFoodPurchaseOperationsScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const runtime = useMobileRuntime()
  const colors = useColors()
  const offline = runtime.state.connectivity !== "online"
  const invalidate = useInvalidateAppQueries()
  const scope = getMobilePersistenceScope()?.key
  const overviewPrefix = appQueryKey(feature, scope, "overview")
  const lanePrefix = appQueryKey(feature, scope, "applications")
  const detailKey = (id: string | null) => appQueryKey(feature, scope, "detail", id)

  const [lane, setLane] = useState<FoodPurchaseLane>("applications")
  const [cycleId, setCycleId] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState("")
  const term = useDebounce(search.trim().slice(0, 120), 350)
  const overview = useAppQuery({
    queryFn: () => getFoodPurchaseOverview(cycleId),
    queryKey: appQueryKey(feature, scope, "overview", cycleId ?? "current"),
  })
  const selected = overview.data?.selectedCycle ?? null
  const capabilities = overview.data?.capabilities
  const currencyCode = overview.data?.currencyCode ?? "NGN"
  const money = (value: number) => formatMoney(value, { currencyCode })
  const applications = useOpsLane({
    enabled: Boolean(selected),
    fetchPage: (cursor: string | null) =>
      getFoodPurchaseApplicationPage({
        cursor: cursor ?? undefined,
        cycleId: selected!.id,
        search: term || undefined,
      }),
    offline,
    queryKey: appQueryKey(feature, scope, "applications", selected?.id ?? null, term),
    selectItems: (page: FoodPurchaseApplicationPage) => page.applications,
    toRow: (item: FoodPurchaseApplication) => applicationRow(item, undefined),
  })
  const stale = isMobileReadCacheStale(overview.data?.cache) || applications.stale
  const writesBlocked = offline || stale
  const cycles = overview.data?.cycles ?? []
  const matches = (cycle: FoodPurchaseCycle) =>
    !term || cycleMonth(cycle.periodMonth).toLowerCase().includes(term.toLowerCase())
  const accountingCycles = cycles.filter((cycle) => accountingStatuses.includes(cycle.status) && matches(cycle))
  const historyCycles = cycles.filter((cycle) => historyStatuses.includes(cycle.status) && matches(cycle))
  const refreshOverview = () => void overview.refetch({ cancelRefetch: false })
  const initialOverviewFailed = overview.isError && !overview.data
  const applicationLane = selected
    ? {
        ...applications.state,
        items: applications.raw.map((item) => applicationRow(item, capabilities)),
      }
    : staticLane([], overview.isPending, initialOverviewFailed, refreshOverview, overview.isRefetching)

  // Detail: an application (fetched, cached) or a cycle (from the overview).
  const [detailRef, setDetailRef] = useState<{ id: string; type: "application" | "cycle" } | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [destinationMissing, setDestinationMissing] = useState(false)
  const applicationDetailQuery = useAppQuery({
    enabled: detailRef?.type === "application",
    placeholderData: undefined,
    queryFn: () => getFoodPurchaseApplicationDetail(detailRef!.id),
    queryKey: detailKey(detailRef?.type === "application" ? detailRef.id : null),
  })
  const handledEntity = useRef<string | null>(null)
  useEffect(() => {
    if (!initialEntityId || handledEntity.current === initialEntityId) return
    handledEntity.current = initialEntityId
    setDetailRef({ id: initialEntityId, type: "application" })
    setDetailOpen(true)
  }, [initialEntityId])
  useEffect(() => {
    if (detailOpen && applicationDetailQuery.isError && detailRef?.id === initialEntityId) {
      setDetailOpen(false)
      setDestinationMissing(true)
    }
  }, [applicationDetailQuery.isError, detailOpen, detailRef, initialEntityId])
  const openedCycle = detailRef?.type === "cycle" ? cycles.find((cycle) => cycle.id === detailRef.id) : undefined
  const openedApplication = detailRef?.type === "application" ? applicationDetailQuery.data : undefined

  // Cycle picker.
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickable = cycles.filter((cycle) => !historyStatuses.includes(cycle.status))

  // Write flow.
  const [step, setStep] = useState<OpsFlowStep>("closed")
  const [kind, setKind] = useState<Kind>("app")
  const [application, setApplication] = useState<FoodPurchaseApplication | null>(null)
  const [cycle, setCycle] = useState<FoodPurchaseCycle | null>(null)
  const [decision, setDecision] = useState<Decision>("approved")
  const [amount, setAmount] = useState("")
  const [months, setMonths] = useState("")
  const [notes, setNotes] = useState("")
  const [periodMonth, setPeriodMonth] = useState(upcomingMonths()[0]!)
  const [releasedAt, setReleasedAt] = useState(todayDateOnly())
  const [sales, setSales] = useState("")
  const [cost, setCost] = useState("")
  const [opex, setOpex] = useState("")
  const [accountingDecision, setAccountingDecision] = useState<"approved" | "rejected">("approved")
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<OpsResult | null>(null)
  const commandId = useRef<string | null>(null)
  const queued = useRef<(() => void) | null>(null)

  function reset() {
    setDecision("approved")
    setNotes("")
    setSales("")
    setCost("")
    setOpex("")
    setAccountingDecision("approved")
    setShowErrors(false)
    setResult(null)
    commandId.current = null
  }
  function openApplicationForm(item: FoodPurchaseApplication) {
    reset()
    setKind("app")
    setApplication(item)
    setCycle(null)
    setAmount(String(item.approvedAmount ?? item.requestedAmount))
    setMonths(String(item.approvedPaybackMonths ?? item.requestedPaybackMonths))
    setStep("form")
  }
  function openCycleForm(nextKind: Exclude<Kind, "app" | "cycle">, item: FoodPurchaseCycle) {
    reset()
    setKind(nextKind)
    setCycle(item)
    setApplication(null)
    setStep("form")
  }
  function openNewCycle() {
    reset()
    const taken = new Set(cycles.map((item) => item.periodMonth.slice(0, 7)))
    setPeriodMonth(upcomingMonths().find((month) => !taken.has(month.slice(0, 7))) ?? upcomingMonths()[0]!)
    setAmount("")
    setReleasedAt(todayDateOnly())
    setKind("cycle")
    setCycle(null)
    setApplication(null)
    setStep("form")
  }

  const takenMonths = new Set(cycles.map((item) => item.periodMonth.slice(0, 7)))
  const profit = Number(sales || 0) - Number(cost || 0) - Number(opex || 0)
  const errors: Record<string, string> = {}
  if (kind === "app" && application) {
    if (decision === "approved") {
      if (!(Number(amount) > 0)) errors.amount = "Enter the approved amount."
      const value = Number(months)
      if (!Number.isInteger(value) || value < 1 || value > application.policyMaximumPaybackMonths)
        errors.months = `Between 1 and ${application.policyMaximumPaybackMonths} months.`
    }
    if (decision !== "under_review" && notes.trim().length < 2) errors.notes = "Add the evidence for this decision."
  } else if (kind === "cycle") {
    if (takenMonths.has(periodMonth.slice(0, 7))) errors.periodMonth = "That month already has a cycle."
    if (!(Number(amount) > 0)) errors.amount = "Enter the release amount."
    if (!releasedAt) errors.releasedAt = "Choose the release date."
  } else if (kind === "acct") {
    if (!sales || !cost || !opex) errors.figures = "Enter sales, purchase cost and expenses."
  } else if (kind === "acctrev") {
    if (accountingDecision === "rejected" && notes.trim().length < 2) errors.notes = "Explain the correction needed."
  }
  const valid = Object.keys(errors).length === 0
  const err = (key: string) => (showErrors ? errors[key] : undefined)
  const intake = cycle ? intakeTransition(cycle) : null

  const reviewSpec: OpsReviewSpec | null =
    kind === "app" && application
      ? {
          confirmLabel:
            decision === "approved" ? "Approve application" : decision === "rejected" ? "Reject application" : "Keep in review",
          rows: [
            ["Member", application.member.fullName],
            ["Items", application.itemDescription ?? "Foodstuff"],
            ["Decision", decision === "approved" ? "Approve" : decision === "rejected" ? "Reject" : "Keep in review"],
            ...(decision === "approved"
              ? ([
                  ["Amount", money(Number(amount || 0))],
                  ["Payback", `${months} months`],
                ] as [string, string][])
              : []),
          ],
          title: "Confirm decision",
        }
      : kind === "cycle"
        ? {
            confirmLabel: "Create cycle",
            note: "Intake stays closed until you open it.",
            rows: [
              ["Cycle", cycleMonth(periodMonth)],
              ["Release amount", money(Number(amount || 0))],
              ["Release date", shortDate(releasedAt, true)],
            ],
            title: "Confirm new cycle",
          }
        : cycle && kind === "acct"
          ? {
              confirmLabel: "Submit accounting",
              note: "Recorded for the committee. No member posting.",
              rows: [
                ["Cycle", cycleMonth(cycle.periodMonth)],
                ["Sales", money(Number(sales || 0))],
                ["Purchase cost", money(Number(cost || 0))],
                ["Expenses", money(Number(opex || 0))],
                ["Profit", money(profit)],
              ],
              title: "Confirm accounting",
            }
          : cycle && kind === "acctrev"
            ? {
                confirmLabel: accountingDecision === "approved" ? "Approve accounting" : "Return accounting",
                rows: [
                  ["Cycle", cycleMonth(cycle.periodMonth)],
                  ["Decision", accountingDecision === "approved" ? "Approve" : "Return"],
                  ["Profit", money(cycle.profitAmount ?? 0)],
                ],
                title: "Confirm review",
              }
            : cycle && kind === "complete"
              ? {
                  confirmLabel: "Complete cycle",
                  note: "The cycle moves to History.",
                  rows: [
                    ["Cycle", cycleMonth(cycle.periodMonth)],
                    ["Released", money(cycle.releasedAmount)],
                    ["Profit", money(cycle.profitAmount ?? 0)],
                  ],
                  title: "Complete cycle",
                }
              : cycle && intake
                ? {
                    confirmLabel: intake.label,
                    rows: [
                      ["Cycle", cycleMonth(cycle.periodMonth)],
                      ["Status", cycleStatusPill(cycle).label],
                    ],
                    title: `${intake.label}?`,
                  }
                : null

  function goReview() {
    setShowErrors(true)
    if (!valid || writesBlocked) return
    commandId.current = createClientSubmissionKey()
    setStep("review")
  }

  async function confirm() {
    if (submitting) return
    const id = commandId.current ?? createClientSubmissionKey()
    commandId.current = id
    setSubmitting(true)
    let success: OpsResult
    try {
      if (kind === "app" && application) {
        await reviewFoodPurchaseApplication({
          applicationId: application.id,
          approvedAmount: decision === "approved" ? Number(amount) : undefined,
          approvedPaybackMonths: decision === "approved" ? Number(months) : undefined,
          commandId: id,
          expectedState: application.status as "submitted" | "under_review",
          notes: notes.trim() || undefined,
          status: decision,
        })
        success = {
          body: decision === "approved" ? `${application.member.fullName} can collect the items.` : "The application has been updated.",
          kind: "success",
          title: decision === "approved" ? "Application approved" : "Decision recorded",
        }
      } else if (kind === "cycle") {
        await createFoodPurchaseCycle({
          commandId: id,
          periodMonth,
          releasedAmount: Number(amount),
          releasedAt,
          releaseNotes: notes.trim() || undefined,
        })
        success = { body: "Open intake when members can apply.", kind: "success", title: "Cycle created" }
      } else if (cycle && kind === "acct") {
        await submitFoodPurchaseAccounting({
          commandId: id,
          cycleId: cycle.id,
          expectedState: cycle.status as "accounting_rejected" | "intake_closed",
          notes: notes.trim() || undefined,
          operatingExpenseAmount: Number(opex),
          purchaseCostAmount: Number(cost),
          salesAmount: Number(sales),
        })
        success = { body: "A second admin reviews it next.", kind: "success", title: "Accounting submitted" }
      } else if (cycle && kind === "acctrev") {
        await reviewFoodPurchaseAccounting({
          commandId: id,
          cycleId: cycle.id,
          decision: accountingDecision,
          expectedState: "accounting_submitted",
          notes: notes.trim() || undefined,
        })
        success =
          accountingDecision === "approved"
            ? { body: "You can complete the cycle now.", kind: "success", title: "Accounting approved" }
            : { body: "The submitter can correct it.", kind: "success", title: "Accounting returned" }
      } else if (cycle && kind === "complete") {
        await completeFoodPurchaseCycle({
          commandId: id,
          cycleId: cycle.id,
          expectedState: "accounting_approved",
          notes: notes.trim() || undefined,
          transition: "complete",
        })
        success = { body: `${cycleMonth(cycle.periodMonth)} moved to History.`, kind: "success", title: "Cycle completed" }
      } else if (cycle && intake) {
        await transitionFoodPurchaseCycle({
          commandId: id,
          cycleId: cycle.id,
          expectedState: cycle.status,
          notes: notes.trim() || undefined,
          transition: intake.transition,
        })
        success = {
          body:
            intake.transition === "close_intake"
              ? "Members can no longer apply. Submit accounting when ready."
              : "Members can apply in this cycle.",
          kind: "success",
          title: intake.transition === "close_intake" ? "Intake closed" : "Intake opened",
        }
      } else {
        return
      }
      setResult(success)
      setStep("result")
      void invalidate(overviewPrefix, lanePrefix, ...(application ? [detailKey(application.id)] : []))
    } catch (error) {
      const code = readErrorCode(error)
      const conflict = code === "CONFLICT" || code === "PRECONDITION_FAILED"
      if (!(error instanceof MobileOfflineOperationError))
        captureMobileError(error, "mobile.food_purchase_operations")
      if (conflict) {
        commandId.current = null
        void invalidate(overviewPrefix, lanePrefix)
      }
      setResult({ kind: conflict ? "conflict" : "error" })
      setStep("result")
    } finally {
      setSubmitting(false)
    }
  }

  const titles: Record<Kind, string> = {
    acct: "Cycle accounting",
    acctrev: "Review accounting",
    app: "Review application",
    complete: "Complete cycle",
    cycle: "New cycle",
    intake: intake?.label ?? "Cycle intake",
  }
  const ctas: Record<Kind, string> = {
    acct: "Review accounting",
    acctrev: "Review decision",
    app: "Review decision",
    complete: "Review",
    cycle: "Review cycle",
    intake: "Review",
  }
  const quick = mobileDevQuickFill.adminFoodPurchaseOperations

  const cycleCard = selected ? (
    <Elevated className="gap-[12px] rounded-[20px] bg-card p-[16px]" radius={20}>
      <Pressable
        accessibilityHint="Choose another cycle"
        accessibilityLabel={`Cycle ${cycleMonth(selected.periodMonth)}`}
        accessibilityRole="button"
        className="flex-row items-center gap-[10px]"
        disabled={pickable.length < 2}
        onPress={() => setPickerOpen(true)}
        testID="food-purchase-cycle-picker"
      >
        <View className="min-w-0 flex-1">
          <Text className="text-muted-foreground" variant="caption">
            Cycle
          </Text>
          <Text variant="section">{cycleMonth(selected.periodMonth)}</Text>
        </View>
        <StatusPill label={cycleStatusPill(selected).label} tone={cycleStatusPill(selected).tone} />
        {pickable.length > 1 ? <Icon className="size-[18px] text-muted-foreground" name="ChevronDown" /> : null}
      </Pressable>
      <View className="h-[6px] overflow-hidden rounded-full bg-surface-raised">
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 999,
            height: "100%",
            width: `${Math.min(100, selected.releasedAmount ? ((overview.data?.summary.approvedAmount ?? 0) / selected.releasedAmount) * 100 : 0)}%`,
          }}
        />
      </View>
      <View className="flex-row">
        {[
          ["Released", selected.releasedAmount],
          ["Approved", overview.data?.summary.approvedAmount ?? 0],
          ["Available", overview.data?.summary.availableAmount ?? 0],
        ].map(([label, value]) => (
          <View className="flex-1 gap-[2px]" key={label as string}>
            <Text className="text-muted-foreground" variant="caption">
              {label}
            </Text>
            <Text variant="money">{formatCompactMoney(value as number, currencyCode)}</Text>
          </View>
        ))}
      </View>
      {capabilities?.releaseFunds ? (
        <View className="flex-row gap-[8px]">
          {intakeTransition(selected) ? (
            <Pressable
              accessibilityRole="button"
              className={cn("min-h-[40px] flex-1 items-center justify-center rounded-[12px] bg-surface-raised active:opacity-80", writesBlocked && "opacity-40")}
              onPress={writesBlocked ? undefined : () => openCycleForm("intake", selected)}
              testID="food-purchase-intake"
            >
              <Text variant="label">{intakeTransition(selected)!.label}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            className={cn("min-h-[40px] flex-1 flex-row items-center justify-center gap-[6px] rounded-[12px] bg-accent active:opacity-80", writesBlocked && "opacity-40")}
            onPress={writesBlocked ? undefined : openNewCycle}
            testID="food-purchase-new-cycle"
          >
            <Icon className="size-[16px] text-accent-foreground" name="Plus" />
            <Text className="text-accent-foreground" variant="label">
              New cycle
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Elevated>
  ) : null

  return (
    <>
      <ServiceOpsLanes
        currencyCode={currencyCode}
        hero={foodPurchaseHero(overview.data, currencyCode)}
        heroAction={
          capabilities?.releaseFunds
            ? { icon: "Plus", label: "New cycle", onPress: () => !writesBlocked && openNewCycle() }
            : undefined
        }
        icon="ShoppingBasket"
        lane={lane}
        laneState={(value) =>
          value === "applications"
            ? applicationLane
            : staticLane(
                (value === "accounting" ? accountingCycles : historyCycles).map((item) =>
                  cycleRow(item, capabilities, currencyCode)
                ),
                overview.isPending,
                initialOverviewFailed,
                refreshOverview,
                overview.isRefetching
              )
        }
        lanes={foodPurchaseLanes(overview.data)}
        lead={(value) => (value === "applications" ? cycleCard : null)}
        offline={offline}
        onAction={(row, value) => {
          if (value === "applications") {
            const item = applications.raw.find((entry) => entry.id === row.id)
            if (item) openApplicationForm(item)
            return
          }
          const item = cycles.find((entry) => entry.id === row.id)
          const action = item ? cycleAction(item, capabilities) : null
          if (item && action) openCycleForm(action, item)
        }}
        onLaneChange={setLane}
        onOpen={(row, value) => {
          setDetailRef({ id: row.id, type: value === "applications" ? "application" : "cycle" })
          setDetailOpen(true)
        }}
        onRefresh={() => {
          refreshOverview()
          if (selected) applications.state.refetch()
        }}
        refreshing={overview.isRefetching || applications.state.refreshing}
        search={search}
        searchPlaceholder="Search member or items"
        searchTerm={term}
        setSearch={setSearch}
        stale={stale}
        summaryError={overview.isError && Boolean(overview.data)}
        testIdPrefix="food-purchase"
        title="Foodstuff purchase"
        topSlot={
          destinationMissing ? (
            <NotificationDestinationNotice onDismiss={() => setDestinationMissing(false)} />
          ) : null
        }
        writesBlocked={writesBlocked}
      />

      <AppSheet onClose={() => setPickerOpen(false)} title="Choose cycle" variant="picker" visible={pickerOpen}>
        <View className="gap-[8px]">
          {pickable.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item.id === selected?.id }}
              className={cn(
                "min-h-[52px] flex-row items-center gap-[10px] rounded-[14px] px-[14px] active:opacity-80",
                item.id === selected?.id ? "bg-accent" : "bg-surface-raised"
              )}
              key={item.id}
              onPress={() => {
                setCycleId(item.id)
                setPickerOpen(false)
              }}
            >
              <Text className="flex-1" variant="body">
                {cycleMonth(item.periodMonth)}
              </Text>
              <StatusPill label={cycleStatusPill(item).label} tone={cycleStatusPill(item).tone} />
            </Pressable>
          ))}
        </View>
      </AppSheet>

      <ServiceOpsDetailSheet
        action={
          openedApplication && ["submitted", "under_review"].includes(openedApplication.status)
            ? {
                disabled: writesBlocked || !capabilities?.reviewApplications,
                label: "Review",
                onPress: () => {
                  queued.current = () => openApplicationForm(openedApplication)
                  setDetailOpen(false)
                },
                testID: "food-purchase-detail-action",
              }
            : openedCycle && cycleAction(openedCycle, capabilities)
              ? {
                  disabled: writesBlocked,
                  label: cycleActionLabel[cycleAction(openedCycle, capabilities)!],
                  onPress: () => {
                    const action = cycleAction(openedCycle, capabilities)!
                    queued.current = () => openCycleForm(action, openedCycle)
                    setDetailOpen(false)
                  },
                  testID: "food-purchase-detail-action",
                }
              : null
        }
        currencyCode={currencyCode}
        detail={
          openedApplication
            ? applicationDetail(openedApplication, currencyCode, overview.data?.summary.availableAmount)
            : openedCycle
              ? cycleDetail(openedCycle, currencyCode)
              : undefined
        }
        error={detailRef?.type === "application" && applicationDetailQuery.isError}
        loading={detailRef?.type === "application" && applicationDetailQuery.isPending}
        offline={offline}
        onClose={() => setDetailOpen(false)}
        onDismissed={() => {
          const next = queued.current
          queued.current = null
          next?.()
        }}
        onRetry={() => void applicationDetailQuery.refetch()}
        retrying={applicationDetailQuery.isRefetching}
        title={detailRef?.type === "cycle" ? "Foodstuff cycle" : "Foodstuff application"}
        visible={detailOpen}
      />

      <ServiceOpsFlowSheet
        cta={ctas[kind]}
        dirty={Boolean(notes.trim() || sales || cost || opex)}
        footerExtra={
          kind === "intake" || kind === "complete" ? undefined : (
            <DevQuickFill
              label={`Quick fill ${titles[kind].toLowerCase()}`}
              onPress={() => {
                if (kind === "app") setNotes(quick.applicationReviewNotes)
                else if (kind === "cycle") {
                  setAmount(quick.releasedAmount)
                  setNotes(quick.releaseNotes)
                } else if (kind === "acct") {
                  setSales(quick.salesAmount)
                  setCost(quick.purchaseCostAmount)
                  setOpex(quick.expenseAmount)
                  setNotes(quick.cycleAccountingNotes)
                } else setNotes(quick.accountingReviewNotes)
              }}
              placement="footer"
              portal={false}
            />
          )
        }
        offline={offline}
        onClose={() => {
          setStep("closed")
          setResult(null)
        }}
        onConfirm={confirm}
        onRetry={confirm}
        onReview={goReview}
        onSecondary={() => {
          setStep("closed")
          setResult(null)
        }}
        result={result}
        review={reviewSpec}
        setStep={setStep}
        step={step}
        submitting={submitting}
        title={titles[kind]}
      >
        {kind === "app" && application ? (
          <>
            <OpsContextCard
              amount={money(application.requestedAmount)}
              subtitle={application.itemDescription ?? "Foodstuff"}
              title={`${application.member.fullName} · ${application.member.memberNumber}`}
            />
            <FormField label="Decision">
              <SegmentedControl
                accessibilityLabel="Decision"
                onChange={setDecision}
                options={[
                  { label: "Approve", value: "approved" as const },
                  { label: "Keep in review", value: "under_review" as const },
                  { label: "Reject", value: "rejected" as const },
                ]}
                value={decision}
              />
            </FormField>
            {decision === "approved" ? (
              <>
                <FormField
                  error={err("amount")}
                  helper={`Requested ${money(application.requestedAmount)}${overview.data ? ` · ${formatCompactMoney(overview.data.summary.availableAmount, currencyCode)} available` : ""}`}
                  label="Approved amount"
                >
                  <MoneyField
                    accessibilityLabel="Approved amount"
                    currencyCode={currencyCode}
                    onChangeValue={(raw) => setAmount(raw)}
                    testID="food-purchase-review-amount"
                    value={amount}
                  />
                </FormField>
                <FormField
                  error={err("months")}
                  helper={`Policy allows up to ${application.policyMaximumPaybackMonths} months`}
                  label="Payback months"
                >
                  <Input
                    accessibilityLabel="Payback months"
                    keyboardType="number-pad"
                    maxLength={2}
                    onChangeText={(value) => setMonths(value.replace(/\D/g, ""))}
                    testID="food-purchase-review-months"
                    value={months}
                  />
                </FormField>
              </>
            ) : null}
            <FormField error={err("notes")} label="Review notes" optional={decision === "under_review"}>
              <Textarea
                accessibilityLabel="Review notes"
                className="min-h-[104px] rounded-[14px] px-[14px] py-[13px]"
                maxLength={2000}
                onChangeText={setNotes}
                placeholder="Cycle capacity and member obligations checked"
                testID="food-purchase-review-notes"
                value={notes}
              />
            </FormField>
          </>
        ) : kind === "cycle" ? (
          <>
            <FormField error={err("periodMonth")} label="Cycle month">
              <View className="flex-row flex-wrap gap-[8px]">
                {upcomingMonths().map((month) => {
                  const taken = takenMonths.has(month.slice(0, 7))
                  const selectedMonth = month === periodMonth
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selectedMonth, disabled: taken }}
                      className={cn(
                        "min-h-[52px] basis-[47%] grow items-center justify-center rounded-[14px] border px-[10px]",
                        selectedMonth ? "border-primary bg-accent" : "border-border bg-card",
                        taken && "opacity-40"
                      )}
                      key={month}
                      onPress={taken ? undefined : () => setPeriodMonth(month)}
                    >
                      <Text className={selectedMonth ? "text-accent-foreground" : undefined} variant="label">
                        {cycleMonth(month)}
                      </Text>
                      {taken ? (
                        <Text className="text-muted-foreground" variant="caption">
                          Has a cycle
                        </Text>
                      ) : null}
                    </Pressable>
                  )
                })}
              </View>
            </FormField>
            <FormField error={err("amount")} helper="Funds the committee released for this cycle" label="Release amount">
              <MoneyField
                accessibilityLabel="Release amount"
                currencyCode={currencyCode}
                onChangeValue={(raw) => setAmount(raw)}
                testID="food-purchase-cycle-amount"
                value={amount}
              />
            </FormField>
            <FormField error={err("releasedAt")} label="Release date">
              <DateField
                maximumDate={todayDateOnly()}
                onChange={setReleasedAt}
                sheetTitle="Release date"
                testID="food-purchase-cycle-date"
                value={releasedAt}
              />
            </FormField>
            <FormField label="Committee note" optional>
              <Textarea
                accessibilityLabel="Committee note"
                className="min-h-[96px] rounded-[14px] px-[14px] py-[13px]"
                maxLength={2000}
                onChangeText={setNotes}
                placeholder="Approved at the committee meeting"
                value={notes}
              />
            </FormField>
          </>
        ) : cycle ? (
          <>
            <OpsContextCard
              amount={money(cycle.releasedAmount)}
              subtitle={cycleStatusPill(cycle).label}
              title={`${cycleMonth(cycle.periodMonth)} cycle`}
            />
            {kind === "acct" ? (
              <>
                <FormField label="Sales">
                  <MoneyField accessibilityLabel="Sales" currencyCode={currencyCode} onChangeValue={(raw) => setSales(raw)} testID="food-purchase-acct-sales" value={sales} />
                </FormField>
                <FormField label="Purchase cost">
                  <MoneyField accessibilityLabel="Purchase cost" currencyCode={currencyCode} onChangeValue={(raw) => setCost(raw)} testID="food-purchase-acct-cost" value={cost} />
                </FormField>
                <FormField error={err("figures")} helper="Transport, storage and handling" label="Operating expenses">
                  <MoneyField accessibilityLabel="Operating expenses" currencyCode={currencyCode} onChangeValue={(raw) => setOpex(raw)} testID="food-purchase-acct-opex" value={opex} />
                </FormField>
                <View className="flex-row items-center justify-between rounded-[16px] bg-surface-raised px-[16px] py-[14px]">
                  <Text className="text-muted-foreground" variant="label">
                    Calculated profit
                  </Text>
                  <Text className={profit < 0 ? "text-destructive" : undefined} variant="money">
                    {sales ? money(profit) : "—"}
                  </Text>
                </View>
              </>
            ) : kind === "acctrev" || kind === "complete" ? (
              <>
                <Elevated className="rounded-[16px] bg-card px-[14px] py-[8px]" radius={16}>
                  {[
                    ["Sales", cycle.salesAmount ?? 0],
                    ["Purchase cost", cycle.purchaseCostAmount ?? 0],
                    ["Operating expenses", cycle.operatingExpenseAmount ?? 0],
                    ["Profit", cycle.profitAmount ?? 0],
                  ].map(([label, value]) => (
                    <View className="min-h-[36px] flex-row items-center justify-between" key={label as string}>
                      <Text className="text-muted-foreground" variant="small">
                        {label}
                      </Text>
                      <Text className="font-bold" tabular variant="small">
                        {money(value as number)}
                      </Text>
                    </View>
                  ))}
                </Elevated>
                {kind === "acctrev" ? (
                  <FormField label="Decision">
                    <SegmentedControl
                      accessibilityLabel="Accounting decision"
                      onChange={setAccountingDecision}
                      options={[
                        { label: "Approve", value: "approved" as const },
                        { label: "Return", value: "rejected" as const },
                      ]}
                      value={accountingDecision}
                    />
                  </FormField>
                ) : null}
              </>
            ) : null}
            <FormField
              error={err("notes")}
              label={kind === "acct" ? "Accounting notes" : kind === "acctrev" ? "Review note" : "Note"}
              optional={!(kind === "acctrev" && accountingDecision === "rejected")}
            >
              <Textarea
                accessibilityLabel="Notes"
                className="min-h-[96px] rounded-[14px] px-[14px] py-[13px]"
                maxLength={2000}
                onChangeText={setNotes}
                placeholder={kind === "acct" ? "Sales, supplier cost and expense evidence" : "Optional note for the record"}
                testID="food-purchase-cycle-notes"
                value={notes}
              />
            </FormField>
          </>
        ) : null}
      </ServiceOpsFlowSheet>
    </>
  )
}
