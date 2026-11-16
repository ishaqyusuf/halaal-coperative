"use client"

import { toast } from "@halaalvest/ui/components/use-toast"
import { DashboardNativeQuickFill } from "@/components/dashboard-quick-fill"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import {
  createQaReference,
  formatCurrency,
  qaMonthLabel,
} from "@halaalvest/utils"
import {
  ContributionPlanCloseForm,
  ContributionPlanForm,
  ContributionPlanUpdateForm,
  MemberPaymentForm,
  MemberPaymentPreferenceForm,
} from "@/components/forms/finance-forms"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { WorkflowConfirmFooter } from "@/components/workflow-confirm-footer"
import { useContributionParams } from "@/hooks/use-contribution-params"
import {
  postCollectionSourceContributionBatchRowsAction,
  stageCollectionSourceContributionBatchAction,
  updateCollectionSourceContributionBatchRowsAction,
} from "@/lib/dashboard-actions"
import { useTRPC } from "@/trpc/client"

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

function useCompleteContributionWorkflow() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()
  const { setParams } = useContributionParams()

  return async () => {
    await queryClient.invalidateQueries(
      trpc.contributions.ledger.infiniteQueryFilter()
    )
    await setParams({
      contributionSheetType: null,
      selectedCollectionBatchId: null,
      selectedCollectionRowId: null,
      selectedContributionMemberId: null,
      selectedContributionPlanId: null,
    })
    router.refresh()
  }
}

