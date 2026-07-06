"use client"

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react"
import { z } from "zod"
import { useTenantRouter } from "@halaalvest/tenant-url/next"
import { ArrowUpDownIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  CurrencyInput,
  CurrencyPrefixInput,
} from "@halaalvest/ui/components/currency-input"
import { Field, FieldGroup, FieldLabel } from "@halaalvest/ui/components/field"
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Separator } from "@halaalvest/ui/components/separator"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import { DatePickerInput } from "@/components/date-picker-input"
import { GettingStartedFooterPortal } from "@/components/getting-started-footer-slot"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { QuickFill } from "@/components/quick-fill"
import { objectToFormData } from "@/lib/form-submit"
import type { TenantBusinessProfitPolicySettings } from "@halaalvest/db"
import { PlusIcon, Trash2Icon } from "lucide-react"
import {
  createChargeDefinitionAction,
  createChargeDefinitionVersionAction,
  createShareBusinessAction,
  createShareBusinessProfitEntryAction,
  createTenantShareStructureVersionAction,
  generateShareProfitAllocationsAction,
  publishShareProfitAllocationsAction,
  updateChargeDefinitionAction,
  updateChargeDefinitionVersionAction,
  updateShareBusinessAction,
  updateShareBusinessProfitEntryAction,
  updateTenantFinanceStartDateAction,
  updateTenantBusinessProfitPolicyAction,
} from "@/lib/dashboard-actions"

const compactInputTableClassName =
  "w-full table-fixed border-separate border-spacing-x-2 border-spacing-y-2 border-0 [&_td]:border-0 [&_td]:p-0 [&_th]:border-0 [&_th]:p-0 [&_tr]:border-0"

function DeleteInlineRowButton({
  disabled,
  label,
  onDelete,
}: {
  disabled?: boolean
  label: string
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            aria-label={`Delete ${label}`}
            className="size-8"
            disabled={disabled}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <Trash2Icon className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the row from the form before it is saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete()
              setOpen(false)
            }}
            type="button"
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function AddInlineRowButton({
  disabled,
  label,
  onAdd,
}: {
  disabled?: boolean
  label: string
  onAdd: () => void
}) {
  return (
    <Button
      className="w-full"
      disabled={disabled}
      onClick={onAdd}
      type="button"
      variant="outline"
    >
      <PlusIcon className="size-4" />
      {label}
    </Button>
  )
}

function CurrencyFormInput({
  disabled,
  id,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean
  id?: string
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <CurrencyInput
      allowNegative={false}
      decimalScale={2}
      disabled={disabled}
      id={id}
      inputMode="decimal"
      placeholder={placeholder}
      value={value ?? ""}
      valueIsNumericString
      onValueChange={(values) => onChange(values.value)}
    />
  )
}

function PercentageFormInput({
  disabled,
  id,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean
  id?: string
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <InputGroup>
      <InputGroupInput
        className="text-right"
        disabled={disabled}
        id={id}
        inputMode="decimal"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step="0.01"
        type="number"
        value={value ?? ""}
      />
      <InputGroupAddon align="inline-end">%</InputGroupAddon>
    </InputGroup>
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
  const today = new Date().toISOString().slice(0, 10)
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
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="overflow-x-auto">
          <table className={`${compactInputTableClassName} min-w-[360px]`}>
            <colgroup>
              <col />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr>
                <th
                  className="text-left text-xs font-medium text-muted-foreground"
                  scope="col"
                >
                  Start date
                </th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                <td>
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <DatePickerInput
                            {...field}
                            allowClear={false}
                            max={today}
                            placeholder="Select start date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </td>
                <td>
                  <Button disabled={isPending} type="submit">
                    Save
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </form>
    </Form>
  )
}

const businessProfitPolicySchema = z
  .object({
    defaultDistributablePercentage: z
      .string()
      .min(1, "Distributable percentage is required."),
    distributionBasis: z.enum(["share_capital_balance"]),
    expenseTreatment: z.enum(["deduct_reviewed_expenses_before_distribution"]),
    financialYearStartMonth: z
      .string()
      .min(1, "Financial year start month is required."),
    historicalProfitMigrationMode: z.enum([
      "manual_review_required",
      "import_historical_profit_pools",
      "no_historical_business_profit",
    ]),
    profitDistributionFrequency: z.enum([
      "annual",
      "semi_annual",
      "quarterly",
      "ad_hoc",
    ]),
    requiresProfitDistributionApproval: z.boolean().default(true),
    reserveRetentionPercentage: z
      .string()
      .min(1, "Reserve retention is required."),
  })
  .superRefine((values, ctx) => {
    const financialYearStartMonth = Number(values.financialYearStartMonth)
    const distributable = Number(values.defaultDistributablePercentage)
    const reserve = Number(values.reserveRetentionPercentage)

    if (
      !Number.isInteger(financialYearStartMonth) ||
      financialYearStartMonth < 1 ||
      financialYearStartMonth > 12
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Financial year start month must be between 1 and 12.",
        path: ["financialYearStartMonth"],
      })
    }

    if (
      !Number.isFinite(distributable) ||
      distributable < 0 ||
      distributable > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Distributable percentage must be between 0 and 100.",
        path: ["defaultDistributablePercentage"],
      })
    }

    if (!Number.isFinite(reserve) || reserve < 0 || reserve > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reserve retention must be between 0 and 100.",
        path: ["reserveRetentionPercentage"],
      })
    }

    if (
      Number.isFinite(distributable) &&
      Number.isFinite(reserve) &&
      distributable + reserve > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Distributable plus reserve cannot exceed 100.",
        path: ["reserveRetentionPercentage"],
      })
    }
  })

type BusinessProfitPolicyValues = z.infer<typeof businessProfitPolicySchema>

