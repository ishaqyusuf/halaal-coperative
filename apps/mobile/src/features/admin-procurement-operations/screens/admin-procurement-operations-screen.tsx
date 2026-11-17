import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { MoneyField } from "@/components/ui/money-field"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Textarea } from "@/components/ui/textarea"
import {
  mobileDevQuickFill,
  mobileDevQuickFillReference,
} from "@/dev/mobile-dev-quick-fill"
import { ServiceOpsDetailSheet } from "@/features/admin-service-operations/components/service-ops-detail"
import {
  OpsContextCard,
  ServiceOpsFlowSheet,
  type OpsFlowStep,
} from "@/features/admin-service-operations/components/service-ops-flow"
import { ServiceOpsLanes } from "@/features/admin-service-operations/components/service-ops-lanes"
import { useOpsLane } from "@/features/admin-service-operations/hooks/use-ops-lane"
import type {
  OpsResult,
  OpsReviewSpec,
  OpsRow,
} from "@/features/admin-service-operations/model/service-ops-types"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import {
  appQueryKey,
  useAppQuery,
  useInvalidateAppQueries,
} from "@/hooks/use-app-query"
import { useDebounce } from "@/hooks/use-debounce"
import { readErrorCode } from "@/lib/app-query-policy"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { addMonthsDateOnly, compareDateOnly, todayDateOnly } from "@/lib/date-only"
import { formatMoney } from "@/lib/money"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { captureMobileError } from "@/lib/sentry"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { MobileOfflineOperationError } from "@/runtime/mobile-runtime-state"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useEffect, useRef, useState } from "react"
import {
  activateProcurementOperation,
  getProcurementOperationDetail,
  getProcurementOperationsSummary,
  getProcurementOperationsWorkspace,
  reviewProcurementOperation,
  submitProcurementPayment,
} from "../api/admin-procurement-operations-api"
import type {
  ProcurementLane,
  ProcurementOperation,
  ProcurementWorkspace,
} from "../model/admin-procurement-operations-types"
import {
  procurementDetail,
  procurementLanes,
  procurementRow,
  procurementSummaryHero,
  shortDate,
} from "../model/procurement-ops-presentation"

type Kind = "activate" | "payment" | "review"
type Decision = "approved" | "rejected" | "under_review"

const feature = "admin-procurement"
const keys = (scope = getMobilePersistenceScope()?.key) => ({
  detail: (id: string | null) => appQueryKey(feature, scope, "detail", id),
  lanes: appQueryKey(feature, scope, "lane"),
  summary: appQueryKey(feature, scope, "summary"),
})

