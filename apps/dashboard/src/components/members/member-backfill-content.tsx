import { Button } from "@halaalvest/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@halaalvest/ui/components/field"
import { Input } from "@halaalvest/ui/components/input"
import { Separator } from "@halaalvest/ui/components/separator"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { DatePickerInput } from "@/components/date-picker-input"
import { DashboardSurfaceCard } from "@/components/dashboard"
import { MemberBackfillActionForm } from "@/components/migration/migration-action-forms"
import { WorkflowConfirmFooter } from "@/components/workflow-confirm-footer"
import {
  applyMemberOpeningBalanceAction,
  cancelMemberOpeningBalanceAction,
  createHistoricalMemberSharePurchaseAction,
  createMemberOpeningBalanceAction,
  generateHistoricalBackfillShareProfitAllocationsAction,
  reviewMemberOpeningBalanceAction,
  reverseMemberOpeningBalanceAction,
  saveMemberProfitSeasonAdjustmentsAction,
} from "@/lib/dashboard-actions"
import type { loadMemberBackfillWorkflowData } from "@/lib/members"
import { MemberBackfillFooterPortal } from "./member-backfill-footer-slot"
import {
  MemberProfitSeasonAdjustmentTable,
  type MemberProfitSeasonAdjustmentSeason,
} from "./member-profit-season-adjustment-table"
import { OpeningCurrencyInput } from "./opening-currency-input"
import { MemberOpeningSharePositionFields } from "./member-opening-share-position-fields"
import { OpeningBalanceOptionalSections } from "./opening-balance-optional-sections"
import { OpeningBalanceQuickFillButton } from "./opening-balance-quick-fill-button"

type MemberBackfillData = Extract<
  Awaited<ReturnType<typeof loadMemberBackfillWorkflowData>>,
  { state: "ready" }
>