// Members already paid this month in monthly records are skipped by the
// server; say who, so staff are not left guessing.
function notifySkippedBatchMembers(names?: string[]) {
  if (!names?.length) return
  toast({
    description: names.join(", "),
    title: `${names.length === 1 ? "1 member" : `${names.length} members`} skipped: already paid this month`,
  })
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
  const completeContributionWorkflow = useCompleteContributionWorkflow()
  const {
    contributionSheetType,
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
  const selectedBatch = selectedCollectionSourceBatch
  const selectedBatchRow = selectedBatch?.rows.find(
    (row) => row.id === selectedCollectionRowId
  )
  const collectedRows =
    selectedBatch?.rows.filter((row) => row.status === "collected") ?? []

  if (contributionSheetType === "plan") {
    return (
      <ContributionPlanForm
        devMode={devMode}
        onSuccess={completeContributionWorkflow}
      />
    )
  }

  if (contributionSheetType === "payment") {
    return (
      <MemberPaymentForm
        commitmentPlans={commitmentPlanOptions}
        devMode={devMode}
        loans={loanOptions}
        onSuccess={completeContributionWorkflow}
      />
    )
  }

  if (contributionSheetType === "preference") {
    if (!selectedMember) {
      // Found by search on the Commitments tab: not in the list of members
      // with a set order, so they use the default (Manual split).
      return selectedContributionMemberId ? (
        <SearchedMemberPaymentPreference
          memberId={selectedContributionMemberId}
          onSuccess={completeContributionWorkflow}
        />
      ) : (
        <div className="text-sm text-muted-foreground">
          Select a member before changing payment preference.
        </div>
      )
    }

    return (
      <MemberPaymentPreferenceForm
        defaultValues={{
          memberId: selectedMember.id,
          preference:
            selectedMember.paymentAllocationPreference ?? "manual_split",
        }}
        onSuccess={completeContributionWorkflow}
        title={selectedMember.label}
      />
    )
  }

  if (contributionSheetType === "editPlan") {
    if (!selectedPlan) {
      return (
        <div className="text-sm text-muted-foreground">
          Commitment plan could not be loaded.
        </div>
      )
    }

    return (
      <div className="grid gap-4">
        <div className="border-y border-border py-4">
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
          onSuccess={completeContributionWorkflow}
        />
        <ContributionPlanCloseForm
          onSuccess={completeContributionWorkflow}
          planId={selectedPlan.id}
        />
      </div>
    )
  }

  if (contributionSheetType === "stageBatch") {
    return (
      <form
        action={async (formData) => {
          await stageCollectionSourceContributionBatchAction(formData)
          await completeContributionWorkflow()
        }}
        className="grid gap-4"
      >
        <DashboardNativeQuickFill
          enabled={devMode}
          values={() => ({
            deductionSourceId: collectionSourceBatchOptions[0]?.id,
            month: String(new Date().getMonth() + 1),
            notes: `${qaMonthLabel()} payroll deductions from the source schedule.`,
            reference: createQaReference("PAYROLL"),
            year: String(new Date().getFullYear()),
          })}
        />
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
          Workplace
          <LabeledSelectInput
            name="deductionSourceId"
            options={collectionSourceBatchOptions.map((source) => ({
              label: `${source.label}${
                source.externalReference ? ` · ${source.externalReference}` : ""
              }`,
              value: source.id,
            }))}
            placeholder="Choose a workplace"
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
          size="touch"
          className="w-full sm:w-auto"
          disabled={collectionSourceBatchOptions.length === 0}
          type="submit"
        >
          Start batch
        </Button>
      </form>
    )
  }

  if (contributionSheetType === "postBatchRows") {
    return (
      <form
        action={async (formData) => {
          const result =
            await postCollectionSourceContributionBatchRowsAction(formData)
          notifySkippedBatchMembers(result?.skippedMemberNames)
          await completeContributionWorkflow()
        }}
        className="grid gap-4"
      >
        <DashboardNativeQuickFill
          enabled={devMode}
          values={() => ({ reference: createQaReference("BATCH") })}
        />
        <input name="batchId" type="hidden" value={selectedBatch?.id ?? ""} />
        {collectedRows.map((row) => (
          <input key={row.id} name="rowId" type="hidden" value={row.id} />
        ))}
        <div className="border-y border-border py-4">
          <p className="font-medium text-foreground">
            {selectedBatch?.deductionSource.name ?? "Workplace batch"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedBatch?.periodLabel ?? "Select a batch"} ·{" "}
            {collectedRows.length} paid, ready to post
          </p>
        </div>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Posting reference
          <Input name="reference" placeholder="Posting reference" />
        </label>
        <Button
          size="touch"
          className="w-full sm:w-auto"
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
        action={async (formData) => {
          await updateCollectionSourceContributionBatchRowsAction(formData)
          await completeContributionWorkflow()
        }}
        className="grid gap-4"
      >
        <DashboardNativeQuickFill
          enabled={devMode}
          values={() => ({
            paidAmount: String(selectedBatchRow?.expectedAmount || 25_000),
          })}
        />
        <input name="batchId" type="hidden" value={selectedBatch?.id ?? ""} />
        <input name="rowId" type="hidden" value={selectedBatchRow?.id ?? ""} />
        <input name="status" type="hidden" value="collected" />
        <div className="border-y border-border py-4">
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
        <Button
          size="touch"
          className="w-full sm:w-auto"
          disabled={!selectedBatch?.id || !selectedBatchRow?.id}
          type="submit"
        >
          Mark collected
        </Button>
      </form>
    )
  }

  if (contributionSheetType === "markBatchRowException") {
    return (
      <form
        action={async (formData) => {
          await updateCollectionSourceContributionBatchRowsAction(formData)
          await completeContributionWorkflow()
        }}
        className="grid gap-4"
      >
        <DashboardNativeQuickFill
          enabled={devMode}
          values={() => ({
            exceptionReason: "Deduction missing from the ministry schedule.",
          })}
        />
        <input name="batchId" type="hidden" value={selectedBatch?.id ?? ""} />
        <input name="rowId" type="hidden" value={selectedBatchRow?.id ?? ""} />
        <input name="status" type="hidden" value="exception" />
        <div className="border-y border-border py-4">
          <p className="font-medium text-foreground">
            {selectedBatchRow?.memberName ?? "Batch row"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kept out of posting until reviewed.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Reason
          <Input name="exceptionReason" placeholder="Reason" required />
        </label>
        <Button
          size="touch"
          className="w-full sm:w-auto"
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
        action={async (formData) => {
          const result =
            await postCollectionSourceContributionBatchRowsAction(formData)
          notifySkippedBatchMembers(result?.skippedMemberNames)
          await completeContributionWorkflow()
        }}
        className="grid gap-4"
      >
        <input name="batchId" type="hidden" value={selectedBatch?.id ?? ""} />
        <input name="rowId" type="hidden" value={selectedBatchRow?.id ?? ""} />
        <div className="border-y border-border py-4">
          <p className="font-medium text-foreground">
            {selectedBatchRow?.memberName ?? "Batch row"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Post this collected row into the member contribution ledger.
          </p>
        </div>
        <WorkflowConfirmFooter>
          <Button
            size="touch"
            className="w-full sm:w-auto"
            disabled={!selectedBatch?.id || !selectedBatchRow?.id}
            type="submit"
          >
            Post row
          </Button>
        </WorkflowConfirmFooter>
      </form>
    )
  }

  return (
    <div>
      <Button onClick={() => setParams({ contributionSheetType: "plan" })}>
        Start with a commitment
      </Button>
    </div>
  )
}

function SearchedMemberPaymentPreference({
  memberId,
  onSuccess,
}: {
  memberId: string
  onSuccess: () => Promise<void> | void
}) {
  const trpc = useTRPC()
  // One id lookup for the name (the same lean picker read as the search).
  const { data, isPending } = useQuery(
    trpc.members.options.queryOptions({ ids: [memberId] })
  )
  const member = data?.[0]

  if (isPending) {
    return <div className="text-sm text-muted-foreground">Loading member…</div>
  }

  if (!member) {
    return (
      <div className="text-sm text-muted-foreground">
        This member could not be found.
      </div>
    )
  }

  return (
    <MemberPaymentPreferenceForm
      defaultValues={{ memberId: member.id, preference: "manual_split" }}
      onSuccess={onSuccess}
      title={`${member.fullName} (${member.memberNumber})`}
    />
  )
}
