import { Button } from "@halaalvest/ui/components/button"
import { DashboardSurfaceCard } from "@/components/dashboard"
import {
  applyMemberOpeningBalanceAction,
  createHistoricalMemberSharePurchaseAction,
  createMemberOpeningBalanceAction,
  generateHistoricalBackfillShareProfitAllocationsAction,
  queueBackfillDraftAction,
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
import { MemberOpeningSharePositionFields } from "./member-opening-share-position-fields"
import { OpeningSourceDocumentFields } from "./opening-source-document-fields"

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
  return option.seasonLabel ?? `Dividend season (${formatDate(option.profitDate)})`
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
  step = "0.01",
}: {
  disabled?: boolean
  label: string
  name: string
  required?: boolean
  step?: string
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <input
        className="h-9 border border-border bg-background px-3 text-sm text-foreground"
        disabled={disabled}
        min="0"
        name={name}
        placeholder="0"
        required={required}
        step={step}
        type="number"
      />
    </label>
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

  return (
    <form
      action={createMemberOpeningBalanceAction}
      className="grid gap-3"
      id={formId}
    >
      <input name="memberId" type="hidden" value={data.member.id} />
      <p className="text-xs font-medium text-muted-foreground">
        Required current position
      </p>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Opening date
        <input
          className="h-9 border border-border bg-background px-3 text-sm text-foreground"
          defaultValue={data.tenantStartDate ?? data.member.joinedAt}
          disabled={disabled}
          name="openingDate"
          required
          type="date"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <details className="border border-border/70 bg-muted/20 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Add active financing
          </summary>
          <div className="mt-3 grid gap-3">
            <OpeningAmountInput
              disabled={disabled}
              label="Outstanding principal"
              name="activeFinancingOutstanding"
            />
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Financing start date
              <input
                className="h-9 border border-border bg-background px-3 text-sm text-foreground"
                disabled={disabled}
                name="activeFinancingOpenedAt"
                type="date"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Guarantor 1
              <select
                className="h-9 border border-border bg-background px-3 text-sm text-foreground"
                disabled={disabled}
                name="activeFinancingGuarantorOneMemberId"
              >
                <option value="">No guarantor</option>
                {guarantorOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Guarantor 2
              <select
                className="h-9 border border-border bg-background px-3 text-sm text-foreground"
                disabled={disabled}
                name="activeFinancingGuarantorTwoMemberId"
              >
                <option value="">No guarantor</option>
                {guarantorOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
        <details className="border border-border/70 bg-muted/20 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Add procurement
          </summary>
          <div className="mt-3">
            <OpeningAmountInput
              disabled={disabled}
              label="Outstanding procurement"
              name="procurementOutstanding"
            />
          </div>
        </details>
        <details className="border border-border/70 bg-muted/20 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Add Food Purchase
          </summary>
          <div className="mt-3">
            <OpeningAmountInput
              disabled={disabled}
              label="Outstanding Food Purchase"
              name="foodPurchaseOutstanding"
            />
          </div>
        </details>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <OpeningSourceDocumentFields disabled={disabled} />
      </div>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Notes
        <textarea
          className="min-h-20 border border-border bg-background px-3 py-2 text-sm text-foreground"
          disabled={disabled}
          name="notes"
          placeholder="Current book position and source note"
        />
      </label>
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
    <form action={reviewMemberOpeningBalanceAction} className="grid gap-2">
      <input name="memberId" type="hidden" value={memberId} />
      <input name="openingBalanceId" type="hidden" value={openingBalanceId} />
      <textarea
        className="min-h-16 border border-border bg-background px-3 py-2 text-sm text-foreground"
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
    </form>
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
    <form action={applyMemberOpeningBalanceAction} className="flex justify-end">
      <input name="memberId" type="hidden" value={memberId} />
      <input name="openingBalanceId" type="hidden" value={openingBalanceId} />
      <Button disabled={disabled} size="sm" type="submit">
        Apply
      </Button>
    </form>
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
    <form action={reverseMemberOpeningBalanceAction} className="grid gap-2">
      <input name="memberId" type="hidden" value={memberId} />
      <input name="openingBalanceId" type="hidden" value={openingBalanceId} />
      <textarea
        className="min-h-16 border border-border bg-background px-3 py-2 text-sm text-foreground"
        disabled={disabled}
        name="reversalNotes"
        placeholder="Reversal note"
        required
      />
      <div className="flex justify-end">
        <Button disabled={disabled} size="sm" type="submit" variant="outline">
          Reverse
        </Button>
      </div>
    </form>
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
    <form
      action={createHistoricalMemberSharePurchaseAction}
      className="grid gap-3"
    >
      <input name="memberId" type="hidden" value={data.member.id} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Share units
          <input
            className="h-9 border border-border bg-background px-3 text-sm text-foreground"
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
          <input
            className="h-9 border border-border bg-background px-3 text-sm text-foreground"
            defaultValue={data.member.joinedAt}
            disabled={disabled}
            name="paidAt"
            required
            type="date"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-2 xl:col-span-1">
          Notes
          <input
            className="h-9 border border-border bg-background px-3 text-sm text-foreground"
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
    </form>
  )
}

export function GenerateBackfillDividendsContent({
  disabled,
}: {
  disabled: boolean
}) {
  return (
    <form action={generateHistoricalBackfillShareProfitAllocationsAction}>
      <Button disabled={disabled} size="sm" type="submit">
        Calculate backfill dividends
      </Button>
    </form>
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
            Continue to review if this member has no season-specific
            historical profit adjustment.
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

export function SaveBackfillDraftContent({ memberId }: { memberId: string }) {
  return (
    <form action={queueBackfillDraftAction}>
      <input name="memberId" type="hidden" value={memberId} />
      <Button size="sm" type="submit">
        Save draft
      </Button>
    </form>
  )
}
