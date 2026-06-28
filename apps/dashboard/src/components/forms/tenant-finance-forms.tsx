"use client"

import { useState, useTransition } from "react"
import { z } from "zod"
import { ArrowUpDownIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@halaalvest/ui/components/field"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import { Separator } from "@halaalvest/ui/components/separator"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { DatePickerInput } from "@/components/date-picker-input"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { objectToFormData } from "@/lib/form-submit"
import {
  createChargeDefinitionAction,
  createChargeDefinitionVersionAction,
  createShareBusinessAction,
  createShareBusinessProfitEntryAction,
  createTenantShareStructureVersionAction,
  generateShareProfitAllocationsAction,
  publishShareProfitAllocationsAction,
  updateTenantFinanceStartDateAction,
} from "@/lib/dashboard-actions"

function CurrencyFormInput({
  id,
  onChange,
  placeholder,
  value,
}: {
  id?: string
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <CurrencyInput
      allowNegative={false}
      decimalScale={2}
      id={id}
      inputMode="decimal"
      placeholder={placeholder}
      value={value ?? ""}
      valueIsNumericString
      onValueChange={(values) => onChange(values.value)}
    />
  )
}

function SelectFormInput({
  disabled,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  placeholder?: string
  value?: string
}) {
  const hasEmptyOption = options.some((option) => option.value === "")

  return (
    <LabeledSelectInput
      disabled={disabled}
      onValueChange={onChange}
      options={options}
      placeholder={placeholder}
      value={hasEmptyOption && !value ? "" : (value ?? "")}
    />
  )
}

function isBeforeFinanceStartDate(
  value: string | undefined,
  min?: string | null
) {
  return Boolean(value && min && value < min)
}

function setDateBeforeFinanceStartError<
  TName extends "effectiveFrom" | "endDate" | "profitDate" | "startDate",
>(
  form: {
    setError: (
      name: TName,
      error: {
        message: string
        type: "manual"
      }
    ) => void
  },
  name: TName,
  label: string,
  financeStartDate?: string | null
) {
  form.setError(name, {
    message: `${label} cannot be before the cooperative start date (${financeStartDate}).`,
    type: "manual",
  })
}

const startDateSchema = z.object({
  startDate: z.string().min(1, "Start date is required."),
})

type StartDateValues = z.infer<typeof startDateSchema>

export function FinanceStartDateForm({
  defaultStartDate,
}: {
  defaultStartDate?: string | null
}) {
  const form = useZodForm<StartDateValues>(startDateSchema, {
    defaultValues: {
      startDate: defaultStartDate ?? "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: StartDateValues) {
    startTransition(async () => {
      try {
        await updateTenantFinanceStartDateAction(objectToFormData(values))
        showSuccess("Start date updated", "Finance history anchor saved.")
      } catch (error) {
        showError(
          "Could not update start date",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cooperative start date</FormLabel>
              <FormControl>
                <DatePickerInput
                  {...field}
                  allowClear={false}
                  placeholder="Select start date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isPending} type="submit" className="rounded-full">
          Save date
        </Button>
      </form>
    </Form>
  )
}

const shareStructureVersionSchema = z.object({
  amount: z.string().min(1, "Amount is required."),
  effectiveFrom: z.string().min(1, "Effective date is required."),
  notes: z.string().optional(),
  valueType: z.enum(["fixed_amount", "percentage"]),
})

type ShareStructureVersionValues = z.infer<typeof shareStructureVersionSchema>

export function ShareStructureVersionForm({
  financeStartDate,
  onSuccess,
}: {
  financeStartDate?: string | null
  onSuccess?: () => void
}) {
  const form = useZodForm<ShareStructureVersionValues>(
    shareStructureVersionSchema,
    {
      defaultValues: {
        amount: "",
        effectiveFrom: "",
        notes: "",
        valueType: "fixed_amount",
      },
    }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ShareStructureVersionValues) {
    if (isBeforeFinanceStartDate(values.effectiveFrom, financeStartDate)) {
      setDateBeforeFinanceStartError(
        form,
        "effectiveFrom",
        "Effective date",
        financeStartDate
      )
      return
    }

    startTransition(async () => {
      try {
        await createTenantShareStructureVersionAction(objectToFormData(values))
        showSuccess(
          "Share update saved",
          "Cooperative default share history updated."
        )
        form.reset({
          amount: "",
          effectiveFrom: "",
          notes: "",
          valueType: "fixed_amount",
        })
        onSuccess?.()
      } catch (error) {
        showError(
          "Could not save share update",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="effectiveFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effective date</FormLabel>
              <FormControl>
                <DatePickerInput
                  {...field}
                  allowClear={false}
                  min={financeStartDate ?? undefined}
                  placeholder="Select effective date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="valueType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Share rule</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Fixed amount", value: "fixed_amount" },
                    {
                      label: "Percentage after charges",
                      value: "percentage",
                    },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Share value</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="15000 or 10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Annual review adjustment"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button disabled={isPending} type="submit" className="rounded-full">
            Add share update
          </Button>
        </div>
      </form>
    </Form>
  )
}

const chargeDefinitionSchema = z.object({
  amount: z.string().optional(),
  appliesToLoanRequests: z.boolean().default(false),
  appliesToLoans: z.boolean().default(false),
  appliesToMembers: z.boolean().default(true),
  chargeFrequency: z.enum([
    "recurring_monthly",
    "per_contribution",
    "one_time",
    "manual",
  ]),
  chargeValueType: z.enum(["fixed_amount", "percentage"]),
  code: z.string().min(1, "Code is required."),
  effectiveFrom: z.string().optional(),
  isMonthlyLevy: z.boolean().default(false),
  kind: z.enum(["fixed", "percentage"]),
  name: z.string().min(1, "Name is required."),
  purpose: z.enum([
    "general",
    "member_share",
    "loan_fee",
    "membership_fee",
    "penalty",
  ]),
})

type ChargeDefinitionValues = z.infer<typeof chargeDefinitionSchema>

type ChargeHistoryRow = {
  amount: string
  effectiveFrom: string
  id: string
}

function createChargeHistoryRow(id?: string): ChargeHistoryRow {
  return {
    amount: "",
    effectiveFrom: "",
    id:
      id ??
      `charge-history-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }
}

function chargeHistoryRowHasValue(row: ChargeHistoryRow) {
  return Boolean(row.amount || row.effectiveFrom)
}

function chargeHistoryRowIsComplete(row: ChargeHistoryRow) {
  return Boolean(row.amount && row.effectiveFrom)
}

function sortChargeHistoryRowsByDate(a: ChargeHistoryRow, b: ChargeHistoryRow) {
  if (a.effectiveFrom && b.effectiveFrom) {
    return a.effectiveFrom.localeCompare(b.effectiveFrom)
  }

  if (a.effectiveFrom) {
    return -1
  }

  if (b.effectiveFrom) {
    return 1
  }

  return a.id.localeCompare(b.id)
}

export function ChargeDefinitionForm({
  financeStartDate,
  onSuccess,
}: {
  financeStartDate?: string | null
  onSuccess?: () => void
}) {
  const form = useZodForm<ChargeDefinitionValues>(chargeDefinitionSchema, {
    defaultValues: {
      amount: "",
      appliesToLoanRequests: false,
      appliesToLoans: false,
      appliesToMembers: true,
      chargeFrequency: "recurring_monthly",
      chargeValueType: "fixed_amount",
      code: "",
      effectiveFrom: "",
      isMonthlyLevy: false,
      kind: "fixed",
      name: "",
      purpose: "general",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [chargeHistoryRows, setChargeHistoryRows] = useState<
    ChargeHistoryRow[]
  >(() => [createChargeHistoryRow("charge-history-initial")])

  function resetChargeHistoryRows() {
    setChargeHistoryRows([createChargeHistoryRow("charge-history-initial")])
  }

  function updateChargeHistoryRow(
    rowId: string,
    patch: Partial<Pick<ChargeHistoryRow, "amount" | "effectiveFrom">>
  ) {
    setChargeHistoryRows((currentRows) => {
      const updatedRows = currentRows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row
      )
      const compactRows = updatedRows.filter(
        (row, index) =>
          chargeHistoryRowHasValue(row) || index === updatedRows.length - 1
      )
      const lastRow = compactRows.at(-1)

      if (!lastRow) {
        return [createChargeHistoryRow()]
      }

      if (chargeHistoryRowHasValue(lastRow)) {
        return [...compactRows, createChargeHistoryRow()]
      }

      return compactRows
    })
  }

  function sortChargeHistoryRows() {
    setChargeHistoryRows((currentRows) => {
      const sortedRows = currentRows
        .filter(chargeHistoryRowHasValue)
        .sort(sortChargeHistoryRowsByDate)

      return [...sortedRows, createChargeHistoryRow()]
    })
  }

  function onSubmit(values: ChargeDefinitionValues) {
    const startedRows = chargeHistoryRows.filter(chargeHistoryRowHasValue)
    const incompleteRow = startedRows.find(
      (row) => !chargeHistoryRowIsComplete(row)
    )

    if (startedRows.length === 0) {
      showError(
        "Charge history required",
        "Add at least one charge history date and amount."
      )
      return
    }

    if (incompleteRow) {
      showError(
        "Complete charge history",
        "Each charge history row needs both a date and an amount."
      )
      return
    }

    const sortedHistoryRows = startedRows
      .filter(chargeHistoryRowIsComplete)
      .sort(sortChargeHistoryRowsByDate)
    const rowBeforeStartDate = sortedHistoryRows.find((row) =>
      isBeforeFinanceStartDate(row.effectiveFrom, financeStartDate)
    )

    if (rowBeforeStartDate) {
      showError(
        "Date before start",
        `Charge history date cannot be before the cooperative start date (${financeStartDate}).`
      )
      return
    }

    startTransition(async () => {
      try {
        await createChargeDefinitionAction(
          objectToFormData({
            ...values,
            amount: sortedHistoryRows[0]?.amount,
            effectiveFrom: sortedHistoryRows[0]?.effectiveFrom,
            historyAmount: sortedHistoryRows.map((row) => row.amount),
            historyEffectiveFrom: sortedHistoryRows.map(
              (row) => row.effectiveFrom
            ),
          })
        )
        showSuccess(
          "Charge created",
          "New charge definition added to finance setup."
        )
        form.reset({
          amount: "",
          appliesToLoanRequests: false,
          appliesToLoans: false,
          appliesToMembers: true,
          chargeFrequency: "recurring_monthly",
          chargeValueType: "fixed_amount",
          code: "",
          effectiveFrom: "",
          isMonthlyLevy: false,
          kind: "fixed",
          name: "",
          purpose: "general",
        })
        resetChargeHistoryRows()
        onSuccess?.()
      } catch (error) {
        showError(
          "Could not create charge",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Charge name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Administrative fee" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input {...field} placeholder="ADM" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="chargeFrequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    {
                      label: "Recurring monthly",
                      value: "recurring_monthly",
                    },
                    { label: "Per contribution", value: "per_contribution" },
                    { label: "One time", value: "one_time" },
                    { label: "Manual", value: "manual" },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="chargeValueType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value type</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Fixed amount", value: "fixed_amount" },
                    { label: "Percentage", value: "percentage" },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kind</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Fixed", value: "fixed" },
                    { label: "Percentage", value: "percentage" },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "General charge", value: "general" },
                    { label: "Member share", value: "member_share" },
                    { label: "Loan fee", value: "loan_fee" },
                    { label: "Membership fee", value: "membership_fee" },
                    { label: "Penalty", value: "penalty" },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2 space-y-3 border border-border/70 bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            <h3 className="shrink-0 text-sm font-medium">Charge History</h3>
            <Separator className="min-w-10 flex-1" />
            <Button
              aria-label="Sort charge history by date"
              onClick={sortChargeHistoryRows}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={ArrowUpDownIcon} data-icon="inline-start" />
            </Button>
            <Button
              onClick={resetChargeHistoryRows}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear
            </Button>
          </div>
          <FieldGroup className="gap-3">
            {chargeHistoryRows.map((row) => (
              <div
                className="grid grid-cols-2 gap-2 sm:gap-3"
                key={row.id}
              >
                <Field>
                  <FieldLabel htmlFor={`charge-history-date-${row.id}`}>
                    Date
                  </FieldLabel>
                  <DatePickerInput
                    allowClear={false}
                    id={`charge-history-date-${row.id}`}
                    min={financeStartDate ?? undefined}
                    onChange={(value) =>
                      updateChargeHistoryRow(row.id, {
                        effectiveFrom: value,
                      })
                    }
                    placeholder="Date"
                    value={row.effectiveFrom}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`charge-history-amount-${row.id}`}>
                    Amount
                  </FieldLabel>
                  <CurrencyFormInput
                    id={`charge-history-amount-${row.id}`}
                    onChange={(amount) =>
                      updateChargeHistoryRow(row.id, { amount })
                    }
                    placeholder="2000"
                    value={row.amount}
                  />
                </Field>
              </div>
            ))}
          </FieldGroup>
        </div>
        <div className="flex justify-end md:col-span-2">
          <Button disabled={isPending} type="submit">
            Add charge
          </Button>
        </div>
      </form>
    </Form>
  )
}

const chargeVersionSchema = z.object({
  amount: z.string().min(1, "Amount is required."),
  chargeDefinitionId: z.string().min(1, "Charge is required."),
  chargeValueType: z.enum(["fixed_amount", "percentage"]),
  effectiveFrom: z.string().min(1, "Effective date is required."),
  kind: z.enum(["fixed", "percentage"]),
  notes: z.string().optional(),
})

type ChargeVersionValues = z.infer<typeof chargeVersionSchema>

export function ChargeDefinitionVersionForm({
  chargeDefinitions,
  financeStartDate,
}: {
  chargeDefinitions: Array<{ id: string; kind: string; label: string }>
  financeStartDate?: string | null
}) {
  const form = useZodForm<ChargeVersionValues>(chargeVersionSchema, {
    defaultValues: {
      amount: "",
      chargeDefinitionId: chargeDefinitions[0]?.id ?? "",
      chargeValueType:
        chargeDefinitions[0]?.kind === "percentage"
          ? "percentage"
          : "fixed_amount",
      effectiveFrom: "",
      kind:
        (chargeDefinitions[0]?.kind as "fixed" | "percentage" | undefined) ??
        "fixed",
      notes: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ChargeVersionValues) {
    if (isBeforeFinanceStartDate(values.effectiveFrom, financeStartDate)) {
      setDateBeforeFinanceStartError(
        form,
        "effectiveFrom",
        "Effective date",
        financeStartDate
      )
      return
    }

    startTransition(async () => {
      try {
        await createChargeDefinitionVersionAction(objectToFormData(values))
        showSuccess("Charge update saved", "Charge amount history updated.")
        form.reset({
          amount: "",
          chargeDefinitionId: chargeDefinitions[0]?.id ?? "",
          chargeValueType:
            chargeDefinitions[0]?.kind === "percentage"
              ? "percentage"
              : "fixed_amount",
          effectiveFrom: "",
          kind:
            (chargeDefinitions[0]?.kind as
              | "fixed"
              | "percentage"
              | undefined) ?? "fixed",
          notes: "",
        })
      } catch (error) {
        showError(
          "Could not save charge update",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="chargeDefinitionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Charge</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Select a charge", value: "" },
                    ...chargeDefinitions.map((charge) => ({
                      label: charge.label,
                      value: charge.id,
                    })),
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="effectiveFrom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effective date</FormLabel>
              <FormControl>
                <DatePickerInput
                  {...field}
                  allowClear={false}
                  min={financeStartDate ?? undefined}
                  placeholder="Select effective date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kind</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Fixed", value: "fixed" },
                    { label: "Percentage", value: "percentage" },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="chargeValueType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Value type</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Fixed amount", value: "fixed_amount" },
                    { label: "Percentage", value: "percentage" },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Updated amount</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="2500" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Updated for new fiscal period"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button disabled={isPending} type="submit" className="rounded-full">
            Add charge update
          </Button>
        </div>
      </form>
    </Form>
  )
}

const shareBusinessSchema = z.object({
  capitalAmount: z.string().min(1, "Capital amount is required."),
  endDate: z.string().optional(),
  linkedDividendPeriodId: z.string().optional(),
  name: z.string().min(1, "Business name is required."),
  notes: z.string().optional(),
  profitAmount: z.string().min(1, "Profit amount is required."),
  startDate: z.string().min(1, "Start date is required."),
  status: z.enum(["planned", "active", "completed", "archived"]),
})

type ShareBusinessValues = z.infer<typeof shareBusinessSchema>

export function ShareBusinessForm({
  dividendPeriods,
  financeStartDate,
  onSuccess,
}: {
  dividendPeriods: Array<{ id: string; label: string }>
  financeStartDate?: string | null
  onSuccess?: () => void
}) {
  const form = useZodForm<ShareBusinessValues>(shareBusinessSchema, {
    defaultValues: {
      capitalAmount: "",
      endDate: "",
      linkedDividendPeriodId: "",
      name: "",
      notes: "",
      profitAmount: "",
      startDate: "",
      status: "planned",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const watchedStartDate = form.watch("startDate")

  function onSubmit(values: ShareBusinessValues) {
    if (isBeforeFinanceStartDate(values.startDate, financeStartDate)) {
      setDateBeforeFinanceStartError(
        form,
        "startDate",
        "Start date",
        financeStartDate
      )
      return
    }

    if (isBeforeFinanceStartDate(values.endDate, financeStartDate)) {
      setDateBeforeFinanceStartError(
        form,
        "endDate",
        "End date",
        financeStartDate
      )
      return
    }

    startTransition(async () => {
      try {
        await createShareBusinessAction(objectToFormData(values))
        showSuccess(
          "Business recorded",
          "Historical business and profit record saved."
        )
        form.reset({
          capitalAmount: "",
          endDate: "",
          linkedDividendPeriodId: "",
          name: "",
          notes: "",
          profitAmount: "",
          startDate: "",
          status: "planned",
        })
        onSuccess?.()
      } catch (error) {
        showError(
          "Could not save business",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Business name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ramadan retail pool" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="capitalAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capital</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="500000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="profitAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profit</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="85000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start date</FormLabel>
              <FormControl>
                <DatePickerInput
                  {...field}
                  allowClear={false}
                  min={financeStartDate ?? undefined}
                  placeholder="Select start date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End date</FormLabel>
              <FormControl>
                <DatePickerInput
                  {...field}
                  min={watchedStartDate || financeStartDate || undefined}
                  placeholder="Select end date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Planned", value: "planned" },
                    { label: "Active", value: "active" },
                    { label: "Completed", value: "completed" },
                    { label: "Archived", value: "archived" },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="linkedDividendPeriodId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Linked dividend period</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Not linked yet", value: "" },
                    ...dividendPeriods.map((period) => ({
                      label: period.label,
                      value: period.id,
                    })),
                  ]}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Used for seasonal trading profit distribution."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button disabled={isPending} type="submit" className="rounded-full">
            Record business
          </Button>
        </div>
      </form>
    </Form>
  )
}

const shareBusinessProfitEntrySchema = z.object({
  allocatableProfitAmount: z
    .string()
    .min(1, "Final allocatable profit is required."),
  expenseAmount: z.string().optional(),
  linkedDividendPeriodId: z.string().optional(),
  notes: z.string().optional(),
  profitAmount: z.string().min(1, "Profit amount is required."),
  profitDate: z.string().min(1, "Profit date is required."),
  reason: z.string().optional(),
  shareBusinessId: z.string().min(1, "Business is required."),
  sourceType: z.enum(["manual", "backfill", "import"]),
  status: z.enum(["draft", "reviewed", "approved", "archived"]),
})

type ShareBusinessProfitEntryValues = z.infer<
  typeof shareBusinessProfitEntrySchema
>

export function ShareBusinessProfitEntryForm({
  businesses,
  dividendPeriods,
  financeStartDate,
}: {
  businesses: Array<{ id: string; label: string }>
  dividendPeriods: Array<{ id: string; label: string }>
  financeStartDate?: string | null
}) {
  const form = useZodForm<ShareBusinessProfitEntryValues>(
    shareBusinessProfitEntrySchema,
    {
      defaultValues: {
        allocatableProfitAmount: "",
        expenseAmount: "",
        linkedDividendPeriodId: "",
        notes: "",
        profitAmount: "",
        profitDate: "",
        reason: "",
        shareBusinessId: businesses[0]?.id ?? "",
        sourceType: "manual",
        status: "draft",
      },
    }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ShareBusinessProfitEntryValues) {
    if (isBeforeFinanceStartDate(values.profitDate, financeStartDate)) {
      setDateBeforeFinanceStartError(
        form,
        "profitDate",
        "Profit date",
        financeStartDate
      )
      return
    }

    startTransition(async () => {
      try {
        await createShareBusinessProfitEntryAction(objectToFormData(values))
        showSuccess(
          "Profit recorded",
          "Business profit entry saved for share allocation."
        )
        form.reset({
          allocatableProfitAmount: "",
          expenseAmount: "",
          linkedDividendPeriodId: "",
          notes: "",
          profitAmount: "",
          profitDate: "",
          reason: "",
          shareBusinessId: businesses[0]?.id ?? "",
          sourceType: "manual",
          status: "draft",
        })
      } catch (error) {
        showError(
          "Could not save profit",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="shareBusinessId"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Business</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={businesses.map((business) => ({
                    label: business.label,
                    value: business.id,
                  }))}
                  placeholder="Select business"
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="profitAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recorded profit</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="85000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expenseAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expenses / charges</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="5000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allocatableProfitAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Final allocatable profit</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="80000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="profitDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profit date</FormLabel>
              <FormControl>
                <DatePickerInput
                  {...field}
                  allowClear={false}
                  min={financeStartDate ?? undefined}
                  placeholder="Select profit date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Draft", value: "draft" },
                    { label: "Reviewed", value: "reviewed" },
                    { label: "Approved", value: "approved" },
                    { label: "Archived", value: "archived" },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sourceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Manual", value: "manual" },
                    { label: "Backfill", value: "backfill" },
                    { label: "Import", value: "import" },
                  ]}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="linkedDividendPeriodId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Linked dividend period</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={field.onChange}
                  options={[
                    { label: "Not linked yet", value: "" },
                    ...dividendPeriods.map((period) => ({
                      label: period.label,
                      value: period.id,
                    })),
                  ]}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Reason</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Board-approved historical profit distribution"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Historical profit backfill for this business."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button
            disabled={isPending || businesses.length === 0}
            type="submit"
            className="rounded-full"
          >
            Record profit
          </Button>
        </div>
      </form>
    </Form>
  )
}

export function GenerateShareProfitAllocationsButton({
  profitEntryId,
}: {
  profitEntryId: string
}) {
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      try {
        await generateShareProfitAllocationsAction(
          objectToFormData({ profitEntryId })
        )
        showSuccess(
          "Allocations generated",
          "Profit was split by member share percentage."
        )
      } catch (error) {
        showError(
          "Could not generate allocations",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Button
      disabled={isPending}
      type="button"
      variant="outline"
      className="rounded-full"
      onClick={onClick}
    >
      Generate allocations
    </Button>
  )
}

export function PublishShareProfitAllocationsButton({
  disabled,
  profitEntryId,
}: {
  disabled?: boolean
  profitEntryId: string
}) {
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onClick() {
    startTransition(async () => {
      try {
        await publishShareProfitAllocationsAction(
          objectToFormData({ profitEntryId })
        )
        showSuccess(
          "Allocations published",
          "Share profit allocations were pushed to the linked dividend period."
        )
      } catch (error) {
        showError(
          "Could not publish allocations",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Button
      disabled={disabled || isPending}
      type="button"
      variant="outline"
      className="rounded-full"
      onClick={onClick}
    >
      Publish
    </Button>
  )
}