type ProfitMigrationOption = {
  businessName: string
  editableAvailableAmount: number
  id: string
  memberMigrationAdjustmentAmount: number
  memberMigrationAdjustmentSharePercentage?: number | null
  profitDate: string
  profitAmount: number
  seasonKey: string
  seasonLabel?: string | null
  seasonPeriodStart?: string | null
  seasonPeriodEnd?: string | null
  seasonStatus?: string | null
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function getFallbackSeasonLabel(option: ProfitMigrationOption) {
  return (
    option.seasonLabel ?? `Dividend season (${formatDate(option.profitDate)})`
  )
}

function getSeasonSharePercentage(
  entries: ProfitMigrationOption[]
): number | null {
  const sharePercentages = entries
    .map((entry) => entry.memberMigrationAdjustmentSharePercentage)
    .filter((value): value is number => value != null)

  if (sharePercentages.length !== entries.length) {
    return null
  }

  const [firstSharePercentage] = sharePercentages

  if (firstSharePercentage === undefined) {
    return null
  }

  return sharePercentages.every((value) => value === firstSharePercentage)
    ? firstSharePercentage
    : null
}

function groupProfitMigrationOptionsBySeason(
  options: ProfitMigrationOption[]
): MemberProfitSeasonAdjustmentSeason[] {
  const seasonsByKey = new Map<string, ProfitMigrationOption[]>()

  for (const option of options) {
    const seasonEntries = seasonsByKey.get(option.seasonKey) ?? []
    seasonEntries.push(option)
    seasonsByKey.set(option.seasonKey, seasonEntries)
  }

  return Array.from(seasonsByKey.entries())
    .map(([key, entries]): MemberProfitSeasonAdjustmentSeason => {
      const firstEntry = entries[0]!

      return {
        businessNames: Array.from(
          new Set(entries.map((entry) => entry.businessName))
        ).sort((a, b) => a.localeCompare(b)),
        editableAvailableAmount: entries.reduce(
          (total, entry) => total + entry.editableAvailableAmount,
          0
        ),
        entries,
        key,
        label: getFallbackSeasonLabel(firstEntry),
        memberMigrationAdjustmentAmount: entries.reduce(
          (total, entry) => total + entry.memberMigrationAdjustmentAmount,
          0
        ),
        memberMigrationAdjustmentSharePercentage:
          getSeasonSharePercentage(entries),
        periodEnd: firstEntry.seasonPeriodEnd,
        periodStart: firstEntry.seasonPeriodStart,
        status: firstEntry.seasonStatus,
      }
    })
    .sort((a, b) => {
      const aDate = a.periodStart ?? a.entries[0]?.profitDate ?? ""
      const bDate = b.periodStart ?? b.entries[0]?.profitDate ?? ""

      return aDate.localeCompare(bDate) || a.label.localeCompare(b.label)
    })
}

function OpeningAmountInput({
  disabled,
  label,
  name,
  required = false,
}: {
  disabled?: boolean
  label: string
  name: string
  required?: boolean
}) {
  const id = `member-opening-${name}`

  return (
    <Field data-disabled={disabled ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <OpeningCurrencyInput
        disabled={disabled}
        id={id}
        name={name}
        required={required}
      />
    </Field>
  )
}

function OpeningDateInput({
  defaultValue,
  disabled,
  label,
  name,
  required = false,
}: {
  defaultValue?: string | null
  disabled?: boolean
  label: string
  name: string
  required?: boolean
}) {
  const id = `member-opening-${name}`

  return (
    <Field data-disabled={disabled ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DatePickerInput
        allowClear={!required}
        defaultValue={defaultValue ?? undefined}
        disabled={disabled}
        id={id}
        name={name}
        placeholder="Select date"
        required={required}
      />
    </Field>
  )
}

export function OpeningBalanceCreateContent({
  data,
  disabled,
  formId,
}: {
  data: MemberBackfillData
  disabled: boolean
  formId: string
}) {
  const sharePolicy = data.tenantSharePolicy
  const isUnitBasedShare = sharePolicy.configurationMode === "unit_based"
  const guarantorOptions = data.memberOptions.filter(
    (option) => option.id !== data.member.id
  )
  const openingDate = data.tenantStartDate ?? data.member.joinedAt
  const shareCapitalQuickFillValue = isUnitBasedShare
    ? String(sharePolicy.unitAmount)
    : "10000"

  return (
    <form
      action={createMemberOpeningBalanceAction}
      className="flex flex-col gap-6"
      id={formId}
    >
      <input name="memberId" type="hidden" value={data.member.id} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-foreground">
            Opening position
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Stage the balances and active obligations that already exist before
            the member starts using the system.
          </p>
        </div>
        {data.quickFillEnabled ? (
          <OpeningBalanceQuickFillButton
            disabled={disabled}
            formId={formId}
            values={{
              activeFinancingGuarantorOneMemberId: guarantorOptions[0]?.id,
              activeFinancingGuarantorTwoMemberId: guarantorOptions[1]?.id,
              openingDate,
              shareCapitalBalance: shareCapitalQuickFillValue,
            }}
          />
        ) : null}
      </div>

      <FieldSet>
        <FieldLegend>Current balances</FieldLegend>
        <FieldDescription>
          Required current book position for savings, special savings, and share
          capital.
        </FieldDescription>
        <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <OpeningDateInput
            defaultValue={openingDate}
            disabled={disabled}
            label="Opening date"
            name="openingDate"
            required
          />
          <OpeningAmountInput
            disabled={disabled}
            label="Commitment savings"
            name="commitmentSavingsBalance"
            required
          />
          <OpeningAmountInput
            disabled={disabled}
            label="Special savings"
            name="specialSavingsBalance"
            required
          />
          {isUnitBasedShare ? (
            <MemberOpeningSharePositionFields
              disabled={disabled}
              unitAmount={sharePolicy.unitAmount}
            />
          ) : (
            <OpeningAmountInput
              disabled={disabled}
              label="Share capital"
              name="shareCapitalBalance"
              required
            />
          )}
        </FieldGroup>
      </FieldSet>

      <Separator />

      <OpeningBalanceOptionalSections
        cooperativeStartDate={data.tenantStartDate}
        disabled={disabled}
        guarantorOptions={guarantorOptions}
        memberNumberPrefix={data.memberNumberPrefix}
        quickFillEnabled={data.quickFillEnabled}
      />

      <div className="flex justify-end">
        <Button disabled={disabled} size="sm" type="submit">
          Stage opening position
        </Button>
      </div>
    </form>
  )
}

export function OpeningBalanceReviewContent({
  disabled,
  memberId,
  openingBalanceId,
}: {
  disabled: boolean
  memberId: string
  openingBalanceId: string
}) {
  return (
    <MemberBackfillActionForm
      action={reviewMemberOpeningBalanceAction}
      className="grid gap-2"
    >
      <input name="memberId" type="hidden" value={memberId} />
      <input name="openingBalanceId" type="hidden" value={openingBalanceId} />
      <Textarea
        aria-label="Review note"
        disabled={disabled}
        name="reviewNotes"
        placeholder="Review note"
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={disabled}
          name="decision"
          size="sm"
          type="submit"
          value="rejected"
          variant="outline"
        >
          Reject
        </Button>
        <Button
          disabled={disabled}
          name="decision"
          size="sm"
          type="submit"
          value="approved"
        >
          Approve
        </Button>
      </div>
    </MemberBackfillActionForm>
  )
}

export function OpeningBalanceApplyContent({
  disabled,
  memberId,
  openingBalanceId,
}: {
  disabled: boolean
  memberId: string
  openingBalanceId: string
}) {
  return (
    <MemberBackfillActionForm action={applyMemberOpeningBalanceAction}>
      <input name="memberId" type="hidden" value={memberId} />
      <input name="openingBalanceId" type="hidden" value={openingBalanceId} />
      <WorkflowConfirmFooter disabled={disabled}>
        <Button disabled={disabled} type="submit">
          Apply opening position
        </Button>
      </WorkflowConfirmFooter>
    </MemberBackfillActionForm>
  )
}

export function OpeningBalanceCancelContent({
  disabled,
  memberId,
  openingBalanceId,
}: {
  disabled: boolean
  memberId: string
  openingBalanceId: string
}) {
  return (
    <MemberBackfillActionForm action={cancelMemberOpeningBalanceAction}>
      <input name="memberId" type="hidden" value={memberId} />
      <input name="openingBalanceId" type="hidden" value={openingBalanceId} />
      <WorkflowConfirmFooter cancelLabel="Keep staging" disabled={disabled}>
        <Button disabled={disabled} type="submit" variant="destructive">
          Cancel staging
        </Button>
      </WorkflowConfirmFooter>
    </MemberBackfillActionForm>
  )
}

export function OpeningBalanceReverseContent({
  disabled,
  memberId,
  openingBalanceId,
}: {
  disabled: boolean
  memberId: string
  openingBalanceId: string
}) {
  return (
    <MemberBackfillActionForm
      action={reverseMemberOpeningBalanceAction}
      className="grid gap-4"
    >
      <input name="memberId" type="hidden" value={memberId} />
      <input name="openingBalanceId" type="hidden" value={openingBalanceId} />
      <Textarea
        aria-label="Reversal note"
        disabled={disabled}
        name="reversalNotes"
        placeholder="Reversal note"
        required
      />
      <WorkflowConfirmFooter disabled={disabled}>
        <Button disabled={disabled} type="submit" variant="destructive">
          Reverse
        </Button>
      </WorkflowConfirmFooter>
    </MemberBackfillActionForm>
  )
}

export function HistoricalSharePurchaseContent({
  data,
  disabled,
}: {
  data: MemberBackfillData
  disabled: boolean
}) {
  return (
    <MemberBackfillActionForm
      action={createHistoricalMemberSharePurchaseAction}
      className="grid gap-3"
    >
      <input name="memberId" type="hidden" value={data.member.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Share units
          <Input
            disabled={disabled}
            min="1"
            name="shareUnits"
            required
            step="1"
            type="number"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Paid date
          <Input
            defaultValue={data.member.joinedAt}
            disabled={disabled}
            name="paidAt"
            required
            type="date"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
          Notes
          <Input
            disabled={disabled}
            name="notes"
            placeholder="Receipt or source note"
            type="text"
          />
        </label>
      </div>
      <div className="flex justify-end">
        <Button disabled={disabled} size="sm" type="submit">
          Add share purchase
        </Button>
      </div>
    </MemberBackfillActionForm>
  )
}

export function GenerateBackfillDividendsContent({
  disabled,
}: {
  disabled: boolean
}) {
  return (
    <MemberBackfillActionForm
      action={generateHistoricalBackfillShareProfitAllocationsAction}
    >
      <WorkflowConfirmFooter disabled={disabled}>
        <Button disabled={disabled} type="submit">
          Calculate dividends
        </Button>
      </WorkflowConfirmFooter>
    </MemberBackfillActionForm>
  )
}

export function ProfitSeasonAdjustmentContent({
  data,
  disabled,
  formId,
  nextHref,
}: {
  data: MemberBackfillData
  disabled: boolean
  formId: string
  nextHref?: string
}) {
  const profitMigrationOptions =
    data.profitMigrationOptions as ProfitMigrationOption[]
  const profitMigrationSeasons = groupProfitMigrationOptionsBySeason(
    profitMigrationOptions
  )

  return (
    <form
      action={saveMemberProfitSeasonAdjustmentsAction}
      className="mt-5 grid gap-4"
      id={formId}
    >
      <input name="memberId" type="hidden" value={data.member.id} />
      {nextHref ? (
        <input name="redirectTo" type="hidden" value={nextHref} />
      ) : null}
      {profitMigrationSeasons.length > 0 ? (
        <MemberProfitSeasonAdjustmentTable
          disabled={disabled}
          seasons={profitMigrationSeasons}
        />
      ) : (
        <DashboardSurfaceCard>
          <p className="text-sm font-medium text-foreground">
            No profit seasons available.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Continue to review if this member has no season-specific historical
            profit adjustment.
          </p>
        </DashboardSurfaceCard>
      )}
      {nextHref ? (
        <MemberBackfillFooterPortal>
          <Button form={formId} type="submit">
            Next
          </Button>
        </MemberBackfillFooterPortal>
      ) : null}
    </form>
  )
}
