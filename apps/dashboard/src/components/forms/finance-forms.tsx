"use client"

import { useQuery } from "@tanstack/react-query"
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
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { DatePickerInput } from "@/components/date-picker-input"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { createQaAmount } from "@halaalvest/utils"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { MemberCombobox } from "@/components/member-combobox"
import { useTRPC } from "@/trpc/client"
import {
  recordMemberPaymentAction,
  setMemberContributionPlanAction,
  updateContributionPlanAction,
  updateMemberPaymentAllocationPreferenceAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { closeContributionPlanAction } from "@/lib/dashboard-actions"

function CurrencyFormInput({
  disabled = false,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <CurrencyInput
      allowNegative={false}
      decimalScale={2}
      disabled={disabled}
      inputMode="decimal"
      placeholder={placeholder}
      value={value ?? ""}
      valueIsNumericString
      onValueChange={(values) => onChange(values.value)}
    />
  )
}

const contributionPlanSchema = z.object({
  amount: z.string().min(1, "Monthly commitment is required."),
  memberId: z.string().min(1, "Member is required."),
  name: z.string().optional(),
  startsAt: z.string().min(1, "Effective date is required."),
})

type ContributionPlanValues = z.infer<typeof contributionPlanSchema>

/**
 * Quick Fill's member: the first match of the members search, read only when
 * Quick Fill shows (the forms no longer receive a member list).
 */
function useQuickFillMemberId(enabled: boolean) {
  const trpc = useTRPC()
  const { data } = useQuery(
    trpc.members.options.queryOptions({}, { enabled, staleTime: 5 * 60_000 })
  )

  return data?.[0]?.id ?? ""
}

export function ContributionPlanForm({
  devMode,
  onSuccess,
}: {
  devMode: boolean
  onSuccess?: () => Promise<void> | void
}) {
  const quickFillMemberId = useQuickFillMemberId(devMode)
  const form = useZodForm<ContributionPlanValues>(contributionPlanSchema, {
    defaultValues: {
      amount: "",
      memberId: "",
      name: "",
      startsAt: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ContributionPlanValues) {
    startTransition(async () => {
      try {
        await setMemberContributionPlanAction(objectToFormData(values))
        showSuccess("Commitment saved", "Member commitment plan recorded.")
        form.reset({
          amount: "",
          memberId: "",
          name: "",
          startsAt: "",
        })
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not save commitment",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 pb-6 md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {devMode ? (
          <div className="flex justify-end md:col-span-2">
            <DashboardQuickFill
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(
                  form,
                  "contribution_plan",
                  {
                    memberId: quickFillMemberId,
                  },
                  { emailDomain }
                )
              }
            />
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Member</FormLabel>
              <FormControl>
                <MemberCombobox
                  disabled={isPending}
                  id={field.name}
                  onValueChange={field.onChange}
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
              <FormLabel>Monthly commitment</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="25000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="startsAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effective from</FormLabel>
              <FormControl>
                <DatePickerInput
                  {...field}
                  allowClear={false}
                  placeholder="Select effective date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Plan label</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Monthly commitment"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button
            className="h-11 w-full sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            Save commitment plan
          </Button>
        </div>
      </form>
    </Form>
  )
}

const memberPaymentSchema = z.object({
  channel: z.enum(["payroll", "transfer", "cash", "manual"]),
  committedSavingsAmount: z
    .string()
    .min(1, "Committed savings amount is required."),
  contributionPlanId: z.string().optional(),
  extraLoanPaymentAmount: z.string().optional(),
  extraSavingsAmount: z.string().optional(),
  loanId: z.string().optional(),
  memberId: z.string().min(1, "Member is required."),
  periodLabel: z.string().optional(),
  postedAt: z.string().min(1, "Posted date is required."),
  reference: z.string().optional(),
  scheduledLoanServicingAmount: z.string().optional(),
  totalAmount: z.string().optional(),
})

type MemberPaymentValues = z.infer<typeof memberPaymentSchema>

export function MemberPaymentForm({
  commitmentPlans,
  devMode,
  loans,
  onSuccess,
}: {
  commitmentPlans: Array<{ id: string; label: string }>
  devMode: boolean
  loans: Array<{ id: string; label: string }>
  onSuccess?: () => Promise<void> | void
}) {
  const quickFillMemberId = useQuickFillMemberId(devMode)
  const form = useZodForm<MemberPaymentValues>(memberPaymentSchema, {
    defaultValues: {
      channel: "transfer",
      committedSavingsAmount: "",
      contributionPlanId: "",
      extraLoanPaymentAmount: "",
      extraSavingsAmount: "",
      loanId: "",
      memberId: "",
      periodLabel: "",
      postedAt: "",
      reference: "",
      scheduledLoanServicingAmount: "",
      totalAmount: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const selectedLoanId = form.watch("loanId")

  function onSubmit(values: MemberPaymentValues) {
    startTransition(async () => {
      try {
        await recordMemberPaymentAction(objectToFormData(values))
        showSuccess("Payment recorded", "Member payment allocation saved.")
        form.reset({
          channel: "transfer",
          committedSavingsAmount: "",
          contributionPlanId: "",
          extraLoanPaymentAmount: "",
          extraSavingsAmount: "",
          loanId: "",
          memberId: "",
          periodLabel: "",
          postedAt: "",
          reference: "",
          scheduledLoanServicingAmount: "",
          totalAmount: "",
        })
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not record payment",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 pb-6 md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {devMode ? (
          <div className="flex justify-end md:col-span-2">
            <DashboardQuickFill
              form={form}
              onFill={({ emailDomain }) => {
                const loanId = loans[0]?.id ?? ""

                applyDashboardDevFormFill(
                  form,
                  "member_payment",
                  {
                    contributionPlanId: commitmentPlans[0]?.id ?? "",
                    extraLoanPaymentAmount: loanId ? "5000" : "",
                    loanId,
                    memberId: quickFillMemberId,
                    scheduledLoanServicingAmount: loanId ? "15000" : "",
                    totalAmount: loanId ? "50000" : "30000",
                  },
                  { emailDomain }
                )
              }}
            />
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Member</FormLabel>
              <FormControl>
                <MemberCombobox
                  disabled={isPending}
                  id={field.name}
                  onValueChange={field.onChange}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contributionPlanId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Commitment plan</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">No linked plan</option>
                  {commitmentPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.label}
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
          name="loanId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Loan</FormLabel>
              <FormControl>
                <NativeSelect
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    if (!event.target.value) {
                      form.setValue("extraLoanPaymentAmount", "")
                      form.setValue("scheduledLoanServicingAmount", "")
                    }
                  }}
                >
                  <option value="">No loan allocation</option>
                  {loans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.label}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {[
          ["totalAmount", "Total payment", "50000"],
          ["committedSavingsAmount", "Commitment savings", "25000"],
          ["extraSavingsAmount", "Extra savings", "5000"],
          ["scheduledLoanServicingAmount", "Scheduled loan servicing", "15000"],
          ["extraLoanPaymentAmount", "Extra loan payment", "5000"],
        ].map(([name, label, placeholder]) => (
          <FormField
            key={name}
            control={form.control}
            name={name as keyof MemberPaymentValues}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <CurrencyFormInput
                    disabled={
                      (name === "scheduledLoanServicingAmount" ||
                        name === "extraLoanPaymentAmount") &&
                      !selectedLoanId
                    }
                    onChange={field.onChange}
                    value={field.value as string | undefined}
                    placeholder={placeholder}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <FormField
          control={form.control}
          name="channel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="payroll">Payroll</option>
                  <option value="transfer">Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="manual">Manual</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="postedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Posted date</FormLabel>
              <FormControl>
                <DatePickerInput
                  {...field}
                  allowClear={false}
                  placeholder="Select posted date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="periodLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period label</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="April 2026"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="TRX-001"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button
            className="h-11 w-full sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            Record payment allocation
          </Button>
        </div>
      </form>
    </Form>
  )
}

const paymentPreferenceSchema = z.object({
  memberId: z.string().min(1),
  preference: z.enum(["manual_split", "savings_first", "loan_first"]),
})

type PaymentPreferenceValues = z.infer<typeof paymentPreferenceSchema>

export function MemberPaymentPreferenceForm({
  defaultValues,
  onSuccess,
  title,
}: {
  defaultValues: PaymentPreferenceValues
  onSuccess?: () => Promise<void> | void
  title: string
}) {
  const form = useZodForm<PaymentPreferenceValues>(paymentPreferenceSchema, {
    defaultValues,
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: PaymentPreferenceValues) {
    startTransition(async () => {
      try {
        await updateMemberPaymentAllocationPreferenceAction(
          objectToFormData(values)
        )
        showSuccess("Preset saved", "Member payment preset updated.")
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not save preset",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-3 border-y border-border py-4 md:grid-cols-[minmax(0,1fr)_220px_auto]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div>
          <p className="font-medium text-foreground">{title}</p>
        </div>
        <FormField
          control={form.control}
          name="preference"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="manual_split">Manual split</option>
                  <option value="savings_first">Savings first</option>
                  <option value="loan_first">Loan first</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center">
          <Button
            className="h-11 md:h-9"
            disabled={isPending}
            size="sm"
            type="submit"
            variant="outline"
          >
            Save preset
          </Button>
        </div>
      </form>
    </Form>
  )
}

const contributionPlanUpdateSchema = z.object({
  amount: z.string().min(1, "Amount is required."),
  name: z.string().optional(),
  planId: z.string().min(1),
})

type ContributionPlanUpdateValues = z.infer<typeof contributionPlanUpdateSchema>

export function ContributionPlanUpdateForm({
  defaultValues,
  onSuccess,
}: {
  defaultValues: ContributionPlanUpdateValues
  onSuccess?: () => Promise<void> | void
}) {
  const form = useZodForm<ContributionPlanUpdateValues>(
    contributionPlanUpdateSchema,
    { defaultValues }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ContributionPlanUpdateValues) {
    startTransition(async () => {
      try {
        await updateContributionPlanAction(objectToFormData(values))
        showSuccess("Plan updated", "Commitment plan updated.")
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not update plan",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <DashboardQuickFill
          className="md:col-span-3"
          form={form}
          onFill={() =>
            form.reset({
              ...form.getValues(),
              amount: createQaAmount(10_000, 60_000, 5_000),
              name: "Monthly commitment",
            })
          }
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
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
              <FormControl>
                <CurrencyFormInput {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className="h-11 md:h-9"
          disabled={isPending}
          size="sm"
          type="submit"
          variant="outline"
        >
          Update plan
        </Button>
      </form>
    </Form>
  )
}

const contributionPlanCloseSchema = z.object({
  endsAt: z.string().min(1, "End date is required."),
  planId: z.string().min(1),
})

type ContributionPlanCloseValues = z.infer<typeof contributionPlanCloseSchema>

export function ContributionPlanCloseForm({
  onSuccess,
  planId,
}: {
  onSuccess?: () => Promise<void> | void
  planId: string
}) {
  const form = useZodForm<ContributionPlanCloseValues>(
    contributionPlanCloseSchema,
    {
      defaultValues: {
        endsAt: "",
        planId,
      },
    }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ContributionPlanCloseValues) {
    startTransition(async () => {
      try {
        await closeContributionPlanAction(objectToFormData(values))
        showSuccess("Plan closed", "Commitment plan closed.")
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not close plan",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="endsAt"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <DatePickerInput
                  {...field}
                  allowClear={false}
                  placeholder="Select end date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className="h-11 md:h-9"
          disabled={isPending}
          size="sm"
          type="submit"
          variant="outline"
        >
          Close plan
        </Button>
      </form>
    </Form>
  )
}
