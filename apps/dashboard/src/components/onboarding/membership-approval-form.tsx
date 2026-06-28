"use client"

import { useMemo, useTransition } from "react"
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
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@halaalvest/ui/components/input-group"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { DatePickerInput } from "@/components/date-picker-input"
import { objectToFormData } from "@/lib/form-submit"
import {
  approveMemberOnboardingAction,
  rejectMemberOnboardingAction,
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

const membershipApprovalSchema = z
  .object({
    currentSavingsBalance: z.string().optional(),
    hasServingLoan: z.boolean().default(false),
    loanAmount: z.string().optional(),
    loanMonthlyCommitment: z.string().optional(),
    loanPaymentMonths: z.string().optional(),
    loanServed: z.string().optional(),
    loanStartDate: z.string().optional(),
    loanTopupAmount: z.string().optional(),
    monthlyCommitment: z.string().optional(),
    reason: z.string().optional(),
    requestId: z.string().min(1),
  })
  .superRefine((values, ctx) => {
    if (!values.hasServingLoan) return

    const amount = Number(values.loanAmount ?? "")
    const paymentMonths = Number(values.loanPaymentMonths ?? "")
    const served = Number(values.loanServed ?? "0")
    const monthly = Number(values.loanMonthlyCommitment ?? "")
    const topup = Number(values.loanTopupAmount ?? "0")

    if (!values.loanStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Loan start date is required.",
        path: ["loanStartDate"],
      })
    }
    if (!values.loanAmount || Number.isNaN(amount) || amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Loan amount must be greater than 0.",
        path: ["loanAmount"],
      })
    }
    if (
      !values.loanMonthlyCommitment ||
      Number.isNaN(monthly) ||
      monthly <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Monthly servicing must be greater than 0.",
        path: ["loanMonthlyCommitment"],
      })
    }
    if (
      !values.loanPaymentMonths ||
      !Number.isInteger(paymentMonths) ||
      paymentMonths <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment months must be greater than 0.",
        path: ["loanPaymentMonths"],
      })
    }
    if (values.loanTopupAmount && (Number.isNaN(topup) || topup < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Topup amount cannot be negative.",
        path: ["loanTopupAmount"],
      })
    }
    if (Number.isNaN(served) || served < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Served amount cannot be negative.",
        path: ["loanServed"],
      })
    }
    if (!Number.isNaN(amount) && !Number.isNaN(served) && served > amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Served amount cannot be more than the loan amount.",
        path: ["loanServed"],
      })
    }
  })

type MembershipApprovalValues = z.infer<typeof membershipApprovalSchema>

