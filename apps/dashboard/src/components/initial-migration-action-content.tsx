import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import {
  LegacyLoanDraftCreateQuickFill,
  LegacyLoanDraftEditQuickFill,
  ProfitMigrationAdjustmentQuickFill,
} from "@/components/initial-migration-quick-fills"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { DatePickerInput } from "@/components/date-picker-input"
import { GoLiveChecklist } from "@/components/go-live-checklist"
import type { GoLiveChecklistData } from "@/lib/getting-started/go-live-readiness"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { MemberAutocompleteSelect } from "@/components/migration/member-autocomplete-select"
import { InitialMigrationActionForm } from "@/components/migration/migration-action-forms"
import { WorkflowConfirmFooter } from "@/components/workflow-confirm-footer"
import {
  createLegacyLoanMigrationDraftAction,
  markLegacyLoansReviewedAction,
  queueBackfillApplyAction,
  updateLegacyLoanMigrationDraftAction,
  upsertMigrationProfitAdjustmentAction,
} from "@/lib/dashboard-actions"

export type InitialMigrationMemberOption = {
  id: string
  label: string
}

export type InitialMigrationLegacyLoanDraft = {
  closedAt: string | null
  guarantorOneMemberId?: string | null
  guarantorTwoMemberId?: string | null
  id: string
  loanLabel: string
  memberId: string
  memberName: string
  memberNumber: string
  openedAt: string
  outstandingPrincipalBalance: number
  principalAmount: number
  savingsDuringLoan: number
  scheduledMonthlyPrincipalRepayment: number
}

export type InitialMigrationProfitMigrationOption = {
  editableAvailableAmount: number
  id: string
  memberMigrationAdjustmentAmount: number
}

export function ProfitMigrationAdjustmentContent({
  disabled,
  formId,
  memberId,
  option,
}: {
  disabled: boolean
  formId: string
  memberId: string | null | undefined
  option: InitialMigrationProfitMigrationOption
}) {
  return (
    <>
      <form action={upsertMigrationProfitAdjustmentAction} id={formId}>
        <ProfitMigrationAdjustmentQuickFill
          disabled={disabled}
          editableAvailableAmount={option.editableAvailableAmount}
        />
        <input name="memberId" type="hidden" value={memberId ?? ""} />
        <input name="profitEntryId" type="hidden" value={option.id} />
        <input
          name="notes"
          type="hidden"
          value="Initial migration profit allocation"
        />
        <label className="space-y-1 text-sm">
          <span className="font-medium text-foreground">Member amount</span>
          <CurrencyPrefixInput
            defaultValue={option.memberMigrationAdjustmentAmount || ""}
            disabled={disabled}
            max={option.editableAvailableAmount}
            min="0"
            name="allocatedProfitAmount"
            required
            step="0.01"
            type="number"
          />
        </label>
      </form>
      <Button disabled={disabled} form={formId} size="sm" type="submit">
        Save
      </Button>
    </>
  )
}

export function ApplyMemberBackfillContent({ memberId }: { memberId: string }) {
  return (
    <InitialMigrationActionForm
      action={queueBackfillApplyAction}
      className="grid gap-4"
    >
      <input name="memberId" type="hidden" value={memberId} />
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Type ADD RECORDS
        <Input
          name="confirmation"
          placeholder="ADD RECORDS"
          required
          type="text"
        />
      </label>
      <WorkflowConfirmFooter>
        <Button type="submit">Add to member’s records</Button>
      </WorkflowConfirmFooter>
    </InitialMigrationActionForm>
  )
}

export function FinalizeInitialMigrationContent({
  checklist = null,
  migrationSnapshot,
  tenantHost = null,
  tenantName,
}: {
  checklist?: GoLiveChecklistData | null
  migrationSnapshot: InitialMigrationSnapshot
  tenantHost?: string | null
  tenantName: string
}) {
  return (
    <GoLiveChecklist
      checklist={checklist}
      migrationSnapshot={migrationSnapshot}
      tenantHost={tenantHost}
      tenantName={tenantName}
    />
  )
}

export function MarkLegacyLoansReviewedContent() {
  return (
    <InitialMigrationActionForm
      action={markLegacyLoansReviewedAction}
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Type NO OLD LOANS
        <Input
          name="confirmation"
          placeholder="NO OLD LOANS"
          required
          type="text"
        />
      </label>
      <div className="flex items-end justify-end">
        <Button size="sm" type="submit">
          Confirm
        </Button>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
        Notes
        <Input
          name="notes"
          placeholder="Board minute, review source, or officer note"
          type="text"
        />
      </label>
    </InitialMigrationActionForm>
  )
}

