import { CalendarDateField } from "@/components/app/calendar-date-field"
import { CalendarPickerSheet } from "@/components/app/calendar-picker-sheet"
import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { captureMobileError } from "@/lib/sentry"
import { todayDateOnly } from "@/lib/date-only"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, View } from "react-native"
import { AdminContributionWorkspace } from "../components/admin-contribution-workspace"
import { PostContributionPaymentSheet } from "../components/post-contribution-payment-sheet"
import { ContributionMemberSummary } from "../components/contribution-member-summary"
import { ContributionChoiceList } from "../components/contribution-choice-list"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import {
  formatCurrency,
  formatDate,
  labelize,
  money,
} from "../lib/admin-contribution-presentation"
import {
  closeContributionPlan,
  getContributionBatch,
  getContributionMember,
  getContributionWorkspace,
  postContributionBatchRows,
  recordContributionPayment,
  setContributionPlan,
  stageContributionBatch,
  updateAllocationPreference,
  updateContributionBatchRows,
} from "../api/admin-contribution-operations-api"
import type {
  AllocationPreference,
  CollectionBatchDetail,
  CollectionBatchRow,
  ContributionLane,
  ContributionLedgerRow,
  ContributionMemberWorkspace,
  ContributionWorkspace,
} from "../model/admin-contribution-operations-types"

type FormMode = "plan" | "payment" | "batch" | "row" | null
type ReviewCommand =
  | { kind: "plan"; input: Parameters<typeof setContributionPlan>[0] }
  | {
      kind: "preference"
      input: Parameters<typeof updateAllocationPreference>[0]
    }
  | { kind: "payment"; input: Parameters<typeof recordContributionPayment>[0] }
  | { kind: "batch"; input: Parameters<typeof stageContributionBatch>[0] }
  | { kind: "row"; input: Parameters<typeof updateContributionBatchRows>[0] }
  | { kind: "post"; input: Parameters<typeof postContributionBatchRows>[0] }
  | { kind: "close"; input: Parameters<typeof closeContributionPlan>[0] }

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="text-sm font-semibold text-foreground">{children}</Text>
  )
}

function SubmitError({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <View className="bg-destructive/10 px-3 py-2">
      <Text className="text-sm leading-5 text-destructive">{message}</Text>
    </View>
  )
}

