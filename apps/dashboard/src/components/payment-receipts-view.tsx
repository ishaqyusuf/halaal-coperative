"use client"

import type { ReactNode } from "react"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import type {
  MemberPaymentReceiptAllocationRow,
  MemberPaymentReceiptRow,
  MemberPaymentReceiptSummary,
} from "@halaalvest/db"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import {
  createMemberSupportCaseAction,
  createMemberPaymentReceiptAction,
  createOwnMemberPaymentReceiptAction,
  createSupportCaseAction,
  reviewMemberPaymentReceiptAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import type { PaymentReceiptCategoryOption } from "@/lib/payment-receipts/load-payment-receipts-page"
import { UploadEvidenceInput } from "@/components/upload-evidence-input"

type Option = {
  id: string
  label: string
  memberId?: string
}

type AllocationCategory =
  | "commitment"
  | "special_savings"
  | "loan_servicing"
  | "loan_extra_payment"
  | "shares"
  | "procurement"
  | "project_financing"
  | "food_purchase"
  | "other"

type PeriodIntent =
  | "current_period"
  | "future_period"
  | "back_period"
  | "unspecified"

type ReceiptDecision =
  | "under_review"
  | "correction_requested"
  | "approved"
  | "rejected"

type AllocationDraft = {
  amount: string
  category: AllocationCategory
  contributionPlanId: string
  foodPurchaseApplicationId: string
  loanId: string
  notes: string
  periodIntent: PeriodIntent
  projectFinancingRequestId: string
  procurementRepaymentScheduleItemId: string
  targetMonth: string
}

const categoryLabels: Record<AllocationCategory, string> = {
  commitment: "Commitment",
  food_purchase: "Foodstuff Purchase",
  loan_extra_payment: "Extra loan payment",
  loan_servicing: "Loan servicing",
  other: "Other",
  procurement: "Procurement",
  project_financing: "Project financing",
  shares: "Shares",
  special_savings: "Special savings",
}

const periodOptions: Array<{ label: string; value: PeriodIntent }> = [
  { label: "Current", value: "current_period" },
  { label: "Future", value: "future_period" },
  { label: "Back payment", value: "back_period" },
  { label: "Unspecified", value: "unspecified" },
]

const decisionOptions: Array<{ label: string; value: ReceiptDecision }> = [
  { label: "Under review", value: "under_review" },
  { label: "Request correction", value: "correction_requested" },
  { label: "Approve and post", value: "approved" },
  { label: "Reject", value: "rejected" },
]

function emptyAllocation(): AllocationDraft {
  return {
    amount: "",
    category: "commitment",
    contributionPlanId: "",
    foodPurchaseApplicationId: "",
    loanId: "",
    notes: "",
    periodIntent: "current_period",
    projectFinancingRequestId: "",
    procurementRepaymentScheduleItemId: "",
    targetMonth: new Date().toISOString().slice(0, 7),
  }
}

function monthFromDate(value: Date | string | null) {
  if (!value) return ""
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 7)
}

function draftFromAllocation(
  allocation: MemberPaymentReceiptAllocationRow
): AllocationDraft {
  return {
    amount: String(allocation.amount),
    category: allocation.category,
    contributionPlanId: allocation.contributionPlanId ?? "",
    foodPurchaseApplicationId: allocation.foodPurchaseApplicationId ?? "",
    loanId: allocation.loanId ?? "",
    notes: allocation.notes ?? "",
    periodIntent: allocation.periodIntent,
    projectFinancingRequestId: allocation.projectFinancingRequestId ?? "",
    procurementRepaymentScheduleItemId:
      allocation.procurementRepaymentScheduleItemId ?? "",
    targetMonth: monthFromDate(allocation.targetPeriodStart),
  }
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function labelFromValue(value: string) {
  return value.replace(/_/g, " ")
}

function toAllocationPayload(allocations: AllocationDraft[]) {
  return allocations
    .filter((allocation) => Number(allocation.amount) > 0)
    .map((allocation) => ({
      amount: Number(allocation.amount),
      category: allocation.category,
      contributionPlanId: allocation.contributionPlanId || null,
      foodPurchaseApplicationId:
        allocation.category === "food_purchase"
          ? allocation.foodPurchaseApplicationId || null
          : null,
      loanId: allocation.loanId || null,
      notes: allocation.notes || null,
      periodIntent: allocation.periodIntent,
      projectFinancingRequestId:
        allocation.category === "project_financing"
          ? allocation.projectFinancingRequestId || null
          : null,
      procurementRepaymentScheduleItemId:
        allocation.category === "procurement"
          ? allocation.procurementRepaymentScheduleItemId || null
          : null,
      targetPeriodStart: allocation.targetMonth
        ? `${allocation.targetMonth}-01`
        : null,
    }))
}

function statusTone(status: MemberPaymentReceiptRow["status"]) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  if (status === "correction_requested") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-sky-200 bg-sky-50 text-sky-700"
}

