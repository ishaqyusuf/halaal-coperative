"use client"

import { useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
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
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import {
  applyChargeAction,
  createChargeDefinitionAction,
  postRepaymentAction,
  recordMemberPaymentAction,
  recordCollectionFollowUpAction,
  reviewLoanRequestAction,
  setMemberContributionPlanAction,
  submitLoanRequestAction,
  updateContributionPlanAction,
  updateMemberPaymentAllocationPreferenceAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import {
  closeContributionPlanAction,
  disburseLoanAction,
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

const contributionPlanSchema = z.object({
  amount: z.string().min(1, "Monthly commitment is required."),
  memberId: z.string().min(1, "Member is required."),
  name: z.string().optional(),
  startsAt: z.string().min(1, "Effective date is required."),
})

type ContributionPlanValues = z.infer<typeof contributionPlanSchema>

export function ContributionPlanForm({
  devMode,
  members,
}: {
  devMode: boolean
  members: Array<{ id: string; label: string }>
}) {
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
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-2">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Set monthly commitment
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Commitments are member-specific and can change over time.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "contribution_plan", {
                  memberId: members[0]?.id ?? "",
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Member</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">Select a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.label}
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
                <Input {...field} type="date" />
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
          <Button disabled={isPending} type="submit">
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
  members,
}: {
  commitmentPlans: Array<{ id: string; label: string }>
  devMode: boolean
  loans: Array<{ id: string; label: string }>
  members: Array<{ id: string; label: string }>
}) {
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
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-2">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Record member payment
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              One payment can include savings, scheduled loan servicing, and
              extra payoff.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "member_payment", {
                  contributionPlanId: commitmentPlans[0]?.id ?? "",
                  loanId: loans[0]?.id ?? "",
                  memberId: members[0]?.id ?? "",
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Member</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">Select a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.label}
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
                <NativeSelect {...field}>
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
                <Input {...field} type="date" />
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
          <Button disabled={isPending} type="submit">
            Record payment allocation
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
  code: z.string().min(1, "Code is required."),
  effectiveFrom: z.string().min(1, "Start date is required."),
  isMonthlyLevy: z.boolean().default(false),
  kind: z.enum(["fixed", "percentage"]),
  name: z.string().min(1, "Name is required."),
})

type ChargeDefinitionValues = z.infer<typeof chargeDefinitionSchema>

export function ChargeDefinitionForm({ devMode }: { devMode: boolean }) {
  const form = useZodForm<ChargeDefinitionValues>(chargeDefinitionSchema, {
    defaultValues: {
      amount: "",
      appliesToLoanRequests: false,
      appliesToLoans: false,
      appliesToMembers: true,
      code: "",
      effectiveFrom: "",
      isMonthlyLevy: false,
      kind: "fixed",
      name: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ChargeDefinitionValues) {
    startTransition(async () => {
      try {
        await createChargeDefinitionAction(objectToFormData(values))
        showSuccess("Charge created", "Charge definition saved.")
        form.reset({
          amount: "",
          appliesToLoanRequests: false,
          appliesToLoans: false,
          appliesToMembers: true,
          code: "",
          effectiveFrom: "",
          isMonthlyLevy: false,
          kind: "fixed",
          name: "",
        })
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
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Create charge definition
          </h3>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "charge_definition")
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Monthly Levy" />
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
                <Input {...field} placeholder="LEVY-001" />
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
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="2500" />
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
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {[
          ["isMonthlyLevy", "Monthly levy"],
          ["appliesToMembers", "Applies to members"],
          ["appliesToLoanRequests", "Applies to loan requests"],
          ["appliesToLoans", "Applies to loans"],
        ].map(([name, label]) => (
          <FormField
            key={name}
            control={form.control}
            name={name as keyof ChargeDefinitionValues}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3">
                <FormControl>
                  <Checkbox
                    checked={Boolean(field.value)}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <FormLabel>{label}</FormLabel>
              </FormItem>
            )}
          />
        ))}
        <div className="md:col-span-2">
          <Button disabled={isPending} type="submit">
            Create charge definition
          </Button>
        </div>
      </form>
    </Form>
  )
}

const chargeApplicationSchema = z.object({
  amount: z.string().min(1, "Amount is required."),
  assessedAt: z.string().min(1, "Assessed date is required."),
  chargeDefinitionId: z.string().min(1, "Charge definition is required."),
  memberId: z.string().min(1, "Member is required."),
  notes: z.string().optional(),
})

type ChargeApplicationValues = z.infer<typeof chargeApplicationSchema>

export function ChargeApplicationForm({
  chargeDefinitions,
  devMode,
  members,
}: {
  chargeDefinitions: Array<{ id: string; label: string }>
  devMode: boolean
  members: Array<{ id: string; label: string }>
}) {
  const form = useZodForm<ChargeApplicationValues>(chargeApplicationSchema, {
    defaultValues: {
      amount: "",
      assessedAt: "",
      chargeDefinitionId: "",
      memberId: "",
      notes: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ChargeApplicationValues) {
    startTransition(async () => {
      try {
        await applyChargeAction(objectToFormData(values))
        showSuccess("Charge applied", "Charge application recorded.")
        form.reset({
          amount: "",
          assessedAt: "",
          chargeDefinitionId: "",
          memberId: "",
          notes: "",
        })
      } catch (error) {
        showError(
          "Could not apply charge",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Apply charge
          </h3>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "charge_application", {
                  chargeDefinitionId: chargeDefinitions[0]?.id ?? "",
                  memberId: members[0]?.id ?? "",
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>
        <FormField
          control={form.control}
          name="chargeDefinitionId"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Charge definition</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">Select a charge definition</option>
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
          name="memberId"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Member</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">Select a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.label}
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="2500" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assessedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assessed date</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
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
                  className="min-h-20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button disabled={isPending} type="submit">
            Apply charge
          </Button>
        </div>
      </form>
    </Form>
  )
}

const loanRequestSchema = z.object({
  extraMonthlySavingsAmount: z.string().optional(),
  loanProductId: z.string().min(1, "Loan product is required."),
  memberId: z.string().min(1, "Member is required."),
  purpose: z.string().optional(),
  requestedAmount: z.string().min(1, "Requested amount is required."),
  requestedTermMonths: z.string().min(1, "Repayment months is required."),
})

type LoanRequestValues = z.infer<typeof loanRequestSchema>

export function LoanRequestForm({
  devMode,
  loanProducts,
  members,
}: {
  devMode: boolean
  loanProducts: Array<{ id: string; label: string }>
  members: Array<{ id: string; label: string }>
}) {
  const form = useZodForm<LoanRequestValues>(loanRequestSchema, {
    defaultValues: {
      extraMonthlySavingsAmount: "",
      loanProductId: "",
      memberId: "",
      purpose: "",
      requestedAmount: "",
      requestedTermMonths: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: LoanRequestValues) {
    startTransition(async () => {
      try {
        await submitLoanRequestAction(objectToFormData(values))
        showSuccess("Loan request saved", "Loan request submitted.")
        form.reset({
          extraMonthlySavingsAmount: "",
          loanProductId: "",
          memberId: "",
          purpose: "",
          requestedAmount: "",
          requestedTermMonths: "",
        })
      } catch (error) {
        showError(
          "Could not submit loan request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2 xl:grid-cols-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 xl:col-span-6">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Submit loan request
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Repayment duration drives the estimated servicing amount while
              extra monthly savings stays in the member account.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "loan_request", {
                  loanProductId: loanProducts[0]?.id ?? "",
                  memberId: members[0]?.id ?? "",
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>
        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem className="xl:col-span-2">
              <FormLabel>Member</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">Select a member</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.label}
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
          name="loanProductId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">Select a loan product</option>
                  {loanProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
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
          name="requestedAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requested amount</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="150000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="requestedTermMonths"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repayment months</FormLabel>
              <FormControl>
                <Input {...field} inputMode="numeric" placeholder="12" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="extraMonthlySavingsAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Extra monthly savings</FormLabel>
              <FormControl>
                <CurrencyFormInput
                  {...field}
                  value={field.value ?? ""}
                  placeholder="5000"
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
            <FormItem className="xl:col-span-6">
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  className="min-h-20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="xl:col-span-6">
          <Button disabled={isPending} type="submit">
            Submit loan request
          </Button>
        </div>
      </form>
    </Form>
  )
}

const repaymentPostSchema = z.object({
  amount: z.string().min(1, "Amount is required."),
  loanId: z.string().min(1, "Loan is required."),
  reference: z.string().optional(),
  repaymentScheduleItemId: z.string().optional(),
})

type RepaymentPostValues = z.infer<typeof repaymentPostSchema>

export function RepaymentPostForm({
  devMode,
  loans,
  scheduleItems,
}: {
  devMode: boolean
  loans: Array<{ id: string; label: string }>
  scheduleItems: Array<{ id: string; label: string }>
}) {
  const form = useZodForm<RepaymentPostValues>(repaymentPostSchema, {
    defaultValues: {
      amount: "",
      loanId: "",
      reference: "",
      repaymentScheduleItemId: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: RepaymentPostValues) {
    startTransition(async () => {
      try {
        await postRepaymentAction(objectToFormData(values))
        showSuccess("Repayment posted", "Repayment recorded successfully.")
        form.reset({
          amount: "",
          loanId: "",
          reference: "",
          repaymentScheduleItemId: "",
        })
      } catch (error) {
        showError(
          "Could not post repayment",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 xl:col-span-4">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Post repayment
          </h3>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "repayment_post", {
                  loanId: loans[0]?.id ?? "",
                  repaymentScheduleItemId: scheduleItems[0]?.id ?? "",
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>
        <FormField
          control={form.control}
          name="loanId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Loan</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">Select a loan</option>
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
        <FormField
          control={form.control}
          name="repaymentScheduleItemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Schedule item</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">No linked schedule item</option>
                  {scheduleItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="25000" />
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
                  placeholder="PMT-001"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="xl:col-span-4">
          <Button disabled={isPending} type="submit">
            Post repayment
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
  title,
}: {
  defaultValues: PaymentPreferenceValues
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
        className="grid gap-3 rounded-2xl border border-border/60 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]"
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
}: {
  defaultValues: ContributionPlanUpdateValues
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
        <Button disabled={isPending} size="sm" type="submit" variant="outline">
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

export function ContributionPlanCloseForm({ planId }: { planId: string }) {
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
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isPending} size="sm" type="submit" variant="outline">
          Close plan
        </Button>
      </form>
    </Form>
  )
}

const loanReviewSchema = z.object({
  loanRequestId: z.string().min(1),
  notes: z.string().optional(),
  status: z.enum(["approved", "rejected", "under_review"]),
})

type LoanReviewValues = z.infer<typeof loanReviewSchema>

export function LoanReviewForm({
  defaultValues,
  label,
  variant = "default",
}: {
  defaultValues: LoanReviewValues
  label: string
  variant?: "default" | "outline"
}) {
  const form = useZodForm<LoanReviewValues>(loanReviewSchema, { defaultValues })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: LoanReviewValues) {
    startTransition(async () => {
      try {
        await reviewLoanRequestAction(objectToFormData(values))
        showSuccess(
          "Review saved",
          `Loan request marked ${values.status.replace(/_/g, " ")}.`
        )
      } catch (error) {
        showError(
          "Could not save review",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder={`${label} note`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isPending} size="xs" type="submit" variant={variant}>
          {label}
        </Button>
      </form>
    </Form>
  )
}

const loanDisbursementSchema = z.object({
  firstRepaymentDueAt: z.string().optional(),
  loanId: z.string().min(1),
})

type LoanDisbursementValues = z.infer<typeof loanDisbursementSchema>

export function LoanDisbursementForm({ loanId }: { loanId: string }) {
  const form = useZodForm<LoanDisbursementValues>(loanDisbursementSchema, {
    defaultValues: {
      firstRepaymentDueAt: "",
      loanId,
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: LoanDisbursementValues) {
    startTransition(async () => {
      try {
        await disburseLoanAction(objectToFormData(values))
        showSuccess("Loan disbursed", "Loan disbursement posted.")
      } catch (error) {
        showError(
          "Could not disburse loan",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="firstRepaymentDueAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                First repayment due
              </FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isPending} size="xs" type="submit">
          Disburse loan
        </Button>
      </form>
    </Form>
  )
}

const collectionFollowUpSchema = z.object({
  assignedToUserId: z.string().optional(),
  caseStage: z.enum(["active", "escalated", "promise_tracking", "resolved"]),
  nextActionAt: z.string().optional(),
  note: z.string().min(1, "Follow-up note is required."),
  priority: z.enum(["low", "normal", "high"]),
  promiseToPayAt: z.string().optional(),
  repaymentScheduleItemId: z.string().min(1),
  resolutionStatus: z.enum(["open", "resolved"]),
  status: z.enum(["reminded", "promise_to_pay", "unreachable", "settled"]),
})

type CollectionFollowUpValues = z.infer<typeof collectionFollowUpSchema>

export function CollectionFollowUpForm({
  assignees,
  repaymentScheduleItemId,
}: {
  assignees: Array<{ id: string; label: string }>
  repaymentScheduleItemId: string
}) {
  const form = useZodForm<CollectionFollowUpValues>(collectionFollowUpSchema, {
    defaultValues: {
      assignedToUserId: "",
      caseStage: "active",
      nextActionAt: "",
      note: "",
      priority: "normal",
      promiseToPayAt: "",
      repaymentScheduleItemId,
      resolutionStatus: "open",
      status: "reminded",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: CollectionFollowUpValues) {
    startTransition(async () => {
      try {
        await recordCollectionFollowUpAction(objectToFormData(values))
        showSuccess("Follow-up saved", "Collections follow-up recorded.")
        form.reset({
          assignedToUserId: values.assignedToUserId,
          caseStage: values.caseStage,
          nextActionAt: "",
          note: "",
          priority: values.priority,
          promiseToPayAt: "",
          repaymentScheduleItemId,
          resolutionStatus: values.resolutionStatus,
          status: values.status,
        })
      } catch (error) {
        showError(
          "Could not save follow-up",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[170px_170px_170px_170px_170px_minmax(0,1fr)_auto]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="reminded">Reminded</option>
                  <option value="promise_to_pay">Promise to pay</option>
                  <option value="unreachable">Unreachable</option>
                  <option value="settled">Settled</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="caseStage"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="active">Active</option>
                  <option value="promise_tracking">Promise tracking</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="low">Low priority</option>
                  <option value="normal">Normal priority</option>
                  <option value="high">High priority</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="resolutionStatus"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assignedToUserId"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">Unassigned</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.label}
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
          name="nextActionAt"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} value={field.value ?? ""} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="promiseToPayAt"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} value={field.value ?? ""} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} placeholder="Follow-up note" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isPending} size="sm" type="submit" variant="outline">
          Save follow-up
        </Button>
      </form>
    </Form>
  )
}