export function AdminContributionOperationsScreen() {
  const router = useRouter()
  const runtime = useMobileRuntime()
  const largeTextLayout = useLargeTextLayout()
  const workspaceRequest = useRef(0)
  const loadingMore = useRef(false)
  const [lane, setLane] = useState<ContributionLane>("commitments")
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")
  const [workspace, setWorkspace] = useState<ContributionWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedLedger, setSelectedLedger] =
    useState<ContributionLedgerRow | null>(null)
  const [member, setMember] = useState<ContributionMemberWorkspace | null>(null)
  const [memberDetailVisible, setMemberDetailVisible] = useState(false)
  const [batch, setBatch] = useState<CollectionBatchDetail | null>(null)
  const [batchDetailVisible, setBatchDetailVisible] = useState(false)
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [editingRow, setEditingRow] = useState<CollectionBatchRow | null>(null)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [calendarIntent, setCalendarIntent] = useState<
    "payment" | "plan" | "batch" | null
  >(null)
  const [review, setReview] = useState<ReviewCommand | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [planAmount, setPlanAmount] = useState("")
  const [planStartsAt, setPlanStartsAt] = useState(todayDateOnly())
  const [preference, setPreference] =
    useState<AllocationPreference>("manual_split")
  const [committedAmount, setCommittedAmount] = useState("")
  const [extraSavings, setExtraSavings] = useState("0")
  const [scheduledServicing, setScheduledServicing] = useState("0")
  const [extraPayoff, setExtraPayoff] = useState("0")
  const [paymentDate, setPaymentDate] = useState(todayDateOnly())
  const [paymentReference, setPaymentReference] = useState("")
  const [batchSourceId, setBatchSourceId] = useState("")
  const [batchYear, setBatchYear] = useState(String(new Date().getFullYear()))
  const [batchMonth, setBatchMonth] = useState(
    String(new Date().getMonth() + 1)
  )
  const [batchReference, setBatchReference] = useState("")
  const [batchNotes, setBatchNotes] = useState("")
  const [rowStatus, setRowStatus] = useState<
    "collected" | "exception" | "skipped" | "staged"
  >("collected")
  const [rowAmount, setRowAmount] = useState("")
  const [rowReason, setRowReason] = useState("")
  const isOnline = runtime.state.connectivity === "online"
  const stale = isMobileReadCacheStale(workspace?.cache)
  const isWritable = isOnline && !stale
  const draft = useMemo(
    () => ({
      batchMonth,
      batchNotes,
      batchReference,
      batchSourceId,
      batchYear,
      committedAmount,
      extraPayoff,
      extraSavings,
      paymentDate,
      paymentReference,
      planAmount,
      planStartsAt,
      preference,
      rowAmount,
      rowReason,
      rowStatus,
      scheduledServicing,
    }),
    [
      batchMonth,
      batchNotes,
      batchReference,
      batchSourceId,
      batchYear,
      committedAmount,
      extraPayoff,
      extraSavings,
      paymentDate,
      paymentReference,
      planAmount,
      planStartsAt,
      preference,
      rowAmount,
      rowReason,
      rowStatus,
      scheduledServicing,
    ]
  )
  const clearDraft = useMobileFormDraft({
    enabled: Boolean(formMode),
    key: `admin.contribution-operations.${formMode ?? "closed"}.${formMode === "plan" || formMode === "payment" ? (member?.id ?? "none") : formMode === "row" ? (editingRow?.id ?? "none") : "collection"}`,
    onHydrate: (value: typeof draft) => {
      setBatchMonth(value.batchMonth)
      setBatchNotes(value.batchNotes)
      setBatchReference(value.batchReference)
      setBatchSourceId(value.batchSourceId)
      setBatchYear(value.batchYear)
      setCommittedAmount(value.committedAmount)
      setExtraPayoff(value.extraPayoff)
      setExtraSavings(value.extraSavings)
      setPaymentDate(value.paymentDate)
      setPaymentReference(value.paymentReference)
      setPlanAmount(value.planAmount)
      setPlanStartsAt(value.planStartsAt)
      setPreference(value.preference)
      setRowAmount(value.rowAmount)
      setRowReason(value.rowReason)
      setRowStatus(value.rowStatus)
      setScheduledServicing(value.scheduledServicing)
    },
    value: draft,
  })
  const hasDraft =
    formMode === "plan"
      ? Boolean(
          planAmount.trim() !== String(member?.commitmentTarget || "") ||
          planStartsAt !== todayDateOnly() ||
          preference !== member?.paymentAllocationPreference
        )
      : formMode === "payment"
        ? Boolean(
            committedAmount.trim() !== String(member?.commitmentTarget || "") ||
            extraSavings.trim() !== "0" ||
            scheduledServicing.trim() !==
              String(member?.activeLoan?.estimatedMonthlyServicing ?? 0) ||
            extraPayoff.trim() !== "0" ||
            paymentDate !== todayDateOnly() ||
            paymentReference.trim()
          )
        : formMode === "batch"
          ? Boolean(batchReference.trim() || batchNotes.trim())
          : formMode === "row"
            ? Boolean(rowAmount.trim() || rowReason.trim())
            : false
  const paymentTotal = useMemo(
    () =>
      [committedAmount, extraSavings, scheduledServicing, extraPayoff].reduce(
        (total, value) => total + (money(value) ?? 0),
        0
      ),
    [committedAmount, extraPayoff, extraSavings, scheduledServicing]
  )

  const load = useCallback(async () => {
    const request = ++workspaceRequest.current
    loadingMore.current = false
    setIsLoadingMore(false)
    setLoadMoreError(null)
    setIsLoading(true)
    setError(null)
    try {
      const next = await getContributionWorkspace({
        lane,
        search: search || undefined,
      })
      if (request === workspaceRequest.current) setWorkspace(next)
    } catch (loadError) {
      if (request !== workspaceRequest.current) return
      captureMobileError(loadError, "mobile.contribution_operations")
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Contribution operations could not be loaded."
      )
    } finally {
      if (request === workspaceRequest.current) setIsLoading(false)
    }
  }, [lane, search])

  useEffect(() => {
    void load()
    return () => {
      workspaceRequest.current += 1
    }
  }, [load])

  async function loadMore() {
    if (!workspace?.nextCursor || isLoading || loadingMore.current || !isOnline)
      return
    const request = workspaceRequest.current
    const cursor = workspace.nextCursor
    loadingMore.current = true
    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const next = await getContributionWorkspace({
        lane,
        search: search || undefined,
        cursor,
      })
      if (request !== workspaceRequest.current) return
      setWorkspace((current) => {
        if (!current || current.nextCursor !== cursor) return current
        const rows = new Map(current.data.map((item) => [item.id, item]))
        for (const item of next.data) rows.set(item.id, item)
        return { ...next, data: [...rows.values()] }
      })
    } catch (loadError) {
      if (request !== workspaceRequest.current) return
      captureMobileError(loadError, "mobile.contribution_operations")
      setLoadMoreError("More records could not be loaded. Try again.")
    } finally {
      if (request === workspaceRequest.current) {
        loadingMore.current = false
        setIsLoadingMore(false)
      }
    }
  }

  const openMember = useCallback(async (memberId: string) => {
    setSubmitError(null)
    try {
      const detail = await getContributionMember(memberId)
      setMember(detail)
      setPlanAmount(String(detail.commitmentTarget || ""))
      setPlanStartsAt(todayDateOnly())
      setCommittedAmount(String(detail.commitmentTarget || ""))
      setExtraSavings("0")
      setScheduledServicing(
        String(detail.activeLoan?.estimatedMonthlyServicing ?? 0)
      )
      setExtraPayoff("0")
      setPaymentDate(todayDateOnly())
      setPaymentReference("")
      setPreference(detail.paymentAllocationPreference)
      setMemberDetailVisible(true)
    } catch (detailError) {
      captureMobileError(detailError, "mobile.contribution_operations")
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Member contribution details are unavailable."
      )
    }
  }, [])

  const openBatch = useCallback(async (batchId: string) => {
    setSubmitError(null)
    try {
      const detail = await getContributionBatch(batchId)
      setBatch(detail)
      setSelectedRowIds(
        detail.rows
          .filter((row) => row.status === "collected")
          .map((row) => row.id)
      )
      setBatchDetailVisible(true)
    } catch (detailError) {
      captureMobileError(detailError, "mobile.contribution_operations")
      setError(
        detailError instanceof Error
          ? detailError.message
          : "Collection batch details are unavailable."
      )
    }
  }, [])

  const currencyCode = workspace?.currencyCode ?? "NGN"
  const canManageMember = Boolean(
    workspace?.capabilities.manageMemberContributions
  )
  const canManageBatches = Boolean(workspace?.capabilities.manageBatches)

  function startPlanForm() {
    if (!member) return
    setMemberDetailVisible(false)
    setFormMode("plan")
    setSubmitError(null)
  }
  function startPaymentForm() {
    if (!member) return
    setMemberDetailVisible(false)
    setFormMode("payment")
    setSubmitError(null)
  }
  function startBatchForm() {
    const first = workspace?.sources?.[0]
    setBatchSourceId(first?.id ?? "")
    setFormMode("batch")
    setSubmitError(null)
  }
  function startRowForm(row: CollectionBatchRow) {
    if (row.status === "posted" || row.status === "blocked") return
    setEditingRow(row)
    setRowStatus(
      row.status === "exception" || row.status === "skipped"
        ? row.status
        : "collected"
    )
    setRowAmount(String(row.paidAmount || row.expectedAmount))
    setRowReason(row.exceptionReason ?? "")
    setBatchDetailVisible(false)
    setFormMode("row")
    setSubmitError(null)
  }

  function quickFill() {
    if (formMode === "plan") {
      setPlanAmount(mobileDevQuickFill.adminContributions.commitmentAmount)
      setPlanStartsAt(todayDateOnly())
      setPreference("savings_first")
    }
    if (formMode === "payment") {
      setCommittedAmount(String(member?.commitmentTarget ?? 25000))
      setExtraSavings(mobileDevQuickFill.adminContributions.extraSavings)
      setScheduledServicing(
        String(member?.activeLoan?.estimatedMonthlyServicing ?? 0)
      )
      setExtraPayoff(
        member?.activeLoan
          ? mobileDevQuickFill.adminContributions.extraPayoff
          : "0"
      )
      setPaymentDate(todayDateOnly())
      setPaymentReference(
        mobileDevQuickFill.adminContributions.paymentReference
      )
    }
    if (formMode === "batch") {
      setBatchSourceId(workspace?.sources?.[0]?.id ?? "")
      setBatchYear(String(new Date().getFullYear()))
      setBatchMonth(String(new Date().getMonth() + 1))
      setBatchReference(mobileDevQuickFill.adminContributions.batchReference)
      setBatchNotes(mobileDevQuickFill.adminContributions.batchNotes)
    }
    if (formMode === "row") {
      setRowStatus("collected")
      setRowAmount(
        String(
          editingRow?.expectedAmount ??
            mobileDevQuickFill.adminContributions.rowAmount
        )
      )
      setRowReason("")
    }
  }

  function validateForm() {
    setSubmitError(null)
    if (formMode === "plan" && member) {
      const amount = money(planAmount)
      if (!amount || amount <= 0)
        return setSubmitError("Enter a commitment greater than zero.")
      setReview({
        kind: "plan",
        input: {
          amount,
          commandId: createClientSubmissionKey(),
          expectedState: member.activePlanId ?? "none",
          memberId: member.id,
          startsAt: `${planStartsAt}T00:00:00.000Z`,
        },
      })
    }
    if (formMode === "payment" && member) {
      const committed = money(committedAmount),
        savings = money(extraSavings),
        servicing = money(scheduledServicing),
        payoff = money(extraPayoff)
      if (
        [committed, savings, servicing, payoff].some((value) => value === null)
      )
        return setSubmitError("Enter valid payment amounts.")
      const total = committed! + savings! + servicing! + payoff!
      if (total <= 0)
        return setSubmitError("Enter at least one payment amount.")
      if ((servicing! > 0 || payoff! > 0) && !member.activeLoan)
        return setSubmitError("This member has no active financing target.")
      setReview({
        kind: "payment",
        input: {
          channel: "manual",
          commandId: createClientSubmissionKey(),
          committedSavingsAmount: committed!,
          contributionPlanId: member.activePlanId ?? undefined,
          expectedState: member.workspaceState,
          extraLoanPaymentAmount: payoff!,
          extraSavingsAmount: savings!,
          loanId: member.activeLoan?.id,
          memberId: member.id,
          postedAt: `${paymentDate}T00:00:00.000Z`,
          reference: paymentReference.trim() || undefined,
          scheduledLoanServicingAmount: servicing!,
          totalAmount: total,
        },
      })
    }
    if (formMode === "batch") {
      const year = Number(batchYear),
        month = Number(batchMonth)
      if (!batchSourceId) return setSubmitError("Select a Collection Source.")
      if (
        !Number.isInteger(year) ||
        year < 2000 ||
        year > 2100 ||
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12
      )
        return setSubmitError("Enter a valid year and month.")
      setReview({
        kind: "batch",
        input: {
          commandId: createClientSubmissionKey(),
          deductionSourceId: batchSourceId,
          expectedState: "absent",
          month,
          notes: batchNotes.trim() || null,
          reference: batchReference.trim() || null,
          year,
        },
      })
    }
    if (formMode === "row" && batch && editingRow) {
      const paidAmount = money(rowAmount)
      if (rowStatus === "collected" && (!paidAmount || paidAmount <= 0))
        return setSubmitError("Enter the collected amount.")
      if (rowStatus === "exception" && !rowReason.trim())
        return setSubmitError("Enter an exception reason.")
      setReview({
        kind: "row",
        input: {
          batchId: batch.id,
          commandId: createClientSubmissionKey(),
          expectedState: batch.status,
          rows: [
            {
              exceptionReason: rowReason.trim() || null,
              paidAmount: rowStatus === "collected" ? paidAmount : null,
              rowId: editingRow.id,
              status: rowStatus,
            },
          ],
        },
      })
    }
  }

  async function submitReview() {
    if (!review || !isWritable) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await runtime.runOnlineOperation("command", async () => {
        if (review.kind === "plan") return setContributionPlan(review.input)
        if (review.kind === "preference")
          return updateAllocationPreference(review.input)
        if (review.kind === "payment")
          return recordContributionPayment(review.input)
        if (review.kind === "batch") return stageContributionBatch(review.input)
        if (review.kind === "row")
          return updateContributionBatchRows(review.input)
        if (review.kind === "post")
          return postContributionBatchRows(review.input)
        return closeContributionPlan(review.input)
      })
      const successMessage =
        review.kind === "payment"
          ? "Payment posted."
          : review.kind === "batch"
            ? "Batch staged. Review the member rows before posting."
            : review.kind === "post"
              ? "Selected collected rows posted to the ledger."
              : review.kind === "row"
                ? "Collection row updated."
                : review.kind === "close"
                  ? "Commitment closed with history preserved."
                  : review.kind === "preference"
                    ? "Payment allocation updated."
                    : "Commitment saved."
      setReview(null)
      setFormMode(null)
      setMemberDetailVisible(false)
      setBatchDetailVisible(false)
      setSuccess(successMessage)
      await clearDraft()
      await load()
      if (member) setMember(await getContributionMember(member.id))
      if (batch) setBatch(await getContributionBatch(batch.id))
    } catch (commandError) {
      captureMobileError(commandError, "mobile.contribution_operations")
      setSubmitError(
        commandError instanceof Error
          ? commandError.message
          : "The contribution command could not be completed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const reviewRows = useMemo(() => {
    if (!review) return []
    if (review.kind === "payment")
      return [
        { label: "Member", value: member?.name ?? "" },
        {
          label: "Commitment",
          value: formatCurrency(
            review.input.committedSavingsAmount,
            currencyCode
          ),
        },
        {
          label: "Special savings",
          value: formatCurrency(
            review.input.extraSavingsAmount ?? 0,
            currencyCode
          ),
        },
        {
          label: "Financing servicing",
          value: formatCurrency(
            (review.input.scheduledLoanServicingAmount ?? 0) +
              (review.input.extraLoanPaymentAmount ?? 0),
            currencyCode
          ),
        },
        { label: "Posting date", value: formatDate(review.input.postedAt) },
        ...(review.input.reference
          ? [{ label: "Reference", value: review.input.reference }]
          : []),
        {
          label: "Total",
          value: formatCurrency(review.input.totalAmount ?? 0, currencyCode),
        },
      ]
    if (review.kind === "plan")
      return [
        { label: "Member", value: member?.name ?? "" },
        {
          label: "Monthly commitment",
          value: formatCurrency(review.input.amount, currencyCode),
        },
        { label: "Effective", value: formatDate(review.input.startsAt) },
      ]
    if (review.kind === "batch")
      return [
        {
          label: "Collection Source",
          value:
            workspace?.sources?.find(
              (item) => item.id === review.input.deductionSourceId
            )?.name ?? "",
        },
        {
          label: "Period",
          value: `${review.input.month}/${review.input.year}`,
        },
        { label: "Reference", value: review.input.reference ?? "Not provided" },
      ]
    if (review.kind === "row")
      return [
        { label: "Member", value: editingRow?.memberName ?? "" },
        { label: "Status", value: labelize(review.input.rows[0]!.status) },
        {
          label: "Amount",
          value: formatCurrency(
            review.input.rows[0]!.paidAmount ?? 0,
            currencyCode
          ),
        },
      ]
    if (review.kind === "post")
      return [
        { label: "Batch", value: batch?.deductionSource.name ?? "" },
        { label: "Period", value: batch?.periodLabel ?? "" },
        { label: "Rows", value: String(review.input.rowIds.length) },
        {
          label: "Total",
          value: formatCurrency(
            batch?.rows
              .filter((row) => review.input.rowIds.includes(row.id))
              .reduce((sum, row) => sum + row.paidAmount, 0) ?? 0,
            currencyCode
          ),
        },
      ]
    if (review.kind === "close")
      return [
        { label: "Member", value: member?.name ?? "" },
        { label: "Effective", value: formatDate(review.input.endsAt) },
      ]
    return [
      { label: "Member", value: member?.name ?? "" },
      { label: "Allocation", value: labelize(review.input.preference) },
    ]
  }, [batch, currencyCode, editingRow, member, review, workspace?.sources])

  return (
    <SafeArea className="flex-1 bg-background">
      <AdminContributionWorkspace
        canManageBatches={canManageBatches}
        canManageMember={canManageMember}
        error={error}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        loadMoreError={loadMoreError}
        isOnline={isOnline}
        lane={lane}
        onBack={() => router.back()}
        onBatchPress={(item) => void openBatch(item.id)}
        onLaneChange={(nextLane) => {
          workspaceRequest.current += 1
          setWorkspace(null)
          setLane(nextLane)
          setSearch("")
          setSearchDraft("")
        }}
        onLedgerPress={setSelectedLedger}
        onLoadMore={() => void loadMore()}
        onMemberPress={(item) => void openMember(item.id)}
        onRefresh={() => void load()}
        onSearchChange={setSearchDraft}
        onSearchSubmit={() => setSearch(searchDraft.trim())}
        onStartBatch={startBatchForm}
        search={search}
        searchDraft={searchDraft}
        workspace={workspace}
      />

      <CompactFormSheet
        onClose={() => setSelectedLedger(null)}
        title="Contribution evidence"
        visible={Boolean(selectedLedger)}
      >
        {selectedLedger ? (
          <View className="gap-3">
            <View className="border-b border-border pb-3">
              <Text className="text-xl font-extrabold text-foreground">
                {formatCurrency(selectedLedger.amount, currencyCode)}
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {selectedLedger.memberName} · {selectedLedger.memberNumber}
              </Text>
            </View>
            {[
              { label: "Status", value: labelize(selectedLedger.status) },
              {
                label: "Committed",
                value: formatCurrency(
                  selectedLedger.committedAmount,
                  currencyCode
                ),
              },
              {
                label: "Special savings",
                value: formatCurrency(
                  selectedLedger.extraSavingsAmount,
                  currencyCode
                ),
              },
              { label: "Channel", value: labelize(selectedLedger.channel) },
              {
                label: "Reference",
                value: selectedLedger.reference ?? "Not provided",
              },
            ].map((row) => (
              <View
                className="flex-row justify-between gap-4 border-b border-border py-2"
                key={row.label}
              >
                <Text className="text-sm text-muted-foreground">
                  {row.label}
                </Text>
                <Text className="text-right text-sm font-bold text-foreground">
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </CompactFormSheet>

      <FullScreenFormSheet
        onClose={() => setMemberDetailVisible(false)}
        isSubmitting={isSubmitting}
        overlayActive={Boolean(review)}
        title="Member commitment"
        visible={memberDetailVisible}
      >
        {member ? (
          <View className="gap-5">
            <ContributionMemberSummary
              member={member}
              currencyCode={currencyCode}
              showBalance
            />
            {canManageMember ? (
              <View className={largeTextLayout ? "gap-2" : "flex-row gap-2"}>
                <Button
                  className="flex-1"
                  disabled={!isWritable}
                  onPress={startPaymentForm}
                >
                  <Text>Post payment</Text>
                </Button>
                <Button
                  className="flex-1"
                  disabled={!isWritable}
                  onPress={startPlanForm}
                  variant="outline"
                >
                  <Text>Manage plan</Text>
                </Button>
              </View>
            ) : null}
            <View>
              <View className="flex-row items-center justify-between gap-3 border-b border-border pb-4">
                <Text className="text-lg font-extrabold text-foreground">
                  Commitment history
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {member.planHistory.length} records
                </Text>
              </View>
              <VirtualizedCardList
                data={member.planHistory}
                empty={<EmptyState title="No commitment history" />}
                estimatedItemSize={72}
                keyExtractor={(item) => item.id}
                maxHeight={330}
                renderItem={({ item }) => (
                  <View className="border-b border-border py-3">
                    <View className="flex-row justify-between gap-3">
                      <Text className="min-w-0 flex-1 font-bold text-foreground">
                        {formatCurrency(item.amount, currencyCode)} monthly
                      </Text>
                      <Text
                        className={
                          item.isActive
                            ? "text-success text-xs font-bold"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {item.isActive ? "Active" : "Closed"}
                      </Text>
                    </View>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.startsAt)}
                      {item.endsAt ? ` – ${formatDate(item.endsAt)}` : ""}
                    </Text>
                  </View>
                )}
              />
            </View>
            {canManageMember && member.activePlanId ? (
              <Button
                disabled={!isWritable || isSubmitting}
                onPress={() =>
                  setReview({
                    kind: "close",
                    input: {
                      commandId: createClientSubmissionKey(),
                      endsAt: new Date().toISOString(),
                      expectedState: "active",
                      planId: member.activePlanId!,
                    },
                  })
                }
                variant="destructive"
              >
                <Text>Close active commitment</Text>
              </Button>
            ) : null}
          </View>
        ) : null}
      </FullScreenFormSheet>

      <FullScreenFormSheet
        dirty={hasDraft}
        isSubmitting={isSubmitting}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              onPress={quickFill}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={!isWritable || isSubmitting}
              onPress={validateForm}
            >
              <Text>Review commitment</Text>
            </Button>
          </View>
        }
        onClose={() => {
          setCalendarIntent(null)
          setFormMode(null)
          if (member) setMemberDetailVisible(true)
        }}
        overlay={
          <CalendarPickerSheet
            label="Effective date"
            onChange={setPlanStartsAt}
            onClose={() => setCalendarIntent(null)}
            testID="contribution-plan-date-calendar"
            value={planStartsAt}
            visible={calendarIntent === "plan"}
          />
        }
        overlayActive={calendarIntent === "plan" || Boolean(review)}
        title="Manage commitment"
        visible={formMode === "plan"}
      >
        <FormStateBanner hasDraft={hasDraft} isStale={stale} />
        <SubmitError message={submitError} />
        {member ? (
          <ContributionMemberSummary
            member={member}
            currencyCode={currencyCode}
          />
        ) : null}
        <View className="gap-2">
          <FieldLabel>Monthly commitment</FieldLabel>
          <Input
            accessibilityLabel="Monthly commitment"
            keyboardType="decimal-pad"
            onChangeText={setPlanAmount}
            placeholder="30000"
            testID="contribution-plan-amount-input"
            value={planAmount}
          />
        </View>
        <View className="gap-2">
          <FieldLabel>Effective date</FieldLabel>
          <CalendarDateField
            accessibilityLabel="Effective date"
            onPress={() => setCalendarIntent("plan")}
            testID="contribution-plan-date-input"
            value={planStartsAt}
          />
        </View>
        <View className="gap-2">
          <FieldLabel>Payment allocation</FieldLabel>
          <ContributionChoiceList<AllocationPreference>
            label="Payment allocation"
            options={[
              { value: "savings_first", label: "Savings first" },
              { value: "loan_first", label: "Loan first" },
              { value: "manual_split", label: "Manual split" },
            ]}
            value={preference}
            onChange={setPreference}
            disabled={!isWritable || isSubmitting}
          />
        </View>
        {member && preference !== member.paymentAllocationPreference ? (
          <Button
            disabled={!isWritable || isSubmitting}
            onPress={() =>
              setReview({
                kind: "preference",
                input: {
                  commandId: createClientSubmissionKey(),
                  expectedState: member.paymentAllocationPreference,
                  memberId: member.id,
                  preference,
                },
              })
            }
            variant="outline"
          >
            <Text>Review allocation change</Text>
          </Button>
        ) : null}
      </FullScreenFormSheet>

      <PostContributionPaymentSheet
        calendarVisible={calendarIntent === "payment"}
        committedAmount={committedAmount}
        currencyCode={currencyCode}
        extraPayoff={extraPayoff}
        extraSavings={extraSavings}
        hasDraft={hasDraft}
        isStale={stale}
        isWritable={isWritable}
        isSubmitting={isSubmitting}
        reviewVisible={Boolean(review)}
        member={member}
        onClose={() => {
          setCalendarIntent(null)
          setFormMode(null)
          if (member) setMemberDetailVisible(true)
        }}
        onCloseCalendar={() => setCalendarIntent(null)}
        onOpenCalendar={() => setCalendarIntent("payment")}
        onQuickFill={quickFill}
        onReview={validateForm}
        onSetCommittedAmount={setCommittedAmount}
        onSetExtraPayoff={setExtraPayoff}
        onSetExtraSavings={setExtraSavings}
        onSetPaymentDate={setPaymentDate}
        onSetPaymentReference={setPaymentReference}
        onSetScheduledServicing={setScheduledServicing}
        paymentDate={paymentDate}
        paymentReference={paymentReference}
        scheduledServicing={scheduledServicing}
        submitError={submitError}
        total={paymentTotal}
        visible={formMode === "payment"}
      />

      <FullScreenFormSheet
        dirty={hasDraft}
        isSubmitting={isSubmitting}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              onPress={quickFill}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={!isWritable || isSubmitting || !batchSourceId}
              onPress={validateForm}
            >
              <Text>Review batch</Text>
            </Button>
          </View>
        }
        onClose={() => {
          setCalendarIntent(null)
          setFormMode(null)
        }}
        overlayActive={calendarIntent === "batch" || Boolean(review)}
        overlay={
          <CalendarPickerSheet
            label="Collection period"
            selectionMode="month"
            minimumDate="2000-01-01"
            maximumDate="2100-12-31"
            value={`${batchYear}-${batchMonth.padStart(2, "0")}-01`}
            visible={calendarIntent === "batch"}
            onClose={() => setCalendarIntent(null)}
            onChange={(value) => {
              setBatchYear(value.slice(0, 4))
              setBatchMonth(String(Number(value.slice(5, 7))))
            }}
          />
        }
        title="Stage collection batch"
        visible={formMode === "batch"}
      >
        <FormStateBanner hasDraft={hasDraft} isStale={stale} />
        <SubmitError message={submitError} />
        <View className="gap-2">
          <FieldLabel>Collection Source</FieldLabel>
          {workspace?.sources?.length ? (
            <ContributionChoiceList
              label="Collection Source"
              value={batchSourceId}
              onChange={setBatchSourceId}
              options={workspace.sources.map((source) => ({
                value: source.id,
                label: source.name,
              }))}
              disabled={!isWritable || isSubmitting}
            />
          ) : (
            <Text className="text-sm leading-5 text-muted-foreground">
              Add a Collection Source in Operation Profile to stage a batch.
            </Text>
          )}
        </View>
        <View className="gap-2">
          <FieldLabel>Collection period</FieldLabel>
          <CalendarDateField
            accessibilityLabel="Collection period"
            precision="month"
            placeholder="Choose month"
            value={`${batchYear}-${batchMonth.padStart(2, "0")}`}
            onPress={() => setCalendarIntent("batch")}
          />
        </View>
        <View className="gap-2">
          <FieldLabel>Reference (optional)</FieldLabel>
          <Input
            accessibilityLabel="Batch reference"
            onChangeText={setBatchReference}
            placeholder="Payroll reference"
            testID="contribution-batch-reference-input"
            value={batchReference}
          />
        </View>
        <View className="gap-2">
          <FieldLabel>Notes (optional)</FieldLabel>
          <Textarea
            accessibilityLabel="Batch notes"
            onChangeText={setBatchNotes}
            placeholder="Optional review evidence"
            testID="contribution-batch-notes-input"
            value={batchNotes}
          />
        </View>
      </FullScreenFormSheet>

      <FullScreenFormSheet
        isSubmitting={isSubmitting}
        overlayActive={Boolean(review)}
        footer={
          batch && canManageBatches ? (
            <Button
              disabled={!isWritable || selectedRowIds.length === 0}
              onPress={() =>
                setReview({
                  kind: "post",
                  input: {
                    batchId: batch.id,
                    commandId: createClientSubmissionKey(),
                    expectedState: batch.status,
                    rowIds: selectedRowIds,
                  },
                })
              }
            >
              <Text>Review {selectedRowIds.length} collected rows</Text>
            </Button>
          ) : undefined
        }
        onClose={() => setBatchDetailVisible(false)}
        title={batch?.deductionSource.name ?? "Collection batch"}
        visible={batchDetailVisible}
      >
        {batch ? (
          <View className="gap-4">
            <View className="bg-brand-surface gap-2 px-4 py-5">
              <Text className="text-brand-surface-foreground text-sm">
                {batch.periodLabel} · {labelize(batch.status)}
              </Text>
              <Text className="text-brand-surface-foreground text-3xl font-extrabold">
                {formatCurrency(batch.totals.paidAmount, currencyCode)}
              </Text>
              <Text className="text-brand-surface-foreground text-xs leading-5">
                {batch.totals.postedRows} posted · {batch.totals.collectedRows}{" "}
                collected ·{" "}
                {batch.totals.blockedRows + batch.totals.exceptionRows}{" "}
                exceptions
              </Text>
            </View>
            <VirtualizedCardList
              data={batch.rows}
              empty={
                <EmptyState
                  description="This source had no eligible members for the selected period."
                  title="No batch rows"
                />
              }
              estimatedItemSize={76}
              keyExtractor={(item) => item.id}
              maxHeight={470}
              renderItem={({ item }) => (
                <View className="min-h-18 flex-row items-center gap-3 border-b border-border py-3">
                  <Pressable
                    accessibilityLabel={`${selectedRowIds.includes(item.id) ? "Deselect" : "Select"} ${item.memberName}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: selectedRowIds.includes(item.id),
                      disabled: item.status !== "collected",
                    }}
                    className="size-11 items-center justify-center"
                    disabled={item.status !== "collected"}
                    onPress={() =>
                      setSelectedRowIds((current) =>
                        current.includes(item.id)
                          ? current.filter((id) => id !== item.id)
                          : [...current, item.id]
                      )
                    }
                  >
                    <Icon
                      className={
                        selectedRowIds.includes(item.id)
                          ? "size-base text-primary"
                          : "size-base text-muted-foreground"
                      }
                      name={
                        selectedRowIds.includes(item.id)
                          ? "SquareCheckBig"
                          : "Square"
                      }
                    />
                  </Pressable>
                  <Pressable
                    accessibilityHint="Opens the contribution row form"
                    accessibilityLabel={`Review ${item.memberName}, ${formatCurrency(item.paidAmount || item.expectedAmount, currencyCode)}, ${labelize(item.status)}`}
                    accessibilityRole="button"
                    className="min-w-0 flex-1 py-1"
                    onPress={() => startRowForm(item)}
                  >
                    <View
                      className={
                        largeTextLayout
                          ? "gap-2"
                          : "flex-row justify-between gap-3"
                      }
                    >
                      <Text className="min-w-0 flex-1 font-bold text-foreground">
                        {item.memberName}
                      </Text>
                      <Text className="font-bold text-foreground">
                        {formatCurrency(
                          item.paidAmount || item.expectedAmount,
                          currencyCode
                        )}
                      </Text>
                    </View>
                    <Text className="mt-1 text-xs text-muted-foreground">
                      {item.memberNumber} · {labelize(item.status)}
                    </Text>
                    {item.blocker || item.exceptionReason ? (
                      <Text className="mt-1 text-xs font-medium text-destructive">
                        {labelize(item.blocker ?? item.exceptionReason ?? "")}
                      </Text>
                    ) : null}
                  </Pressable>
                </View>
              )}
            />
          </View>
        ) : null}
      </FullScreenFormSheet>

      <CompactFormSheet
        dirty={hasDraft}
        isSubmitting={isSubmitting}
        overlayActive={Boolean(review)}
        footer={
          <View className="flex-row items-center gap-3 px-5 pt-3 pb-5">
            <DevQuickFill
              onPress={quickFill}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={!isWritable || isSubmitting}
              onPress={validateForm}
            >
              <Text>Review row</Text>
            </Button>
          </View>
        }
        onClose={() => {
          setFormMode(null)
          setBatchDetailVisible(true)
        }}
        title="Update collection row"
        visible={formMode === "row"}
      >
        <FormStateBanner hasDraft={hasDraft} isStale={stale} />
        <SubmitError message={submitError} />
        <View className="border-b border-border pb-3">
          <Text className="font-bold text-foreground">
            {editingRow?.memberName}
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            Expected{" "}
            {formatCurrency(editingRow?.expectedAmount ?? 0, currencyCode)}
          </Text>
        </View>
        <View className={largeTextLayout ? "gap-2" : "flex-row gap-2"}>
          {(["collected", "exception", "skipped"] as const).map((value) => (
            <Button
              className="flex-1 px-2"
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: rowStatus === value }}
              onPress={() => setRowStatus(value)}
              variant={rowStatus === value ? "secondary" : "outline"}
            >
              <Text className="text-xs">{labelize(value)}</Text>
            </Button>
          ))}
        </View>
        {rowStatus === "collected" ? (
          <View className="gap-2">
            <FieldLabel>Collected amount</FieldLabel>
            <Input
              accessibilityLabel="Collected amount"
              keyboardType="decimal-pad"
              onChangeText={setRowAmount}
              placeholder="0"
              testID="contribution-row-amount-input"
              value={rowAmount}
            />
          </View>
        ) : null}
        {rowStatus !== "collected" ? (
          <View className="gap-2">
            <FieldLabel>
              {rowStatus === "exception" ? "Exception reason" : "Skip note"}
            </FieldLabel>
            <Textarea
              accessibilityLabel="Row reason"
              onChangeText={setRowReason}
              placeholder="Explain this row status"
              testID="contribution-row-reason-input"
              value={rowReason}
            />
          </View>
        ) : null}
      </CompactFormSheet>

      <SubmissionReviewSheet
        cancelLabel="Keep editing"
        confirmLabel={
          review?.kind === "payment"
            ? "Post payment"
            : review?.kind === "post"
              ? "Post rows"
              : review?.kind === "batch"
                ? "Stage batch"
                : review?.kind === "close"
                  ? "Close commitment"
                  : "Save change"
        }
        error={submitError}
        isSubmitting={isSubmitting}
        onClose={() => setReview(null)}
        onConfirm={() => void submitReview()}
        rows={reviewRows}
        title={
          review?.kind === "payment"
            ? "Review payment"
            : review?.kind === "post"
              ? "Review posting"
              : review?.kind === "batch"
                ? "Review batch"
                : review?.kind === "close"
                  ? "Close commitment?"
                  : review?.kind === "row"
                    ? "Review collection row"
                    : "Review commitment"
        }
        visible={Boolean(review)}
      />
      <SubmissionSuccessSheet
        description={success ?? ""}
        onClose={() => setSuccess(null)}
        title="Saved"
        visible={Boolean(success)}
      />
    </SafeArea>
  )
}
