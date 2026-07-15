import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { DatePickerInput } from "@/components/date-picker-input"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { MemberAutocompleteSelect } from "@/components/migration/member-autocomplete-select"
import {
  createLegacyLoanMigrationDraftAction,
  finalizeInitialMigrationAction,
  markLegacyLoansReviewedAction,
  queueBackfillApplyAction,
  queueBackfillDraftAction,
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

export function SaveMemberBackfillDraftContent({
  memberId,
}: {
  memberId: string
}) {
  return (
    <form action={queueBackfillDraftAction} className="flex justify-end">
      <input name="memberId" type="hidden" value={memberId} />
      <Button size="sm" type="submit">
        Save draft
      </Button>
    </form>
  )
}

export function ApplyMemberBackfillContent({ memberId }: { memberId: string }) {
  return (
    <form
      action={queueBackfillApplyAction}
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <input name="memberId" type="hidden" value={memberId} />
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Type APPLY BACKFILL
        <Input
          name="confirmation"
          placeholder="APPLY BACKFILL"
          required
          type="text"
        />
      </label>
      <div className="flex items-end justify-end">
        <Button size="sm" type="submit">
          Apply backfill
        </Button>
      </div>
    </form>
  )
}

export function FinalizeInitialMigrationContent({
  disabled,
}: {
  disabled: boolean
}) {
  return (
    <form
      action={finalizeInitialMigrationAction}
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Type FINALIZE MIGRATION
        <Input
          name="confirmation"
          placeholder="FINALIZE MIGRATION"
          required
          type="text"
        />
      </label>
      <div className="flex items-end justify-end">
        <Button disabled={disabled} size="sm" type="submit">
          Finalize migration
        </Button>
      </div>
    </form>
  )
}

export function MarkLegacyLoansReviewedContent() {
  return (
    <form
      action={markLegacyLoansReviewedAction}
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Type NO LEGACY LOANS
        <Input
          name="confirmation"
          placeholder="NO LEGACY LOANS"
          required
          type="text"
        />
      </label>
      <div className="flex items-end justify-end">
        <Button size="sm" type="submit">
          Mark reviewed
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
    </form>
  )
}

export function CreateLegacyLoanMigrationDraftContent({
  memberOptions,
}: {
  memberOptions: InitialMigrationMemberOption[]
}) {
  return (
    <form
      action={createLegacyLoanMigrationDraftAction}
      className="grid gap-3 sm:grid-cols-2"
    >
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
        Principal
        <CurrencyPrefixInput
          min="0"
          name="principalAmount"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Monthly principal repayment
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
        Outstanding principal
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
          Add loan draft
        </Button>
      </div>
    </form>
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
          These values feed the generated loan repayment, savings-during-loan,
          and principal balance columns.
        </p>
      </div>
      <form
        action={updateLegacyLoanMigrationDraftAction}
        className="grid gap-3 sm:grid-cols-2"
      >
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
          Principal
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
          Monthly principal repayment
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
          Outstanding principal
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
            Save loan draft
          </Button>
        </div>
      </form>
    </>
  )
}
