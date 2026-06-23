"use client"

import { useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
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
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <CurrencyInput
      allowNegative={false}
      decimalScale={2}
      inputMode="decimal"
      placeholder={placeholder}
      value={value ?? ""}
      valueIsNumericString
      onValueChange={(values) => onChange(values.value)}
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
                <Input {...field} type="date" />
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
                <Input
                  {...field}
                  min={financeStartDate ?? undefined}
                  type="date"
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
                <NativeSelect {...field}>
                  <option value="fixed_amount">Fixed amount</option>
                  <option value="percentage">Percentage after charges</option>
                </NativeSelect>
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
  amount: z.string().min(1, "Amount is required."),
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
  effectiveFrom: z.string().min(1, "Start date is required."),
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

  function onSubmit(values: ChargeDefinitionValues) {
    if (isBeforeFinanceStartDate(values.effectiveFrom, financeStartDate)) {
      setDateBeforeFinanceStartError(
        form,
        "effectiveFrom",
        "Start date",
        financeStartDate
      )
      return
    }

    startTransition(async () => {
      try {
        await createChargeDefinitionAction(objectToFormData(values))
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
                <NativeSelect {...field}>
                  <option value="recurring_monthly">Recurring monthly</option>
                  <option value="per_contribution">Per contribution</option>
                  <option value="one_time">One time</option>
                  <option value="manual">Manual</option>
                </NativeSelect>
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
                <NativeSelect {...field}>
                  <option value="fixed_amount">Fixed amount</option>
                  <option value="percentage">Percentage</option>
                </NativeSelect>
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
                <NativeSelect {...field}>
                  <option value="fixed">Fixed</option>
                  <option value="percentage">Percentage</option>
                </NativeSelect>
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
              <FormLabel>Initial amount</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="2000" />
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
                <NativeSelect {...field}>
                  <option value="general">General charge</option>
                  <option value="member_share">Member share</option>
                  <option value="loan_fee">Loan fee</option>
                  <option value="membership_fee">Membership fee</option>
                  <option value="penalty">Penalty</option>
                </NativeSelect>
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
              <FormLabel>Start date</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  min={financeStartDate ?? undefined}
                  type="date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button disabled={isPending} type="submit" className="rounded-full">
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
                <NativeSelect {...field}>
                  <option value="">Select a charge</option>
                  {chargeDefinitions.map((charge) => (
                    <option key={charge.id} value={charge.id}>
                      {charge.label}
                    </option>
                  ))}
                </NativeSelect>
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
                <Input
                  {...field}
                  min={financeStartDate ?? undefined}
                  type="date"
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
                <NativeSelect {...field}>
                  <option value="fixed">Fixed</option>
                  <option value="percentage">Percentage</option>
                </NativeSelect>
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
                <NativeSelect {...field}>
                  <option value="fixed_amount">Fixed amount</option>
                  <option value="percentage">Percentage</option>
                </NativeSelect>
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
                <Input
                  {...field}
                  min={financeStartDate ?? undefined}
                  type="date"
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
                <Input
                  {...field}
                  min={watchedStartDate || financeStartDate || undefined}
                  type="date"
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
                <NativeSelect {...field}>
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </NativeSelect>
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
                <NativeSelect {...field}>
                  <option value="">Not linked yet</option>
                  {dividendPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </NativeSelect>
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
                <NativeSelect {...field}>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.label}
                    </option>
                  ))}
                </NativeSelect>
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
                <Input
                  {...field}
                  min={financeStartDate ?? undefined}
                  type="date"
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
                <NativeSelect {...field}>
                  <option value="draft">Draft</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="archived">Archived</option>
                </NativeSelect>
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
                <NativeSelect {...field}>
                  <option value="manual">Manual</option>
                  <option value="backfill">Backfill</option>
                  <option value="import">Import</option>
                </NativeSelect>
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
                <NativeSelect {...field}>
                  <option value="">Not linked yet</option>
                  {dividendPeriods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </NativeSelect>
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
