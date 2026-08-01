"use client"

import {
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
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
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
import { Textarea } from "@halaalvest/ui/components/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
import {
  usePreservedClientState,
  usePreservedFormState,
} from "@halaalvest/ui/hooks/use-preserved-form-state"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import { DatePickerInput } from "@/components/date-picker-input"
import { GettingStartedFooterPortal } from "@/components/getting-started-footer-slot"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { QuickFill } from "@/components/quick-fill"
import { objectToFormData } from "@/lib/form-submit"
import { navigateWithFreshWizardState } from "@/lib/getting-started/navigate-with-fresh-state"
import type {
  LoanProductSettingsRow,
  TenantBusinessProfitPolicySettings,
  TenantFinancingSettingsWorkspace,
  TenantMigrationSetupMode,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { PlusIcon, Trash2Icon } from "lucide-react"
import {
  createChargeDefinitionAction,
  createChargeDefinitionVersionAction,
  deleteChargeDefinitionAction,
  deleteChargeDefinitionVersionAction,
  createShareBusinessAction,
  createShareBusinessProfitEntryAction,
  createTenantShareStructureVersionAction,
  generateShareProfitAllocationsAction,
  openMonthlyFinancingCycleAction,
  updateChargeDefinitionAction,
  updateChargeDefinitionVersionAction,
  updateLoanProductSettingsAction,
  updateMonthlyFinancingCycleStatusAction,
  updateShareBusinessAction,
  updateShareBusinessProfitEntryAction,
  updateTenantFinanceStartDateAction,
  updateTenantBusinessProfitPolicyAction,
  updateTenantFinancingPolicyAction,
  updateTenantSharePolicyAction,
} from "@/lib/dashboard-actions"

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
      className="h-11 w-full md:h-9"
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
  className,
  disabled,
  id,
  onChange,
  placeholder,
  value,
}: {
  className?: string
  disabled?: boolean
  id?: string
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <CurrencyInput
      allowNegative={false}
      className={className}
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
  triggerClassName,
  value,
}: {
  disabled?: boolean
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  placeholder?: string
  triggerClassName?: string
  value?: string
}) {
  const hasEmptyOption = options.some((option) => option.value === "")

  return (
    <LabeledSelectInput
      disabled={disabled}
      onValueChange={onChange}
      options={options}
      placeholder={placeholder}
      triggerClassName={triggerClassName}
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
  onSuccess,
  preserveDraftKey,
}: {
  defaultStartDate?: string | null
  onSuccess?: () => void
  preserveDraftKey?: string
}) {
  const router = useTenantRouter()
  const today = new Date().toISOString().slice(0, 10)
  const form = useZodForm<StartDateValues>(startDateSchema, {
    defaultValues: {
      startDate: defaultStartDate ?? "",
    },
  })
  const clearPreservedFormState = usePreservedFormState(form, {
    baselineKey: defaultStartDate ?? "",
    enabled: Boolean(preserveDraftKey),
    storageKey: preserveDraftKey ?? "tenant-finance:start-date",
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: StartDateValues) {
    startTransition(async () => {
      try {
        await updateTenantFinanceStartDateAction(objectToFormData(values))
        showSuccess("Start date updated", "Finance history anchor saved.")
        clearPreservedFormState()
        router.refresh()
        onSuccess?.()
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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
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
                    max={today}
                    placeholder="Select start date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="pt-7">
            <Button disabled={isPending} type="submit">
              Save
            </Button>
          </div>
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
    reserveRetentionPercentage: z.string().optional(),
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
      Math.abs(distributable + reserve - 100) > Number.EPSILON
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Distributable plus reserve must equal 100%.",
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
  devMode = false,
  formId,
  preserveDraftKey,
  redirectTo,
  showSubmitButton = true,
}: {
  defaultPolicy: TenantBusinessProfitPolicySettings
  devMode?: boolean
  formId?: string
  preserveDraftKey?: string
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
        reserveRetentionPercentage:
          defaultPolicy.reserveRetentionPercentage === 0
            ? ""
            : String(defaultPolicy.reserveRetentionPercentage),
      },
    }
  )
  const clearPreservedFormState = usePreservedFormState(form, {
    baselineKey: `optional-zero-reserve-v1:${JSON.stringify(defaultPolicy)}`,
    enabled: Boolean(preserveDraftKey),
    storageKey: preserveDraftKey ?? "tenant-finance:business-profit-policy",
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function quickFillProfitPolicy() {
    form.reset({
      defaultDistributablePercentage: "80",
      distributionBasis: "share_capital_balance",
      expenseTreatment: "deduct_reviewed_expenses_before_distribution",
      financialYearStartMonth: "1",
      historicalProfitMigrationMode: "import_historical_profit_pools",
      profitDistributionFrequency: "annual",
      requiresProfitDistributionApproval: true,
      reserveRetentionPercentage: "20",
    })
    showSuccess(
      "Profit policy filled",
      "Review the generated profit-sharing policy before saving."
    )
  }

  function onSubmit(values: BusinessProfitPolicyValues) {
    startTransition(async () => {
      try {
        await updateTenantBusinessProfitPolicyAction(
          objectToFormData({
            ...values,
            reserveRetentionPercentage:
              values.reserveRetentionPercentage?.trim() || "0",
          })
        )
        showSuccess("Policy saved", "Business profit policy updated.")
        clearPreservedFormState()
        if (redirectTo) {
          navigateWithFreshWizardState(router, redirectTo)
          return
        }
        router.refresh()
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
        {devMode ? (
          <div className="flex justify-end">
            <Button
              disabled={isPending}
              onClick={quickFillProfitPolicy}
              size="sm"
              type="button"
              variant="ghost"
            >
              Quick fill
            </Button>
          </div>
        ) : null}
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

const sharePolicySchema = z
  .object({
    configurationMode: z.enum(["monthly_history", "unit_based"]),
    compulsoryShareUnits: z.string().optional(),
    maximumShareUnits: z.string().optional(),
    unitAmount: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const unitAmount = Number(values.unitAmount)
    const compulsoryShareUnits = Number(values.compulsoryShareUnits)
    const maximumShareUnits = Number(values.maximumShareUnits)

    if (values.configurationMode !== "unit_based") {
      return
    }

    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Share cost must be greater than 0.",
        path: ["unitAmount"],
      })
    }

    if (!Number.isInteger(compulsoryShareUnits) || compulsoryShareUnits < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Compulsory shares must be a whole number 0 or greater.",
        path: ["compulsoryShareUnits"],
      })
    }

    if (!Number.isInteger(maximumShareUnits) || maximumShareUnits <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum shares must be a positive whole number.",
        path: ["maximumShareUnits"],
      })
    }

    if (
      Number.isInteger(compulsoryShareUnits) &&
      Number.isInteger(maximumShareUnits) &&
      maximumShareUnits < compulsoryShareUnits
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum shares cannot be below compulsory shares.",
        path: ["maximumShareUnits"],
      })
    }
  })

type SharePolicyValues = z.infer<typeof sharePolicySchema>

const shareConfigurationModeOptions = [
  { label: "Monthly share history model", value: "monthly_history" },
  { label: "Unit-based shareholding model", value: "unit_based" },
]