const distributionFrequencyOptions = [
  { label: "Annual", value: "annual" },
  { label: "Semi-annual", value: "semi_annual" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Ad hoc", value: "ad_hoc" },
]

const financialYearStartMonthOptions = [
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
]

const distributionBasisOptions = [
  { label: "Share capital balance", value: "share_capital_balance" },
]

const expenseTreatmentOptions = [
  {
    label: "Deduct reviewed expenses before distribution",
    value: "deduct_reviewed_expenses_before_distribution",
  },
]

const historicalProfitMigrationModeOptions = [
  { label: "Manual review required", value: "manual_review_required" },
  {
    label: "Import historical profit pools",
    value: "import_historical_profit_pools",
  },
  {
    label: "No historical business profit",
    value: "no_historical_business_profit",
  },
]

export function BusinessProfitPolicyForm({
  defaultPolicy,
  formId,
  redirectTo,
  showSubmitButton = true,
}: {
  defaultPolicy: TenantBusinessProfitPolicySettings
  formId?: string
  redirectTo?: string
  showSubmitButton?: boolean
}) {
  const router = useTenantRouter()
  const fallbackFormId = useId()
  const resolvedFormId = formId ?? fallbackFormId
  const form = useZodForm<BusinessProfitPolicyValues>(
    businessProfitPolicySchema,
    {
      defaultValues: {
        defaultDistributablePercentage: String(
          defaultPolicy.defaultDistributablePercentage
        ),
        distributionBasis: defaultPolicy.distributionBasis,
        expenseTreatment: defaultPolicy.expenseTreatment,
        financialYearStartMonth: String(defaultPolicy.financialYearStartMonth),
        historicalProfitMigrationMode:
          defaultPolicy.historicalProfitMigrationMode,
        profitDistributionFrequency: defaultPolicy.profitDistributionFrequency,
        requiresProfitDistributionApproval:
          defaultPolicy.requiresProfitDistributionApproval,
        reserveRetentionPercentage: String(
          defaultPolicy.reserveRetentionPercentage
        ),
      },
    }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: BusinessProfitPolicyValues) {
    startTransition(async () => {
      try {
        await updateTenantBusinessProfitPolicyAction(objectToFormData(values))
        showSuccess("Policy saved", "Business profit policy updated.")
        if (redirectTo) {
          router.push(redirectTo)
          return
        }
      } catch (error) {
        showError(
          "Could not save policy",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        id={resolvedFormId}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            control={form.control}
            name="profitDistributionFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <FormControl>
                  <SelectFormInput
                    onChange={field.onChange}
                    options={distributionFrequencyOptions}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="financialYearStartMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year start</FormLabel>
                <FormControl>
                  <SelectFormInput
                    onChange={field.onChange}
                    options={financialYearStartMonthOptions}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultDistributablePercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Distributable</FormLabel>
                <FormControl>
                  <PercentageFormInput
                    {...field}
                    placeholder="Enter distributable percentage"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reserveRetentionPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reserve</FormLabel>
                <FormControl>
                  <PercentageFormInput
                    {...field}
                    placeholder="Enter reserve percentage"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="distributionBasis"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Basis</FormLabel>
                <FormControl>
                  <SelectFormInput
                    onChange={field.onChange}
                    options={distributionBasisOptions}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expenseTreatment"
            render={({ field }) => (
              <FormItem className="xl:col-span-2">
                <FormLabel>Expense</FormLabel>
                <FormControl>
                  <SelectFormInput
                    onChange={field.onChange}
                    options={expenseTreatmentOptions}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="historicalProfitMigrationMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>History</FormLabel>
                <FormControl>
                  <SelectFormInput
                    onChange={field.onChange}
                    options={historicalProfitMigrationModeOptions}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="requiresProfitDistributionApproval"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3 md:mt-6">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-xs">Approval required</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {showSubmitButton ? (
          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              Save
            </Button>
          </div>
        ) : null}
        {redirectTo ? (
          <GettingStartedFooterPortal>
            <Button disabled={isPending} form={resolvedFormId} type="submit">
              Next
            </Button>
          </GettingStartedFooterPortal>
        ) : null}
      </form>
    </Form>
  )
}

const shareStructureVersionSchema = z.object({
  notes: z.string().optional(),
})

type ShareStructureVersionValues = z.infer<typeof shareStructureVersionSchema>

type ShareRuleValueType = "fixed_amount" | "percentage"

type ShareHistoryRow = {
  amount: string
  effectiveFrom: string
  id: string
  valueType: ShareRuleValueType
}

function createShareHistoryRow(id?: string): ShareHistoryRow {
  return {
    amount: "",
    effectiveFrom: "",
    id:
      id ??
      `share-history-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    valueType: "fixed_amount",
  }
}

function shareHistoryRowHasValue(row: ShareHistoryRow) {
  return Boolean(
    row.amount || row.effectiveFrom || row.valueType !== "fixed_amount"
  )
}

function normalizeShareHistoryRows(rows: ShareHistoryRow[]) {
  const compactRows = rows.filter(
    (row, index) => shareHistoryRowHasValue(row) || index === rows.length - 1
  )

  return compactRows.length > 0 ? compactRows : [createShareHistoryRow()]
}

function shareHistoryRowIsComplete(row: ShareHistoryRow) {
  return Boolean(row.amount && row.effectiveFrom && row.valueType)
}

function sortShareHistoryRowsByDate(a: ShareHistoryRow, b: ShareHistoryRow) {
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

export function ShareStructureVersionForm({
  financeStartDate,
  formId,
  onSuccess,
  redirectTo,
  showSubmitButton = true,
  stayOnStepHref,
}: {
  financeStartDate?: string | null
  formId?: string
  onSuccess?: () => void
  redirectTo?: string
  showSubmitButton?: boolean
  stayOnStepHref?: string
}) {
  const router = useTenantRouter()
  const fallbackFormId = useId()
  const resolvedFormId = formId ?? fallbackFormId
  const form = useZodForm<ShareStructureVersionValues>(
    shareStructureVersionSchema,
    {
      defaultValues: {
        notes: "",
      },
    }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [shareHistoryRows, setShareHistoryRows] = useState<ShareHistoryRow[]>(
    () => [createShareHistoryRow("share-history-initial")]
  )

  function onSubmit(values: ShareStructureVersionValues) {
    const startedRows = shareHistoryRows.filter(shareHistoryRowHasValue)
    const incompleteRow = startedRows.find(
      (row) => !shareHistoryRowIsComplete(row)
    )

    if (startedRows.length === 0) {
      showError(
        "Share history required",
        "Add at least one share history date, rule, and value."
      )
      return
    }

    if (incompleteRow) {
      showError(
        "Complete share history",
        "Each share history row needs a date, rule, and value."
      )
      return
    }

    const sortedHistoryRows = startedRows
      .filter(shareHistoryRowIsComplete)
      .sort(sortShareHistoryRowsByDate)
    const rowBeforeStartDate = sortedHistoryRows.find((row) =>
      isBeforeFinanceStartDate(row.effectiveFrom, financeStartDate)
    )

    if (rowBeforeStartDate) {
      showError(
        "Date before start",
        `Share history date cannot be before the cooperative start date (${financeStartDate}).`
      )
      return
    }

    if (stayOnStepHref && !redirectTo) {
      router.replace(stayOnStepHref)
    }

    startTransition(async () => {
      try {
        await createTenantShareStructureVersionAction(
          objectToFormData({
            ...values,
            amount: sortedHistoryRows[0]?.amount,
            effectiveFrom: sortedHistoryRows[0]?.effectiveFrom,
            historyAmount: sortedHistoryRows.map((row) => row.amount),
            historyEffectiveFrom: sortedHistoryRows.map(
              (row) => row.effectiveFrom
            ),
            historyValueType: sortedHistoryRows.map((row) => row.valueType),
            valueType: sortedHistoryRows[0]?.valueType,
          })
        )
        showSuccess(
          "Share update saved",
          "Cooperative default share history updated."
        )
        form.reset({
          notes: "",
        })
        resetShareHistoryRows()
        onSuccess?.()
        if (redirectTo) {
          router.push(redirectTo)
          return
        }
      } catch (error) {
        showError(
          "Could not save share update",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function resetShareHistoryRows() {
    setShareHistoryRows([createShareHistoryRow("share-history-initial")])
  }

  function updateShareHistoryRow(
    rowId: string,
    patch: Partial<
      Pick<ShareHistoryRow, "amount" | "effectiveFrom" | "valueType">
    >
  ) {
    setShareHistoryRows((currentRows) => {
      const updatedRows = currentRows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row
      )

      return normalizeShareHistoryRows(updatedRows)
    })
  }

  function addShareHistoryRow() {
    setShareHistoryRows((currentRows) => [
      ...normalizeShareHistoryRows(currentRows),
      createShareHistoryRow(),
    ])
  }

  function deleteShareHistoryRow(rowId: string) {
    setShareHistoryRows((currentRows) => {
      const compactRows = currentRows.filter((row) => row.id !== rowId)

      return compactRows.length > 0
        ? compactRows
        : [createShareHistoryRow("share-history-initial")]
    })
  }

  return (
    <Form {...form}>
      <form
        className="space-y-3"
        id={resolvedFormId}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="shrink-0 text-sm font-medium">Share History</h3>
            <div className="min-w-10 flex-1 border-t border-border/70" />
            <QuickFill
              args={{
                createRow: createShareHistoryRow,
                hasValue: shareHistoryRowHasValue,
                minDate: financeStartDate,
                rows: shareHistoryRows,
                setRows: (updater) =>
                  setShareHistoryRows(
                    (currentRows) => updater(currentRows) as ShareHistoryRow[]
                  ),
                sortRows: sortShareHistoryRowsByDate,
              }}
              name="shareHistory"
            />
            <Button
              onClick={resetShareHistoryRows}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className={`${compactInputTableClassName} min-w-[560px]`}>
              <colgroup>
                <col className="w-[150px]" />
                <col />
                <col className="w-[150px]" />
                <col className="w-8" />
              </colgroup>
              <thead>
                <tr>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground"
                    scope="col"
                  >
                    Date
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground"
                    scope="col"
                  >
                    Rule
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground"
                    scope="col"
                  >
                    Value
                  </th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shareHistoryRows.map((row) => (
                  <tr className="align-top" key={row.id}>
                    <td>
                      <DatePickerInput
                        allowClear={false}
                        min={financeStartDate ?? undefined}
                        onChange={(effectiveFrom) =>
                          updateShareHistoryRow(row.id, { effectiveFrom })
                        }
                        placeholder="Effective Date"
                        value={row.effectiveFrom}
                      />
                    </td>
                    <td>
                      <SelectFormInput
                        onChange={(value) =>
                          updateShareHistoryRow(row.id, {
                            valueType: value as ShareRuleValueType,
                          })
                        }
                        options={[
                          { label: "Fixed amount", value: "fixed_amount" },
                          {
                            label: "Percentage after charges",
                            value: "percentage",
                          },
                        ]}
                        value={row.valueType}
                      />
                    </td>
                    <td>
                      {row.valueType === "percentage" ? (
                        <PercentageFormInput
                          onChange={(amount) =>
                            updateShareHistoryRow(row.id, { amount })
                          }
                          placeholder="10"
                          value={row.amount}
                        />
                      ) : (
                        <CurrencyFormInput
                          onChange={(amount) =>
                            updateShareHistoryRow(row.id, { amount })
                          }
                          placeholder="15000"
                          value={row.amount}
                        />
                      )}
                    </td>
                    <td>
                      <DeleteInlineRowButton
                        disabled={
                          shareHistoryRows.length === 1 &&
                          !shareHistoryRowHasValue(row)
                        }
                        label="share history row"
                        onDelete={() => deleteShareHistoryRow(row.id)}
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4}>
                    <AddInlineRowButton
                      disabled={isPending}
                      label="Add Amount"
                      onAdd={addShareHistoryRow}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {showSubmitButton ? (
          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              Add share
            </Button>
          </div>
        ) : null}
        {redirectTo ? (
          <GettingStartedFooterPortal>
            <Button disabled={isPending} form={resolvedFormId} type="submit">
              Next
            </Button>
          </GettingStartedFooterPortal>
        ) : null}
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

function getChargeKindForValueType(
  chargeValueType: ChargeDefinitionValues["chargeValueType"]
): ChargeDefinitionValues["kind"] {
  return chargeValueType === "percentage" ? "percentage" : "fixed"
}

type ChargeHistoryRow = {
  amount: string
  effectiveFrom: string
  id: string
  versionId: string
}

function createChargeHistoryRow(id?: string): ChargeHistoryRow {
  return {
    amount: "",
    effectiveFrom: "",
    id:
      id ??
      `charge-history-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    versionId: "",
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

type ChargeDefinitionInitialDefinition = {
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
  appliesToMembers?: boolean
  chargeFrequency: ChargeDefinitionValues["chargeFrequency"]
  chargeValueType: ChargeDefinitionValues["chargeValueType"]
  code: string
  id: string
  isActive: boolean
  isMonthlyLevy?: boolean
  kind: ChargeDefinitionValues["kind"]
  name: string
  purpose?: ChargeDefinitionValues["purpose"]
  versions: Array<{
    amount: number
    effectiveFrom: string
    id: string
  }>
}

type ChargeDefinitionInputRow = ChargeDefinitionValues & {
  chargeDefinitionId: string
  historyRows: ChargeHistoryRow[]
  id: string
  isActive: boolean
  saved: boolean
}

function createChargeDefinitionRow(id?: string): ChargeDefinitionInputRow {
  const rowId =
    id ??
    `charge-definition-${Date.now()}-${Math.random().toString(36).slice(2)}`

  return {
    amount: "",
    appliesToLoanRequests: false,
    appliesToLoans: false,
    appliesToMembers: true,
    chargeFrequency: "recurring_monthly",
    chargeValueType: "fixed_amount",
    chargeDefinitionId: "",
    code: "",
    effectiveFrom: "",
    historyRows: [createChargeHistoryRow(`${rowId}-history`)],
    id: rowId,
    isActive: true,
    isMonthlyLevy: false,
    kind: "fixed",
    name: "",
    purpose: "general",
    saved: false,
  }
}

function buildChargeDefinitionRows(
  initialDefinitions: ChargeDefinitionInitialDefinition[] | undefined
) {
  const savedRows =
    initialDefinitions?.map((definition) => ({
      ...createChargeDefinitionRow(`charge-definition-${definition.id}`),
      appliesToLoanRequests: definition.appliesToLoanRequests ?? false,
      appliesToLoans: definition.appliesToLoans ?? false,
      appliesToMembers: definition.appliesToMembers ?? true,
      chargeFrequency: definition.chargeFrequency,
      chargeValueType: definition.chargeValueType,
      chargeDefinitionId: definition.id,
      code: definition.code,
      historyRows:
        definition.versions.length > 0
          ? definition.versions.map((version) => ({
              amount: String(version.amount),
              effectiveFrom: version.effectiveFrom,
              id: `charge-history-${version.id}`,
              versionId: version.id,
            }))
          : [createChargeHistoryRow(`charge-history-${definition.id}`)],
      isActive: definition.isActive,
      isMonthlyLevy: definition.isMonthlyLevy ?? false,
      kind: getChargeKindForValueType(definition.chargeValueType),
      name: definition.name,
      purpose: definition.purpose ?? "general",
      saved: true,
    })) ?? []

  return savedRows.length > 0
    ? savedRows
    : [createChargeDefinitionRow("charge-definition-initial")]
}

function chargeDefinitionRowHasValue(row: ChargeDefinitionInputRow) {
  return Boolean(
    row.code || row.name || row.historyRows.some(chargeHistoryRowHasValue)
  )
}

function normalizeChargeHistoryRows(rows: ChargeHistoryRow[]) {
  const compactRows = rows.filter(
    (row, index) => chargeHistoryRowHasValue(row) || index === rows.length - 1
  )

  return compactRows.length > 0 ? compactRows : [createChargeHistoryRow()]
}

function normalizeChargeDefinitionRows(rows: ChargeDefinitionInputRow[]) {
  const compactRows = rows.filter(
    (row) => row.saved || chargeDefinitionRowHasValue(row)
  )

  return compactRows.length > 0 ? compactRows : [createChargeDefinitionRow()]
}

export function ChargeDefinitionForm({
  financeStartDate,
  formId,
  initialDefinitions,
  onSuccess,
  redirectTo,
  showSubmitButton = true,
  stayOnStepHref,
}: {
  financeStartDate?: string | null
  formId?: string
  initialDefinitions?: ChargeDefinitionInitialDefinition[]
  onSuccess?: () => void
  redirectTo?: string
  showSubmitButton?: boolean
  stayOnStepHref?: string
}) {
  const router = useTenantRouter()
  const fallbackFormId = useId()
  const resolvedFormId = formId ?? fallbackFormId
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [chargeRows, setChargeRows] = useState<ChargeDefinitionInputRow[]>(() =>
    buildChargeDefinitionRows(initialDefinitions)
  )

  function resetChargeRows() {
    setChargeRows(buildChargeDefinitionRows(initialDefinitions))
  }

  function updateChargeRow(
    rowId: string,
    patch: Partial<
      Pick<
        ChargeDefinitionInputRow,
        | "appliesToLoanRequests"
        | "appliesToLoans"
        | "appliesToMembers"
        | "chargeFrequency"
        | "chargeValueType"
        | "code"
        | "name"
        | "purpose"
      >
    >
  ) {
    setChargeRows((currentRows) =>
      normalizeChargeDefinitionRows(
        currentRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                ...patch,
                ...(patch.purpose === "loan_fee"
                  ? {
                      appliesToLoanRequests: true,
                      appliesToLoans: false,
                      appliesToMembers: false,
                      chargeFrequency: "one_time" as const,
                    }
                  : patch.purpose
                    ? {
                        appliesToLoanRequests: false,
                        appliesToLoans: false,
                        appliesToMembers: true,
                      }
                  : {}),
                kind: patch.chargeValueType
                  ? getChargeKindForValueType(patch.chargeValueType)
                  : row.kind,
              }
            : row
        )
      )
    )
  }

  function updateChargeHistoryRow(
    chargeRowId: string,
    rowId: string,
    patch: Partial<Pick<ChargeHistoryRow, "amount" | "effectiveFrom">>
  ) {
    setChargeRows((currentRows) =>
      normalizeChargeDefinitionRows(
        currentRows.map((chargeRow) =>
          chargeRow.id === chargeRowId
            ? {
                ...chargeRow,
                historyRows: normalizeChargeHistoryRows(
                  chargeRow.historyRows.map((historyRow) =>
                    historyRow.id === rowId
                      ? { ...historyRow, ...patch }
                      : historyRow
                  )
                ),
              }
            : chargeRow
        )
      )
    )
  }

  function deleteChargeRow(rowId: string) {
    setChargeRows((currentRows) =>
      normalizeChargeDefinitionRows(
        currentRows.filter((row) => row.id !== rowId)
      )
    )
  }

  function addChargeRow() {
    setChargeRows((currentRows) => [
      ...normalizeChargeDefinitionRows(currentRows),
      createChargeDefinitionRow(),
    ])
  }

  function deleteChargeHistoryRow(chargeRowId: string, rowId: string) {
    setChargeRows((currentRows) =>
      normalizeChargeDefinitionRows(
        currentRows.map((chargeRow) =>
          chargeRow.id === chargeRowId
            ? {
                ...chargeRow,
                historyRows: normalizeChargeHistoryRows(
                  chargeRow.historyRows.filter((row) => row.id !== rowId)
                ),
              }
            : chargeRow
        )
      )
    )
  }

  function addChargeHistoryRow(chargeRowId: string) {
    setChargeRows((currentRows) =>
      normalizeChargeDefinitionRows(
        currentRows.map((chargeRow) =>
          chargeRow.id === chargeRowId
            ? {
                ...chargeRow,
                historyRows: [
                  ...normalizeChargeHistoryRows(chargeRow.historyRows),
                  createChargeHistoryRow(),
                ],
              }
            : chargeRow
        )
      )
    )
  }

  function getValidChargeRows() {
    const startedRows = chargeRows
      .filter(chargeDefinitionRowHasValue)
      .map((chargeRow) => ({
        ...chargeRow,
        kind: getChargeKindForValueType(chargeRow.chargeValueType),
      }))

    if (startedRows.length === 0) {
      showError("Charge required", "Add at least one charge and history row.")
      return null
    }

    for (const chargeRow of startedRows) {
      const result = chargeDefinitionSchema.safeParse(chargeRow)

      if (!result.success) {
        showError(
          "Complete charge row",
          "Each started charge row needs a charge name, code, frequency, value, and purpose."
        )
        return null
      }

      const startedHistoryRows = chargeRow.historyRows.filter(
        chargeHistoryRowHasValue
      )

      if (startedHistoryRows.length === 0) {
        showError(
          "Charge history required",
          "Each started charge needs at least one history row."
        )
        return null
      }

      const incompleteRow = startedHistoryRows.find(
        (row) => !chargeHistoryRowIsComplete(row)
      )

      if (incompleteRow) {
        showError(
          "Complete charge history",
          "Each charge history row needs both a date and an amount."
        )
        return null
      }

      const rowBeforeStartDate = startedHistoryRows.find((row) =>
        isBeforeFinanceStartDate(row.effectiveFrom, financeStartDate)
      )

      if (rowBeforeStartDate) {
        showError(
          "Date before start",
          `Charge history date cannot be before the cooperative start date (${financeStartDate}).`
        )
        return null
      }
    }

    return startedRows.map((chargeRow) => ({
      ...chargeRow,
      historyRows: chargeRow.historyRows
        .filter(chargeHistoryRowIsComplete)
        .sort(sortChargeHistoryRowsByDate),
    }))
  }

  function submitChargeRows() {
    const validChargeRows = getValidChargeRows()

    if (!validChargeRows) {
      return
    }

    startTransition(async () => {
      try {
        for (const chargeRow of validChargeRows) {
          const chargeKind = getChargeKindForValueType(
            chargeRow.chargeValueType
          )

          if (chargeRow.saved) {
            await updateChargeDefinitionAction(
              objectToFormData({
                appliesToLoanRequests: String(chargeRow.appliesToLoanRequests),
                appliesToLoans: String(chargeRow.appliesToLoans),
                appliesToMembers: String(chargeRow.appliesToMembers),
                chargeDefinitionId: chargeRow.chargeDefinitionId,
                chargeFrequency: chargeRow.chargeFrequency,
                code: chargeRow.code,
                isActive: String(chargeRow.isActive),
                isMonthlyLevy: String(chargeRow.isMonthlyLevy),
                name: chargeRow.name,
                purpose: chargeRow.purpose,
              })
            )

            for (const historyRow of chargeRow.historyRows) {
              if (historyRow.versionId) {
                await updateChargeDefinitionVersionAction(
                  objectToFormData({
                    amount: historyRow.amount,
                    chargeDefinitionVersionId: historyRow.versionId,
                    chargeValueType: chargeRow.chargeValueType,
                    effectiveFrom: historyRow.effectiveFrom,
                  })
                )
                continue
              }

              await createChargeDefinitionVersionAction(
                objectToFormData({
                  amount: historyRow.amount,
                  chargeDefinitionId: chargeRow.chargeDefinitionId,
                  chargeValueType: chargeRow.chargeValueType,
                  effectiveFrom: historyRow.effectiveFrom,
                  kind: chargeKind,
                })
              )
            }

            continue
          }

          await createChargeDefinitionAction(
            objectToFormData({
              amount: chargeRow.historyRows[0]?.amount,
              appliesToLoanRequests: chargeRow.appliesToLoanRequests,
              appliesToLoans: chargeRow.appliesToLoans,
              appliesToMembers: chargeRow.appliesToMembers,
              chargeFrequency: chargeRow.chargeFrequency,
              chargeValueType: chargeRow.chargeValueType,
              code: chargeRow.code,
              effectiveFrom: chargeRow.historyRows[0]?.effectiveFrom,
              historyAmount: chargeRow.historyRows.map((row) => row.amount),
              historyEffectiveFrom: chargeRow.historyRows.map(
                (row) => row.effectiveFrom
              ),
              isMonthlyLevy: chargeRow.isMonthlyLevy,
              kind: chargeKind,
              name: chargeRow.name,
              purpose: chargeRow.purpose,
            })
          )
        }

        showSuccess(
          "Charges saved",
          "Charge definitions and history rows were recorded."
        )
        setChargeRows(buildChargeDefinitionRows(initialDefinitions))
        onSuccess?.()
        if (redirectTo) {
          router.push(redirectTo)
          return
        }
        router.refresh()
        if (stayOnStepHref) {
          router.replace(stayOnStepHref)
        }
      } catch (error) {
        showError(
          "Could not save charges",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <form
      className="space-y-3"
      id={resolvedFormId}
      onSubmit={(event) => {
        event.preventDefault()
        submitChargeRows()
      }}
    >
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-sm font-medium">Charge History</h3>
        <div className="min-w-10 flex-1 border-t border-border/70" />
        <Button
          disabled={isPending}
          onClick={resetChargeRows}
          size="sm"
          type="button"
          variant="ghost"
        >
          Clear
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className={`${compactInputTableClassName} min-w-[800px]`}>
          <colgroup>
            <col />
            <col className="w-[120px]" />
            <col className="w-[160px]" />
            <col className="w-[140px]" />
            <col className="w-[150px]" />
            <col className="w-8" />
          </colgroup>
          <thead>
            <tr>
              <th
                className="text-left text-xs font-medium text-muted-foreground"
                scope="col"
              >
                Charge
              </th>
              <th
                className="text-left text-xs font-medium text-muted-foreground"
                scope="col"
              >
                Code
              </th>
              <th
                className="text-left text-xs font-medium text-muted-foreground"
                scope="col"
              >
                Frequency
              </th>
              <th
                className="text-left text-xs font-medium text-muted-foreground"
                scope="col"
              >
                Value
              </th>
              <th
                className="text-left text-xs font-medium text-muted-foreground"
                scope="col"
              >
                Purpose
              </th>
              <th scope="col">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {chargeRows.map((chargeRow) => (
              <Fragment key={chargeRow.id}>
                <tr aria-hidden="true">
                  <td colSpan={6}>
                    <div className="border-t border-border/70" />
                  </td>
                </tr>
                <tr className="align-top" key={`${chargeRow.id}-charge`}>
                  <td>
                    <Input
                      disabled={isPending}
                      onChange={(event) =>
                        updateChargeRow(chargeRow.id, {
                          name: event.target.value,
                        })
                      }
                      placeholder="Enter charge title"
                      value={chargeRow.name}
                    />
                  </td>
                  <td>
                    <Input
                      disabled={isPending}
                      onChange={(event) =>
                        updateChargeRow(chargeRow.id, {
                          code: event.target.value,
                        })
                      }
                      placeholder="Enter charge code name"
                      value={chargeRow.code}
                    />
                  </td>
                  <td>
                    <SelectFormInput
                      disabled={isPending}
                      onChange={(chargeFrequency) =>
                        updateChargeRow(chargeRow.id, {
                          chargeFrequency:
                            chargeFrequency as ChargeDefinitionValues["chargeFrequency"],
                        })
                      }
                      options={[
                        {
                          label: "Recurring monthly",
                          value: "recurring_monthly",
                        },
                        {
                          label: "Per contribution",
                          value: "per_contribution",
                        },
                        { label: "One time", value: "one_time" },
                        { label: "Manual", value: "manual" },
                      ]}
                      value={chargeRow.chargeFrequency}
                    />
                  </td>
                  <td>
                    <SelectFormInput
                      disabled={isPending}
                      onChange={(chargeValueType) =>
                        updateChargeRow(chargeRow.id, {
                          chargeValueType:
                            chargeValueType as ChargeDefinitionValues["chargeValueType"],
                        })
                      }
                      options={[
                        { label: "Fixed amount", value: "fixed_amount" },
                        { label: "Percentage", value: "percentage" },
                      ]}
                      value={chargeRow.chargeValueType}
                    />
                  </td>
                  <td>
                    <SelectFormInput
                      disabled={isPending}
                      onChange={(purpose) =>
                        updateChargeRow(chargeRow.id, {
                          purpose: purpose as ChargeDefinitionValues["purpose"],
                        })
                      }
                      options={[
                        { label: "General charge", value: "general" },
                        { label: "Member share", value: "member_share" },
                        { label: "Loan fee", value: "loan_fee" },
                        { label: "Membership fee", value: "membership_fee" },
                        { label: "Penalty", value: "penalty" },
                      ]}
                      value={chargeRow.purpose}
                    />
                  </td>
                  <td>
                    <DeleteInlineRowButton
                      disabled={
                        chargeRow.saved ||
                        isPending ||
                        (!chargeDefinitionRowHasValue(chargeRow) &&
                          chargeRows.filter((row) => !row.saved).length === 1 &&
                          chargeRows.every((row) => !row.saved))
                      }
                      label="charge row"
                      onDelete={() => deleteChargeRow(chargeRow.id)}
                    />
                  </td>
                </tr>
                <tr key={`${chargeRow.id}-history`}>
                  <td colSpan={6}>
                    <div className="flex justify-end pl-6">
                      <table
                        className={`${compactInputTableClassName} !w-[430px] max-w-full`}
                      >
                        <colgroup>
                          <col className="w-[210px]" />
                          <col className="w-[150px]" />
                          <col className="w-8" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th
                              className="text-left text-xs font-medium text-muted-foreground"
                              scope="col"
                            >
                              Date
                            </th>
                            <th
                              className="text-left text-xs font-medium text-muted-foreground"
                              scope="col"
                            >
                              Amount
                            </th>
                            <th scope="col">
                              <span className="sr-only">Action</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {chargeRow.historyRows.map((row) => (
                            <tr className="align-top" key={row.id}>
                              <td>
                                <DatePickerInput
                                  allowClear={false}
                                  disabled={isPending}
                                  min={financeStartDate ?? undefined}
                                  onChange={(value) =>
                                    updateChargeHistoryRow(
                                      chargeRow.id,
                                      row.id,
                                      {
                                        effectiveFrom: value,
                                      }
                                    )
                                  }
                                  placeholder="Select charge effective date"
                                  value={row.effectiveFrom}
                                />
                              </td>
                              <td>
                                {chargeRow.chargeValueType === "percentage" ? (
                                  <PercentageFormInput
                                    disabled={isPending}
                                    onChange={(amount) =>
                                      updateChargeHistoryRow(
                                        chargeRow.id,
                                        row.id,
                                        { amount }
                                      )
                                    }
                                    placeholder="Enter charge percentage"
                                    value={row.amount}
                                  />
                                ) : (
                                  <CurrencyFormInput
                                    disabled={isPending}
                                    onChange={(amount) =>
                                      updateChargeHistoryRow(
                                        chargeRow.id,
                                        row.id,
                                        { amount }
                                      )
                                    }
                                    placeholder="Enter charge amount"
                                    value={row.amount}
                                  />
                                )}
                              </td>
                              <td>
                                <DeleteInlineRowButton
                                  disabled={isPending || Boolean(row.versionId)}
                                  label="charge history row"
                                  onDelete={() =>
                                    deleteChargeHistoryRow(chargeRow.id, row.id)
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={3}>
                              <AddInlineRowButton
                                disabled={isPending}
                                label="Add Amount"
                                onAdd={() => addChargeHistoryRow(chargeRow.id)}
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
            <tr>
              <td colSpan={6}>
                <AddInlineRowButton
                  disabled={isPending}
                  label="Add Charge"
                  onAdd={addChargeRow}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {showSubmitButton ? (
        <div className="flex justify-end">
          <Button disabled={isPending} type="submit">
            Record charges
          </Button>
        </div>
      ) : null}
      {redirectTo ? (
        <GettingStartedFooterPortal>
          <Button disabled={isPending} form={resolvedFormId} type="submit">
            Next
          </Button>
        </GettingStartedFooterPortal>
      ) : null}
    </form>
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
  stayOnStepHref,
}: {
  chargeDefinitions: Array<{ id: string; kind: string; label: string }>
  financeStartDate?: string | null
  stayOnStepHref?: string
}) {
  const router = useTenantRouter()
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

    if (stayOnStepHref) {
      router.replace(stayOnStepHref)
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
  profitAmount: z.string().optional(),
  startDate: z.string().min(1, "Start date is required."),
  status: z.enum(["planned", "active", "completed", "archived"]),
})

type ShareBusinessValues = z.infer<typeof shareBusinessSchema>

const businessProfitHistoryRowSchema = z.object({
  allocatableProfitAmount: z.string(),
  amount: z.string(),
  deductionAmount: z.string(),
  id: z.string(),
  linkedDividendPeriodId: z.string(),
  profitDate: z.string(),
  profitEntryId: z.string(),
  reason: z.string(),
  sourceType: z.enum(["manual", "backfill", "import"]),
  status: z.enum(["draft", "reviewed", "approved", "archived"]),
})

type BusinessProfitHistoryRow = z.infer<typeof businessProfitHistoryRowSchema>

function normalizeBusinessProfitSourceType(
  sourceType: string | null | undefined
): BusinessProfitHistoryRow["sourceType"] {
  if (
    sourceType === "manual" ||
    sourceType === "backfill" ||
    sourceType === "import"
  ) {
    return sourceType
  }

  return "backfill"
}

function normalizeBusinessProfitStatus(
  status: string | null | undefined
): BusinessProfitHistoryRow["status"] {
  if (
    status === "draft" ||
    status === "reviewed" ||
    status === "approved" ||
    status === "archived"
  ) {
    return status
  }

  return "draft"
}

function createBusinessProfitHistoryRow(id?: string): BusinessProfitHistoryRow {
  return {
    allocatableProfitAmount: "",
    amount: "",
    deductionAmount: "",
    id:
      id ??
      `business-profit-history-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
    linkedDividendPeriodId: "",
    profitDate: "",
    profitEntryId: "",
    reason: "",
    sourceType: "backfill",
    status: "draft",
  }
}

function businessProfitHistoryRowHasValue(row: BusinessProfitHistoryRow) {
  return Boolean(
    row.amount || row.deductionAmount || row.profitDate || row.reason
  )
}

function businessProfitHistoryRowIsComplete(row: BusinessProfitHistoryRow) {
  return Boolean(row.amount && row.profitDate)
}

function sortBusinessProfitHistoryRowsByDate(
  a: BusinessProfitHistoryRow,
  b: BusinessProfitHistoryRow
) {
  if (a.profitDate && b.profitDate) {
    return a.profitDate.localeCompare(b.profitDate)
  }

  if (a.profitDate) {
    return -1
  }

  if (b.profitDate) {
    return 1
  }

  return a.id.localeCompare(b.id)
}

function parseOptionalFormAmount(value: string | undefined) {
  const amount = Number(value || 0)

  return Number.isFinite(amount) ? amount : 0
}

function calculateShareableBalance(row: BusinessProfitHistoryRow) {
  return (
    parseOptionalFormAmount(row.amount) -
    parseOptionalFormAmount(row.deductionAmount)
  )
}

type ShareBusinessInitialBusiness = {
  capitalAmount: number
  endDate: string | null
  id: string
  linkedDividendPeriodId?: string | null
  name: string
  notes?: string | null
  profitAmount: number
  profitEntries: Array<{
    allocatableProfitAmount: number
    expenseAmount: number
    id: string
    linkedDividendPeriodId?: string | null
    profitAmount: number
    profitDate: string
    reason?: string | null
    sourceType: string
    status: string
  }>
  startDate: string
  status: string
}

type ShareBusinessFormProps = {
  dividendPeriods: Array<{ id: string; label: string }>
  financeStartDate?: string | null
  initialBusinesses?: ShareBusinessInitialBusiness[]
  onSuccess?: () => void
  profitHistoryMode?: boolean
  redirectTo?: string
  showSubmitButton?: boolean
  sourceType?: "manual" | "backfill" | "import"
  stayOnStepHref?: string
}

const businessHistoryInputRowSchema = z.object({
  capitalAmount: z.string(),
  businessId: z.string(),
  endDate: z.string(),
  id: z.string(),
  linkedDividendPeriodId: z.string(),
  name: z.string(),
  notes: z.string(),
  profitRows: z.array(businessProfitHistoryRowSchema),
  saved: z.boolean(),
  startDate: z.string(),
  status: z.enum(["planned", "active", "completed", "archived"]),
})

const businessHistoryTableSchema = z.object({
  businessRows: z.array(businessHistoryInputRowSchema),
})

type BusinessHistoryInputRow = z.infer<typeof businessHistoryInputRowSchema>
type BusinessHistoryTableValues = z.infer<typeof businessHistoryTableSchema>

function normalizeBusinessHistoryStatus(
  status: string | null | undefined
): BusinessHistoryInputRow["status"] {
  if (
    status === "planned" ||
    status === "active" ||
    status === "completed" ||
    status === "archived"
  ) {
    return status
  }

  return "active"
}

function createBusinessHistoryRow(id?: string): BusinessHistoryInputRow {
  const rowId =
    id ??
    `business-history-${Date.now()}-${Math.random().toString(36).slice(2)}`

  return {
    capitalAmount: "",
    businessId: "",
    endDate: "",
    id: rowId,
    linkedDividendPeriodId: "",
    name: "",
    notes: "",
    profitRows: [createBusinessProfitHistoryRow(`${rowId}-profit`)],
    saved: false,
    startDate: "",
    status: "active",
  }
}

function sortBusinessHistoryRowsByStartDate(
  a: BusinessHistoryInputRow,
  b: BusinessHistoryInputRow
) {
  if (a.startDate && b.startDate) {
    return a.startDate.localeCompare(b.startDate)
  }

  if (a.startDate) {
    return -1
  }

  if (b.startDate) {
    return 1
  }

  return a.id.localeCompare(b.id)
}

function buildBusinessHistoryRows(
  initialBusinesses: ShareBusinessInitialBusiness[] | undefined
): BusinessHistoryInputRow[] {
  const savedRows =
    initialBusinesses?.map(
      (business): BusinessHistoryInputRow => ({
        capitalAmount: String(business.capitalAmount),
        businessId: business.id,
        endDate: business.endDate ?? "",
        id: `business-history-${business.id}`,
        linkedDividendPeriodId: business.linkedDividendPeriodId ?? "",
        name: business.name,
        notes: business.notes ?? "",
        profitRows:
          business.profitEntries.length > 0
            ? business.profitEntries.map(
                (entry): BusinessProfitHistoryRow => ({
                  allocatableProfitAmount: String(
                    entry.allocatableProfitAmount
                  ),
                  amount: String(entry.profitAmount),
                  deductionAmount: String(entry.expenseAmount),
                  id: `business-profit-history-${entry.id}`,
                  linkedDividendPeriodId: entry.linkedDividendPeriodId ?? "",
                  profitDate: entry.profitDate,
                  profitEntryId: entry.id,
                  reason: entry.reason ?? "",
                  sourceType: normalizeBusinessProfitSourceType(
                    entry.sourceType
                  ),
                  status: normalizeBusinessProfitStatus(entry.status),
                })
              )
            : [
                {
                  allocatableProfitAmount: String(business.profitAmount),
                  amount: String(business.profitAmount),
                  deductionAmount: "",
                  id: `business-profit-history-${business.id}`,
                  linkedDividendPeriodId: "",
                  profitDate: business.startDate,
                  profitEntryId: "",
                  reason: "",
                  sourceType: "backfill",
                  status: "draft",
                },
              ],
        saved: true,
        startDate: business.startDate,
        status: normalizeBusinessHistoryStatus(business.status),
      })
    ) ?? []

  return savedRows.length > 0
    ? [...savedRows].sort(sortBusinessHistoryRowsByStartDate)
    : [createBusinessHistoryRow("business-history-initial")]
}

function businessHistoryRowHasValue(row: BusinessHistoryInputRow) {
  return Boolean(
    row.capitalAmount ||
    row.endDate ||
    row.name ||
    row.notes ||
    row.startDate ||
    row.profitRows.some(businessProfitHistoryRowHasValue)
  )
}

function normalizeProfitRows(rows: BusinessProfitHistoryRow[]) {
  const compactRows = rows.filter(
    (row, index) =>
      businessProfitHistoryRowHasValue(row) || index === rows.length - 1
  )

  return compactRows.length > 0
    ? compactRows
    : [createBusinessProfitHistoryRow()]
}

function normalizeBusinessHistoryRows(rows: BusinessHistoryInputRow[]) {
  const compactRows = rows.filter(
    (row) => row.saved || businessHistoryRowHasValue(row)
  )

  return compactRows.length > 0
    ? compactRows.sort(sortBusinessHistoryRowsByStartDate)
    : [createBusinessHistoryRow()]
}

const businessQuickFillTitles = [
  "Retail Trading Pool",
  "Commodity Sales Pool",
  "Transport Services Pool",
  "Equipment Leasing Pool",
  "Community Market Pool",
  "Agriculture Supply Pool",
  "Seasonal Trade Pool",
  "Member Services Pool",
]

const businessQuickFillReasons = [
  "Operating expenses",
  "Market logistics",
  "Supplier deductions",
  "Maintenance costs",
  "Trading expenses",
]

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem<TItem>(items: TItem[]) {
  return items[randomInt(0, items.length - 1)]!
}

function parseInputDate(value: string | null | undefined) {
  const [year, month, day] = (value ?? "").split("-").map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(Date.UTC(year, month - 1, day))
}

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)

  return nextDate
}

function daysBetween(startDate: Date, endDate: Date) {
  return Math.max(
    0,
    Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  )
}

function randomDateBetween(startDate: Date, endDate: Date) {
  const earliestDate = startDate <= endDate ? startDate : endDate
  const latestDate = startDate <= endDate ? endDate : startDate

  return addDays(
    earliestDate,
    randomInt(0, daysBetween(earliestDate, latestDate))
  )
}

function randomAmount(min: number, max: number, step = 1000) {
  return String(randomInt(Math.ceil(min / step), Math.floor(max / step)) * step)
}

function createRandomBusinessProfitRows({
  businessId,
  endDate,
  startDate,
}: {
  businessId: string
  endDate: Date
  startDate: Date
}) {
  const profitCount = randomInt(3, 5)
  const usedDates = new Set<string>()
  const profitRows: BusinessProfitHistoryRow[] = []

  for (let index = 0; index < profitCount; index += 1) {
    let profitDate = formatInputDate(randomDateBetween(startDate, endDate))

    for (
      let attempt = 0;
      usedDates.has(profitDate) && attempt < 20;
      attempt += 1
    ) {
      profitDate = formatInputDate(randomDateBetween(startDate, endDate))
    }

    usedDates.add(profitDate)

    const amount = randomAmount(60_000, 450_000, 5000)
    const hasDeduction = Math.random() > 0.45
    const maxDeduction = Math.max(5000, Math.floor(Number(amount) * 0.18))
    const deductionAmount = hasDeduction
      ? randomAmount(5000, maxDeduction, 1000)
      : ""

    profitRows.push({
      ...createBusinessProfitHistoryRow(`${businessId}-profit-${index}`),
      amount,
      deductionAmount,
      profitDate,
      reason: deductionAmount ? randomItem(businessQuickFillReasons) : "",
    })
  }

  return profitRows.sort(sortBusinessProfitHistoryRowsByDate)
}

function createRandomBusinessHistoryRows(financeStartDate?: string | null) {
  const today = new Date()
  const todayUtc = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  )
  const configuredStartDate =
    parseInputDate(financeStartDate) ?? addDays(todayUtc, -720)
  const minimumStartDate =
    configuredStartDate <= todayUtc
      ? configuredStartDate
      : addDays(todayUtc, -720)
  const latestStartDate =
    addDays(todayUtc, -150) > minimumStartDate
      ? addDays(todayUtc, -150)
      : minimumStartDate
  const businessCount = randomInt(1, 5)

  return Array.from({ length: businessCount }, (_, index) => {
    const businessId = `business-history-quick-fill-${Date.now()}-${index}`
    const startDate = randomDateBetween(minimumStartDate, latestStartDate)
    const minimumEndDate = addDays(startDate, 90)
    const endDate = randomDateBetween(
      minimumEndDate > todayUtc ? startDate : minimumEndDate,
      todayUtc
    )

    return {
      ...createBusinessHistoryRow(businessId),
      capitalAmount: randomAmount(300_000, 2_500_000, 10_000),
      endDate: formatInputDate(endDate),
      name: randomItem(businessQuickFillTitles),
      profitRows: createRandomBusinessProfitRows({
        businessId,
        endDate,
        startDate,
      }),
      startDate: formatInputDate(startDate),
      status: "completed" as const,
    }
  })
}

export function ShareBusinessForm(props: ShareBusinessFormProps) {
  if (props.profitHistoryMode) {
    return <ShareBusinessProfitHistoryTableForm {...props} />
  }

  return <ShareBusinessSingleForm {...props} />
}

function ShareBusinessProfitHistoryTableForm({
  financeStartDate,
  initialBusinesses,
  onSuccess,
  sourceType = "backfill",
  redirectTo,
  showSubmitButton = true,
  stayOnStepHref,
}: ShareBusinessFormProps) {
  const router = useTenantRouter()
  const fallbackFormId = useId()
  const resolvedFormId = fallbackFormId
  const form = useZodForm<BusinessHistoryTableValues>(
    businessHistoryTableSchema,
    {
      defaultValues: {
        businessRows: buildBusinessHistoryRows(initialBusinesses),
      },
    }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [flashBusinessRowId, setFlashBusinessRowId] = useState<string | null>(
    null
  )
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const businessRows = form.watch("businessRows") ?? []

  function setBusinessRows(
    updater: (
      currentRows: BusinessHistoryInputRow[]
    ) => BusinessHistoryInputRow[]
  ) {
    form.setValue(
      "businessRows",
      updater(form.getValues("businessRows") ?? []),
      { shouldDirty: true }
    )
  }

  function resetBusinessRows() {
    form.reset({
      businessRows: buildBusinessHistoryRows(initialBusinesses),
    })
  }

  function quickFillBusinessRows() {
    setBusinessRows((currentRows) =>
      normalizeBusinessHistoryRows([
        ...currentRows.filter((row) => row.saved),
        ...createRandomBusinessHistoryRows(financeStartDate),
      ])
    )
  }

  const flashMovedBusinessRow = useCallback((rowId: string) => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current)
    }

    setFlashBusinessRowId(rowId)
    flashTimeoutRef.current = setTimeout(() => {
      setFlashBusinessRowId(null)
      flashTimeoutRef.current = null
    }, 900)
  }, [])

  function updateBusinessRow(
    rowId: string,
    patch: Partial<
      Pick<
        BusinessHistoryInputRow,
        "capitalAmount" | "endDate" | "name" | "notes" | "startDate"
      >
    >
  ) {
    setBusinessRows((currentRows) =>
      normalizeBusinessHistoryRows(
        currentRows.map((row) =>
          row.id === rowId ? { ...row, ...patch } : row
        )
      )
    )
  }

  const updateBusinessStartDate = useCallback(
    (rowId: string, startDate: string) => {
      const currentRows = form.getValues("businessRows") ?? []
      const beforeIndex = currentRows.findIndex((row) => row.id === rowId)
      const updatedRows = currentRows.map((row) =>
        row.id === rowId ? { ...row, startDate } : row
      )
      const sortedRows = normalizeBusinessHistoryRows(updatedRows)
      const afterIndex = sortedRows.findIndex((row) => row.id === rowId)

      form.setValue("businessRows", sortedRows, { shouldDirty: true })

      if (beforeIndex !== afterIndex) {
        flashMovedBusinessRow(rowId)
      }
    },
    [flashMovedBusinessRow, form]
  )

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }
    }
  }, [])

  function updateBusinessProfitRow(
    businessRowId: string,
    profitRowId: string,
    patch: Partial<
      Pick<
        BusinessProfitHistoryRow,
        "amount" | "deductionAmount" | "profitDate" | "reason"
      >
    >
  ) {
    setBusinessRows((currentRows) =>
      normalizeBusinessHistoryRows(
        currentRows.map((businessRow) =>
          businessRow.id === businessRowId
            ? {
                ...businessRow,
                profitRows: normalizeProfitRows(
                  businessRow.profitRows.map((profitRow) =>
                    profitRow.id === profitRowId
                      ? { ...profitRow, ...patch }
                      : profitRow
                  )
                ),
              }
            : businessRow
        )
      )
    )
  }

  function deleteBusinessRow(rowId: string) {
    setBusinessRows((currentRows) =>
      normalizeBusinessHistoryRows(
        currentRows.filter((row) => row.id !== rowId)
      )
    )
  }

  function addBusinessRow() {
    setBusinessRows((currentRows) => [
      ...normalizeBusinessHistoryRows(currentRows),
      createBusinessHistoryRow(),
    ])
  }

  function deleteBusinessProfitRow(businessRowId: string, profitRowId: string) {
    setBusinessRows((currentRows) =>
      normalizeBusinessHistoryRows(
        currentRows.map((businessRow) =>
          businessRow.id === businessRowId
            ? {
                ...businessRow,
                profitRows: normalizeProfitRows(
                  businessRow.profitRows.filter((row) => row.id !== profitRowId)
                ),
              }
            : businessRow
        )
      )
    )
  }

  function addBusinessProfitRow(businessRowId: string) {
    setBusinessRows((currentRows) =>
      normalizeBusinessHistoryRows(
        currentRows.map((businessRow) =>
          businessRow.id === businessRowId
            ? {
                ...businessRow,
                profitRows: [
                  ...normalizeProfitRows(businessRow.profitRows),
                  createBusinessProfitHistoryRow(),
                ],
              }
            : businessRow
        )
      )
    )
  }

  function getValidBusinessRows(values: BusinessHistoryTableValues) {
    const startedRows = values.businessRows.filter(businessHistoryRowHasValue)

    if (startedRows.length === 0) {
      showError(
        "Business history required",
        "Add at least one business and profit row."
      )
      return null
    }

    for (const businessRow of startedRows) {
      if (
        !businessRow.name.trim() ||
        !businessRow.capitalAmount ||
        !businessRow.startDate
      ) {
        showError(
          "Complete business row",
          "Each started business row needs business, capital, and start date."
        )
        return null
      }

      const capitalAmount = parseOptionalFormAmount(businessRow.capitalAmount)

      if (!Number.isFinite(capitalAmount) || capitalAmount <= 0) {
        showError("Invalid capital", "Business capital must be greater than 0.")
        return null
      }

      if (isBeforeFinanceStartDate(businessRow.startDate, financeStartDate)) {
        showError(
          "Date before start",
          `Business start date cannot be before the cooperative start date (${financeStartDate}).`
        )
        return null
      }

      if (isBeforeFinanceStartDate(businessRow.endDate, financeStartDate)) {
        showError(
          "Date before start",
          `Business end date cannot be before the cooperative start date (${financeStartDate}).`
        )
        return null
      }

      if (
        businessRow.endDate &&
        businessRow.startDate &&
        businessRow.endDate < businessRow.startDate
      ) {
        showError(
          "Invalid end date",
          "Business end date cannot be before the start date."
        )
        return null
      }

      const startedProfitRows = businessRow.profitRows.filter(
        businessProfitHistoryRowHasValue
      )

      if (startedProfitRows.length === 0) {
        showError(
          "Profit history required",
          "Each started business needs at least one profit row."
        )
        return null
      }

      for (const profitRow of startedProfitRows) {
        if (!businessProfitHistoryRowIsComplete(profitRow)) {
          showError(
            "Complete profit row",
            "Each started profit row needs a date and amount."
          )
          return null
        }

        if (isBeforeFinanceStartDate(profitRow.profitDate, financeStartDate)) {
          showError(
            "Date before start",
            `Profit date cannot be before the cooperative start date (${financeStartDate}).`
          )
          return null
        }

        if (profitRow.profitDate < businessRow.startDate) {
          showError(
            "Invalid profit date",
            "Profit date cannot be before the business start date."
          )
          return null
        }

        if (businessRow.endDate && profitRow.profitDate > businessRow.endDate) {
          showError(
            "Invalid profit date",
            "Profit date cannot be after the business end date."
          )
          return null
        }

        const profitAmount = parseOptionalFormAmount(profitRow.amount)
        const deductionAmount = parseOptionalFormAmount(
          profitRow.deductionAmount
        )

        if (!Number.isFinite(profitAmount) || profitAmount <= 0) {
          showError("Invalid profit", "Profit amount must be greater than 0.")
          return null
        }

        if (deductionAmount < 0) {
          showError("Invalid deduction", "Deduction cannot be negative.")
          return null
        }

        if (profitAmount - deductionAmount < 0) {
          showError(
            "Invalid shareable balance",
            "Deduction cannot be greater than profit amount."
          )
          return null
        }

        if (deductionAmount > 0 && !profitRow.reason.trim()) {
          showError(
            "Deduction reason required",
            "Add a reason for every deduction."
          )
          return null
        }
      }
    }

    return startedRows.map((businessRow) => ({
      ...businessRow,
      profitRows: businessRow.profitRows
        .filter(businessProfitHistoryRowIsComplete)
        .sort(sortBusinessProfitHistoryRowsByDate),
    }))
  }

  function submitBusinessRows(values: BusinessHistoryTableValues) {
    const validBusinessRows = getValidBusinessRows(values)

    if (!validBusinessRows) {
      return
    }

    startTransition(async () => {
      try {
        for (const businessRow of validBusinessRows) {
          const totalProfitAmount = businessRow.profitRows
            .reduce(
              (total, row) => total + parseOptionalFormAmount(row.amount),
              0
            )
            .toString()

          if (businessRow.saved) {
            await updateShareBusinessAction(
              objectToFormData({
                capitalAmount: businessRow.capitalAmount,
                endDate: businessRow.endDate,
                linkedDividendPeriodId: businessRow.linkedDividendPeriodId,
                name: businessRow.name,
                notes: businessRow.notes,
                profitAmount: totalProfitAmount,
                shareBusinessId: businessRow.businessId,
                startDate: businessRow.startDate,
                status: businessRow.status,
              })
            )

            for (const profitRow of businessRow.profitRows) {
              const profitAmount = parseOptionalFormAmount(profitRow.amount)
              const deductionAmount = parseOptionalFormAmount(
                profitRow.deductionAmount
              )
              const allocatableProfitAmount = Math.max(
                0,
                profitAmount - deductionAmount
              ).toString()

              if (profitRow.profitEntryId) {
                await updateShareBusinessProfitEntryAction(
                  objectToFormData({
                    allocatableProfitAmount,
                    expenseAmount: profitRow.deductionAmount || "0",
                    linkedDividendPeriodId: profitRow.linkedDividendPeriodId,
                    profitAmount: profitRow.amount,
                    profitDate: profitRow.profitDate,
                    profitEntryId: profitRow.profitEntryId,
                    reason: profitRow.reason,
                    sourceType: profitRow.sourceType,
                    status: profitRow.status,
                  })
                )
                continue
              }

              await createShareBusinessProfitEntryAction(
                objectToFormData({
                  allocatableProfitAmount,
                  expenseAmount: profitRow.deductionAmount || "0",
                  linkedDividendPeriodId: profitRow.linkedDividendPeriodId,
                  profitAmount: profitRow.amount,
                  profitDate: profitRow.profitDate,
                  reason: profitRow.reason,
                  shareBusinessId: businessRow.businessId,
                  sourceType: profitRow.sourceType,
                  status: profitRow.status,
                })
              )
            }

            continue
          }

          await createShareBusinessAction(
            objectToFormData({
              capitalAmount: businessRow.capitalAmount,
              endDate: businessRow.endDate,
              historyDeductionAmount: businessRow.profitRows.map(
                (row) => row.deductionAmount || "0"
              ),
              historyDeductionReason: businessRow.profitRows.map(
                (row) => row.reason
              ),
              historyProfitAmount: businessRow.profitRows.map(
                (row) => row.amount
              ),
              historyProfitDate: businessRow.profitRows.map(
                (row) => row.profitDate
              ),
              name: businessRow.name,
              notes: businessRow.notes,
              profitAmount: totalProfitAmount,
              sourceType,
              startDate: businessRow.startDate,
              status: businessRow.endDate ? "completed" : "active",
            })
          )
        }

        showSuccess(
          "Business history saved",
          "Business and profit history rows were recorded."
        )
        form.reset({
          businessRows: buildBusinessHistoryRows(initialBusinesses),
        })
        if (redirectTo) {
          router.push(redirectTo)
          return
        }
        router.refresh()
        if (stayOnStepHref) {
          router.replace(stayOnStepHref)
        }
        onSuccess?.()
      } catch (error) {
        showError(
          "Could not save business history",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="space-y-3"
        id={resolvedFormId}
        onSubmit={form.handleSubmit(submitBusinessRows)}
      >
        <div className="flex items-center gap-3">
          <h3 className="shrink-0 text-sm font-medium">Business History</h3>
          <div className="min-w-10 flex-1 border-t border-border/70" />
          <Button
            disabled={isPending}
            onClick={quickFillBusinessRows}
            size="sm"
            type="button"
            variant="ghost"
          >
            Quick fill
          </Button>
          <Button
            disabled={isPending}
            onClick={resetBusinessRows}
            size="sm"
            type="button"
            variant="ghost"
          >
            Clear
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className={`${compactInputTableClassName} min-w-[820px]`}>
            <colgroup>
              <col />
              <col className="w-[140px]" />
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-8" />
            </colgroup>
            <thead>
              <tr>
                <th
                  className="text-left text-xs font-medium text-muted-foreground"
                  scope="col"
                >
                  Title
                </th>
                <th
                  className="text-left text-xs font-medium text-muted-foreground"
                  scope="col"
                >
                  Amount
                </th>
                <th
                  className="text-left text-xs font-medium text-muted-foreground"
                  scope="col"
                >
                  Start date
                </th>
                <th
                  className="text-left text-xs font-medium text-muted-foreground"
                  scope="col"
                >
                  End date
                </th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {businessRows.map((businessRow) => (
                <Fragment key={businessRow.id}>
                  <tr aria-hidden="true">
                    <td colSpan={5}>
                      <div className="border-t border-border/70" />
                    </td>
                  </tr>
                  <tr
                    className={cn(
                      "align-top [&_td]:transition-colors [&_td]:duration-700",
                      flashBusinessRowId === businessRow.id &&
                        "[&_td]:bg-muted/70"
                    )}
                    key={`${businessRow.id}-business`}
                  >
                    <td>
                      <Input
                        disabled={isPending}
                        onChange={(event) =>
                          updateBusinessRow(businessRow.id, {
                            name: event.target.value,
                          })
                        }
                        placeholder="Title"
                        value={businessRow.name}
                      />
                    </td>
                    <td>
                      <CurrencyInput
                        allowNegative={false}
                        decimalScale={2}
                        disabled={isPending}
                        inputMode="decimal"
                        onValueChange={(values) =>
                          updateBusinessRow(businessRow.id, {
                            capitalAmount: values.value,
                          })
                        }
                        placeholder="Amount"
                        value={businessRow.capitalAmount}
                        valueIsNumericString
                      />
                    </td>
                    <td>
                      <DatePickerInput
                        allowClear={false}
                        disabled={isPending}
                        min={financeStartDate ?? undefined}
                        onChange={(startDate) =>
                          updateBusinessStartDate(businessRow.id, startDate)
                        }
                        placeholder="Start date"
                        value={businessRow.startDate}
                      />
                    </td>
                    <td>
                      <DatePickerInput
                        disabled={isPending}
                        min={
                          businessRow.startDate || financeStartDate || undefined
                        }
                        onChange={(endDate) =>
                          updateBusinessRow(businessRow.id, { endDate })
                        }
                        placeholder="End date"
                        value={businessRow.endDate}
                      />
                    </td>
                    <td>
                      <DeleteInlineRowButton
                        disabled={
                          businessRow.saved ||
                          isPending ||
                          (!businessHistoryRowHasValue(businessRow) &&
                            businessRows.filter((row) => !row.saved).length ===
                              1)
                        }
                        label="business row"
                        onDelete={() => deleteBusinessRow(businessRow.id)}
                      />
                    </td>
                  </tr>
                  <tr key={`${businessRow.id}-profits`}>
                    <td colSpan={5}>
                      <div className="pl-6">
                        <div className="mb-2 flex items-center gap-3">
                          <h4 className="shrink-0 text-xs font-medium text-muted-foreground">
                            Profit History
                          </h4>
                          <div className="min-w-10 flex-1 border-t border-border/70" />
                        </div>
                        <table
                          className={`${compactInputTableClassName} min-w-[760px]`}
                        >
                          <colgroup>
                            <col className="w-[150px]" />
                            <col className="w-[140px]" />
                            <col className="w-[140px]" />
                            <col />
                            <col className="w-[140px]" />
                            <col className="w-8" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th
                                className="text-left text-xs font-medium text-muted-foreground"
                                scope="col"
                              >
                                Date
                              </th>
                              <th
                                className="text-left text-xs font-medium text-muted-foreground"
                                scope="col"
                              >
                                Amount
                              </th>
                              <th
                                className="text-left text-xs font-medium text-muted-foreground"
                                scope="col"
                              >
                                Deduction
                              </th>
                              <th
                                className="text-left text-xs font-medium text-muted-foreground"
                                scope="col"
                              >
                                Reason
                              </th>
                              <th
                                className="text-left text-xs font-medium text-muted-foreground"
                                scope="col"
                              >
                                Shareable
                              </th>
                              <th scope="col">
                                <span className="sr-only">Action</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {businessRow.profitRows.map((profitRow) => {
                              const shareableBalance =
                                calculateShareableBalance(profitRow)

                              return (
                                <tr className="align-top" key={profitRow.id}>
                                  <td>
                                    <DatePickerInput
                                      allowClear={false}
                                      disabled={isPending}
                                      min={
                                        businessRow.startDate ||
                                        financeStartDate ||
                                        undefined
                                      }
                                      onChange={(profitDate) =>
                                        updateBusinessProfitRow(
                                          businessRow.id,
                                          profitRow.id,
                                          { profitDate }
                                        )
                                      }
                                      placeholder="Date"
                                      value={profitRow.profitDate}
                                    />
                                  </td>
                                  <td>
                                    <CurrencyInput
                                      allowNegative={false}
                                      decimalScale={2}
                                      disabled={isPending}
                                      inputMode="decimal"
                                      onValueChange={(values) =>
                                        updateBusinessProfitRow(
                                          businessRow.id,
                                          profitRow.id,
                                          { amount: values.value }
                                        )
                                      }
                                      placeholder="Amount"
                                      value={profitRow.amount}
                                      valueIsNumericString
                                    />
                                  </td>
                                  <td>
                                    <CurrencyInput
                                      allowNegative={false}
                                      decimalScale={2}
                                      disabled={isPending}
                                      inputMode="decimal"
                                      onValueChange={(values) =>
                                        updateBusinessProfitRow(
                                          businessRow.id,
                                          profitRow.id,
                                          { deductionAmount: values.value }
                                        )
                                      }
                                      placeholder="Deduction"
                                      value={profitRow.deductionAmount}
                                      valueIsNumericString
                                    />
                                  </td>
                                  <td>
                                    <Input
                                      disabled={isPending}
                                      onChange={(event) =>
                                        updateBusinessProfitRow(
                                          businessRow.id,
                                          profitRow.id,
                                          { reason: event.target.value }
                                        )
                                      }
                                      placeholder="Reason"
                                      value={profitRow.reason}
                                    />
                                  </td>
                                  <td>
                                    <CurrencyInput
                                      decimalScale={2}
                                      disabled={isPending}
                                      fixedDecimalScale
                                      readOnly
                                      value={
                                        Number.isFinite(shareableBalance)
                                          ? shareableBalance.toFixed(2)
                                          : "0.00"
                                      }
                                      valueIsNumericString
                                    />
                                  </td>
                                  <td>
                                    <DeleteInlineRowButton
                                      disabled={
                                        isPending ||
                                        Boolean(profitRow.profitEntryId)
                                      }
                                      label="profit row"
                                      onDelete={() =>
                                        deleteBusinessProfitRow(
                                          businessRow.id,
                                          profitRow.id
                                        )
                                      }
                                    />
                                  </td>
                                </tr>
                              )
                            })}
                            <tr>
                              <td colSpan={6}>
                                <AddInlineRowButton
                                  disabled={isPending}
                                  label="Add Profit"
                                  onAdd={() =>
                                    addBusinessProfitRow(businessRow.id)
                                  }
                                />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
              <tr>
                <td colSpan={5}>
                  <AddInlineRowButton
                    disabled={isPending}
                    label="Add Business"
                    onAdd={addBusinessRow}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {showSubmitButton ? (
          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              Record businesses
            </Button>
          </div>
        ) : null}
        {redirectTo ? (
          <GettingStartedFooterPortal>
            <Button disabled={isPending} form={resolvedFormId} type="submit">
              Next
            </Button>
          </GettingStartedFooterPortal>
        ) : null}
      </form>
    </Form>
  )
}

function ShareBusinessSingleForm({
  dividendPeriods,
  financeStartDate,
  onSuccess,
  profitHistoryMode = false,
  sourceType = "manual",
  stayOnStepHref,
}: ShareBusinessFormProps) {
  const router = useTenantRouter()
  const form = useZodForm<ShareBusinessValues>(shareBusinessSchema, {
    defaultValues: {
      capitalAmount: "",
      endDate: "",
      linkedDividendPeriodId: "",
      name: "",
      notes: "",
      profitAmount: profitHistoryMode ? undefined : "",
      startDate: "",
      status: "planned",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [profitHistoryRows, setProfitHistoryRows] = useState<
    BusinessProfitHistoryRow[]
  >(() => [createBusinessProfitHistoryRow("business-profit-history-initial")])
  const watchedStartDate = form.watch("startDate")
  const watchedEndDate = form.watch("endDate")

  function resetProfitHistoryRows() {
    setProfitHistoryRows([
      createBusinessProfitHistoryRow("business-profit-history-initial"),
    ])
  }

  function updateProfitHistoryRow(
    rowId: string,
    patch: Partial<
      Pick<
        BusinessProfitHistoryRow,
        "amount" | "deductionAmount" | "profitDate" | "reason"
      >
    >
  ) {
    setProfitHistoryRows((currentRows) => {
      const updatedRows = currentRows.map((row) =>
        row.id === rowId ? { ...row, ...patch } : row
      )

      return normalizeProfitRows(updatedRows)
    })
  }

  function addProfitHistoryRow() {
    setProfitHistoryRows((currentRows) => [
      ...normalizeProfitRows(currentRows),
      createBusinessProfitHistoryRow(),
    ])
  }

  function sortProfitHistoryRows() {
    setProfitHistoryRows((currentRows) => {
      const sortedRows = currentRows
        .filter(businessProfitHistoryRowHasValue)
        .sort(sortBusinessProfitHistoryRowsByDate)

      return sortedRows.length > 0
        ? sortedRows
        : [createBusinessProfitHistoryRow()]
    })
  }

  function getValidProfitHistoryRows() {
    const startedRows = profitHistoryRows.filter(
      businessProfitHistoryRowHasValue
    )
    const incompleteRow = startedRows.find(
      (row) => !businessProfitHistoryRowIsComplete(row)
    )

    if (incompleteRow) {
      showError(
        "Complete profit history",
        "Each started profit history row needs a profit date and amount."
      )
      return null
    }

    const sortedRows = startedRows
      .filter(businessProfitHistoryRowIsComplete)
      .sort(sortBusinessProfitHistoryRowsByDate)

    for (const row of sortedRows) {
      const profitAmount = parseOptionalFormAmount(row.amount)
      const deductionAmount = parseOptionalFormAmount(row.deductionAmount)
      const shareableBalance = profitAmount - deductionAmount

      if (isBeforeFinanceStartDate(row.profitDate, financeStartDate)) {
        showError(
          "Date before start",
          `Profit date cannot be before the cooperative start date (${financeStartDate}).`
        )
        return null
      }

      if (deductionAmount < 0) {
        showError(
          "Invalid deduction",
          "Profit history deduction cannot be negative."
        )
        return null
      }

      if (shareableBalance < 0) {
        showError(
          "Invalid shareable balance",
          "Profit history deduction cannot be greater than the profit amount."
        )
        return null
      }

      if (deductionAmount > 0 && !row.reason.trim()) {
        showError(
          "Deduction reason required",
          "Add a reason for every profit history row with a deduction."
        )
        return null
      }
    }

    return sortedRows
  }

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

    const validProfitHistoryRows = profitHistoryMode
      ? getValidProfitHistoryRows()
      : []

    if (profitHistoryMode && !validProfitHistoryRows) {
      return
    }

    if (!profitHistoryMode && !values.profitAmount) {
      form.setError("profitAmount", {
        message: "Profit amount is required.",
        type: "manual",
      })
      return
    }

    if (stayOnStepHref) {
      router.replace(stayOnStepHref)
    }

    startTransition(async () => {
      try {
        await createShareBusinessAction(
          objectToFormData(
            profitHistoryMode
              ? {
                  ...values,
                  historyDeductionAmount: validProfitHistoryRows?.map(
                    (row) => row.deductionAmount || "0"
                  ),
                  historyDeductionReason: validProfitHistoryRows?.map(
                    (row) => row.reason
                  ),
                  historyProfitAmount: validProfitHistoryRows?.map(
                    (row) => row.amount
                  ),
                  historyProfitDate: validProfitHistoryRows?.map(
                    (row) => row.profitDate
                  ),
                  profitAmount:
                    validProfitHistoryRows
                      ?.reduce(
                        (total, row) =>
                          total + parseOptionalFormAmount(row.amount),
                        0
                      )
                      .toString() ?? "0",
                  sourceType,
                }
              : { ...values, sourceType }
          )
        )
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
          profitAmount: profitHistoryMode ? undefined : "",
          startDate: "",
          status: "planned",
        })
        if (profitHistoryMode) {
          resetProfitHistoryRows()
        }
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
        {!profitHistoryMode ? (
          <FormField
            control={form.control}
            name="profitAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profit</FormLabel>
                <FormControl>
                  <CurrencyFormInput
                    {...field}
                    value={field.value ?? ""}
                    placeholder="85000"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
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
        {profitHistoryMode ? (
          <div className="flex flex-col gap-3 border border-border/70 bg-muted/20 p-3 md:col-span-2">
            <div className="flex items-center gap-3">
              <h3 className="shrink-0 text-sm font-medium">Profit History</h3>
              <Separator className="min-w-10 flex-1" />
              <QuickFill
                args={{
                  createRow: createBusinessProfitHistoryRow,
                  disabled: !watchedStartDate,
                  hasValue: businessProfitHistoryRowHasValue,
                  maxDate: watchedEndDate || undefined,
                  minDate: watchedStartDate || financeStartDate,
                  rows: profitHistoryRows,
                  setRows: (updater) =>
                    setProfitHistoryRows(
                      (currentRows) =>
                        updater(currentRows) as BusinessProfitHistoryRow[]
                    ),
                  sortRows: sortBusinessProfitHistoryRowsByDate,
                }}
                key={`${watchedStartDate || "no-start"}-${watchedEndDate || "no-end"}`}
                name="businessProfitHistory"
              />
              <Button
                aria-label="Sort profit history by date"
                onClick={sortProfitHistoryRows}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <HugeiconsIcon
                  icon={ArrowUpDownIcon}
                  data-icon="inline-start"
                />
              </Button>
              <Button
                onClick={resetProfitHistoryRows}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear
              </Button>
            </div>
            <FieldGroup className="gap-3">
              {profitHistoryRows.map((row) => {
                const shareableBalance = calculateShareableBalance(row)

                return (
                  <div
                    className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(140px,0.9fr)_minmax(130px,0.8fr)_minmax(130px,0.8fr)_minmax(150px,1fr)_minmax(130px,0.8fr)]"
                    key={row.id}
                  >
                    <Field>
                      <FieldLabel htmlFor={`profit-history-date-${row.id}`}>
                        Profit date
                      </FieldLabel>
                      <DatePickerInput
                        allowClear={false}
                        id={`profit-history-date-${row.id}`}
                        min={financeStartDate ?? undefined}
                        onChange={(profitDate) =>
                          updateProfitHistoryRow(row.id, { profitDate })
                        }
                        placeholder="Select profit date"
                        value={row.profitDate}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`profit-history-amount-${row.id}`}>
                        Amount
                      </FieldLabel>
                      <CurrencyFormInput
                        id={`profit-history-amount-${row.id}`}
                        onChange={(amount) =>
                          updateProfitHistoryRow(row.id, { amount })
                        }
                        placeholder="85000"
                        value={row.amount}
                      />
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor={`profit-history-deduction-${row.id}`}
                      >
                        Deduction
                      </FieldLabel>
                      <CurrencyFormInput
                        id={`profit-history-deduction-${row.id}`}
                        onChange={(deductionAmount) =>
                          updateProfitHistoryRow(row.id, { deductionAmount })
                        }
                        placeholder="0"
                        value={row.deductionAmount}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`profit-history-reason-${row.id}`}>
                        Reason
                      </FieldLabel>
                      <Input
                        id={`profit-history-reason-${row.id}`}
                        onChange={(event) =>
                          updateProfitHistoryRow(row.id, {
                            reason: event.target.value,
                          })
                        }
                        placeholder="Enter deduction reason"
                        value={row.reason}
                      />
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor={`profit-history-shareable-${row.id}`}
                      >
                        Shareable balance
                      </FieldLabel>
                      <CurrencyPrefixInput
                        id={`profit-history-shareable-${row.id}`}
                        inputClassName="text-right"
                        readOnly
                        value={
                          Number.isFinite(shareableBalance)
                            ? shareableBalance.toFixed(2)
                            : "0.00"
                        }
                      />
                    </Field>
                  </div>
                )
              })}
              <AddInlineRowButton
                label="Add Profit"
                onAdd={addProfitHistoryRow}
              />
            </FieldGroup>
          </div>
        ) : null}
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
  stayOnStepHref,
}: {
  businesses: Array<{ id: string; label: string }>
  dividendPeriods: Array<{ id: string; label: string }>
  financeStartDate?: string | null
  stayOnStepHref?: string
}) {
  const router = useTenantRouter()
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

    if (stayOnStepHref) {
      router.replace(stayOnStepHref)
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
