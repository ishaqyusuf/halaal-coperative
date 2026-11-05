"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@halaalvest/ui/components/collapsible"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"
import { ChevronDownIcon } from "lucide-react"
import { DatePickerInput } from "@/components/date-picker-input"
import {
  AddInlineRowButton,
  ChargeApplicabilityCombobox,
  chargeDefinitionRowHasValue,
  CurrencyFormInput,
  DeleteInlineRowButton,
  PercentageFormInput,
  SelectFormInput,
  type ChargeDefinitionInputRow,
  type ChargeDefinitionValues,
  type useChargeDefinitionRows,
} from "@/components/forms/tenant-finance-forms"
import {
  chargePurposeOptions,
  chargeValueTypeOptions,
  chargeWhenOptions,
} from "@/lib/getting-started/one-path-finance"

type ChargeRowsDraft = ReturnType<typeof useChargeDefinitionRows>

// The charges half of step 7: a compact list with Charge, Amount and When,
// the required "Applies to" chip under each row, and the less common fields
// (value type, purpose, extra dated amounts) under "More options".
export function ChargesListFields({
  defaultEffectiveFrom,
  disabled,
  draft,
  financeStartDate,
  isBroughtForward,
  quickFillEnabled,
}: {
  defaultEffectiveFrom: string
  disabled: boolean
  draft: ChargeRowsDraft
  financeStartDate: string | null
  isBroughtForward: boolean
  quickFillEnabled: boolean
}) {
  const {
    addChargeHistoryRow,
    addChargeRow,
    chargeRows,
    deleteChargeHistoryRow,
    deleteChargeRow,
    quickFillChargeRows,
    updateChargeApplicability,
    updateChargeHistoryRow,
    updateChargeRow,
  } = draft
  const showFromColumn = !isBroughtForward
  const rowGridClassName = cn(
    "grid gap-3 sm:items-start",
    showFromColumn
      ? "sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,12rem)_9.5rem_2rem]"
      : "sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,12rem)_2rem]"
  )

  return (
    <section aria-labelledby="one-path-charges-heading" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className="text-base font-medium text-foreground"
          id="one-path-charges-heading"
        >
          What do members pay the cooperative?
        </h3>
        {quickFillEnabled ? (
          <Button
            disabled={disabled}
            onClick={quickFillChargeRows}
            size="sm"
            type="button"
            variant="ghost"
          >
            Quick fill charges
          </Button>
        ) : null}
      </div>
      <div
        aria-hidden
        className={cn(
          rowGridClassName,
          "text-xs font-medium text-muted-foreground max-sm:hidden"
        )}
      >
        <span>Charge</span>
        <span>Amount</span>
        <span>When</span>
        {showFromColumn ? <span>From</span> : null}
        <span />
      </div>
      <div className="grid gap-4">
        {chargeRows.map((chargeRow) => (
          <ChargeRowFields
            canDelete={
              chargeDefinitionRowHasValue(chargeRow) ||
              chargeRows.some((row) => row.saved) ||
              chargeRows.filter((row) => !row.saved).length > 1
            }
            chargeRow={chargeRow}
            defaultEffectiveFrom={defaultEffectiveFrom}
            disabled={disabled}
            financeStartDate={financeStartDate}
            isBroughtForward={isBroughtForward}
            key={chargeRow.id}
            onAddHistoryRow={() => addChargeHistoryRow(chargeRow.id)}
            onApplicabilityChange={(value, checked) =>
              updateChargeApplicability(chargeRow.id, value, checked)
            }
            onDelete={() => deleteChargeRow(chargeRow.id)}
            onDeleteHistoryRow={(historyRowId) =>
              deleteChargeHistoryRow(chargeRow.id, historyRowId)
            }
            onHistoryRowChange={(historyRowId, patch) =>
              updateChargeHistoryRow(chargeRow.id, historyRowId, patch)
            }
            onRowChange={(patch) => updateChargeRow(chargeRow.id, patch)}
            rowGridClassName={rowGridClassName}
            showFromColumn={showFromColumn}
          />
        ))}
        <AddInlineRowButton
          disabled={disabled}
          label="Add a charge"
          onAdd={addChargeRow}
        />
      </div>
    </section>
  )
}