export function SharePolicyForm({
  defaultPolicy,
  formId,
  onConfigurationModeChange,
  preserveDraftKey,
  redirectTo,
  showSubmitButton = true,
}: {
  defaultPolicy: TenantSharePolicySettings
  formId?: string
  onConfigurationModeChange?: (
    mode: TenantSharePolicySettings["configurationMode"]
  ) => void
  preserveDraftKey?: string
  redirectTo?: string
  showSubmitButton?: boolean
}) {
  const router = useTenantRouter()
  const fallbackFormId = useId()
  const resolvedFormId = formId ?? fallbackFormId
  const hasSavedUnitPolicy = defaultPolicy.configurationMode === "unit_based"
  const form = useZodForm<SharePolicyValues>(sharePolicySchema, {
    defaultValues: {
      configurationMode: defaultPolicy.configurationMode,
      compulsoryShareUnits: hasSavedUnitPolicy
        ? String(defaultPolicy.compulsoryShareUnits)
        : "",
      maximumShareUnits: hasSavedUnitPolicy
        ? String(defaultPolicy.maximumShareUnits)
        : "",
      unitAmount: hasSavedUnitPolicy ? String(defaultPolicy.unitAmount) : "",
    },
  })
  const selectedMode = form.watch("configurationMode")
  const clearPreservedFormState = usePreservedFormState(form, {
    baselineKey: `empty-unsaved-unit-policy-v1:${JSON.stringify(defaultPolicy)}`,
    enabled: Boolean(preserveDraftKey),
    storageKey: preserveDraftKey ?? "tenant-finance:share-policy",
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    onConfigurationModeChange?.(selectedMode)
  }, [onConfigurationModeChange, selectedMode])

  function onSubmit(values: SharePolicyValues) {
    startTransition(async () => {
      try {
        const payload =
          values.configurationMode === "unit_based"
            ? values
            : { configurationMode: values.configurationMode }

        await updateTenantSharePolicyAction(objectToFormData(payload))
        showSuccess("Policy saved", "Share configuration updated.")
        clearPreservedFormState()
        if (redirectTo) {
          navigateWithFreshWizardState(router, redirectTo)
          return
        }
        router.refresh()
      } catch (error) {
        showError(
          "Could not save share policy",
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
        <FormField
          control={form.control}
          name="configurationMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Active share model</FormLabel>
              <FormControl>
                <SelectFormInput
                  onChange={(value) => {
                    const mode =
                      value as TenantSharePolicySettings["configurationMode"]

                    if (
                      mode === "unit_based" &&
                      field.value !== "unit_based" &&
                      !hasSavedUnitPolicy
                    ) {
                      form.setValue("unitAmount", "")
                      form.setValue("compulsoryShareUnits", "")
                      form.setValue("maximumShareUnits", "")
                    }

                    field.onChange(value)
                    onConfigurationModeChange?.(mode)
                  }}
                  options={shareConfigurationModeOptions}
                  value={field.value}
                />
              </FormControl>
              <p className="text-xs leading-5 text-muted-foreground">
                Select one active share model for this cooperative. The other
                model is inactive and is not used side by side.
              </p>
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
                  <FormLabel>Share cost</FormLabel>
                  <FormControl>
                    <CurrencyFormInput {...field} placeholder="Enter amount" />
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
                  <FormLabel>Compulsory shares</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      min="0"
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
                  <FormLabel>Maximum shares</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      min="1"
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
        ) : null}
        {showSubmitButton ? (
          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              Save policy
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

const financingPolicySchema = z
  .object({
    activeFinancingBlocksEmergency: z.boolean().default(true),
    activeFinancingBlocksProcurement: z.boolean().default(true),
    disbursementRequiresDeployableFunds: z.boolean().default(true),
    foodPurchaseAllowsCommitmentReductionDuringPayback: z
      .boolean()
      .default(false),
    foodPurchaseMaximumPaybackMonths: z
      .string()
      .min(1, "Foodstuff payback cap is required."),
    loanEligibilityMultiple: z
      .string()
      .min(1, "Eligibility multiple is required."),
    normalLoanAllocationPercentage: z
      .string()
      .min(1, "Normal allocation is required."),
    normalLoanTermMonths: z.string().min(1, "Normal term is required."),
    procurementAllowsCommitmentReductionDuringPayback: z
      .boolean()
      .default(false),
    procurementMaximumPaybackMonths: z
      .string()
      .min(1, "Procurement payback cap is required."),
    quickLoanAllocationPercentage: z
      .string()
      .min(1, "Quick allocation is required."),
    quickLoanTermMonths: z.string().min(1, "Quick term is required."),
    requiresDualLoanApproval: z.boolean().default(false),
    reserveBufferAmount: z.string().min(1, "Reserve buffer is required."),
    specialSavingsCountsForEligibility: z.boolean().default(true),
    strictCommitmentDuringFinancing: z.boolean().default(true),
  })
  .superRefine((values, ctx) => {
    const quickAllocation = Number(values.quickLoanAllocationPercentage)
    const normalAllocation = Number(values.normalLoanAllocationPercentage)
    const eligibilityMultiple = Number(values.loanEligibilityMultiple)
    const quickTerm = Number(values.quickLoanTermMonths)
    const normalTerm = Number(values.normalLoanTermMonths)
    const procurementMaxPayback = Number(values.procurementMaximumPaybackMonths)
    const foodPurchaseMaxPayback = Number(
      values.foodPurchaseMaximumPaybackMonths
    )
    const reserveBuffer = Number(values.reserveBufferAmount)

    if (
      !Number.isFinite(quickAllocation) ||
      quickAllocation < 0 ||
      quickAllocation > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quick allocation must be between 0 and 100.",
        path: ["quickLoanAllocationPercentage"],
      })
    }

    if (
      !Number.isFinite(normalAllocation) ||
      normalAllocation < 0 ||
      normalAllocation > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Normal allocation must be between 0 and 100.",
        path: ["normalLoanAllocationPercentage"],
      })
    }

    if (
      Number.isFinite(quickAllocation) &&
      Number.isFinite(normalAllocation) &&
      Number((quickAllocation + normalAllocation).toFixed(2)) !== 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quick and normal allocation must total 100.",
        path: ["normalLoanAllocationPercentage"],
      })
    }

    if (!Number.isFinite(eligibilityMultiple) || eligibilityMultiple <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Eligibility multiple must be greater than 0.",
        path: ["loanEligibilityMultiple"],
      })
    }

    if (!Number.isInteger(quickTerm) || quickTerm <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quick term must be a positive whole number.",
        path: ["quickLoanTermMonths"],
      })
    }

    if (!Number.isInteger(normalTerm) || normalTerm <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Normal term must be a positive whole number.",
        path: ["normalLoanTermMonths"],
      })
    }

    if (
      !Number.isInteger(procurementMaxPayback) ||
      procurementMaxPayback <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Procurement payback cap must be a positive whole number.",
        path: ["procurementMaximumPaybackMonths"],
      })
    }

    if (
      !Number.isInteger(foodPurchaseMaxPayback) ||
      foodPurchaseMaxPayback <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Foodstuff payback cap must be a positive whole number.",
        path: ["foodPurchaseMaximumPaybackMonths"],
      })
    }

    if (!Number.isFinite(reserveBuffer) || reserveBuffer < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reserve buffer must be 0 or greater.",
        path: ["reserveBufferAmount"],
      })
    }
  })

type FinancingPolicyValues = z.infer<typeof financingPolicySchema>

