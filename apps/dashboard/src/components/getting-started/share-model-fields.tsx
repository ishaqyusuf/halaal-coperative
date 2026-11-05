"use client"

import { useState } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import type { TenantSharePolicySettings } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@halaalvest/ui/components/collapsible"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import {
  usePreservedClientState,
  usePreservedFormState,
} from "@halaalvest/ui/hooks/use-preserved-form-state"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import { ChevronDownIcon } from "lucide-react"
import { DatePickerInput } from "@/components/date-picker-input"
import {
  AddInlineRowButton,
  buildShareHistoryRows,
  createShareHistoryRow,
  CurrencyFormInput,
  DeleteInlineRowButton,
  normalizeShareHistoryRows,
  PercentageFormInput,
  persistShareHistoryRows,
  persistSharePolicy,
  SelectFormInput,
  sharePolicySchema,
  shareHistoryRowHasValue,
  sortShareHistoryRowsByDate,
  validateShareHistoryRows,
  type SharePolicyValues,
  type ShareHistoryRow,
  type ShareRuleValueType,
} from "@/components/forms/tenant-finance-forms"
import { QuickFill } from "@/components/quick-fill"
import type { GettingStartedShareStructureVersionRow } from "@/lib/getting-started/getting-started-page-types"
import {
  fillFirstRowEffectiveFrom,
  shareModelOptions,
  shareRuleOptions,
  type OnePathSavePreparer,
} from "@/lib/getting-started/one-path-finance"

type ShareConfigurationMode = TenantSharePolicySettings["configurationMode"]

// Draft state for the share half of step 7. `prepareSave` validates the share
// model (and the monthly amounts) and returns the save: the share policy
// first, then the monthly share history, which the server stores against the
// active model.
export function useShareModelDraft({
  defaultEffectiveFrom,
  financeStartDate,
  sharePolicy,
  shareStructureVersions,
}: {
  defaultEffectiveFrom: string
  financeStartDate: string | null
  sharePolicy: TenantSharePolicySettings
  shareStructureVersions: GettingStartedShareStructureVersionRow[]
}) {
  const { showError } = useNotifications()
  const hasSavedUnitPolicy = sharePolicy.configurationMode === "unit_based"
  const form = useZodForm<SharePolicyValues>(sharePolicySchema, {
    defaultValues: {
      configurationMode: sharePolicy.configurationMode,
      compulsoryShareUnits: hasSavedUnitPolicy
        ? String(sharePolicy.compulsoryShareUnits)
        : "",
      maximumShareUnits: hasSavedUnitPolicy
        ? String(sharePolicy.maximumShareUnits)
        : "",
      unitAmount: hasSavedUnitPolicy ? String(sharePolicy.unitAmount) : "",
    },
  })
  const clearPreservedPolicy = usePreservedFormState(form, {
    baselineKey: `empty-unsaved-unit-policy-v1:${JSON.stringify(sharePolicy)}`,
    storageKey: "getting-started:share-policy",
  })
  const [historyRows, setHistoryRows] = useState<ShareHistoryRow[]>(() =>
    buildShareHistoryRows(shareStructureVersions)
  )
  const clearPreservedHistoryRows = usePreservedClientState({
    baselineKey: JSON.stringify(shareStructureVersions),
    onRestore: setHistoryRows,
    storageKey: "getting-started:shares:history-rows",
    value: historyRows,
  })

  const prepareSave: OnePathSavePreparer = async () => {
    const isPolicyValid = await form.trigger()

    if (!isPolicyValid) {
      showError(
        "Check your share details",
        "Fix the highlighted share fields, then continue."
      )
      return null
    }

    const values = form.getValues()
    let sortedHistoryRows: ShareHistoryRow[] = []

    if (values.configurationMode === "monthly_history") {
      const validation = validateShareHistoryRows(
        fillFirstRowEffectiveFrom(historyRows, defaultEffectiveFrom),
        financeStartDate
      )

      if (!validation.ok) {
        showError(validation.title, validation.message)
        return null
      }

      sortedHistoryRows = validation.rows
    }

    return async () => {
      await persistSharePolicy(values)

      if (sortedHistoryRows.length > 0) {
        await persistShareHistoryRows(sortedHistoryRows)
      }

      clearPreservedPolicy()
      clearPreservedHistoryRows()
    }
  }

  return {
    form,
    hasSavedUnitPolicy,
    historyRows,
    prepareSave,
    setHistoryRows,
  }
}

type ShareModelDraft = ReturnType<typeof useShareModelDraft>

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

