"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import {
  ContributionPlanCloseForm,
  ContributionPlanForm,
  ContributionPlanUpdateForm,
  MemberPaymentForm,
  MemberPaymentPreferenceForm,
} from "@/components/forms/finance-forms"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { useContributionParams } from "@/hooks/use-contribution-params"
import {
  postCollectionSourceContributionBatchRowsAction,
  stageCollectionSourceContributionBatchAction,
  updateCollectionSourceContributionBatchRowsAction,
} from "@/lib/dashboard-actions"

export type ContributionMemberOption = {
  id: string
  label: string
  paymentAllocationPreference?:
    | "loan_first"
    | "manual_split"
    | "savings_first"
    | null
}

export type ContributionPlanOption = {
  amount: number | string | { toString(): string }
  id: string
  isActive: boolean
  member: {
    fullName: string
  }
  name?: string | null
  startsAt: Date
}

export type ContributionLoanOption = {
  id: string
  loanProduct: {
    name: string
  }
  member: {
    fullName: string
  }
  status: string
}

export type CollectionSourceBatchOption = {
  externalReference?: string | null
  id: string
  label: string
}

export type CollectionSourceBatchRowOption = {
  blocker?: string | null
  expectedAmount: number
  id: string
  memberName: string
  memberNumber: string
  paidAmount: number
  status: string
}

export type CollectionSourceBatchSheetOption = {
  deductionSource: {
    name: string
  }
  id: string
  periodLabel: string
  rows: CollectionSourceBatchRowOption[]
}