export function FinancingPolicyForm({
  defaultPolicy,
}: {
  defaultPolicy: TenantFinancingSettingsWorkspace["policy"]
}) {
  const form = useZodForm<FinancingPolicyValues>(financingPolicySchema, {
    defaultValues: {
      activeFinancingBlocksEmergency:
        defaultPolicy.activeFinancingBlocksEmergency,
      activeFinancingBlocksProcurement:
        defaultPolicy.activeFinancingBlocksProcurement,
      disbursementRequiresDeployableFunds:
        defaultPolicy.disbursementRequiresDeployableFunds,
      foodPurchaseAllowsCommitmentReductionDuringPayback:
        defaultPolicy.foodPurchaseAllowsCommitmentReductionDuringPayback,
      foodPurchaseMaximumPaybackMonths: String(
        defaultPolicy.foodPurchaseMaximumPaybackMonths
      ),
      loanEligibilityMultiple: String(defaultPolicy.loanEligibilityMultiple),
      normalLoanAllocationPercentage: String(
        defaultPolicy.normalLoanAllocationPercentage
      ),
      normalLoanTermMonths: String(defaultPolicy.normalLoanTermMonths),
      procurementAllowsCommitmentReductionDuringPayback:
        defaultPolicy.procurementAllowsCommitmentReductionDuringPayback,
      procurementMaximumPaybackMonths: String(
        defaultPolicy.procurementMaximumPaybackMonths
      ),
      quickLoanAllocationPercentage: String(
        defaultPolicy.quickLoanAllocationPercentage
      ),
      quickLoanTermMonths: String(defaultPolicy.quickLoanTermMonths),
      requiresDualLoanApproval: defaultPolicy.requiresDualLoanApproval,
      reserveBufferAmount: String(defaultPolicy.reserveBufferAmount),
      specialSavingsCountsForEligibility:
        defaultPolicy.specialSavingsCountsForEligibility,
      strictCommitmentDuringFinancing:
        defaultPolicy.strictCommitmentDuringFinancing,
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: FinancingPolicyValues) {
    startTransition(async () => {
      try {
        await updateTenantFinancingPolicyAction(
          objectToFormData(values, { booleanMode: "true-false" })
        )
        showSuccess("Policy saved", "Financing settings updated.")
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
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            control={form.control}
            name="quickLoanAllocationPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quick allocation</FormLabel>
                <FormControl>
                  <PercentageFormInput {...field} placeholder="30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="normalLoanAllocationPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Normal allocation</FormLabel>
                <FormControl>
                  <PercentageFormInput {...field} placeholder="70" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quickLoanTermMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quick term months</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    min="1"
                    placeholder="3"
                    type="number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="normalLoanTermMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Normal term months</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    min="1"
                    placeholder="18"
                    type="number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="procurementMaximumPaybackMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Procurement max payback</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    min="1"
                    placeholder="12"
                    type="number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="foodPurchaseMaximumPaybackMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Foodstuff max payback</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    min="1"
                    placeholder="1"
                    type="number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="loanEligibilityMultiple"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Eligibility multiple</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="decimal"
                    min="0.01"
                    placeholder="2"
                    step="0.01"
                    type="number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reserveBufferAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reserve buffer</FormLabel>
                <FormControl>
                  <CurrencyFormInput {...field} placeholder="0.00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="requiresDualLoanApproval"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-xs">Dual approval</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="disbursementRequiresDeployableFunds"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-xs">
                  Deployable funds check
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="specialSavingsCountsForEligibility"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-xs">Count special savings</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="strictCommitmentDuringFinancing"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-xs">Strict commitment</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="activeFinancingBlocksEmergency"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-xs">Block quick overlap</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="activeFinancingBlocksProcurement"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-xs">
                  Block procurement overlap
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="procurementAllowsCommitmentReductionDuringPayback"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-xs">Procurement flexible</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="foodPurchaseAllowsCommitmentReductionDuringPayback"
            render={({ field }) => (
              <FormItem className="flex h-10 items-center gap-2 rounded-md border border-input bg-transparent px-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel className="text-xs">Foodstuff flexible</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button disabled={isPending} type="submit">
            Save policy
          </Button>
        </div>
      </form>
    </Form>
  )
}

const loanProductSettingsSchema = z
  .object({
    code: z.string().trim().optional(),
    isActive: z.boolean().default(true),
    loanProductId: z.string().optional(),
    loanType: z.enum(["quick", "normal"]),
    maxSavingsMultiple: z.string().min(1, "Savings multiple is required."),
    name: z.string().min(1, "Product name is required."),
    termMonths: z.string().min(1, "Term months is required."),
  })
  .superRefine((values, ctx) => {
    const termMonths = Number(values.termMonths)
    const maxSavingsMultiple = Number(values.maxSavingsMultiple)

    if (!Number.isInteger(termMonths) || termMonths <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Term months must be a positive whole number.",
        path: ["termMonths"],
      })
    }

    if (!Number.isFinite(maxSavingsMultiple) || maxSavingsMultiple <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Savings multiple must be greater than 0.",
        path: ["maxSavingsMultiple"],
      })
    }
  })

type LoanProductSettingsValues = z.infer<typeof loanProductSettingsSchema>

export function LoanProductSettingsForm({
  product,
}: {
  product: LoanProductSettingsRow
}) {
  const form = useZodForm<LoanProductSettingsValues>(
    loanProductSettingsSchema,
    {
      defaultValues: {
        code: product.code ?? "",
        isActive: product.isActive,
        loanProductId: product.id ?? "",
        loanType: product.loanType,
        maxSavingsMultiple: String(product.maxSavingsMultiple),
        name: product.name,
        termMonths: String(product.termMonths),
      },
    }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: LoanProductSettingsValues) {
    startTransition(async () => {
      try {
        await updateLoanProductSettingsAction(
          objectToFormData(values, { booleanMode: "true-false" })
        )
        showSuccess("Product saved", `${values.name} updated.`)
      } catch (error) {
        showError(
          "Could not save product",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <input type="hidden" {...form.register("loanProductId")} />
        <input type="hidden" {...form.register("loanType")} />
        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Product name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="termMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Term months</FormLabel>
                <FormControl>
                  <Input {...field} inputMode="numeric" min="1" type="number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxSavingsMultiple"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Savings multiple</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    type="number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
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
                <FormLabel className="text-xs">Active</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button disabled={isPending} type="submit" variant="outline">
            Save product
          </Button>
        </div>
      </form>
    </Form>
  )
}

const financingCycleControlSchema = z.object({
  financingCycleId: z.string().optional(),
  status: z.enum(["open", "paused", "closed"]).optional(),
  statusNote: z.string().optional(),
})

type FinancingCycleControlValues = z.infer<typeof financingCycleControlSchema>

const cycleStatusOptions = [
  { label: "Open intake", value: "open" },
  { label: "Pause intake", value: "paused" },
  { label: "Close intake", value: "closed" },
]

export function FinancingCycleControlForm({
  currentCycle,
}: {
  currentCycle: TenantFinancingSettingsWorkspace["currentCyclePreview"]["existingCycle"]
}) {
  const form = useZodForm<FinancingCycleControlValues>(
    financingCycleControlSchema,
    {
      defaultValues: {
        financingCycleId: currentCycle?.id ?? "",
        status:
          currentCycle?.status === "open"
            ? "paused"
            : currentCycle?.status === "paused"
              ? "open"
              : "open",
        statusNote: "",
      },
    }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: FinancingCycleControlValues) {
    startTransition(async () => {
      try {
        const formData = objectToFormData(values)

        if (currentCycle?.id) {
          await updateMonthlyFinancingCycleStatusAction(formData)
          showSuccess("Cycle updated", "Monthly financing cycle status saved.")
          return
        }

        await openMonthlyFinancingCycleAction(formData)
        showSuccess("Cycle opened", "Monthly capacity snapshot created.")
      } catch (error) {
        showError(
          currentCycle?.id ? "Could not update cycle" : "Could not open cycle",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        {currentCycle?.id ? (
          <>
            <input type="hidden" {...form.register("financingCycleId")} />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cycle action</FormLabel>
                  <FormControl>
                    <SelectFormInput
                      onChange={field.onChange}
                      options={cycleStatusOptions}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : null}
        <FormField
          control={form.control}
          name="statusNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Audit note</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Board approval, quota pause, or month-end note"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button disabled={isPending} type="submit">
            {currentCycle?.id ? "Update cycle" : "Open current cycle"}
          </Button>
        </div>
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

type ShareStructureVersionInitialVersion = {
  amount: number
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

function buildShareHistoryRows(
  initialVersions: ShareStructureVersionInitialVersion[] | undefined
): ShareHistoryRow[] {
  const savedRows =
    initialVersions?.map(
      (version): ShareHistoryRow => ({
        amount: String(version.amount),
        effectiveFrom: version.effectiveFrom,
        id: `share-history-${version.id}`,
        valueType: version.valueType,
      })
    ) ?? []

  return savedRows.length > 0
    ? [...savedRows].sort(sortShareHistoryRowsByDate)
    : [createShareHistoryRow("share-history-initial")]
}

export function ShareStructureVersionForm({
  allowEmptyHistory = false,
  financeStartDate,
  formId,
  initialVersions,
  onSuccess,
  preserveDraftKey,
  redirectTo,
  showSubmitButton = true,
  stayOnStepHref,
}: {
  allowEmptyHistory?: boolean
  financeStartDate?: string | null
  formId?: string
  initialVersions?: ShareStructureVersionInitialVersion[]
  onSuccess?: () => void
  preserveDraftKey?: string
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
    () => buildShareHistoryRows(initialVersions)
  )
  const clearPreservedFormState = usePreservedFormState(form, {
    baselineKey: JSON.stringify(initialVersions ?? []),
    enabled: Boolean(preserveDraftKey),
    storageKey: `${preserveDraftKey ?? "tenant-finance:share-structure"}:form`,
  })
  const clearPreservedShareHistoryRows = usePreservedClientState({
    baselineKey: JSON.stringify(initialVersions ?? []),
    enabled: Boolean(preserveDraftKey),
    onRestore: setShareHistoryRows,
    storageKey: `${preserveDraftKey ?? "tenant-finance:share-structure"}:history-rows`,
    value: shareHistoryRows,
  })

  function onSubmit(values: ShareStructureVersionValues) {
    const startedRows = shareHistoryRows.filter(shareHistoryRowHasValue)
    const incompleteRow = startedRows.find(
      (row) => !shareHistoryRowIsComplete(row)
    )

    if (startedRows.length === 0) {
      if (allowEmptyHistory && redirectTo) {
        clearPreservedFormState()
        clearPreservedShareHistoryRows()
        navigateWithFreshWizardState(router, redirectTo)
        return
      }

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
        clearPreservedFormState()
        clearPreservedShareHistoryRows()
        if (redirectTo) {
          navigateWithFreshWizardState(router, redirectTo)
          return
        }
        resetShareHistoryRows()
        router.refresh()
        if (stayOnStepHref) {
          router.replace(stayOnStepHref)
        }
        onSuccess?.()
      } catch (error) {
        showError(
          "Could not save share update",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function resetShareHistoryRows() {
    setShareHistoryRows(buildShareHistoryRows(initialVersions))
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
          <div className="grid gap-3">
            {shareHistoryRows.map((row) => (
              <div
                className="grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-[9.5rem_minmax(0,1fr)_9.5rem_2rem] sm:items-start"
                key={row.id}
              >
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Date
                  <DatePickerInput
                    allowClear={false}
                    min={financeStartDate ?? undefined}
                    onChange={(effectiveFrom) =>
                      updateShareHistoryRow(row.id, { effectiveFrom })
                    }
                    placeholder="Effective Date"
                    value={row.effectiveFrom}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Rule
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
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Value
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
                      placeholder="Enter amount"
                      value={row.amount}
                    />
                  )}
                </label>
                <div className="pt-6">
                  <DeleteInlineRowButton
                    disabled={
                      shareHistoryRows.length === 1 &&
                      !shareHistoryRowHasValue(row)
                    }
                    label="share history row"
                    onDelete={() => deleteShareHistoryRow(row.id)}
                  />
                </div>
              </div>
            ))}
            <AddInlineRowButton
              disabled={isPending}
              label="Add Amount"
              onAdd={addShareHistoryRow}
            />
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
  applicability: z.array(z.string()).default([]),
  chargeFrequency: z.enum([
    "recurring_monthly",
    "per_contribution",
    "one_time",
    "manual",
  ]),
  chargeValueType: z.enum(["fixed_amount", "percentage"]),
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

const chargeApplicabilityOptions = [
  {
    label: "Commitment",
    value: "commitment_collection:monthly_collection:deduct_from_savings",
  },
  {
    label: "Loan request",
    value: "loan_request:submission:deduct_from_savings",
  },
  {
    label: "Loan",
    value: "loan:manual:deduct_from_savings",
  },
  {
    label: "Procurement",
    value: "procurement_request:submission:deduct_from_savings",
  },
  {
    label: "Foodstuff",
    value: "food_purchase_application:submission:deduct_from_savings",
  },
  {
    label: "Project",
    value: "project_financing_request:submission:deduct_from_savings",
  },
] as const

function ChargeApplicabilityCombobox({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean
  onChange: (value: string, checked: boolean) => void
  value: string[]
}) {
  const selectedLabels = chargeApplicabilityOptions
    .filter((option) => value.includes(option.value))
    .map((option) => option.label)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            className="h-9 w-full justify-start overflow-hidden px-3 font-normal"
            disabled={disabled}
            type="button"
            variant="outline"
          />
        }
      >
        <span className="truncate">
          {selectedLabels.length > 0
            ? selectedLabels.join(", ")
            : "Select workflows"}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-1 p-1">
        {chargeApplicabilityOptions.map((option) => (
          <label
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
            key={option.value}
          >
            <Checkbox
              checked={value.includes(option.value)}
              onCheckedChange={(checked) =>
                onChange(option.value, checked === true)
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function defaultChargeApplicabilityForPurpose(
  purpose: ChargeDefinitionValues["purpose"]
) {
  if (purpose === "loan_fee") {
    return ["loan_request:submission:deduct_from_savings"]
  }

  return ["commitment_collection:monthly_collection:deduct_from_savings"]
}

function legacyChargeApplicabilityValues(input: {
  appliesToLoanRequests?: boolean
  appliesToLoans?: boolean
  appliesToMembers?: boolean
  purpose?: ChargeDefinitionValues["purpose"]
}) {
  const values: string[] = []

  if (input.appliesToMembers ?? true) {
    values.push("commitment_collection:monthly_collection:deduct_from_savings")
  }

  if (input.appliesToLoanRequests || input.purpose === "loan_fee") {
    values.push("loan_request:submission:deduct_from_savings")
  }

  if (input.appliesToLoans) {
    values.push("loan:manual:deduct_from_savings")
  }

  return Array.from(new Set(values))
}

function getLegacyApplicabilityFlags(values: string[]) {
  return {
    appliesToLoanRequests: values.some((value) =>
      value.startsWith("loan_request:")
    ),
    appliesToLoans: values.some((value) => value.startsWith("loan:")),
    appliesToMembers: values.some((value) =>
      value.startsWith("commitment_collection:")
    ),
  }
}

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
  applicability?: Array<{
    collectionMode?: string | null
    trigger: string
    workflow: string
  }>
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
  code: string
  historyRows: ChargeHistoryRow[]
  id: string
  isActive: boolean
  saved: boolean
}

type ChargeQuickFillTemplate = Pick<
  ChargeDefinitionValues,
  | "appliesToLoanRequests"
  | "appliesToLoans"
  | "appliesToMembers"
  | "applicability"
  | "chargeFrequency"
  | "chargeValueType"
  | "isMonthlyLevy"
  | "name"
  | "purpose"
> & {
  amount: string
  code: string
}

const chargeQuickFillTemplates = [
  {
    amount: "1000",
    appliesToLoanRequests: false,
    appliesToLoans: false,
    appliesToMembers: true,
    applicability: [
      "commitment_collection:monthly_collection:deduct_from_savings",
    ],
    chargeFrequency: "recurring_monthly",
    chargeValueType: "fixed_amount",
    code: "LEVY",
    isMonthlyLevy: true,
    name: "Monthly levy",
    purpose: "general",
  },
  {
    amount: "2000",
    appliesToLoanRequests: false,
    appliesToLoans: false,
    appliesToMembers: true,
    applicability: [],
    chargeFrequency: "recurring_monthly",
    chargeValueType: "fixed_amount",
    code: "ADM",
    isMonthlyLevy: false,
    name: "Administrative fee",
    purpose: "general",
  },
  {
    amount: "5000",
    appliesToLoanRequests: false,
    appliesToLoans: false,
    appliesToMembers: true,
    applicability: ["commitment_collection:membership:separate_payment"],
    chargeFrequency: "one_time",
    chargeValueType: "fixed_amount",
    code: "MEM",
    isMonthlyLevy: false,
    name: "Membership fee",
    purpose: "membership_fee",
  },
  {
    amount: "2500",
    appliesToLoanRequests: true,
    appliesToLoans: false,
    appliesToMembers: false,
    applicability: ["loan_request:submission:deduct_from_savings"],
    chargeFrequency: "one_time",
    chargeValueType: "fixed_amount",
    code: "LNF",
    isMonthlyLevy: false,
    name: "Loan processing fee",
    purpose: "loan_fee",
  },
] satisfies ChargeQuickFillTemplate[]

function createChargeDefinitionRow(id?: string): ChargeDefinitionInputRow {
  const rowId =
    id ??
    `charge-definition-${Date.now()}-${Math.random().toString(36).slice(2)}`

  return {
    amount: "",
    appliesToLoanRequests: false,
    appliesToLoans: false,
    appliesToMembers: true,
    applicability: [],
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

function createQuickFillChargeDefinitionRow({
  effectiveFrom,
  template,
}: {
  effectiveFrom: string
  template: ChargeQuickFillTemplate
}) {
  const rowId = `charge-definition-quick-fill-${template.code.toLowerCase()}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`

  return {
    ...createChargeDefinitionRow(rowId),
    ...template,
    applicability: legacyChargeApplicabilityValues(template),
    effectiveFrom,
    historyRows: [
      {
        ...createChargeHistoryRow(`${rowId}-history`),
        amount: template.amount,
        effectiveFrom,
      },
    ],
    kind: getChargeKindForValueType(template.chargeValueType),
  }
}

function buildChargeApplicabilityValues(
  definition: ChargeDefinitionInitialDefinition
) {
  const explicitValues = definition.applicability
    ?.map(
      (row) =>
        `${row.workflow}:${row.trigger}:${row.collectionMode ?? "deduct_from_savings"}`
    )
    .filter((value) =>
      chargeApplicabilityOptions.some((option) => option.value === value)
    )

  return explicitValues && explicitValues.length > 0
    ? explicitValues
    : legacyChargeApplicabilityValues(definition)
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
      applicability: buildChargeApplicabilityValues(definition),
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
  return Boolean(row.name || row.historyRows.some(chargeHistoryRowHasValue))
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
  devMode = false,
  financeStartDate,
  formId,
  initialDefinitions,
  onSuccess,
  preserveDraftKey,
  redirectTo,
  showSubmitButton = true,
  stayOnStepHref,
}: {
  devMode?: boolean
  financeStartDate?: string | null
  formId?: string
  initialDefinitions?: ChargeDefinitionInitialDefinition[]
  onSuccess?: () => void
  preserveDraftKey?: string
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
  const clearPreservedChargeRows = usePreservedClientState({
    baselineKey: JSON.stringify(initialDefinitions ?? []),
    enabled: Boolean(preserveDraftKey),
    onRestore: setChargeRows,
    storageKey: preserveDraftKey ?? "tenant-finance:charge-definitions",
    value: chargeRows,
  })

  function quickFillChargeRows() {
    const effectiveFrom =
      financeStartDate ?? new Date().toISOString().slice(0, 10)
    const existingCodes = new Set(
      chargeRows.map((row) => row.code.trim().toUpperCase()).filter(Boolean)
    )
    const generatedRows = chargeQuickFillTemplates
      .filter((template) => !existingCodes.has(template.code))
      .map((template) =>
        createQuickFillChargeDefinitionRow({ effectiveFrom, template })
      )

    if (generatedRows.length === 0) {
      showSuccess(
        "Charges already filled",
        "The standard charge examples are already in the table."
      )
      return
    }

    setChargeRows((currentRows) => {
      const currentCodes = new Set(
        currentRows.map((row) => row.code.trim().toUpperCase()).filter(Boolean)
      )
      const rowsToAdd = chargeQuickFillTemplates
        .filter((template) => !currentCodes.has(template.code))
        .map((template) =>
          createQuickFillChargeDefinitionRow({ effectiveFrom, template })
        )
      const preservedRows = currentRows.filter(
        (row) => row.saved || chargeDefinitionRowHasValue(row)
      )

      return normalizeChargeDefinitionRows([...preservedRows, ...rowsToAdd])
    })
    showSuccess(
      "Charges generated",
      "Review the generated charge definitions and dated amounts before saving."
    )
  }

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
        | "applicability"
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
                      applicability:
                        defaultChargeApplicabilityForPurpose("loan_fee"),
                      chargeFrequency: "one_time" as const,
                    }
                  : patch.purpose
                    ? {
                        ...getLegacyApplicabilityFlags(
                          defaultChargeApplicabilityForPurpose(patch.purpose)
                        ),
                        applicability: defaultChargeApplicabilityForPurpose(
                          patch.purpose
                        ),
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

  function updateChargeApplicability(
    rowId: string,
    value: string,
    checked: boolean
  ) {
    setChargeRows((currentRows) =>
      normalizeChargeDefinitionRows(
        currentRows.map((row) => {
          if (row.id !== rowId) {
            return row
          }

          const applicability = checked
            ? Array.from(new Set([...row.applicability, value]))
            : row.applicability.filter((currentValue) => currentValue !== value)

          return {
            ...row,
            ...getLegacyApplicabilityFlags(applicability),
            applicability,
          }
        })
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
    const chargeRow = chargeRows.find((row) => row.id === rowId)

    if (!chargeRow?.saved) {
      setChargeRows((currentRows) =>
        normalizeChargeDefinitionRows(
          currentRows.filter((row) => row.id !== rowId)
        )
      )
      return
    }

    startTransition(async () => {
      try {
        await deleteChargeDefinitionAction(
          objectToFormData({
            chargeDefinitionId: chargeRow.chargeDefinitionId,
          })
        )
        setChargeRows((currentRows) =>
          normalizeChargeDefinitionRows(
            currentRows.filter((row) => row.id !== rowId)
          )
        )
        clearPreservedChargeRows()
        showSuccess("Charge deleted", "The unused charge was removed.")
        router.refresh()
      } catch (error) {
        showError(
          "Could not delete charge",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function addChargeRow() {
    setChargeRows((currentRows) => [
      ...normalizeChargeDefinitionRows(currentRows),
      createChargeDefinitionRow(),
    ])
  }

  function deleteChargeHistoryRow(chargeRowId: string, rowId: string) {
    const chargeRow = chargeRows.find((row) => row.id === chargeRowId)
    const historyRow = chargeRow?.historyRows.find((row) => row.id === rowId)

    if (!chargeRow || chargeRow.historyRows.length <= 1) {
      return
    }

    const removeLocalRow = () =>
      setChargeRows((currentRows) =>
        normalizeChargeDefinitionRows(
          currentRows.map((currentChargeRow) =>
            currentChargeRow.id === chargeRowId
              ? {
                  ...currentChargeRow,
                  historyRows: normalizeChargeHistoryRows(
                    currentChargeRow.historyRows.filter(
                      (row) => row.id !== rowId
                    )
                  ),
                }
              : currentChargeRow
          )
        )
      )

    if (!historyRow?.versionId) {
      removeLocalRow()
      return
    }

    startTransition(async () => {
      try {
        await deleteChargeDefinitionVersionAction(
          objectToFormData({
            chargeDefinitionVersionId: historyRow.versionId,
          })
        )
        removeLocalRow()
        clearPreservedChargeRows()
        showSuccess(
          "Dated amount deleted",
          "The charge history row was removed."
        )
        router.refresh()
      } catch (error) {
        showError(
          "Could not delete dated amount",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
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
          "Each started charge row needs a charge name, frequency, value, and purpose."
        )
        return null
      }

      if (chargeRow.applicability.length === 0) {
        showError(
          "Select charge target",
          "Each started charge row needs at least one workflow target."
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
          const legacyApplicabilityFlags = getLegacyApplicabilityFlags(
            chargeRow.applicability
          )

          if (chargeRow.saved) {
            await updateChargeDefinitionAction(
              objectToFormData({
                applicability: chargeRow.applicability,
                appliesToLoanRequests: String(
                  legacyApplicabilityFlags.appliesToLoanRequests
                ),
                appliesToLoans: String(legacyApplicabilityFlags.appliesToLoans),
                appliesToMembers: String(
                  legacyApplicabilityFlags.appliesToMembers
                ),
                chargeDefinitionId: chargeRow.chargeDefinitionId,
                chargeFrequency: chargeRow.chargeFrequency,
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
              applicability: chargeRow.applicability,
              appliesToLoanRequests:
                legacyApplicabilityFlags.appliesToLoanRequests,
              appliesToLoans: legacyApplicabilityFlags.appliesToLoans,
              appliesToMembers: legacyApplicabilityFlags.appliesToMembers,
              chargeFrequency: chargeRow.chargeFrequency,
              chargeValueType: chargeRow.chargeValueType,
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
        clearPreservedChargeRows()
        onSuccess?.()
        if (redirectTo) {
          navigateWithFreshWizardState(router, redirectTo)
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
        <h3 className="shrink-0 text-sm font-medium">Charges</h3>
        <div className="min-w-10 flex-1 border-t border-border/70" />
        {devMode ? (
          <Button
            disabled={isPending}
            onClick={quickFillChargeRows}
            size="sm"
            type="button"
            variant="ghost"
          >
            Quick fill charges
          </Button>
        ) : null}
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
      <div className="grid gap-4">
        {chargeRows.map((chargeRow) => (
          <div
            className="grid gap-4 border-t border-border/70 pt-4"
            key={chargeRow.id}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_10rem_8.5rem_9rem_15rem_2rem] xl:items-start">
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Charge
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
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Frequency
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
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Value
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
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Purpose
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
              </label>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Applies to
                </p>
                <ChargeApplicabilityCombobox
                  disabled={isPending}
                  onChange={(value, checked) =>
                    updateChargeApplicability(chargeRow.id, value, checked)
                  }
                  value={chargeRow.applicability}
                />
              </div>
              <div className="pt-6">
                <DeleteInlineRowButton
                  disabled={
                    isPending ||
                    (!chargeDefinitionRowHasValue(chargeRow) &&
                      chargeRows.filter((row) => !row.saved).length === 1 &&
                      chargeRows.every((row) => !row.saved))
                  }
                  label="charge row"
                  onDelete={() => deleteChargeRow(chargeRow.id)}
                />
              </div>
            </div>

            <div className="grid gap-3 pl-0 md:pl-6">
              <p className="text-xs font-medium text-muted-foreground">
                Dated amounts
              </p>
              {chargeRow.historyRows.map((row) => (
                <div
                  className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem_2rem] sm:items-start"
                  key={row.id}
                >
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Date
                    <DatePickerInput
                      allowClear={false}
                      disabled={isPending}
                      min={financeStartDate ?? undefined}
                      onChange={(value) =>
                        updateChargeHistoryRow(chargeRow.id, row.id, {
                          effectiveFrom: value,
                        })
                      }
                      placeholder="Select charge effective date"
                      value={row.effectiveFrom}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Amount
                    {chargeRow.chargeValueType === "percentage" ? (
                      <PercentageFormInput
                        disabled={isPending}
                        onChange={(amount) =>
                          updateChargeHistoryRow(chargeRow.id, row.id, {
                            amount,
                          })
                        }
                        placeholder="Enter charge percentage"
                        value={row.amount}
                      />
                    ) : (
                      <CurrencyFormInput
                        disabled={isPending}
                        onChange={(amount) =>
                          updateChargeHistoryRow(chargeRow.id, row.id, {
                            amount,
                          })
                        }
                        placeholder="Enter charge amount"
                        value={row.amount}
                      />
                    )}
                  </label>
                  {chargeRow.historyRows.length > 1 ? (
                    <div className="pt-6">
                      <DeleteInlineRowButton
                        disabled={isPending}
                        label="charge history row"
                        onDelete={() =>
                          deleteChargeHistoryRow(chargeRow.id, row.id)
                        }
                      />
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
              <AddInlineRowButton
                disabled={isPending}
                label="Add dated amount"
                onAdd={() => addChargeHistoryRow(chargeRow.id)}
              />
            </div>
          </div>
        ))}
        <AddInlineRowButton
          disabled={isPending}
          label="Add Charge"
          onAdd={addChargeRow}
        />
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
        if (stayOnStepHref) {
          router.replace(stayOnStepHref)
        }
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
          <Button disabled={isPending} type="submit">
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
  status: z.enum([
    "draft",
    "pending",
    "reviewed",
    "completed",
    "approved",
    "archived",
  ]),
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
    status === "pending" ||
    status === "reviewed" ||
    status === "completed" ||
    status === "approved" ||
    status === "archived"
  ) {
    return status
  }

  return "draft"
}

function createBusinessProfitHistoryRow(
  id?: string,
  status: BusinessProfitHistoryRow["status"] = "draft"
): BusinessProfitHistoryRow {
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
    status,
  }
}

const broughtForwardProfitStatusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
]

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
  preserveDraftKey?: string
  profitHistoryLayout?: "single" | "table"
  profitHistoryMode?: boolean
  redirectTo?: string
  showSubmitButton?: boolean
  sourceType?: "manual" | "backfill" | "import"
  setupMode?: TenantMigrationSetupMode
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
  hasNoOngoingBusiness: z.boolean().default(false),
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

function createBusinessHistoryRow(
  id?: string,
  profitStatus: BusinessProfitHistoryRow["status"] = "draft"
): BusinessHistoryInputRow {
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
    profitRows: [
      createBusinessProfitHistoryRow(`${rowId}-profit`, profitStatus),
    ],
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
  initialBusinesses: ShareBusinessInitialBusiness[] | undefined,
  profitStatus: BusinessProfitHistoryRow["status"] = "draft"
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
                  status: profitStatus,
                },
              ],
        saved: true,
        startDate: business.startDate,
        status: normalizeBusinessHistoryStatus(business.status),
      })
    ) ?? []

  return savedRows.length > 0
    ? [...savedRows].sort(sortBusinessHistoryRowsByStartDate)
    : [createBusinessHistoryRow("business-history-initial", profitStatus)]
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
  profitStatus = "draft",
  startDate,
}: {
  businessId: string
  endDate: Date
  profitStatus?: BusinessProfitHistoryRow["status"]
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
      ...createBusinessProfitHistoryRow(
        `${businessId}-profit-${index}`,
        profitStatus
      ),
      amount,
      deductionAmount,
      profitDate,
      reason: deductionAmount ? randomItem(businessQuickFillReasons) : "",
    })
  }

  return profitRows.sort(sortBusinessProfitHistoryRowsByDate)
}

function createRandomBusinessHistoryRows(
  financeStartDate?: string | null,
  profitStatus: BusinessProfitHistoryRow["status"] = "draft"
) {
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
        profitStatus,
        startDate,
      }),
      startDate: formatInputDate(startDate),
      status: "completed" as const,
    }
  })
}

export function ShareBusinessForm(props: ShareBusinessFormProps) {
  if (props.profitHistoryMode && props.profitHistoryLayout !== "single") {
    return <ShareBusinessProfitHistoryTableForm {...props} />
  }

  return <ShareBusinessSingleForm {...props} />
}

function ShareBusinessProfitHistoryTableForm({
  financeStartDate,
  initialBusinesses,
  onSuccess,
  preserveDraftKey,
  sourceType = "backfill",
  redirectTo,
  setupMode = "historical_backfill",
  showSubmitButton = true,
  stayOnStepHref,
}: ShareBusinessFormProps) {
  const isBroughtForwardSetup = setupMode === "brought_forward"
  const defaultProfitStatus = isBroughtForwardSetup ? "pending" : "draft"
  const router = useTenantRouter()
  const fallbackFormId = useId()
  const resolvedFormId = fallbackFormId
  const form = useZodForm<BusinessHistoryTableValues>(
    businessHistoryTableSchema,
    {
      defaultValues: {
        businessRows: buildBusinessHistoryRows(
          initialBusinesses,
          defaultProfitStatus
        ),
        hasNoOngoingBusiness: false,
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
  const hasNoOngoingBusiness = form.watch("hasNoOngoingBusiness") ?? false
  const clearPreservedFormState = usePreservedFormState(form, {
    baselineKey: JSON.stringify(initialBusinesses ?? []),
    enabled: Boolean(preserveDraftKey),
    storageKey: `${preserveDraftKey ?? "tenant-finance:business-history"}:form`,
  })

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
      businessRows: buildBusinessHistoryRows(
        initialBusinesses,
        defaultProfitStatus
      ),
      hasNoOngoingBusiness: false,
    })
  }

  function quickFillBusinessRows() {
    setBusinessRows((currentRows) =>
      normalizeBusinessHistoryRows([
        ...currentRows.filter((row) => row.saved),
        ...createRandomBusinessHistoryRows(
          financeStartDate,
          defaultProfitStatus
        ),
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
        "amount" | "deductionAmount" | "profitDate" | "reason" | "status"
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
      createBusinessHistoryRow(undefined, defaultProfitStatus),
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
                  createBusinessProfitHistoryRow(
                    undefined,
                    defaultProfitStatus
                  ),
                ],
              }
            : businessRow
        )
      )
    )
  }

  function getValidBusinessRows(values: BusinessHistoryTableValues) {
    if (values.hasNoOngoingBusiness) {
      return []
    }

    const startedRows = values.businessRows.filter(businessHistoryRowHasValue)

    if (startedRows.length === 0) {
      if (isBroughtForwardSetup) {
        return []
      }

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

      if (startedProfitRows.length === 0 && !isBroughtForwardSetup) {
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
              historyStatus: businessRow.profitRows.map((row) => row.status),
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
          isBroughtForwardSetup
            ? "Current-season businesses saved"
            : "Business history saved",
          validBusinessRows.length === 0
            ? "No ongoing business was recorded. Continuing setup."
            : isBroughtForwardSetup
              ? "Current-season business details were recorded."
              : "Business and profit history rows were recorded."
        )
        form.reset({
          businessRows: buildBusinessHistoryRows(
            initialBusinesses,
            defaultProfitStatus
          ),
          hasNoOngoingBusiness: false,
        })
        clearPreservedFormState()
        if (redirectTo) {
          navigateWithFreshWizardState(router, redirectTo)
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
        <FormField
          control={form.control}
          name="hasNoOngoingBusiness"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3 border border-border/70 bg-muted/20 p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              </FormControl>
              <div className="grid gap-1">
                <FormLabel>
                  {isBroughtForwardSetup
                    ? "We don't have any ongoing business"
                    : "We don't have any business history to record"}
                </FormLabel>
                <p className="text-xs leading-5 text-muted-foreground">
                  {isBroughtForwardSetup
                    ? "Select this when there is no business participating in the current profit-sharing season."
                    : "Select this when the cooperative has no historical business or profit records to migrate."}{" "}
                  The business form will close and you can continue with Next.
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        {hasNoOngoingBusiness ? null : (
          <>
        <div className="flex items-center gap-3">
          <h3 className="shrink-0 text-sm font-medium">
            {isBroughtForwardSetup
              ? "Current-season businesses"
              : "Business History"}
          </h3>
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
        <div className="grid gap-4">
          {businessRows.map((businessRow) => (
            <div
              className={cn(
                "grid gap-4 border-t border-border/70 pt-4 transition-colors duration-700",
                flashBusinessRowId === businessRow.id && "bg-muted/70"
              )}
              key={businessRow.id}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_9rem_9.5rem_9.5rem_2rem] xl:items-start">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Title
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
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Amount
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
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Start date
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
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  End date
                  <DatePickerInput
                    disabled={isPending}
                    min={businessRow.startDate || financeStartDate || undefined}
                    onChange={(endDate) =>
                      updateBusinessRow(businessRow.id, { endDate })
                    }
                    placeholder="End date"
                    value={businessRow.endDate}
                  />
                </label>
                <div className="pt-6">
                  <DeleteInlineRowButton
                    disabled={
                      businessRow.saved ||
                      isPending ||
                      (!businessHistoryRowHasValue(businessRow) &&
                        businessRows.filter((row) => !row.saved).length === 1)
                    }
                    label="business row"
                    onDelete={() => deleteBusinessRow(businessRow.id)}
                  />
                </div>
              </div>

              <div className="grid gap-3 pl-0 md:pl-6">
                <div className="flex items-center gap-3">
                  <h4 className="shrink-0 text-xs font-medium text-muted-foreground">
                    {isBroughtForwardSetup
                      ? "Current-season profit"
                      : "Profit History"}
                  </h4>
                  <div className="min-w-10 flex-1 border-t border-border/70" />
                </div>
                {businessRow.profitRows.map((profitRow) => {
                  const shareableBalance = calculateShareableBalance(profitRow)

                  return (
                    <div
                      className={cn(
                        "grid gap-3 md:grid-cols-2 xl:items-start",
                        isBroughtForwardSetup
                          ? "xl:grid-cols-[9.5rem_9rem_9rem_8.5rem_minmax(0,1fr)_9rem_2rem]"
                          : "xl:grid-cols-[9.5rem_9rem_9rem_minmax(0,1fr)_9rem_2rem]"
                      )}
                      key={profitRow.id}
                    >
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Date
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
                      </label>
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Amount
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
                      </label>
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Deduction
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
                      </label>
                      {isBroughtForwardSetup ? (
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                          Status
                          <SelectFormInput
                            disabled={isPending}
                            onChange={(status) =>
                              updateBusinessProfitRow(
                                businessRow.id,
                                profitRow.id,
                                {
                                  status:
                                    status === "completed"
                                      ? "completed"
                                      : "pending",
                                }
                              )
                            }
                            options={broughtForwardProfitStatusOptions}
                            value={
                              profitRow.status === "completed"
                                ? "completed"
                                : "pending"
                            }
                          />
                        </label>
                      ) : null}
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Reason
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
                      </label>
                      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Shareable
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
                      </label>
                      <div className="pt-6">
                        <DeleteInlineRowButton
                          disabled={
                            isPending || Boolean(profitRow.profitEntryId)
                          }
                          label="profit row"
                          onDelete={() =>
                            deleteBusinessProfitRow(
                              businessRow.id,
                              profitRow.id
                            )
                          }
                        />
                      </div>
                    </div>
                  )
                })}
                <AddInlineRowButton
                  disabled={isPending}
                  label="Add Profit"
                  onAdd={() => addBusinessProfitRow(businessRow.id)}
                />
              </div>
            </div>
          ))}
          <AddInlineRowButton
            disabled={isPending}
            label="Add Business"
            onAdd={addBusinessRow}
          />
        </div>
          </>
        )}
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
  preserveDraftKey,
  profitHistoryMode = false,
  sourceType = "manual",
  stayOnStepHref,
}: ShareBusinessFormProps) {
  const isMigrationHistory = sourceType === "backfill"
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
  const clearPreservedFormState = usePreservedFormState(form, {
    enabled: Boolean(preserveDraftKey),
    storageKey: `${preserveDraftKey ?? "tenant-finance:share-business"}:form`,
  })
  const clearPreservedProfitHistoryRows = usePreservedClientState({
    enabled: Boolean(preserveDraftKey),
    onRestore: setProfitHistoryRows,
    storageKey: `${preserveDraftKey ?? "tenant-finance:share-business"}:profit-history-rows`,
    value: profitHistoryRows,
  })

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

  function removeProfitHistoryRow(rowId: string) {
    setProfitHistoryRows((currentRows) => {
      const remainingRows = currentRows.filter((row) => row.id !== rowId)

      return remainingRows.length > 0
        ? remainingRows
        : [createBusinessProfitHistoryRow()]
    })
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
        "Complete profit entry",
        "Each started profit entry needs a profit date and amount."
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
        showError("Invalid deduction", "Profit deduction cannot be negative.")
        return null
      }

      if (shareableBalance < 0) {
        showError(
          "Invalid shareable balance",
          "Profit deduction cannot be greater than the profit amount."
        )
        return null
      }

      if (deductionAmount > 0 && !row.reason.trim()) {
        showError(
          "Deduction reason required",
          "Add a reason for every profit entry with a deduction."
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
          isMigrationHistory
            ? "Historical business and profit record saved."
            : validProfitHistoryRows?.length
              ? "Business and realized profit entries were saved."
              : "Business saved. Profit can be recorded when results are available."
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
        clearPreservedFormState()
        clearPreservedProfitHistoryRows()
        if (stayOnStepHref) {
          router.replace(stayOnStepHref)
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
                <Input
                  {...field}
                  className="h-11 md:h-8"
                  placeholder="Community retail pool"
                />
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
                <CurrencyFormInput
                  {...field}
                  className="h-11 md:h-8"
                  placeholder="500000"
                />
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
                  className="h-11 md:h-8"
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
                  className="h-11 md:h-8"
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
                  triggerClassName="h-11! md:h-8!"
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
                  triggerClassName="h-11! md:h-8!"
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {profitHistoryMode ? (
          <section className="border-y border-border/70 py-4 md:col-span-2 md:border md:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">
                  {isMigrationHistory
                    ? "Profit history"
                    : "Profit entries (optional)"}
                </h3>
                <p className="max-w-xl text-xs leading-5 text-muted-foreground">
                  {isMigrationHistory
                    ? "Add each historical profit result supported by the cooperative records."
                    : "Register the business now, then add only realized profit supported by evidence."}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
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
                  triggerClassName="h-11 w-full sm:w-auto! md:h-8"
                />
                <Button
                  className="h-11 w-full sm:w-auto! md:h-8"
                  onClick={sortProfitHistoryRows}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon
                    icon={ArrowUpDownIcon}
                    data-icon="inline-start"
                  />
                  Sort
                </Button>
                <Button
                  className="h-11 w-full sm:w-auto! md:h-8"
                  onClick={resetProfitHistoryRows}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Clear
                </Button>
              </div>
            </div>
            <FieldGroup className="mt-4 gap-4">
              {profitHistoryRows.map((row, index) => {
                const shareableBalance = calculateShareableBalance(row)

                return (
                  <div
                    className="border-t border-border/70 pt-4 first:border-t-0 first:pt-0"
                    key={row.id}
                  >
                    <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
                      <p className="text-xs font-medium text-foreground">
                        Profit entry {index + 1}
                      </p>
                      <Button
                        aria-label={`Remove profit entry ${index + 1}`}
                        className="size-11 text-muted-foreground md:size-8"
                        onClick={() => removeProfitHistoryRow(row.id)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`profit-history-date-${row.id}`}>
                          Profit date
                        </FieldLabel>
                        <DatePickerInput
                          allowClear={false}
                          className="h-11 md:h-8"
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
                          Profit amount
                        </FieldLabel>
                        <CurrencyFormInput
                          className="h-11 md:h-8"
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
                          className="h-11 md:h-8"
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
                          Deduction reason
                        </FieldLabel>
                        <Input
                          className="h-11 md:h-8"
                          id={`profit-history-reason-${row.id}`}
                          onChange={(event) =>
                            updateProfitHistoryRow(row.id, {
                              reason: event.target.value,
                            })
                          }
                          placeholder="Required when a deduction is added"
                          value={row.reason}
                        />
                      </Field>
                      <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 sm:col-span-2">
                        <span className="text-xs text-muted-foreground">
                          Shareable balance
                        </span>
                        <span className="font-medium tabular-nums text-foreground">
                          ₦
                          {Number.isFinite(shareableBalance)
                            ? shareableBalance.toLocaleString("en-NG", {
                                maximumFractionDigits: 2,
                                minimumFractionDigits: 2,
                              })
                            : "0.00"}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <AddInlineRowButton
                label="Add profit entry"
                onAdd={addProfitHistoryRow}
              />
            </FieldGroup>
          </section>
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
          <Button
            className="h-11 w-full md:h-9 md:w-auto"
            disabled={isPending}
            type="submit"
          >
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
        if (stayOnStepHref) {
          router.replace(stayOnStepHref)
        }
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
      onClick={onClick}
    >
      Generate allocations
    </Button>
  )
}