function ChargeRowFields({
  canDelete,
  chargeRow,
  defaultEffectiveFrom,
  disabled,
  financeStartDate,
  isBroughtForward,
  onAddHistoryRow,
  onApplicabilityChange,
  onDelete,
  onDeleteHistoryRow,
  onHistoryRowChange,
  onRowChange,
  rowGridClassName,
  showFromColumn,
}: {
  canDelete: boolean
  chargeRow: ChargeDefinitionInputRow
  defaultEffectiveFrom: string
  disabled: boolean
  financeStartDate: string | null
  isBroughtForward: boolean
  onAddHistoryRow: () => void
  onApplicabilityChange: (value: string, checked: boolean) => void
  onDelete: () => void
  onDeleteHistoryRow: (historyRowId: string) => void
  onHistoryRowChange: (
    historyRowId: string,
    patch: { amount?: string; effectiveFrom?: string }
  ) => void
  onRowChange: (
    patch: Partial<
      Pick<
        ChargeDefinitionValues,
        "chargeFrequency" | "chargeValueType" | "name" | "purpose"
      >
    >
  ) => void
  rowGridClassName: string
  showFromColumn: boolean
}) {
  const [firstHistoryRow, ...laterHistoryRows] = chargeRow.historyRows
  const isPercentage = chargeRow.chargeValueType === "percentage"
  const hasMoreOptions =
    laterHistoryRows.length > 0 ||
    chargeRow.chargeValueType !== "fixed_amount" ||
    chargeRow.purpose !== "general"

  return (
    <div className="grid gap-2 border-t border-border/70 pt-3">
      <div className={rowGridClassName}>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          <span className="sm:sr-only">Charge</span>
          <Input
            disabled={disabled}
            onChange={(event) => onRowChange({ name: event.target.value })}
            placeholder="For example, registration fee"
            value={chargeRow.name}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          <span className="sm:sr-only">Amount</span>
          {firstHistoryRow ? (
            <ChargeAmountInput
              disabled={disabled}
              isPercentage={isPercentage}
              onChange={(amount) =>
                onHistoryRowChange(firstHistoryRow.id, { amount })
              }
              value={firstHistoryRow.amount}
            />
          ) : null}
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          <span className="sm:sr-only">When</span>
          <SelectFormInput
            disabled={disabled}
            onChange={(chargeFrequency) =>
              onRowChange({
                chargeFrequency:
                  chargeFrequency as ChargeDefinitionValues["chargeFrequency"],
              })
            }
            options={[...chargeWhenOptions]}
            value={chargeRow.chargeFrequency}
          />
        </label>
        {showFromColumn && firstHistoryRow ? (
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            <span className="sm:sr-only">From</span>
            <DatePickerInput
              allowClear={false}
              disabled={disabled}
              min={financeStartDate ?? undefined}
              onChange={(effectiveFrom) =>
                onHistoryRowChange(firstHistoryRow.id, { effectiveFrom })
              }
              placeholder="From"
              value={firstHistoryRow.effectiveFrom}
            />
          </label>
        ) : null}
        <div className="flex justify-end sm:pt-0.5">
          <DeleteInlineRowButton
            disabled={disabled || !canDelete}
            label="charge"
            onDelete={onDelete}
          />
        </div>
      </div>
      <Collapsible defaultOpen={hasMoreOptions}>
        <div className="flex flex-wrap items-center gap-2">
          <ChargeApplicabilityCombobox
            disabled={disabled}
            onChange={onApplicabilityChange}
            value={chargeRow.applicability}
            variant="chip"
          />
          <CollapsibleTrigger
            className="group/more"
            render={<Button size="sm" type="button" variant="ghost" />}
          >
            More options
            <ChevronDownIcon
              className="transition-transform group-data-[panel-open]/more:rotate-180"
              data-icon="inline-end"
            />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-3 grid gap-3 border-l-2 border-primary/30 pl-4">
          <div className="grid gap-3 sm:grid-cols-[10rem_12rem_9.5rem]">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Value type
              <SelectFormInput
                disabled={disabled}
                onChange={(chargeValueType) =>
                  onRowChange({
                    chargeValueType:
                      chargeValueType as ChargeDefinitionValues["chargeValueType"],
                  })
                }
                options={[...chargeValueTypeOptions]}
                value={chargeRow.chargeValueType}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Purpose
              <SelectFormInput
                disabled={disabled}
                onChange={(purpose) =>
                  onRowChange({
                    purpose: purpose as ChargeDefinitionValues["purpose"],
                  })
                }
                options={[...chargePurposeOptions]}
                value={chargeRow.purpose}
              />
            </label>
            {isBroughtForward && firstHistoryRow ? (
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                From
                <DatePickerInput
                  allowClear={false}
                  disabled={disabled}
                  min={financeStartDate ?? undefined}
                  onChange={(effectiveFrom) =>
                    onHistoryRowChange(firstHistoryRow.id, { effectiveFrom })
                  }
                  placeholder="From"
                  value={firstHistoryRow.effectiveFrom || defaultEffectiveFrom}
                />
              </label>
            ) : null}
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Amount changed over time?
            </p>
            {laterHistoryRows.map((historyRow) => (
              <div
                className="grid gap-3 sm:grid-cols-[9.5rem_9rem_2rem] sm:items-start"
                key={historyRow.id}
              >
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  <span className="sr-only">From</span>
                  <DatePickerInput
                    allowClear={false}
                    disabled={disabled}
                    min={financeStartDate ?? undefined}
                    onChange={(effectiveFrom) =>
                      onHistoryRowChange(historyRow.id, { effectiveFrom })
                    }
                    placeholder="From"
                    value={historyRow.effectiveFrom}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  <span className="sr-only">Amount</span>
                  <ChargeAmountInput
                    disabled={disabled}
                    isPercentage={isPercentage}
                    onChange={(amount) =>
                      onHistoryRowChange(historyRow.id, { amount })
                    }
                    value={historyRow.amount}
                  />
                </label>
                <DeleteInlineRowButton
                  disabled={disabled}
                  label="dated amount"
                  onDelete={() => onDeleteHistoryRow(historyRow.id)}
                />
              </div>
            ))}
            <Button
              className="w-fit"
              disabled={disabled}
              onClick={onAddHistoryRow}
              size="sm"
              type="button"
              variant="outline"
            >
              Add a dated amount
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function ChargeAmountInput({
  disabled,
  isPercentage,
  onChange,
  value,
}: {
  disabled: boolean
  isPercentage: boolean
  onChange: (amount: string) => void
  value: string
}) {
  return isPercentage ? (
    <PercentageFormInput
      disabled={disabled}
      onChange={onChange}
      placeholder="0"
      value={value}
    />
  ) : (
    <CurrencyFormInput
      disabled={disabled}
      onChange={onChange}
      placeholder="Amount"
      value={value}
    />
  )
}