export function AdminProcurementOperationsScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const runtime = useMobileRuntime()
  const offline = runtime.state.connectivity !== "online"
  const invalidate = useInvalidateAppQueries()
  const scope = getMobilePersistenceScope()?.key
  const k = keys(scope)

  // Reads: summary once, one paged query per visited lane and term.
  const [lane, setLane] = useState<ProcurementLane>("review")
  const [visited, setVisited] = useState<Record<ProcurementLane, boolean>>({
    activate: false,
    completed: false,
    review: true,
    servicing: false,
  })
  const [search, setSearch] = useState("")
  const term = useDebounce(search.trim().slice(0, 120), 350)
  const summary = useAppQuery({
    queryFn: getProcurementOperationsSummary,
    queryKey: k.summary,
  })
  const laneRead = (value: ProcurementLane) => ({
    enabled: visited[value],
    fetchPage: (cursor: string | null) =>
      getProcurementOperationsWorkspace({ cursor, lane: value, search: term || undefined }),
    offline,
    queryKey: appQueryKey(feature, scope, "lane", value, term),
    selectItems: (page: ProcurementWorkspace) => page.items,
    toRow: (item: ProcurementOperation) => procurementRow(item, undefined),
  })
  const review = useOpsLane(laneRead("review"))
  const activate = useOpsLane(laneRead("activate"))
  const servicing = useOpsLane(laneRead("servicing"))
  const completed = useOpsLane(laneRead("completed"))
  const lanes = { activate, completed, review, servicing }
  const capabilities =
    review.first?.capabilities ?? lanes[lane].first?.capabilities
  const currencyCode = summary.data?.currencyCode ?? lanes[lane].first?.currencyCode ?? "NGN"
  const money = (value: number) => formatMoney(value, { currencyCode })
  const stale = isMobileReadCacheStale(summary.data?.cache) || lanes[lane].stale
  const writesBlocked = offline || stale
  const findRequest = (id: string) =>
    Object.values(lanes)
      .flatMap((entry) => entry.raw)
      .find((item) => item.id === id)

  // Detail (cached per request).
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [destinationMissing, setDestinationMissing] = useState(false)
  const detail = useAppQuery({
    enabled: Boolean(detailId),
    placeholderData: undefined,
    queryFn: () => getProcurementOperationDetail(detailId!),
    queryKey: k.detail(detailId),
  })
  const handledEntity = useRef<string | null>(null)
  useEffect(() => {
    if (!initialEntityId || handledEntity.current === initialEntityId) return
    handledEntity.current = initialEntityId
    setDetailId(initialEntityId)
    setDetailOpen(true)
  }, [initialEntityId])
  useEffect(() => {
    if (detailOpen && detail.isError && detailId === initialEntityId) {
      setDetailOpen(false)
      setDestinationMissing(true)
    }
  }, [detail.isError, detailId, detailOpen, initialEntityId])

  // Write flow.
  const [step, setStep] = useState<OpsFlowStep>("closed")
  const [kind, setKind] = useState<Kind>("review")
  const [target, setTarget] = useState<ProcurementOperation | null>(null)
  const [decision, setDecision] = useState<Decision>("approved")
  const [cost, setCost] = useState("")
  const [termMonths, setTermMonths] = useState("")
  const [notes, setNotes] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(todayDateOnly())
  const [firstDueDate, setFirstDueDate] = useState(addMonthsDateOnly(todayDateOnly(), 1))
  const [reference, setReference] = useState("")
  const [amount, setAmount] = useState("")
  const [paidAt, setPaidAt] = useState(todayDateOnly())
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<OpsResult | null>(null)
  const commandId = useRef<string | null>(null)
  const queued = useRef<{ kind: Kind; request: ProcurementOperation } | null>(null)
  const reopenDetail = useRef(false)

  function openForm(nextKind: Kind, request: ProcurementOperation) {
    setKind(nextKind)
    setTarget(request)
    setDecision("approved")
    setCost(String(request.requestedCost))
    setTermMonths(String(request.requestedRepaymentMonths))
    setNotes("")
    setPurchaseDate(todayDateOnly())
    setFirstDueDate(addMonthsDateOnly(todayDateOnly(), 1))
    setReference("")
    setAmount(String(request.nextDue?.outstandingAmount ?? ""))
    setPaidAt(todayDateOnly())
    setShowErrors(false)
    setResult(null)
    commandId.current = null
    setStep("form")
  }

  const kindForLane = (value: ProcurementLane): Kind | null =>
    value === "review" ? "review" : value === "activate" ? "activate" : value === "servicing" ? "payment" : null

  const errors: Record<string, string> = {}
  if (target) {
    if (kind === "review") {
      if (decision === "approved") {
        const value = Number(cost)
        const monthsValue = Number(termMonths)
        if (!cost || !(value > 0)) errors.cost = "Enter the approved cost."
        if (!Number.isInteger(monthsValue) || monthsValue < 1 || monthsValue > target.policyMaximumPaybackMonths)
          errors.termMonths = `Between 1 and ${target.policyMaximumPaybackMonths} months.`
      }
      if (decision !== "under_review" && notes.trim().length < 2)
        errors.notes = "Add the evidence for this decision."
    } else if (kind === "activate") {
      if (!purchaseDate) errors.purchaseDate = "Choose the purchase date."
      if (!firstDueDate) errors.firstDueDate = "Choose the first due date."
      else if (purchaseDate && compareDateOnly(firstDueDate, purchaseDate) < 0)
        errors.firstDueDate = "Can’t be before the purchase date."
      if (reference.trim().length < 2) errors.reference = "Add the invoice reference."
    } else {
      const due = target.nextDue?.outstandingAmount ?? 0
      const value = Number(amount)
      if (!amount || !(value > 0)) errors.amount = "Enter an amount."
      else if (value > due) errors.amount = `Can’t be more than the ${money(due)} balance.`
      if (!paidAt) errors.paidAt = "Choose the payment date."
      if (reference.trim().length < 2) errors.reference = "Add the payment reference."
    }
  }
  const valid = Object.keys(errors).length === 0
  const err = (key: string) => (showErrors ? errors[key] : undefined)

  const reviewSpec: OpsReviewSpec | null = !target
    ? null
    : kind === "review"
      ? {
          confirmLabel:
            decision === "approved" ? "Approve request" : decision === "rejected" ? "Reject request" : "Keep in review",
          note: decision === "approved" ? "These terms are frozen for the purchase." : undefined,
          rows: [
            ["Member", target.member.fullName],
            ["Item", target.itemName],
            ["Decision", decision === "approved" ? "Approve" : decision === "rejected" ? "Reject" : "Keep in review"],
            ...(decision === "approved"
              ? ([
                  ["Approved cost", money(Number(cost || 0))],
                  ["Term", `${termMonths} months`],
                ] as [string, string][])
              : []),
          ],
          title: "Confirm decision",
        }
      : kind === "activate"
        ? {
            confirmLabel: "Activate purchase",
            note: "The repayment schedule is created once.",
            rows: [
              ["Member", target.member.fullName],
              ["Invoice", reference.trim() || "—"],
              ["Purchase date", purchaseDate ? shortDate(purchaseDate, true) : "—"],
              ["First due", firstDueDate ? shortDate(firstDueDate, true) : "—"],
              ["Schedule", `${target.approvedRepaymentMonths ?? target.requestedRepaymentMonths} installments`],
            ],
            title: "Confirm purchase",
          }
        : {
            confirmLabel: "Submit receipt",
            note: "Finance reviews the receipt before the balance changes.",
            rows: [
              ["Member", target.member.fullName],
              ["Installment", String(target.nextDue?.installmentNumber ?? "–")],
              ["Amount", money(Number(amount || 0))],
              ["Date", paidAt ? shortDate(paidAt, true) : "—"],
              ["Reference", reference.trim() || "—"],
            ],
            title: "Confirm payment",
          }

  function goReview() {
    setShowErrors(true)
    if (!valid || writesBlocked) return
    commandId.current = createClientSubmissionKey()
    setStep("review")
  }

  async function confirm() {
    if (!target || submitting) return
    const id = commandId.current ?? createClientSubmissionKey()
    commandId.current = id
    setSubmitting(true)
    try {
      if (kind === "review") {
        await reviewProcurementOperation({
          approvedCost: decision === "approved" ? Number(cost) : undefined,
          approvedRepaymentMonths: decision === "approved" ? Number(termMonths) : undefined,
          commandId: id,
          expectedState: target.status as "submitted" | "under_review",
          notes: notes.trim() || undefined,
          procurementRequestId: target.id,
          status: decision,
        })
      } else if (kind === "activate") {
        await activateProcurementOperation({
          commandId: id,
          expectedState: "approved",
          firstDueDate,
          procurementRequestId: target.id,
          purchaseDate,
          purchaseNotes: notes.trim() || undefined,
          purchaseReference: reference.trim(),
        })
      } else if (target.nextDue) {
        await submitProcurementPayment({
          amount: Number(amount),
          commandId: id,
          expectedState: target.nextDue.status as "due" | "overdue" | "partially_paid" | "pending",
          memberId: target.member.id,
          notes: notes.trim() || undefined,
          paidAt,
          paymentReference: reference.trim(),
          procurementRepaymentScheduleItemId: target.nextDue.id,
        })
      }
      const months = target.approvedRepaymentMonths ?? target.requestedRepaymentMonths
      setResult(
        kind === "review"
          ? {
              body:
                decision === "approved"
                  ? `${target.member.fullName} can now buy the ${target.itemName}.`
                  : decision === "rejected"
                    ? `${target.member.fullName}’s request is closed.`
                    : "The request stays in review.",
              kind: "success",
              secondaryLabel: "Open record",
              title: decision === "approved" ? "Request approved" : "Decision recorded",
            }
          : kind === "activate"
            ? {
                body: `${target.member.fullName}’s ${months}-month schedule has started.`,
                kind: "success",
                secondaryLabel: "Open record",
                title: "Purchase activated",
              }
            : {
                body: "Finance will review it before the balance changes.",
                kind: "success",
                secondaryLabel: "Open record",
                title: "Receipt submitted",
              }
      )
      setStep("result")
      void invalidate(k.summary, k.lanes, k.detail(target.id))
    } catch (error) {
      const code = readErrorCode(error)
      const conflict = code === "CONFLICT" || code === "PRECONDITION_FAILED"
      if (!(error instanceof MobileOfflineOperationError))
        captureMobileError(error, "mobile.procurement_operations")
      if (conflict) {
        commandId.current = null
        void invalidate(k.summary, k.lanes, k.detail(target.id))
      }
      setResult({ kind: conflict ? "conflict" : "error" })
      setStep("result")
    } finally {
      setSubmitting(false)
    }
  }

  const opened = detail.data
  const openedKind = opened ? kindForLane(opened.lane) : null
  const detailAction =
    opened && openedKind
      ? {
          disabled:
            writesBlocked ||
            (openedKind === "review" && !capabilities?.review) ||
            (openedKind === "activate" && !capabilities?.activate) ||
            (openedKind === "payment" && (!capabilities?.submitPayment || !opened.nextDue)),
          label: openedKind === "review" ? "Review" : openedKind === "activate" ? "Record purchase" : "Record payment",
          onPress: () => {
            queued.current = { kind: openedKind, request: opened }
            setDetailOpen(false)
          },
          testID: "procurement-detail-action",
        }
      : null

  const formTitle = kind === "review" ? "Review request" : kind === "activate" ? "Record purchase" : "Record payment"
  const months = target ? target.approvedRepaymentMonths ?? target.requestedRepaymentMonths : 0

  return (
    <>
      <ServiceOpsLanes
        currencyCode={currencyCode}
        hero={procurementSummaryHero(summary.data)}
        heroAction={{
          icon: "RefreshCw",
          label: "Refresh procurement",
          onPress: () => {
            void summary.refetch({ cancelRefetch: false })
            lanes[lane].state.refetch()
          },
        }}
        icon="ShoppingBag"
        lane={lane}
        laneState={(value) => ({
          ...lanes[value].state,
          items: lanes[value].raw.map((item) => procurementRow(item, capabilities)),
        })}
        lanes={procurementLanes(summary.data)}
        offline={offline}
        onAction={(row: OpsRow, value) => {
          const request = findRequest(row.id)
          const nextKind = kindForLane(value)
          if (request && nextKind) openForm(nextKind, request)
        }}
        onLaneChange={(value) => {
          setLane(value)
          setVisited((current) => (current[value] ? current : { ...current, [value]: true }))
        }}
        onOpen={(row) => {
          setDetailId(row.id)
          setDetailOpen(true)
        }}
        onRefresh={() => {
          void summary.refetch({ cancelRefetch: false })
          lanes[lane].state.refetch()
        }}
        refreshing={summary.isRefetching || lanes[lane].state.refreshing}
        search={search}
        searchPlaceholder="Search member or item"
        searchTerm={term}
        setSearch={setSearch}
        stale={stale}
        summaryError={summary.isError}
        testIdPrefix="procurement"
        title="Procurement"
        topSlot={
          destinationMissing ? (
            <NotificationDestinationNotice onDismiss={() => setDestinationMissing(false)} />
          ) : null
        }
        writesBlocked={writesBlocked}
      />

      <ServiceOpsDetailSheet
        action={detailAction}
        currencyCode={currencyCode}
        detail={opened ? procurementDetail(opened, currencyCode) : undefined}
        error={detail.isError}
        loading={detail.isPending}
        offline={offline}
        onClose={() => setDetailOpen(false)}
        onDismissed={() => {
          const next = queued.current
          queued.current = null
          if (next) openForm(next.kind, next.request)
        }}
        onRetry={() => void detail.refetch()}
        retrying={detail.isRefetching}
        title="Procurement request"
        visible={detailOpen}
      />

      <ServiceOpsFlowSheet
        cta={kind === "review" ? "Review decision" : kind === "activate" ? "Review purchase" : "Review payment"}
        dirty={Boolean(notes.trim() || reference.trim())}
        footerExtra={
          <DevQuickFill
            label={`Quick fill ${formTitle.toLowerCase()}`}
            onPress={() => {
              const quick = mobileDevQuickFill.adminProcurementOperations
              if (kind === "review") setNotes(quick.reviewNotes)
              else if (kind === "activate") {
                setReference(mobileDevQuickFillReference("QA-INV"))
                setNotes(quick.activateNotes)
              } else {
                setReference(mobileDevQuickFillReference("QA-PAY"))
                setNotes(quick.paymentNotes)
              }
            }}
            placement="footer"
            portal={false}
          />
        }
        offline={offline}
        onClose={() => {
          setStep("closed")
          setResult(null)
        }}
        onConfirm={confirm}
        onDismissed={() => {
          if (!reopenDetail.current || !target) return
          reopenDetail.current = false
          setDetailId(target.id)
          setDetailOpen(true)
        }}
        onRetry={confirm}
        onReview={goReview}
        onSecondary={() => {
          reopenDetail.current = true
          setStep("closed")
          setResult(null)
        }}
        result={result}
        review={reviewSpec}
        setStep={setStep}
        step={step}
        submitting={submitting}
        title={formTitle}
      >
        {target ? (
          <>
            <OpsContextCard
              amount={money(
                kind === "payment"
                  ? target.outstandingAmount
                  : target.approvedCost ?? target.requestedCost
              )}
              subtitle={`${target.itemName} · ${months} months`}
              title={`${target.member.fullName} · ${target.member.memberNumber}`}
            />
            {kind === "review" ? (
              <>
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
                    <FormField error={err("cost")} helper={`Requested ${money(target.requestedCost)}`} label="Approved cost">
                      <MoneyField
                        accessibilityLabel="Approved cost"
                        currencyCode={currencyCode}
                        onChangeValue={(raw) => setCost(raw)}
                        testID="procurement-review-cost"
                        value={cost}
                      />
                    </FormField>
                    <FormField
                      error={err("termMonths")}
                      helper={`Policy allows up to ${target.policyMaximumPaybackMonths} months`}
                      label="Repayment months"
                    >
                      <Input
                        accessibilityLabel="Repayment months"
                        keyboardType="number-pad"
                        maxLength={2}
                        onChangeText={(value) => setTermMonths(value.replace(/\D/g, ""))}
                        testID="procurement-review-months"
                        value={termMonths}
                      />
                    </FormField>
                  </>
                ) : null}
                <FormField
                  error={err("notes")}
                  label="Review evidence"
                  optional={decision === "under_review"}
                >
                  <Textarea
                    accessibilityLabel="Review evidence"
                    className="min-h-[104px] rounded-[14px] px-[14px] py-[13px]"
                    maxLength={2000}
                    onChangeText={setNotes}
                    placeholder="Policy basis and what you checked"
                    testID="procurement-review-notes"
                    value={notes}
                  />
                </FormField>
              </>
            ) : kind === "activate" ? (
              <>
                <FormField error={err("purchaseDate")} label="Purchase date">
                  <DateField
                    maximumDate={todayDateOnly()}
                    onChange={setPurchaseDate}
                    sheetTitle="Purchase date"
                    testID="procurement-activate-purchase-date"
                    value={purchaseDate}
                  />
                </FormField>
                <FormField error={err("reference")} label="Invoice reference">
                  <Input
                    accessibilityLabel="Invoice reference"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={120}
                    onChangeText={setReference}
                    placeholder="INV-012345"
                    testID="procurement-activate-reference"
                    value={reference}
                  />
                </FormField>
                <FormField
                  error={err("firstDueDate")}
                  helper={`${months} monthly installments from the approved terms`}
                  label="First repayment due"
                >
                  <DateField
                    minimumDate={purchaseDate || undefined}
                    onChange={setFirstDueDate}
                    sheetTitle="First repayment due"
                    testID="procurement-activate-first-due"
                    value={firstDueDate}
                  />
                </FormField>
                <FormField label="Purchase notes" optional>
                  <Textarea
                    accessibilityLabel="Purchase notes"
                    className="min-h-[96px] rounded-[14px] px-[14px] py-[13px]"
                    maxLength={2000}
                    onChangeText={setNotes}
                    placeholder="Delivery and condition checks"
                    value={notes}
                  />
                </FormField>
              </>
            ) : (
              <>
                <FormField
                  error={err("amount")}
                  helper={
                    target.nextDue
                      ? `Installment ${target.nextDue.installmentNumber} balance ${money(target.nextDue.outstandingAmount)}`
                      : undefined
                  }
                  label="Amount"
                >
                  <MoneyField
                    accessibilityLabel="Payment amount"
                    currencyCode={currencyCode}
                    onChangeValue={(raw) => setAmount(raw)}
                    testID="procurement-payment-amount"
                    value={amount}
                  />
                </FormField>
                <FormField error={err("paidAt")} label="Payment date">
                  <DateField
                    maximumDate={todayDateOnly()}
                    onChange={setPaidAt}
                    sheetTitle="Payment date"
                    testID="procurement-payment-date"
                    value={paidAt}
                  />
                </FormField>
                <FormField error={err("reference")} label="Payment reference">
                  <Input
                    accessibilityLabel="Payment reference"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={120}
                    onChangeText={setReference}
                    placeholder="Bank transfer reference"
                    testID="procurement-payment-reference"
                    value={reference}
                  />
                </FormField>
                <FormField label="Notes" optional>
                  <Textarea
                    accessibilityLabel="Payment notes"
                    className="min-h-[96px] rounded-[14px] px-[14px] py-[13px]"
                    maxLength={2000}
                    onChangeText={setNotes}
                    placeholder="Where the payment was received"
                    value={notes}
                  />
                </FormField>
              </>
            )}
          </>
        ) : null}
      </ServiceOpsFlowSheet>
    </>
  )
}
