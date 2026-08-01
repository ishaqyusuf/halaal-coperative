"use client"

import { useMemo, useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import { DialogFooter } from "@halaalvest/ui/components/dialog"
import {
  Field as FormField,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@halaalvest/ui/components/field"
import { Input } from "@halaalvest/ui/components/input"
import { ScrollArea } from "@halaalvest/ui/components/scroll-area"
import { Separator } from "@halaalvest/ui/components/separator"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { Textarea } from "@halaalvest/ui/components/textarea"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@halaalvest/ui/components/toggle-group"
import { formatCurrency } from "@halaalvest/utils"
import type {
  MemberPaymentReceiptAllocationRow,
  MemberPaymentReceiptRow,
} from "@halaalvest/db"
import { ExternalLinkIcon } from "lucide-react"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { UploadEvidenceInput } from "@/components/upload-evidence-input"
import {
  createMemberPaymentReceiptAction,
  createMemberSupportCaseAction,
  createOwnMemberPaymentReceiptAction,
  createSupportCaseAction,
  reviewMemberPaymentReceiptAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import type { PaymentReceiptCategoryOption } from "@/lib/payment-receipts/load-payment-receipts-page"

export type PaymentReceiptOption = {
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

const decisionGuidance: Record<
  ReceiptDecision,
  { description: string; title: string }
> = {
  approved: {
    description:
      "The verified allocations will post through their supported ledgers. This changes the member's financial position.",
    title: "Approve and post this receipt",
  },
  correction_requested: {
    description:
      "No balance will change. The member will be asked to correct the receipt using your review note.",
    title: "Return this receipt for correction",
  },
  rejected: {
    description:
      "The receipt will be closed without posting any allocation. A review note is required.",
    title: "Reject this receipt",
  },
  under_review: {
    description:
      "Keep the receipt in the finance queue while evidence or allocation details are still being checked.",
    title: "Continue reviewing this receipt",
  },
}

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

function toAllocationPayload(allocations: AllocationDraft[]) {
  return allocations
    .filter((allocation) => Number(allocation.amount) > 0)
    .map((allocation) => ({
      amount: Number(allocation.amount),
      category: allocation.category,
      contributionPlanId:
        allocation.category === "commitment" ||
        allocation.category === "special_savings"
          ? allocation.contributionPlanId || null
          : null,
      foodPurchaseApplicationId:
        allocation.category === "food_purchase"
          ? allocation.foodPurchaseApplicationId || null
          : null,
      loanId:
        allocation.category === "loan_servicing" ||
        allocation.category === "loan_extra_payment"
          ? allocation.loanId || null
          : null,
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

function selectOptionsForMember(
  options: PaymentReceiptOption[],
  memberId: string
) {
  return options
    .filter((option) => !memberId || option.memberId === memberId)
    .map((option) => ({ label: option.label, value: option.id }))
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function PaymentReceiptCreateContent({
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  loans,
  members,
  onClose,
  projectFinancingRequests,
  procurementSchedules,
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  loans: PaymentReceiptOption[]
  members: PaymentReceiptOption[]
  onClose: () => void
  projectFinancingRequests: PaymentReceiptOption[]
  procurementSchedules: PaymentReceiptOption[]
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
  const selectedMemberPlans = useMemo(
    () => selectOptionsForMember(commitmentPlans, memberId),
    [commitmentPlans, memberId]
  )
  const selectedMemberLoans = useMemo(
    () => selectOptionsForMember(loans, memberId),
    [loans, memberId]
  )
  const selectedMemberFoodPurchaseApplications = useMemo(
    () => selectOptionsForMember(foodPurchaseApplications, memberId),
    [foodPurchaseApplications, memberId]
  )
  const selectedMemberProjectFinancingRequests = useMemo(
    () => selectOptionsForMember(projectFinancingRequests, memberId),
    [memberId, projectFinancingRequests]
  )
  const selectedMemberProcurementSchedules = useMemo(
    () => selectOptionsForMember(procurementSchedules, memberId),
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
        onClose()
        showSuccess(
          "Receipt submitted",
          "Receipt is waiting for finance review."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not submit receipt",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <p className="mb-4 text-sm font-medium text-foreground">
        Total: {formatCurrency(totalAmount)}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
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
                      current.filter(
                        (_, currentIndex) => currentIndex !== index
                      )
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
        <Button
          disabled={isPending || !memberId || totalAmount <= 0}
          onClick={createReceipt}
        >
          Submit receipt
        </Button>
      </div>
    </>
  )
}

export function PaymentReceiptReviewContent({
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  loans,
  onClose,
  projectFinancingRequests,
  procurementSchedules,
  receipt,
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  loans: PaymentReceiptOption[]
  onClose: () => void
  projectFinancingRequests: PaymentReceiptOption[]
  procurementSchedules: PaymentReceiptOption[]
  receipt: MemberPaymentReceiptRow
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [decision, setDecision] = useState<ReceiptDecision>("under_review")
  const [reviewNotes, setReviewNotes] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")
  const [allocations, setAllocations] = useState<AllocationDraft[]>(
    receipt.allocations.map(draftFromAllocation)
  )
  const originalAllocationSnapshot = useMemo(
    () =>
      JSON.stringify(
        toAllocationPayload(receipt.allocations.map(draftFromAllocation))
      ),
    [receipt.allocations]
  )
  const receiptLoans = useMemo(
    () => selectOptionsForMember(loans, receipt.memberId),
    [loans, receipt.memberId]
  )
  const receiptPlans = useMemo(
    () => selectOptionsForMember(commitmentPlans, receipt.memberId),
    [commitmentPlans, receipt.memberId]
  )
  const receiptFoodPurchaseApplications = useMemo(
    () => selectOptionsForMember(foodPurchaseApplications, receipt.memberId),
    [foodPurchaseApplications, receipt.memberId]
  )
  const receiptProjectFinancingRequests = useMemo(
    () => selectOptionsForMember(projectFinancingRequests, receipt.memberId),
    [projectFinancingRequests, receipt.memberId]
  )
  const receiptProcurementSchedules = useMemo(
    () => selectOptionsForMember(procurementSchedules, receipt.memberId),
    [procurementSchedules, receipt.memberId]
  )
  const allocationPayload = useMemo(
    () => toAllocationPayload(allocations),
    [allocations]
  )
  const allocationTotal = allocationPayload.reduce(
    (total, allocation) => total + allocation.amount,
    0
  )
  const isAllocationBalanced =
    Math.abs(allocationTotal - receipt.totalAmount) < 0.005
  const allocationsChanged =
    JSON.stringify(allocationPayload) !== originalAllocationSnapshot
  const requiresReviewNote =
    decision === "correction_requested" || decision === "rejected"
  const adjustmentReasonMissing = allocationsChanged && !adjustmentReason.trim()
  const reviewNoteMissing = requiresReviewNote && !reviewNotes.trim()
  const canSaveReview =
    !isPending &&
    isAllocationBalanced &&
    !adjustmentReasonMissing &&
    !reviewNoteMissing
  const guidance = decisionGuidance[decision]
  const actionLabel =
    decision === "approved"
      ? "Approve and post"
      : decision === "correction_requested"
        ? "Request correction"
        : decision === "rejected"
          ? "Reject receipt"
          : "Save as under review"

  function updateAllocation(index: number, patch: Partial<AllocationDraft>) {
    setAllocations((current) =>
      current.map((allocation, currentIndex) =>
        currentIndex === index ? { ...allocation, ...patch } : allocation
      )
    )
  }

  function reviewReceipt() {
    startTransition(async () => {
      try {
        await reviewMemberPaymentReceiptAction(
          objectToFormData({
            adjustedAllocationsJson: JSON.stringify(allocationPayload),
            adjustmentReason,
            decision,
            receiptId: receipt.id,
            reviewNotes,
          })
        )
        onClose()
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

  return (
    <div className="absolute inset-0 flex min-h-0 w-full flex-col overflow-hidden">
      <ScrollArea className="h-0 flex-1 overflow-hidden">
        <div className="flex flex-col gap-6 px-6 pt-5 pb-24">
          <section
            aria-labelledby="receipt-overview-heading"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    className="text-sm font-medium"
                    id="receipt-overview-heading"
                  >
                    {receipt.member.fullName}
                  </h3>
                  <Badge variant={receiptStatusVariant(receipt.status)}>
                    {receiptStatusLabel(receipt.status)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {receipt.member.memberNumber}
                  {receipt.member.email ? ` · ${receipt.member.email}` : ""}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground">Receipt amount</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatCurrency(receipt.totalAmount)}
                </p>
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ReceiptMetadata
                label="Paid"
                value={formatDate(receipt.paidAt)}
              />
              <ReceiptMetadata
                label="Channel"
                value={humanizeValue(receipt.channel)}
              />
              <ReceiptMetadata
                label="Reference"
                value={receipt.paymentReference || "Not provided"}
              />
              <ReceiptMetadata
                label="Submitted"
                value={formatDate(receipt.submittedAt)}
              />
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              {receipt.proofDocumentUrl ? (
                <Button
                  render={
                    <a
                      href={receipt.proofDocumentUrl}
                      rel="noreferrer"
                      target="_blank"
                    />
                  }
                  variant="outline"
                >
                  <ExternalLinkIcon data-icon="inline-start" />
                  {receipt.proofDocumentName || "Open payment proof"}
                </Button>
              ) : (
                <Badge variant="destructive">Payment proof missing</Badge>
              )}
            </div>

            {receipt.memberNotes ? (
              <Alert>
                <AlertTitle>Member note</AlertTitle>
                <AlertDescription>{receipt.memberNotes}</AlertDescription>
              </Alert>
            ) : null}
          </section>

          <Separator />

          <section
            aria-labelledby="receipt-allocation-heading"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3
                  className="text-sm font-medium"
                  id="receipt-allocation-heading"
                >
                  Verify allocations
                </h3>
                <p className="text-xs text-muted-foreground">
                  Confirm where the receipt should post before making a
                  decision.
                </p>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatCurrency(allocationTotal)} of{" "}
                {formatCurrency(receipt.totalAmount)} allocated
              </p>
            </div>

            {!isAllocationBalanced ? (
              <Alert variant="destructive">
                <AlertTitle>Allocation total does not match</AlertTitle>
                <AlertDescription>
                  Adjust the allocation amounts until they equal{" "}
                  {formatCurrency(receipt.totalAmount)}. The review cannot be
                  saved while the totals differ.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3">
              {allocations.map((allocation, index) => (
                <ReviewAllocationEditor
                  allocation={allocation}
                  categoryOptions={categoryOptions}
                  commitmentPlans={receiptPlans}
                  disabled={isPending}
                  foodPurchaseApplications={receiptFoodPurchaseApplications}
                  index={index}
                  key={`${receipt.id}-${index}`}
                  loans={receiptLoans}
                  onChange={(patch) => updateAllocation(index, patch)}
                  projectFinancingRequests={receiptProjectFinancingRequests}
                  procurementSchedules={receiptProcurementSchedules}
                />
              ))}
            </div>
          </section>

          <Separator />

          <section
            aria-labelledby="receipt-decision-heading"
            className="flex flex-col gap-4"
          >
            <div>
              <h3 className="text-sm font-medium" id="receipt-decision-heading">
                Review decision
              </h3>
              <p className="text-xs text-muted-foreground">
                Choose the next state and leave clear evidence for the member
                and finance team.
              </p>
            </div>

            <FieldSet>
              <FieldLegend variant="label">Decision</FieldLegend>
              <ToggleGroup
                aria-label="Receipt decision"
                className="grid w-full grid-cols-2 sm:grid-cols-4"
                disabled={isPending}
                onValueChange={(values) => {
                  const nextDecision = values[0]
                  if (nextDecision) {
                    setDecision(nextDecision as ReceiptDecision)
                  }
                }}
                value={[decision]}
                variant="outline"
              >
                {decisionOptions.map((option) => (
                  <ToggleGroupItem
                    className="w-full"
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </FieldSet>

            <Alert
              variant={decision === "rejected" ? "destructive" : "default"}
            >
              <AlertTitle>{guidance.title}</AlertTitle>
              <AlertDescription>{guidance.description}</AlertDescription>
            </Alert>

            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              {allocationsChanged ? (
                <FormField
                  className="sm:col-span-2"
                  data-invalid={adjustmentReasonMissing}
                >
                  <FieldLabel htmlFor="receipt-adjustment-reason">
                    Adjustment reason
                  </FieldLabel>
                  <Input
                    aria-invalid={adjustmentReasonMissing}
                    disabled={isPending}
                    id="receipt-adjustment-reason"
                    onChange={(event) =>
                      setAdjustmentReason(event.target.value)
                    }
                    placeholder="Explain why the submitted allocation changed"
                    value={adjustmentReason}
                  />
                  <FieldDescription>
                    Required because one or more submitted allocation values
                    were changed.
                  </FieldDescription>
                  {adjustmentReasonMissing ? (
                    <FieldError>Enter an adjustment reason.</FieldError>
                  ) : null}
                </FormField>
              ) : null}

              <FormField
                className="sm:col-span-2"
                data-invalid={reviewNoteMissing}
              >
                <FieldLabel htmlFor="receipt-review-note">
                  Review note
                  {requiresReviewNote ? " (required)" : " (optional)"}
                </FieldLabel>
                <Textarea
                  aria-invalid={reviewNoteMissing}
                  disabled={isPending}
                  id="receipt-review-note"
                  onChange={(event) => setReviewNotes(event.target.value)}
                  placeholder={
                    requiresReviewNote
                      ? "Explain what the member needs to correct or why the receipt was rejected"
                      : "Add context for the member and finance audit trail"
                  }
                  value={reviewNotes}
                />
                {reviewNoteMissing ? (
                  <FieldError>
                    A review note is required for this decision.
                  </FieldError>
                ) : null}
              </FormField>
            </FieldGroup>
          </section>
        </div>
      </ScrollArea>

      <div className="absolute inset-x-0 bottom-0 bg-popover">
        <Separator />
        <DialogFooter className="px-6 py-4 sm:justify-between">
          <Button disabled={isPending} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!canSaveReview}
            onClick={reviewReceipt}
            variant={decision === "rejected" ? "destructive" : "default"}
          >
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            {isPending ? "Saving review..." : actionLabel}
          </Button>
        </DialogFooter>
      </div>
    </div>
  )
}

function ReceiptMetadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-xs font-medium">{value}</dd>
    </div>
  )
}

function humanizeValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function receiptStatusLabel(status: MemberPaymentReceiptRow["status"]) {
  return humanizeValue(status)
}

function receiptStatusVariant(
  status: MemberPaymentReceiptRow["status"]
): "default" | "destructive" | "outline" | "secondary" {
  if (status === "approved") return "default"
  if (status === "rejected" || status === "correction_requested") {
    return "destructive"
  }
  if (status === "under_review") return "secondary"
  return "outline"
}

function ReviewAllocationEditor({
  allocation,
  categoryOptions,
  commitmentPlans,
  disabled,
  foodPurchaseApplications,
  index,
  loans,
  onChange,
  projectFinancingRequests,
  procurementSchedules,
}: {
  allocation: AllocationDraft
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: Array<{ label: string; value: string }>
  disabled?: boolean
  foodPurchaseApplications: Array<{ label: string; value: string }>
  index: number
  loans: Array<{ label: string; value: string }>
  onChange: (patch: Partial<AllocationDraft>) => void
  projectFinancingRequests: Array<{ label: string; value: string }>
  procurementSchedules: Array<{ label: string; value: string }>
}) {
  const idPrefix = `receipt-allocation-${index}`
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
  const showsContributionPlan =
    allocation.category === "commitment" ||
    allocation.category === "special_savings"
  const showsLoan =
    allocation.category === "loan_servicing" ||
    allocation.category === "loan_extra_payment"
  const showsProcurement = allocation.category === "procurement"
  const showsFoodPurchase = allocation.category === "food_purchase"
  const showsProjectFinancing = allocation.category === "project_financing"

  return (
    <FieldSet className="rounded-none border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <FieldLegend className="mb-0">Allocation {index + 1}</FieldLegend>
        <Badge variant="outline">
          {formatCurrency(Number(allocation.amount || 0))}
        </Badge>
      </div>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <FormField>
          <FieldLabel htmlFor={`${idPrefix}-category`}>Category</FieldLabel>
          <LabeledSelectInput
            disabled={disabled}
            id={`${idPrefix}-category`}
            onValueChange={(value) =>
              onChange({ category: value as AllocationCategory })
            }
            options={visibleCategoryOptions}
            value={allocation.category}
          />
        </FormField>

        <FormField>
          <FieldLabel htmlFor={`${idPrefix}-amount`}>Amount</FieldLabel>
          <CurrencyInput
            allowNegative={false}
            decimalScale={2}
            disabled={disabled}
            id={`${idPrefix}-amount`}
            onValueChange={(values) => onChange({ amount: values.value })}
            value={allocation.amount}
          />
        </FormField>

        <FormField>
          <FieldLabel htmlFor={`${idPrefix}-target-month`}>
            Target month
          </FieldLabel>
          <Input
            disabled={disabled}
            id={`${idPrefix}-target-month`}
            onChange={(event) => onChange({ targetMonth: event.target.value })}
            type="month"
            value={allocation.targetMonth}
          />
        </FormField>

        <FormField>
          <FieldLabel htmlFor={`${idPrefix}-period`}>Period</FieldLabel>
          <LabeledSelectInput
            disabled={disabled}
            id={`${idPrefix}-period`}
            onValueChange={(value) =>
              onChange({ periodIntent: value as PeriodIntent })
            }
            options={periodOptions}
            value={allocation.periodIntent}
          />
        </FormField>

        {showsContributionPlan ? (
          <FormField className="sm:col-span-2">
            <FieldLabel htmlFor={`${idPrefix}-plan`}>
              Contribution plan
            </FieldLabel>
            <LabeledSelectInput
              disabled={disabled}
              id={`${idPrefix}-plan`}
              onValueChange={(value) => onChange({ contributionPlanId: value })}
              options={[
                { label: "Use active plan", value: "" },
                ...commitmentPlans,
              ]}
              value={allocation.contributionPlanId}
            />
          </FormField>
        ) : null}

        {showsLoan ? (
          <FormField className="sm:col-span-2">
            <FieldLabel htmlFor={`${idPrefix}-loan`}>Loan</FieldLabel>
            <LabeledSelectInput
              disabled={disabled}
              id={`${idPrefix}-loan`}
              onValueChange={(value) => onChange({ loanId: value })}
              options={[{ label: "Select loan", value: "" }, ...loans]}
              value={allocation.loanId}
            />
          </FormField>
        ) : null}

        {showsProcurement ? (
          <FormField className="sm:col-span-2">
            <FieldLabel htmlFor={`${idPrefix}-procurement`}>
              Procurement repayment
            </FieldLabel>
            <LabeledSelectInput
              disabled={disabled}
              id={`${idPrefix}-procurement`}
              onValueChange={(value) =>
                onChange({ procurementRepaymentScheduleItemId: value })
              }
              options={[
                { label: "Select repayment item", value: "" },
                ...procurementSchedules,
              ]}
              value={allocation.procurementRepaymentScheduleItemId}
            />
          </FormField>
        ) : null}

        {showsFoodPurchase ? (
          <FormField className="sm:col-span-2">
            <FieldLabel htmlFor={`${idPrefix}-food-purchase`}>
              Foodstuff Purchase application
            </FieldLabel>
            <LabeledSelectInput
              disabled={disabled}
              id={`${idPrefix}-food-purchase`}
              onValueChange={(value) =>
                onChange({ foodPurchaseApplicationId: value })
              }
              options={[
                { label: "Select application", value: "" },
                ...foodPurchaseApplications,
              ]}
              value={allocation.foodPurchaseApplicationId}
            />
          </FormField>
        ) : null}

        {showsProjectFinancing ? (
          <FormField className="sm:col-span-2">
            <FieldLabel htmlFor={`${idPrefix}-project-financing`}>
              Project financing request
            </FieldLabel>
            <LabeledSelectInput
              disabled={disabled}
              id={`${idPrefix}-project-financing`}
              onValueChange={(value) =>
                onChange({ projectFinancingRequestId: value })
              }
              options={[
                { label: "Select financing request", value: "" },
                ...projectFinancingRequests,
              ]}
              value={allocation.projectFinancingRequestId}
            />
          </FormField>
        ) : null}

        <FormField className="sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-note`}>Allocation note</FieldLabel>
          <Input
            disabled={disabled}
            id={`${idPrefix}-note`}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Optional allocation context"
            value={allocation.notes}
          />
        </FormField>
      </FieldGroup>
    </FieldSet>
  )
}

export function PaymentReceiptSupportCaseContent({
  onClose,
  receipt,
}: {
  onClose: () => void
  receipt: MemberPaymentReceiptRow
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [supportDescription, setSupportDescription] = useState("")

  function openReceiptSupportCase() {
    const description =
      supportDescription.trim() ||
      `Please review this payment receipt for ${formatCurrency(
        receipt.totalAmount
      )} paid on ${formatDate(receipt.paidAt)}.`

    startTransition(async () => {
      try {
        await createSupportCaseAction(
          objectToFormData({
            category: "payment_issue",
            description,
            linkedRecordId: receipt.id,
            linkedRecordType: "receipt",
            memberId: receipt.memberId,
            moneyImpactRequested: true,
            priority: "normal",
            subject: "Payment receipt issue",
          })
        )
        setSupportDescription("")
        onClose()
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
    <>
      <Field label="Support note">
        <Textarea
          disabled={isPending}
          onChange={(event) => setSupportDescription(event.target.value)}
          placeholder="Describe the payment mistake or receipt issue"
          value={supportDescription}
        />
      </Field>
      <div className="mt-3 flex justify-end">
        <Button
          disabled={isPending}
          onClick={openReceiptSupportCase}
          type="button"
        >
          Open support case
        </Button>
      </div>
    </>
  )
}

export function MemberPaymentReceiptCreateContent({
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  loans,
  member,
  onClose,
  projectFinancingRequests,
  procurementSchedules,
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  loans: PaymentReceiptOption[]
  member: {
    id: string
  }
  onClose: () => void
  projectFinancingRequests: PaymentReceiptOption[]
  procurementSchedules: PaymentReceiptOption[]
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
  const [allocations, setAllocations] = useState<AllocationDraft[]>([
    emptyAllocation(),
  ])
  const planOptions = useMemo(
    () => selectOptionsForMember(commitmentPlans, member.id),
    [commitmentPlans, member.id]
  )
  const loanOptions = useMemo(
    () => selectOptionsForMember(loans, member.id),
    [loans, member.id]
  )
  const foodPurchaseApplicationOptions = useMemo(
    () => selectOptionsForMember(foodPurchaseApplications, member.id),
    [foodPurchaseApplications, member.id]
  )
  const projectFinancingRequestOptions = useMemo(
    () => selectOptionsForMember(projectFinancingRequests, member.id),
    [member.id, projectFinancingRequests]
  )
  const procurementScheduleOptions = useMemo(
    () => selectOptionsForMember(procurementSchedules, member.id),
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
        onClose()
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

  return (
    <>
      <p className="mb-4 text-sm font-medium text-foreground">
        Total: {formatCurrency(totalAmount)}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
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
    </>
  )
}

export function MemberPaymentReceiptSupportCaseContent({
  onClose,
  receipt,
}: {
  onClose: () => void
  receipt: MemberPaymentReceiptRow
}) {
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [supportDescription, setSupportDescription] = useState("")

  function openReceiptSupportCase() {
    const description =
      supportDescription.trim() ||
      `Please review my payment receipt for ${formatCurrency(
        receipt.totalAmount
      )} paid on ${formatDate(receipt.paidAt)}.`

    startTransition(async () => {
      try {
        await createMemberSupportCaseAction(
          objectToFormData({
            category: "payment_issue",
            description,
            linkedRecordId: receipt.id,
            linkedRecordType: "receipt",
            moneyImpactRequested: true,
            subject: "Payment receipt issue",
          })
        )
        setSupportDescription("")
        onClose()
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
    <>
      <Field label="Support note">
        <Textarea
          disabled={isPending}
          onChange={(event) => setSupportDescription(event.target.value)}
          placeholder="Describe the payment mistake or receipt issue"
          value={supportDescription}
        />
      </Field>
      <div className="mt-3 flex justify-end">
        <Button
          disabled={isPending}
          onClick={openReceiptSupportCase}
          type="button"
        >
          Open support case
        </Button>
      </div>
    </>
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