export function ContributionContent({
  activeCommitmentPlans,
  activeLoans,
  collectionSourceBatchOptions,
  devMode,
  members,
  selectedCollectionSourceBatch,
}: {
  activeCommitmentPlans: ContributionPlanOption[]
  activeLoans: ContributionLoanOption[]
  collectionSourceBatchOptions: CollectionSourceBatchOption[]
  devMode: boolean
  members: ContributionMemberOption[]
  selectedCollectionSourceBatch?: CollectionSourceBatchSheetOption | null
}) {
  const {
    contributionSheetType,
    selectedCollectionBatchId,
    selectedCollectionRowId,
    selectedContributionMemberId,
    selectedContributionPlanId,
    setParams,
  } = useContributionParams()
  const selectedMember = members.find(
    (member) => member.id === selectedContributionMemberId
  )
  const selectedPlan = activeCommitmentPlans.find(
    (plan) => plan.id === selectedContributionPlanId
  )
  const memberOptions = members.map((member) => ({
    id: member.id,
    label: member.label,
  }))
  const commitmentPlanOptions = activeCommitmentPlans.map((plan) => ({
    id: plan.id,
    label: `${plan.member.fullName} · ${formatCurrency(Number(plan.amount))}`,
  }))
  const loanOptions = activeLoans.map((loan) => ({
    id: loan.id,
    label: `${loan.member.fullName} · ${loan.loanProduct.name}`,
  }))
  const now = new Date()
  const currentBatchYear = now.getUTCFullYear()
  const currentBatchMonth = now.getUTCMonth() + 1
  const selectedBatch =
    selectedCollectionSourceBatch?.id === selectedCollectionBatchId
      ? selectedCollectionSourceBatch
      : selectedCollectionSourceBatch
  const selectedBatchRow = selectedBatch?.rows.find(
    (row) => row.id === selectedCollectionRowId
  )
  const collectedRows =
    selectedBatch?.rows.filter((row) => row.status === "collected") ?? []

  if (contributionSheetType === "plan") {
    return (
      <div className="px-6">
        <ContributionPlanForm devMode={devMode} members={memberOptions} />
      </div>
    )
  }

  if (contributionSheetType === "payment") {
    return (
      <div className="px-6">
        <MemberPaymentForm
          commitmentPlans={commitmentPlanOptions}
          devMode={devMode}
          loans={loanOptions}
          members={memberOptions}
        />
      </div>
    )
  }

  if (contributionSheetType === "preference") {
    if (!selectedMember) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Select a member before changing payment preference.
        </div>
      )
    }

    return (
      <div className="px-6">
        <MemberPaymentPreferenceForm
          defaultValues={{
            memberId: selectedMember.id,
            preference:
              selectedMember.paymentAllocationPreference ?? "manual_split",
          }}
          title={selectedMember.label}
        />
      </div>
    )
  }

  if (contributionSheetType === "editPlan") {
    if (!selectedPlan) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Commitment plan could not be loaded.
        </div>
      )
    }

    return (
      <div className="grid gap-4 px-6">
        <div className="rounded-lg border p-4">
          <p className="font-medium text-foreground">
            {selectedPlan.member.fullName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCurrency(Number(selectedPlan.amount))} monthly commitment
          </p>
        </div>
        <ContributionPlanUpdateForm
          defaultValues={{
            amount: String(Number(selectedPlan.amount)),
            name: selectedPlan.name ?? "",
            planId: selectedPlan.id,
          }}
        />
        <ContributionPlanCloseForm planId={selectedPlan.id} />
      </div>
    )
  }

  if (contributionSheetType === "stageBatch") {
    return (
      <form
        action={stageCollectionSourceContributionBatchAction}
        className="grid gap-4 px-6"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Year
            <Input
              defaultValue={currentBatchYear}
              name="year"
              required
              type="number"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-foreground">
            Month
            <Input
              defaultValue={currentBatchMonth}
              max={12}
              min={1}
              name="month"
              required
              type="number"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Source
          <LabeledSelectInput
            name="deductionSourceId"
            options={collectionSourceBatchOptions.map((source) => ({
              label: `${source.label}${
                source.externalReference
                  ? ` · ${source.externalReference}`
                  : ""
              }`,
              value: source.id,
            }))}
            placeholder="Select source"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Reference
          <Input name="reference" placeholder="MIN-EDU-JUN-2026" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Note
          <Textarea name="notes" />
        </label>
        <Button
          disabled={collectionSourceBatchOptions.length === 0}
          type="submit"
        >
          Stage batch
        </Button>
      </form>
    )
  }

  if (contributionSheetType === "postBatchRows") {
    return (
      <form
        action={postCollectionSourceContributionBatchRowsAction}
        className="grid gap-4 px-6"
      >
        <input name="batchId" type="hidden" value={selectedBatch?.id ?? ""} />
        {collectedRows.map((row) => (
          <input key={row.id} name="rowId" type="hidden" value={row.id} />
        ))}
        <div className="rounded-lg border p-4">
          <p className="font-medium text-foreground">
            {selectedBatch?.deductionSource.name ?? "Collection source batch"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedBatch?.periodLabel ?? "Select a batch"} ·{" "}
            {collectedRows.length} collected rows ready
          </p>
        </div>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Posting reference
          <Input name="reference" placeholder="Posting reference" />
        </label>
        <Button
          disabled={!selectedBatch?.id || collectedRows.length === 0}
          type="submit"
        >
          Post collected rows
        </Button>
      </form>
    )
  }

  if (contributionSheetType === "markBatchRowCollected") {
    return (
      <form
        action={updateCollectionSourceContributionBatchRowsAction}
        className="grid gap-4 px-6"
      >
        <input name="batchId" type="hidden" value={selectedBatch?.id ?? ""} />
        <input name="rowId" type="hidden" value={selectedBatchRow?.id ?? ""} />
        <input name="status" type="hidden" value="collected" />
        <div className="rounded-lg border p-4">
          <p className="font-medium text-foreground">
            {selectedBatchRow?.memberName ?? "Batch row"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedBatchRow?.memberNumber ?? "Select a row"} · expected{" "}
            {formatCurrency(selectedBatchRow?.expectedAmount ?? 0)}
          </p>
        </div>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Paid amount
          <Input
            defaultValue={selectedBatchRow?.expectedAmount || ""}
            name="paidAmount"
            placeholder="Paid amount"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Variance note
          <Input name="exceptionReason" placeholder="Variance note" />
        </label>
        <Button disabled={!selectedBatch?.id || !selectedBatchRow?.id} type="submit">
          Mark collected
        </Button>
      </form>
    )
  }

  if (contributionSheetType === "markBatchRowException") {
    return (
      <form
        action={updateCollectionSourceContributionBatchRowsAction}
        className="grid gap-4 px-6"
      >
        <input name="batchId" type="hidden" value={selectedBatch?.id ?? ""} />
        <input name="rowId" type="hidden" value={selectedBatchRow?.id ?? ""} />
        <input name="status" type="hidden" value="exception" />
        <div className="rounded-lg border p-4">
          <p className="font-medium text-foreground">
            {selectedBatchRow?.memberName ?? "Batch row"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark this deduction row as an exception so it is held for review.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Reason
          <Input name="exceptionReason" placeholder="Reason" required />
        </label>
        <Button
          disabled={!selectedBatch?.id || !selectedBatchRow?.id}
          type="submit"
          variant="outline"
        >
          Mark exception
        </Button>
      </form>
    )
  }

  if (contributionSheetType === "postBatchRow") {
    return (
      <form
        action={postCollectionSourceContributionBatchRowsAction}
        className="grid gap-4 px-6"
      >
        <input name="batchId" type="hidden" value={selectedBatch?.id ?? ""} />
        <input name="rowId" type="hidden" value={selectedBatchRow?.id ?? ""} />
        <div className="rounded-lg border p-4">
          <p className="font-medium text-foreground">
            {selectedBatchRow?.memberName ?? "Batch row"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Post this collected row into the member contribution ledger.
          </p>
        </div>
        <Button disabled={!selectedBatch?.id || !selectedBatchRow?.id} type="submit">
          Post row
        </Button>
      </form>
    )
  }

  return (
    <div className="px-6">
      <Button onClick={() => setParams({ contributionSheetType: "plan" })}>
        Start with a commitment
      </Button>
    </div>
  )
}