export function MembershipApprovalForm({ requestId }: { requestId: string }) {
  const form = useZodForm<MembershipApprovalValues>(membershipApprovalSchema, {
    defaultValues: {
      currentSavingsBalance: "",
      hasServingLoan: false,
      loanAmount: "",
      loanMonthlyCommitment: "",
      loanPaymentMonths: "",
      loanServed: "",
      loanStartDate: "",
      loanTopupAmount: "",
      monthlyCommitment: "",
      reason: "",
      requestId,
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isApproving, startApproveTransition] = useTransition()
  const [isRejecting, startRejectTransition] = useTransition()
  const hasServingLoan = form.watch("hasServingLoan")
  const loanAmount = Number(form.watch("loanAmount") || 0)
  const loanPaymentMonths = Number(form.watch("loanPaymentMonths") || 0)
  const loanServed = Number(form.watch("loanServed") || 0)
  const loanMonthlyCommitment = Number(form.watch("loanMonthlyCommitment") || 0)
  const loanTopupAmount = Number(form.watch("loanTopupAmount") || 0)
  const loanStartDate = form.watch("loanStartDate")
  const pendingAmount = Math.max(0, loanAmount - loanServed)
  const totalMonthlyDeduction = loanMonthlyCommitment + loanTopupAmount
  const estimatedEndMonth = useMemo(() => {
    if (
      !hasServingLoan ||
      !loanStartDate ||
      !loanPaymentMonths ||
      pendingAmount <= 0
    ) {
      return null
    }

    const endDate = new Date(`${loanStartDate}T00:00:00.000Z`)
    endDate.setUTCMonth(endDate.getUTCMonth() + loanPaymentMonths)

    return endDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  }, [hasServingLoan, loanPaymentMonths, loanStartDate, pendingAmount])

  function calculateMonthlyService(
    amount: string | number,
    served: string | number,
    paymentMonths: string | number
  ) {
    const principalAmount = Number(amount || 0)
    const amountServed = Number(served || 0)
    const months = Number(paymentMonths || 0)

    if (
      !Number.isFinite(principalAmount) ||
      !Number.isFinite(amountServed) ||
      !Number.isInteger(months) ||
      months <= 0
    ) {
      return ""
    }

    return String(
      Number((Math.max(0, principalAmount - amountServed) / months).toFixed(2))
    )
  }

  function updateCalculatedMonthlyService(
    nextValues: Partial<
      Pick<
        MembershipApprovalValues,
        "loanAmount" | "loanPaymentMonths" | "loanServed"
      >
    >
  ) {
    const monthlyService = calculateMonthlyService(
      nextValues.loanAmount ?? form.getValues("loanAmount") ?? "",
      nextValues.loanServed ?? form.getValues("loanServed") ?? "",
      nextValues.loanPaymentMonths ?? form.getValues("loanPaymentMonths") ?? ""
    )

    if (monthlyService) {
      form.setValue("loanMonthlyCommitment", monthlyService, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  function onApprove(values: MembershipApprovalValues) {
    startApproveTransition(async () => {
      try {
        await approveMemberOnboardingAction(objectToFormData(values))
        showSuccess("Member approved", "The member now has dashboard access.")
      } catch (error) {
        showError(
          "Could not approve member",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function onReject() {
    startRejectTransition(async () => {
      try {
        const values = form.getValues()
        await rejectMemberOnboardingAction(
          objectToFormData({
            requestId: values.requestId,
            reason: values.reason,
          })
        )
        showSuccess(
          "Request rejected",
          "The applicant was updated with the rejection status."
        )
      } catch (error) {
        showError(
          "Could not reject request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onApprove)}>
        <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Approval metadata
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirm the member’s existing balance and monthly cooperative
              commitments before approval.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="currentSavingsBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current balance</FormLabel>
                  <FormControl>
                    <CurrencyFormInput {...field} placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthlyCommitment"
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
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
          <FormField
            control={form.control}
            name="hasServingLoan"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel>Serving loan</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Seed an active loan snapshot with separate repayment and
                    savings topup amounts.
                  </p>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {hasServingLoan ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FormField
                control={form.control}
                name="loanStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan start date</FormLabel>
                    <FormControl>
                      <DatePickerInput
                        {...field}
                        allowClear={false}
                        placeholder="Select loan start date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loanAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan amount</FormLabel>
                    <FormControl>
                      <CurrencyFormInput
                        {...field}
                        placeholder="500000"
                        onChange={(value) => {
                          field.onChange(value)
                          updateCalculatedMonthlyService({ loanAmount: value })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loanPaymentMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment months</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput
                          {...field}
                          inputMode="numeric"
                          min={1}
                          placeholder="12"
                          type="number"
                          onChange={(event) => {
                            field.onChange(event)
                            updateCalculatedMonthlyService({
                              loanPaymentMonths: event.target.value,
                            })
                          }}
                        />
                        <InputGroupText>months</InputGroupText>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loanServed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Served amount</FormLabel>
                    <FormControl>
                      <CurrencyFormInput
                        {...field}
                        placeholder="200000"
                        onChange={(value) => {
                          field.onChange(value)
                          updateCalculatedMonthlyService({ loanServed: value })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loanMonthlyCommitment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly loan service</FormLabel>
                    <FormControl>
                      <CurrencyFormInput {...field} placeholder="50000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loanTopupAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topup amount</FormLabel>
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

              <div className="grid gap-3 rounded-[1.25rem] border border-border/60 bg-muted/25 p-4 sm:grid-cols-3 md:col-span-2 xl:col-span-5">
                <div>
                  <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    Pending
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {Number.isFinite(pendingAmount)
                      ? pendingAmount.toLocaleString()
                      : "0"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    Total monthly
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {Number.isFinite(totalMonthlyDeduction)
                      ? totalMonthlyDeduction.toLocaleString()
                      : "0"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Loan service + topup to member savings
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    Estimated end month
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {estimatedEndMonth ?? "Waiting for loan inputs"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rejection reason</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Optional reason if you need to reject this request."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={isApproving}
            type="submit"
            className="rounded-full px-5"
          >
            Approve member
          </Button>
          <Button
            disabled={isRejecting}
            type="button"
            variant="outline"
            className="rounded-full px-5"
            onClick={onReject}
          >
            Reject request
          </Button>
        </div>
      </form>
    </Form>
  )
}