export function PaymentReceiptsView({
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  loans,
  members,
  projectFinancingRequests,
  procurementSchedules,
  receipts,
  summary,
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: Option[]
  foodPurchaseApplications: Option[]
  loans: Option[]
  members: Option[]
  projectFinancingRequests: Option[]
  procurementSchedules: Option[]
  receipts: MemberPaymentReceiptRow[]
  summary: MemberPaymentReceiptSummary
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberId, setMemberId] = useState("")
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [channel, setChannel] = useState("transfer")
  const [paymentReference, setPaymentReference] = useState("")
  const [proofDocumentName, setProofDocumentName] = useState("")
  const [proofDocumentUrl, setProofDocumentUrl] = useState("")
  const [memberNotes, setMemberNotes] = useState("")
  const [allocations, setAllocations] = useState<AllocationDraft[]>([
    emptyAllocation(),
  ])
  const [decisionByReceiptId, setDecisionByReceiptId] = useState<
    Record<string, ReceiptDecision>
  >({})
  const [reviewNotesByReceiptId, setReviewNotesByReceiptId] = useState<
    Record<string, string>
  >({})
  const [supportDescriptionByReceiptId, setSupportDescriptionByReceiptId] =
    useState<Record<string, string>>({})
  const [adjustmentReasonByReceiptId, setAdjustmentReasonByReceiptId] =
    useState<Record<string, string>>({})
  const [reviewAllocationsByReceiptId, setReviewAllocationsByReceiptId] =
    useState<Record<string, AllocationDraft[]>>({})

  const selectedMemberPlans = useMemo(
    () =>
      commitmentPlans
        .filter((plan) => !memberId || plan.memberId === memberId)
        .map((plan) => ({ label: plan.label, value: plan.id })),
    [commitmentPlans, memberId]
  )
  const selectedMemberLoans = useMemo(
    () =>
      loans
        .filter((loan) => !memberId || loan.memberId === memberId)
        .map((loan) => ({ label: loan.label, value: loan.id })),
    [loans, memberId]
  )
  const selectedMemberFoodPurchaseApplications = useMemo(
    () =>
      foodPurchaseApplications
        .filter((application) => !memberId || application.memberId === memberId)
        .map((application) => ({
          label: application.label,
          value: application.id,
        })),
    [foodPurchaseApplications, memberId]
  )
  const selectedMemberProjectFinancingRequests = useMemo(
    () =>
      projectFinancingRequests
        .filter((request) => !memberId || request.memberId === memberId)
        .map((request) => ({ label: request.label, value: request.id })),
    [memberId, projectFinancingRequests]
  )
  const selectedMemberProcurementSchedules = useMemo(
    () =>
      procurementSchedules
        .filter((schedule) => !memberId || schedule.memberId === memberId)
        .map((schedule) => ({ label: schedule.label, value: schedule.id })),
    [memberId, procurementSchedules]
  )
  const memberOptions = useMemo(
    () => members.map((member) => ({ label: member.label, value: member.id })),
    [members]
  )
  const totalAmount = allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount || 0),
    0
  )

  function updateAllocation(index: number, patch: Partial<AllocationDraft>) {
    setAllocations((current) =>
      current.map((allocation, currentIndex) =>
        currentIndex === index ? { ...allocation, ...patch } : allocation
      )
    )
  }

  function updateReviewAllocation(
    receipt: MemberPaymentReceiptRow,
    index: number,
    patch: Partial<AllocationDraft>
  ) {
    setReviewAllocationsByReceiptId((current) => {
      const existing =
        current[receipt.id] ?? receipt.allocations.map(draftFromAllocation)

      return {
        ...current,
        [receipt.id]: existing.map((allocation, currentIndex) =>
          currentIndex === index ? { ...allocation, ...patch } : allocation
        ),
      }
    })
  }

  function createReceipt() {
    startTransition(async () => {
      try {
        await createMemberPaymentReceiptAction(
          objectToFormData({
            allocationsJson: JSON.stringify(toAllocationPayload(allocations)),
            channel,
            memberId,
            memberNotes,
            paidAt,
            paymentReference,
            proofDocumentName,
            proofDocumentUrl,
            totalAmount,
          })
        )
        setAllocations([emptyAllocation()])
        setMemberId("")
        setMemberNotes("")
        setPaymentReference("")
        setProofDocumentName("")
        setProofDocumentUrl("")
        showSuccess("Receipt submitted", "Receipt is waiting for finance review.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not submit receipt",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function reviewReceipt(receipt: MemberPaymentReceiptRow) {
    const nextDecision = decisionByReceiptId[receipt.id] ?? "under_review"
    const nextAllocations =
      reviewAllocationsByReceiptId[receipt.id] ??
      receipt.allocations.map(draftFromAllocation)

    startTransition(async () => {
      try {
        await reviewMemberPaymentReceiptAction(
          objectToFormData({
            adjustedAllocationsJson: JSON.stringify(
              toAllocationPayload(nextAllocations)
            ),
            adjustmentReason: adjustmentReasonByReceiptId[receipt.id] ?? "",
            decision: nextDecision,
            receiptId: receipt.id,
            reviewNotes: reviewNotesByReceiptId[receipt.id] ?? "",
          })
        )
        showSuccess("Receipt reviewed", "Receipt status was updated.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not review receipt",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function openReceiptSupportCase(receipt: MemberPaymentReceiptRow) {
    const supportDescription =
      supportDescriptionByReceiptId[receipt.id]?.trim() ||
      `Please review this payment receipt for ${formatCurrency(
        receipt.totalAmount
      )} paid on ${formatDate(receipt.paidAt)}.`

    startTransition(async () => {
      try {
        await createSupportCaseAction(
          objectToFormData({
            category: "payment_issue",
            description: supportDescription,
            linkedRecordId: receipt.id,
            linkedRecordType: "receipt",
            memberId: receipt.memberId,
            moneyImpactRequested: true,
            priority: "normal",
            subject: "Payment receipt issue",
          })
        )
        setSupportDescriptionByReceiptId((current) => {
          const next = { ...current }
          delete next[receipt.id]
          return next
        })
        showSuccess("Case opened", "The receipt is linked to a support case.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not open support case",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Pending" value={summary.pendingReviewReceipts} />
        <SummaryTile label="Submitted" value={summary.submittedReceipts} />
        <SummaryTile label="Corrections" value={summary.correctionRequestedReceipts} />
        <SummaryTile label="Approved" value={summary.approvedReceipts} />
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Stage payment receipt
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Save transfer proof and allocation intent before finance approval.
            </p>
          </div>
          <p className="text-sm font-medium text-foreground">
            {formatCurrency(totalAmount)}
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Member">
            <LabeledSelectInput
              disabled={isPending}
              onValueChange={setMemberId}
              options={memberOptions}
              value={memberId}
            />
          </Field>
          <Field label="Paid date">
            <Input
              disabled={isPending}
              onChange={(event) => setPaidAt(event.target.value)}
              type="date"
              value={paidAt}
            />
          </Field>
          <Field label="Channel">
            <LabeledSelectInput
              disabled={isPending}
              onValueChange={setChannel}
              options={[
                { label: "Transfer", value: "transfer" },
                { label: "Cash", value: "cash" },
                { label: "Payroll", value: "payroll" },
                { label: "Manual", value: "manual" },
              ]}
              value={channel}
            />
          </Field>
          <Field label="Payment reference">
            <Input
              disabled={isPending}
              onChange={(event) => setPaymentReference(event.target.value)}
              value={paymentReference}
            />
          </Field>
          <Field label="Proof name">
            <Input
              disabled={isPending}
              onChange={(event) => setProofDocumentName(event.target.value)}
              value={proofDocumentName}
            />
          </Field>
          <Field label="Proof upload">
            <UploadEvidenceInput
              disabled={isPending}
              fileName={proofDocumentName}
              onUploaded={(upload) => {
                setProofDocumentName(upload.fileName)
                setProofDocumentUrl(upload.url)
              }}
              purpose="payment_receipt_proof"
              value={proofDocumentUrl}
            />
          </Field>
          <Field label="Proof URL">
            <Input
              disabled={isPending}
              onChange={(event) => setProofDocumentUrl(event.target.value)}
              value={proofDocumentUrl}
            />
          </Field>
          <Field label="Member note">
            <Input
              disabled={isPending}
              onChange={(event) => setMemberNotes(event.target.value)}
              value={memberNotes}
            />
          </Field>
        </div>

        <div className="mt-4 space-y-3">
          {allocations.map((allocation, index) => (
            <AllocationEditor
              allocation={allocation}
              categoryOptions={categoryOptions}
              commitmentPlans={selectedMemberPlans}
              disabled={isPending}
              foodPurchaseApplications={selectedMemberFoodPurchaseApplications}
              key={index}
              loans={selectedMemberLoans}
              onChange={(patch) => updateAllocation(index, patch)}
              onRemove={
                allocations.length > 1
                  ? () =>
                      setAllocations((current) =>
                        current.filter((_, currentIndex) => currentIndex !== index)
                      )
                  : undefined
              }
              projectFinancingRequests={selectedMemberProjectFinancingRequests}
              procurementSchedules={selectedMemberProcurementSchedules}
            />
          ))}
          <Button
            disabled={isPending}
            onClick={() =>
              setAllocations((current) => [...current, emptyAllocation()])
            }
            type="button"
            variant="outline"
          >
            Add allocation
          </Button>
        </div>

        <div className="mt-4 flex justify-end">
          <Button disabled={isPending || !memberId || totalAmount <= 0} onClick={createReceipt}>
            Submit receipt
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {receipts.length ? (
          receipts.map((receipt) => {
            const reviewAllocations =
              reviewAllocationsByReceiptId[receipt.id] ??
              receipt.allocations.map(draftFromAllocation)
            const receiptLoans = loans
              .filter((loan) => loan.memberId === receipt.memberId)
              .map((loan) => ({ label: loan.label, value: loan.id }))
            const receiptPlans = commitmentPlans
              .filter((plan) => plan.memberId === receipt.memberId)
              .map((plan) => ({ label: plan.label, value: plan.id }))
            const receiptFoodPurchaseApplications = foodPurchaseApplications
              .filter((application) => application.memberId === receipt.memberId)
              .map((application) => ({
                label: application.label,
                value: application.id,
              }))
            const receiptProjectFinancingRequests = projectFinancingRequests
              .filter((request) => request.memberId === receipt.memberId)
              .map((request) => ({ label: request.label, value: request.id }))
            const receiptProcurementSchedules = procurementSchedules
              .filter((schedule) => schedule.memberId === receipt.memberId)
              .map((schedule) => ({ label: schedule.label, value: schedule.id }))

            return (
              <article
                className="rounded-lg border border-border bg-card p-4"
                key={receipt.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {receipt.member.fullName}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusTone(receipt.status)}`}
                      >
                        {labelFromValue(receipt.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {receipt.member.memberNumber} - paid {formatDate(receipt.paidAt)} - {formatCurrency(receipt.totalAmount)}
                    </p>
                    {receipt.paymentReference ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ref: {receipt.paymentReference}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Submitted {formatDate(receipt.submittedAt)}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {reviewAllocations.map((allocation, index) => (
                    <AllocationEditor
                      allocation={allocation}
                      categoryOptions={categoryOptions}
                      commitmentPlans={receiptPlans}
                      disabled={
                        isPending ||
                        receipt.status === "approved" ||
                        receipt.status === "rejected"
                      }
                      foodPurchaseApplications={receiptFoodPurchaseApplications}
                      key={`${receipt.id}-${index}`}
                      loans={receiptLoans}
                      onChange={(patch) =>
                        updateReviewAllocation(receipt, index, patch)
                      }
                      projectFinancingRequests={receiptProjectFinancingRequests}
                      procurementSchedules={receiptProcurementSchedules}
                    />
                  ))}
                </div>

                {receipt.status === "approved" || receipt.status === "rejected" ? null : (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Field label="Decision">
                      <LabeledSelectInput
                        disabled={isPending}
                        onValueChange={(value) =>
                          setDecisionByReceiptId((current) => ({
                            ...current,
                            [receipt.id]: value as ReceiptDecision,
                          }))
                        }
                        options={decisionOptions}
                        value={decisionByReceiptId[receipt.id] ?? "under_review"}
                      />
                    </Field>
                    <Field label="Adjustment reason">
                      <Input
                        disabled={isPending}
                        onChange={(event) =>
                          setAdjustmentReasonByReceiptId((current) => ({
                            ...current,
                            [receipt.id]: event.target.value,
                          }))
                        }
                        value={adjustmentReasonByReceiptId[receipt.id] ?? ""}
                      />
                    </Field>
                    <Field label="Review note">
                      <Textarea
                        disabled={isPending}
                        onChange={(event) =>
                          setReviewNotesByReceiptId((current) => ({
                            ...current,
                            [receipt.id]: event.target.value,
                          }))
                        }
                        value={reviewNotesByReceiptId[receipt.id] ?? ""}
                      />
                    </Field>
                    <div className="md:col-span-3">
                      <Button disabled={isPending} onClick={() => reviewReceipt(receipt)}>
                        Save review
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-4 border-t border-border pt-4">
                  <Field label="Support note">
                    <Textarea
                      disabled={isPending}
                      onChange={(event) =>
                        setSupportDescriptionByReceiptId((current) => ({
                          ...current,
                          [receipt.id]: event.target.value,
                        }))
                      }
                      placeholder="Describe the payment mistake or receipt issue"
                      value={supportDescriptionByReceiptId[receipt.id] ?? ""}
                    />
                  </Field>
                  <div className="mt-3 flex justify-end">
                    <Button
                      disabled={isPending}
                      onClick={() => openReceiptSupportCase(receipt)}
                      type="button"
                      variant="outline"
                    >
                      Open support case
                    </Button>
                  </div>
                </div>
              </article>
            )
          })
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No payment receipts have been submitted yet.
          </div>
        )}
      </section>
    </div>
  )
}

export function MemberPaymentReceiptsView({
  canCreateReceipt,
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  loans,
  member,
  projectFinancingRequests,
  procurementSchedules,
  receipts,
  summary,
}: {
  canCreateReceipt: boolean
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: Option[]
  foodPurchaseApplications: Option[]
  loans: Option[]
  member: {
    fullName: string
    id: string
    memberNumber: string
  }
  projectFinancingRequests: Option[]
  procurementSchedules: Option[]
  receipts: MemberPaymentReceiptRow[]
  summary: MemberPaymentReceiptSummary
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [channel, setChannel] = useState("transfer")
  const [paymentReference, setPaymentReference] = useState("")
  const [proofDocumentName, setProofDocumentName] = useState("")
  const [proofDocumentUrl, setProofDocumentUrl] = useState("")
  const [memberNotes, setMemberNotes] = useState("")
  const [supportDescriptionByReceiptId, setSupportDescriptionByReceiptId] =
    useState<Record<string, string>>({})
  const [allocations, setAllocations] = useState<AllocationDraft[]>([
    emptyAllocation(),
  ])
  const planOptions = useMemo(
    () =>
      commitmentPlans
        .filter((plan) => plan.memberId === member.id)
        .map((plan) => ({ label: plan.label, value: plan.id })),
    [commitmentPlans, member.id]
  )
  const loanOptions = useMemo(
    () =>
      loans
        .filter((loan) => loan.memberId === member.id)
        .map((loan) => ({ label: loan.label, value: loan.id })),
    [loans, member.id]
  )
  const foodPurchaseApplicationOptions = useMemo(
    () =>
      foodPurchaseApplications
        .filter((application) => application.memberId === member.id)
        .map((application) => ({
          label: application.label,
          value: application.id,
        })),
    [foodPurchaseApplications, member.id]
  )
  const projectFinancingRequestOptions = useMemo(
    () =>
      projectFinancingRequests
        .filter((request) => request.memberId === member.id)
        .map((request) => ({ label: request.label, value: request.id })),
    [member.id, projectFinancingRequests]
  )
  const procurementScheduleOptions = useMemo(
    () =>
      procurementSchedules
        .filter((schedule) => schedule.memberId === member.id)
        .map((schedule) => ({ label: schedule.label, value: schedule.id })),
    [member.id, procurementSchedules]
  )
  const totalAmount = allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amount || 0),
    0
  )

  function updateAllocation(index: number, patch: Partial<AllocationDraft>) {
    setAllocations((current) =>
      current.map((allocation, currentIndex) =>
        currentIndex === index ? { ...allocation, ...patch } : allocation
      )
    )
  }

  function createReceipt() {
    startTransition(async () => {
      try {
        await createOwnMemberPaymentReceiptAction(
          objectToFormData({
            allocationsJson: JSON.stringify(toAllocationPayload(allocations)),
            channel,
            memberNotes,
            paidAt,
            paymentReference,
            proofDocumentName,
            proofDocumentUrl,
            totalAmount,
          })
        )
        setAllocations([emptyAllocation()])
        setMemberNotes("")
        setPaymentReference("")
        setProofDocumentName("")
        setProofDocumentUrl("")
        showSuccess("Receipt submitted", "Your receipt is waiting for review.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not submit receipt",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function openReceiptSupportCase(receipt: MemberPaymentReceiptRow) {
    const supportDescription =
      supportDescriptionByReceiptId[receipt.id]?.trim() ||
      `Please review my payment receipt for ${formatCurrency(
        receipt.totalAmount
      )} paid on ${formatDate(receipt.paidAt)}.`

    startTransition(async () => {
      try {
        await createMemberSupportCaseAction(
          objectToFormData({
            category: "payment_issue",
            description: supportDescription,
            linkedRecordId: receipt.id,
            linkedRecordType: "receipt",
            moneyImpactRequested: true,
            subject: "Payment receipt issue",
          })
        )
        setSupportDescriptionByReceiptId((current) => {
          const next = { ...current }
          delete next[receipt.id]
          return next
        })
        showSuccess("Case opened", "Your receipt is linked to a support case.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not open support case",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Pending" value={summary.pendingReviewReceipts} />
        <SummaryTile
          label="Corrections"
          value={summary.correctionRequestedReceipts}
        />
        <SummaryTile label="Approved" value={summary.approvedReceipts} />
        <SummaryTile label="Rejected" value={summary.rejectedReceipts} />
      </section>

      {canCreateReceipt ? (
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Submit payment receipt
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
          <p className="text-sm font-medium text-foreground">
            {formatCurrency(totalAmount)}
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Paid date">
            <Input
              disabled={isPending}
              onChange={(event) => setPaidAt(event.target.value)}
              type="date"
              value={paidAt}
            />
          </Field>
          <Field label="Channel">
            <LabeledSelectInput
              disabled={isPending}
              onValueChange={setChannel}
              options={[
                { label: "Transfer", value: "transfer" },
                { label: "Cash", value: "cash" },
                { label: "Payroll", value: "payroll" },
                { label: "Manual", value: "manual" },
              ]}
              value={channel}
            />
          </Field>
          <Field label="Payment reference">
            <Input
              disabled={isPending}
              onChange={(event) => setPaymentReference(event.target.value)}
              value={paymentReference}
            />
          </Field>
          <Field label="Proof name">
            <Input
              disabled={isPending}
              onChange={(event) => setProofDocumentName(event.target.value)}
              value={proofDocumentName}
            />
          </Field>
          <Field label="Proof upload">
            <UploadEvidenceInput
              disabled={isPending}
              fileName={proofDocumentName}
              onUploaded={(upload) => {
                setProofDocumentName(upload.fileName)
                setProofDocumentUrl(upload.url)
              }}
              purpose="payment_receipt_proof"
              value={proofDocumentUrl}
            />
          </Field>
          <Field label="Proof URL">
            <Input
              disabled={isPending}
              onChange={(event) => setProofDocumentUrl(event.target.value)}
              value={proofDocumentUrl}
            />
          </Field>
          <Field label="Note">
            <Input
              disabled={isPending}
              onChange={(event) => setMemberNotes(event.target.value)}
              value={memberNotes}
            />
          </Field>
        </div>

        <div className="mt-4 space-y-3">
          {allocations.map((allocation, index) => (
            <AllocationEditor
              allocation={allocation}
              categoryOptions={categoryOptions}
              commitmentPlans={planOptions}
              disabled={isPending}
              foodPurchaseApplications={foodPurchaseApplicationOptions}
              key={index}
              loans={loanOptions}
              onChange={(patch) => updateAllocation(index, patch)}
              onRemove={
                allocations.length > 1
                  ? () =>
                      setAllocations((current) =>
                        current.filter(
                          (_, currentIndex) => currentIndex !== index
                        )
                      )
                  : undefined
              }
              projectFinancingRequests={projectFinancingRequestOptions}
              procurementSchedules={procurementScheduleOptions}
            />
          ))}
          <Button
            disabled={isPending}
            onClick={() =>
              setAllocations((current) => [...current, emptyAllocation()])
            }
            type="button"
            variant="outline"
          >
            Add allocation
          </Button>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            disabled={isPending || totalAmount <= 0}
            onClick={createReceipt}
          >
            Submit receipt
          </Button>
        </div>
      </section>
      ) : null}

      <section className="space-y-3">
        {receipts.length ? (
          receipts.map((receipt) => (
            <article
              className="rounded-lg border border-border bg-card p-4"
              key={receipt.id}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {formatCurrency(receipt.totalAmount)}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusTone(receipt.status)}`}
                    >
                      {labelFromValue(receipt.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Paid {formatDate(receipt.paidAt)} - submitted{" "}
                    {formatDate(receipt.submittedAt)}
                  </p>
                  {receipt.paymentReference ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ref: {receipt.paymentReference}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {receipt.allocations.map((allocation) => (
                  <div
                    className="rounded-md border border-border p-3 text-sm"
                    key={allocation.id}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-foreground">
                        {labelFromValue(allocation.category)}
                      </p>
                      <p className="text-muted-foreground">
                        {formatCurrency(allocation.amount)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {labelFromValue(allocation.periodIntent)}
                      {allocation.targetPeriodStart
                        ? ` - ${formatDate(allocation.targetPeriodStart)}`
                        : ""}
                    </p>
                    {allocation.notes ? (
                      <p className="mt-2 text-sm text-foreground">
                        {allocation.notes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              {receipt.reviewNotes ? (
                <div className="mt-4 rounded-md border border-border p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">
                    Review note
                  </p>
                  <p className="mt-1 text-foreground">{receipt.reviewNotes}</p>
                </div>
              ) : null}

              <div className="mt-4 border-t border-border pt-4">
                <Field label="Support note">
                  <Textarea
                    disabled={isPending}
                    onChange={(event) =>
                      setSupportDescriptionByReceiptId((current) => ({
                        ...current,
                        [receipt.id]: event.target.value,
                      }))
                    }
                    placeholder="Describe the payment mistake or receipt issue"
                    value={supportDescriptionByReceiptId[receipt.id] ?? ""}
                  />
                </Field>
                <div className="mt-3 flex justify-end">
                  <Button
                    disabled={isPending}
                    onClick={() => openReceiptSupportCase(receipt)}
                    type="button"
                    variant="outline"
                  >
                    Open support case
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No payment receipts have been submitted for this member profile.
          </div>
        )}
      </section>
    </div>
  )
}

function AllocationEditor({
  allocation,
  categoryOptions,
  commitmentPlans,
  disabled,
  foodPurchaseApplications,
  loans,
  onChange,
  onRemove,
  projectFinancingRequests,
  procurementSchedules,
}: {
  allocation: AllocationDraft
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: Array<{ label: string; value: string }>
  disabled?: boolean
  foodPurchaseApplications: Array<{ label: string; value: string }>
  loans: Array<{ label: string; value: string }>
  onChange: (patch: Partial<AllocationDraft>) => void
  onRemove?: () => void
  projectFinancingRequests: Array<{ label: string; value: string }>
  procurementSchedules: Array<{ label: string; value: string }>
}) {
  const visibleCategoryOptions = categoryOptions.some(
    (option) => option.value === allocation.category
  )
    ? categoryOptions
    : [
        ...categoryOptions,
        {
          label: categoryLabels[allocation.category],
          value: allocation.category,
        },
      ]

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-2 xl:grid-cols-9">
      <Field label="Category">
        <LabeledSelectInput
          disabled={disabled}
          onValueChange={(value) =>
            onChange({ category: value as AllocationCategory })
          }
          options={visibleCategoryOptions}
          value={allocation.category}
        />
      </Field>
      <Field label="Amount">
        <Input
          disabled={disabled}
          min="0"
          onChange={(event) => onChange({ amount: event.target.value })}
          step="0.01"
          type="number"
          value={allocation.amount}
        />
      </Field>
      <Field label="Target month">
        <Input
          disabled={disabled}
          onChange={(event) => onChange({ targetMonth: event.target.value })}
          type="month"
          value={allocation.targetMonth}
        />
      </Field>
      <Field label="Period">
        <LabeledSelectInput
          disabled={disabled}
          onValueChange={(value) =>
            onChange({ periodIntent: value as PeriodIntent })
          }
          options={periodOptions}
          value={allocation.periodIntent}
        />
      </Field>
      <Field label="Plan">
        <LabeledSelectInput
          disabled={disabled}
          onValueChange={(value) => onChange({ contributionPlanId: value })}
          options={[{ label: "Auto", value: "" }, ...commitmentPlans]}
          value={allocation.contributionPlanId}
        />
      </Field>
      <Field label="Loan">
        <LabeledSelectInput
          disabled={disabled}
          onValueChange={(value) => onChange({ loanId: value })}
          options={[{ label: "None", value: "" }, ...loans]}
          value={allocation.loanId}
        />
      </Field>
      <Field label="Procurement">
        <LabeledSelectInput
          disabled={disabled}
          onValueChange={(value) =>
            onChange({ procurementRepaymentScheduleItemId: value })
          }
          options={[{ label: "None", value: "" }, ...procurementSchedules]}
          value={allocation.procurementRepaymentScheduleItemId}
        />
      </Field>
      <Field label="Foodstuff Purchase">
        <LabeledSelectInput
          disabled={disabled}
          onValueChange={(value) =>
            onChange({ foodPurchaseApplicationId: value })
          }
          options={[{ label: "None", value: "" }, ...foodPurchaseApplications]}
          value={allocation.foodPurchaseApplicationId}
        />
      </Field>
      <Field label="Project financing">
        <LabeledSelectInput
          disabled={disabled}
          onValueChange={(value) =>
            onChange({ projectFinancingRequestId: value })
          }
          options={[{ label: "None", value: "" }, ...projectFinancingRequests]}
          value={allocation.projectFinancingRequestId}
        />
      </Field>
      <div className="md:col-span-2 xl:col-span-9">
        <Field label="Allocation note">
          <Input
            disabled={disabled}
            onChange={(event) => onChange({ notes: event.target.value })}
            value={allocation.notes}
          />
        </Field>
      </div>
      {onRemove ? (
        <div className="md:col-span-2 xl:col-span-9">
          <Button
            disabled={disabled}
            onClick={onRemove}
            size="sm"
            type="button"
            variant="ghost"
          >
            Remove allocation
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

function Field({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