export function ShareModelFields({
  defaultEffectiveFrom,
  disabled,
  draft,
  financeStartDate,
  quickFillEnabled,
}: {
  defaultEffectiveFrom: string
  disabled: boolean
  draft: ShareModelDraft
  financeStartDate: string | null
  quickFillEnabled: boolean
}) {
  const { form, hasSavedUnitPolicy, historyRows, setHistoryRows } = draft
  const selectedMode = form.watch("configurationMode")

  return (
    <Form {...form}>
      <section aria-labelledby="one-path-shares-heading" className="grid gap-4">
        <h3
          className="text-base font-medium text-foreground"
          id="one-path-shares-heading"
        >
          How do members hold shares?
        </h3>
        <FormField
          control={form.control}
          name="configurationMode"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  aria-labelledby="one-path-shares-heading"
                  className="grid gap-2 sm:grid-cols-2"
                  disabled={disabled}
                  onValueChange={(value) => {
                    const mode = value as ShareConfigurationMode

                    // Unit terms start empty when switching from an unsaved
                    // monthly policy (existing behaviour).
                    if (
                      mode === "unit_based" &&
                      field.value !== "unit_based" &&
                      !hasSavedUnitPolicy
                    ) {
                      form.setValue("unitAmount", "")
                      form.setValue("compulsoryShareUnits", "")
                      form.setValue("maximumShareUnits", "")
                    }

                    field.onChange(mode)
                  }}
                  value={field.value}
                >
                  {shareModelOptions.map((option) => (
                    <label
                      className={cn(
                        "flex min-h-11 min-w-0 cursor-pointer items-start gap-3 border border-border/70 bg-background px-4 py-3 text-sm transition-colors",
                        "hover:border-foreground/30 hover:bg-muted/20",
                        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                        "has-[[data-slot=radio-group-item][data-checked]]:border-primary has-[[data-slot=radio-group-item][data-checked]]:bg-primary/5"
                      )}
                      key={option.value}
                    >
                      <RadioGroupItem className="mt-0.5" value={option.value} />
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedMode === "unit_based" ? (
          <div className="grid gap-3 md:grid-cols-3">
            <FormField
              control={form.control}
              name="unitAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price of one unit</FormLabel>
                  <FormControl>
                    <CurrencyFormInput
                      disabled={disabled}
                      onChange={field.onChange}
                      placeholder="Enter amount"
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="compulsoryShareUnits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Each member must hold</FormLabel>
                  <FormControl>
                    <Input
                      disabled={disabled}
                      inputMode="numeric"
                      min="0"
                      placeholder="Units"
                      step="1"
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maximumShareUnits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>No member can hold more than</FormLabel>
                  <FormControl>
                    <Input
                      disabled={disabled}
                      inputMode="numeric"
                      min="1"
                      placeholder="Units"
                      step="1"
                      type="number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <MonthlyShareAmountFields
            defaultEffectiveFrom={defaultEffectiveFrom}
            disabled={disabled}
            financeStartDate={financeStartDate}
            historyRows={historyRows}
            quickFillEnabled={quickFillEnabled}
            setHistoryRows={setHistoryRows}
          />
        )}
      </section>
    </Form>
  )
}

function MonthlyShareAmountFields({
  defaultEffectiveFrom,
  disabled,
  financeStartDate,
  historyRows,
  quickFillEnabled,
  setHistoryRows,
}: {
  defaultEffectiveFrom: string
  disabled: boolean
  financeStartDate: string | null
  historyRows: ShareHistoryRow[]
  quickFillEnabled: boolean
  setHistoryRows: ShareModelDraft["setHistoryRows"]
}) {
  const firstRow = historyRows[0] ?? createShareHistoryRow()
  const laterRows = historyRows.slice(1)
  const [isHistoryOpen, setIsHistoryOpen] = useState(
    () =>
      historyRows.filter(shareHistoryRowHasValue).length > 1 ||
      firstRow.valueType === "percentage"
  )

  function updateRow(
    rowId: string,
    patch: Partial<
      Pick<ShareHistoryRow, "amount" | "effectiveFrom" | "valueType">
    >
  ) {
    setHistoryRows((currentRows) =>
      normalizeShareHistoryRows(
        currentRows.map((row) =>
          row.id === rowId ? { ...row, ...patch } : row
        )
      )
    )
  }

  function addRow() {
    setHistoryRows((currentRows) => [
      ...normalizeShareHistoryRows(currentRows),
      createShareHistoryRow(),
    ])
  }

  function deleteRow(rowId: string) {
    setHistoryRows((currentRows) => {
      const remainingRows = currentRows.filter((row) => row.id !== rowId)

      return remainingRows.length > 0
        ? remainingRows
        : [createShareHistoryRow("share-history-initial")]
    })
  }

  return (
    <div className="grid gap-3">
      <label className="grid max-w-sm gap-1 text-sm font-medium text-foreground">
        Share amount per member, each month
        <ShareAmountInput
          disabled={disabled}
          onChange={(amount) => updateRow(firstRow.id, { amount })}
          row={firstRow}
        />
        <span className="text-xs font-normal text-muted-foreground">
          From {formatShortDate(firstRow.effectiveFrom || defaultEffectiveFrom)}
          . Leave it empty if members don&apos;t add a share amount yet.
        </span>
      </label>
      <Collapsible onOpenChange={setIsHistoryOpen} open={isHistoryOpen}>
        <CollapsibleTrigger
          render={
            <Button className="w-fit" size="sm" type="button" variant="ghost" />
          }
        >
          Amount changed over time?
          <ChevronDownIcon
            className={cn(
              "transition-transform",
              isHistoryOpen && "rotate-180"
            )}
            data-icon="inline-end"
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 grid gap-3 border-l-2 border-primary/30 pl-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Add each date the amount or the rule changed.
            </p>
            {quickFillEnabled ? (
              <QuickFill
                args={{
                  createRow: createShareHistoryRow,
                  hasValue: shareHistoryRowHasValue,
                  minDate: financeStartDate,
                  rows: historyRows,
                  setRows: (updater) =>
                    setHistoryRows(
                      (currentRows) => updater(currentRows) as ShareHistoryRow[]
                    ),
                  sortRows: sortShareHistoryRowsByDate,
                }}
                name="shareHistory"
              />
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-[9.5rem_minmax(0,16rem)] sm:items-start">
            <ShareRowDateField
              disabled={disabled}
              financeStartDate={financeStartDate}
              onChange={(effectiveFrom) =>
                updateRow(firstRow.id, { effectiveFrom })
              }
              placeholder={formatShortDate(defaultEffectiveFrom)}
              value={firstRow.effectiveFrom}
            />
            <ShareRowRuleField
              disabled={disabled}
              onChange={(valueType) => updateRow(firstRow.id, { valueType })}
              value={firstRow.valueType}
            />
          </div>
          {laterRows.map((row) => (
            <div
              className="grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-[9.5rem_minmax(0,16rem)_9.5rem_2rem] sm:items-start"
              key={row.id}
            >
              <ShareRowDateField
                disabled={disabled}
                financeStartDate={financeStartDate}
                onChange={(effectiveFrom) =>
                  updateRow(row.id, { effectiveFrom })
                }
                placeholder="Select date"
                value={row.effectiveFrom}
              />
              <ShareRowRuleField
                disabled={disabled}
                onChange={(valueType) => updateRow(row.id, { valueType })}
                value={row.valueType}
              />
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Amount
                <ShareAmountInput
                  disabled={disabled}
                  onChange={(amount) => updateRow(row.id, { amount })}
                  row={row}
                />
              </label>
              <div className="pt-6">
                <DeleteInlineRowButton
                  disabled={disabled}
                  label="share amount change"
                  onDelete={() => deleteRow(row.id)}
                />
              </div>
            </div>
          ))}
          <AddInlineRowButton
            disabled={disabled}
            label="Add a change"
            onAdd={addRow}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function ShareAmountInput({
  disabled,
  onChange,
  row,
}: {
  disabled: boolean
  onChange: (amount: string) => void
  row: ShareHistoryRow
}) {
  return row.valueType === "percentage" ? (
    <PercentageFormInput
      disabled={disabled}
      onChange={onChange}
      placeholder="10"
      value={row.amount}
    />
  ) : (
    <CurrencyFormInput
      disabled={disabled}
      onChange={onChange}
      placeholder="Enter amount"
      value={row.amount}
    />
  )
}

function ShareRowDateField({
  disabled,
  financeStartDate,
  onChange,
  placeholder,
  value,
}: {
  disabled: boolean
  financeStartDate: string | null
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      From
      <DatePickerInput
        allowClear={false}
        disabled={disabled}
        min={financeStartDate ?? undefined}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function ShareRowRuleField({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean
  onChange: (value: ShareRuleValueType) => void
  value: ShareRuleValueType
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      Rule
      <SelectFormInput
        disabled={disabled}
        onChange={(value) => onChange(value as ShareRuleValueType)}
        options={[...shareRuleOptions]}
        value={value}
      />
    </label>
  )
}