export function CreateLegacyLoanMigrationDraftContent({
  memberOptions,
}: {
  memberOptions: InitialMigrationMemberOption[]
}) {
  return (
    <InitialMigrationActionForm
      action={createLegacyLoanMigrationDraftAction}
      className="grid gap-3 sm:grid-cols-2"
    >
      <LegacyLoanDraftCreateQuickFill
        className="sm:col-span-2"
        memberId={memberOptions[0]?.id}
      />
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Member
        <LabeledSelectInput
          name="memberId"
          options={memberOptions.map((member) => ({
            label: member.label,
            value: member.id,
          }))}
          placeholder="Select member"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Loan label
        <Input name="loanLabel" placeholder="Loan A" required type="text" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Loan date
        <DatePickerInput
          name="openedAt"
          placeholder="Select loan date"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Closed date
        <DatePickerInput name="closedAt" placeholder="Select closed date" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Amount borrowed
        <CurrencyPrefixInput
          min="0"
          name="principalAmount"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Paid back each month
        <CurrencyPrefixInput
          min="0"
          name="scheduledMonthlyPrincipalRepayment"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Savings during loan
        <CurrencyPrefixInput
          min="0"
          name="savingsDuringLoan"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Still owed
        <CurrencyPrefixInput
          min="0"
          name="outstandingPrincipalBalance"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
        Notes
        <Input
          name="notes"
          placeholder="Board approval, source file, or correction note"
          type="text"
        />
      </label>
      <div className="flex items-end justify-end sm:col-span-2">
        <Button size="sm" type="submit">
          Add the loan
        </Button>
      </div>
    </InitialMigrationActionForm>
  )
}

export function LegacyLoanDraftEditContent({
  disabled,
  loan,
  memberOptions,
}: {
  disabled: boolean
  loan: InitialMigrationLegacyLoanDraft
  memberOptions: InitialMigrationMemberOption[]
}) {
  const guarantorOptions = memberOptions.filter(
    (member) => member.id !== loan.memberId
  )
  const promotedGuarantorIds = [
    loan.guarantorOneMemberId,
    loan.guarantorTwoMemberId,
  ].filter((id): id is string => Boolean(id))

  return (
    <>
      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
        <p className="font-medium text-foreground">
          {loan.memberName} · {loan.memberNumber}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          These amounts make the loan’s months: what they paid back, what they
          saved and what they still owed.
        </p>
      </div>
      <InitialMigrationActionForm
        action={updateLegacyLoanMigrationDraftAction}
        className="grid gap-3 sm:grid-cols-2"
      >
        <LegacyLoanDraftEditQuickFill />
        <input name="draftId" type="hidden" value={loan.id} />
        <input name="memberId" type="hidden" value={loan.memberId} />
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Loan label
          <Input
            defaultValue={loan.loanLabel}
            name="loanLabel"
            required
            type="text"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Loan date
          <DatePickerInput
            defaultValue={loan.openedAt}
            name="openedAt"
            placeholder="Select loan date"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Closed date
          <DatePickerInput
            defaultValue={loan.closedAt ?? ""}
            name="closedAt"
            placeholder="Select closed date"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Amount borrowed
          <CurrencyPrefixInput
            defaultValue={loan.principalAmount}
            min="0"
            name="principalAmount"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Paid back each month
          <CurrencyPrefixInput
            defaultValue={loan.scheduledMonthlyPrincipalRepayment}
            min="0"
            name="scheduledMonthlyPrincipalRepayment"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Savings during loan
          <CurrencyPrefixInput
            defaultValue={loan.savingsDuringLoan}
            min="0"
            name="savingsDuringLoan"
            required
            step="0.01"
            type="number"
          />
        </label>
        <div className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">
            Guarantor 1
          </span>
          <MemberAutocompleteSelect
            label="Guarantor 1"
            name="guarantorOneMemberId"
            options={guarantorOptions}
            placeholder="Search member"
            promotedOptionIds={promotedGuarantorIds}
            value={loan.guarantorOneMemberId}
          />
        </div>
        <div className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">
            Guarantor 2
          </span>
          <MemberAutocompleteSelect
            label="Guarantor 2"
            name="guarantorTwoMemberId"
            options={guarantorOptions}
            placeholder="Search member"
            promotedOptionIds={promotedGuarantorIds}
            value={loan.guarantorTwoMemberId}
          />
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Still owed
          <CurrencyPrefixInput
            defaultValue={loan.outstandingPrincipalBalance}
            min="0"
            name="outstandingPrincipalBalance"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
          Notes
          <Input
            name="notes"
            placeholder="Board approval, source file, or correction note"
            type="text"
          />
        </label>
        <div className="flex justify-end sm:col-span-2">
          <Button disabled={disabled} size="sm" type="submit">
            Save the loan
          </Button>
        </div>
      </InitialMigrationActionForm>
    </>
  )
}
