"use client"

import { useMemo, useState, useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
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
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { createQaAmount } from "@halaalvest/utils"
import { useQueryClient } from "@tanstack/react-query"
import type { MembershipApprovalRequest } from "@/components/membership-approval-content"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import { useMembershipApprovalParams } from "@/hooks/use-membership-approval-params"
import {
  approveMemberOnboardingAction,
  rejectMemberOnboardingAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { useTRPC } from "@/trpc/client"

function CurrencyFormInput({
  onChange,
  placeholder,
  value,
  ...props
}: {
  id?: string
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <CurrencyInput
      {...props}
      allowNegative={false}
      decimalScale={2}
      inputMode="decimal"
      onValueChange={(values) => onChange(values.value)}
      placeholder={placeholder}
      value={value ?? ""}
      valueIsNumericString
    />
  )
}

function getTodayDateValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
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
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] })

    if (!values.loanStartDate) {
      issue("loanStartDate", "Enter the date the loan started.")
    } else if (values.loanStartDate > getTodayDateValue()) {
      issue("loanStartDate", "The start date cannot be in the future.")
    }
    if (!values.loanAmount || Number.isNaN(amount) || amount <= 0) {
      issue("loanAmount", "Enter the loan amount.")
    }
    if (
      !values.loanMonthlyCommitment ||
      Number.isNaN(monthly) ||
      monthly <= 0
    ) {
      issue("loanMonthlyCommitment", "Enter the monthly repayment.")
    }
    if (
      !values.loanPaymentMonths ||
      !Number.isInteger(paymentMonths) ||
      paymentMonths <= 0
    ) {
      issue("loanPaymentMonths", "Enter how many months, for example 12.")
    }
    if (values.loanTopupAmount && (Number.isNaN(topup) || topup < 0)) {
      issue("loanTopupAmount", "This cannot be less than 0.")
    }
    if (Number.isNaN(served) || served < 0) {
      issue("loanServed", "This cannot be less than 0.")
    }
    if (!Number.isNaN(amount) && !Number.isNaN(served) && served > amount) {
      issue("loanServed", "This cannot be more than the loan amount.")
    }
  })

type MembershipApprovalValues = z.infer<typeof membershipApprovalSchema>

function formatAmount(value: number) {
  return Number.isFinite(value) ? value.toLocaleString("en-NG") : "0"
}

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

export function MembershipApprovalForm({
  request,
}: {
  request: MembershipApprovalRequest
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { setParams } = useMembershipApprovalParams()
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
      requestId: request.id,
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isApproving, startApproveTransition] = useTransition()
  const [isRejecting, startRejectTransition] = useTransition()
  const [isDeclineOpen, setIsDeclineOpen] = useState(false)
  const canApprove = request.status === "pending_approval"
  const isBusy = isApproving || isRejecting
  const hasServingLoan = form.watch("hasServingLoan")
  const today = getTodayDateValue()
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

    return endDate.toLocaleDateString("en-GB", {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    })
  }, [hasServingLoan, loanPaymentMonths, loanStartDate, pendingAmount])

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

  async function finish() {
    await queryClient.invalidateQueries({
      queryKey: trpc.onboarding.pathKey(),
    })
    await setParams({ membershipRequestId: null })
  }

  function onApprove(values: MembershipApprovalValues) {
    startApproveTransition(async () => {
      try {
        await approveMemberOnboardingAction(objectToFormData(values))
        showSuccess("Approved", `${request.fullName} can sign in now.`)
        await finish()
      } catch (error) {
        showError(
          "Could not approve",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  function onDecline() {
    startRejectTransition(async () => {
      try {
        await rejectMemberOnboardingAction(
          objectToFormData({
            reason: form.getValues("reason"),
            requestId: request.id,
          })
        )
        setIsDeclineOpen(false)
        showSuccess("Declined", `We will email ${request.fullName}.`)
        await finish()
      } catch (error) {
        showError(
          "Could not decline",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="grid gap-6" onSubmit={form.handleSubmit(onApprove)}>
        <DashboardQuickFill
          form={form}
          onFill={() =>
            form.reset({
              ...form.getValues(),
              currentSavingsBalance: createQaAmount(20_000, 250_000, 5_000),
              hasServingLoan: false,
              monthlyCommitment: createQaAmount(10_000, 50_000, 5_000),
              reason: "Membership confirmed at the monthly general meeting.",
            })
          }
        />

        {canApprove ? (
          <section
            aria-labelledby="approval-records-title"
            className="grid gap-5 border-t border-border/70 pt-6"
          >
            <div>
              <h3 className="text-lg font-semibold" id="approval-records-title">
                Their records so far
              </h3>
              <p className="text-muted-foreground">
                Leave empty if they are new.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="currentSavingsBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Savings so far</FormLabel>
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
                    <FormLabel>Monthly savings</FormLabel>
                    <FormControl>
                      <CurrencyFormInput {...field} placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hasServingLoan"
              render={({ field }) => (
                <FormItem className="flex min-h-11 flex-row items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  </FormControl>
                  <FormLabel className="text-lg font-semibold">
                    Already has a loan
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            {hasServingLoan ? (
              <div className="grid gap-5 sm:grid-cols-2">
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
                          max={today}
                          placeholder="Choose a date"
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
                          onChange={(value) => {
                            field.onChange(value)
                            updateCalculatedMonthlyService({
                              loanAmount: value,
                            })
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
                      <FormLabel>Months to repay</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          min={1}
                          onChange={(event) => {
                            field.onChange(event)
                            updateCalculatedMonthlyService({
                              loanPaymentMonths: event.target.value,
                            })
                          }}
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
                  name="loanServed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Already repaid</FormLabel>
                      <FormControl>
                        <CurrencyFormInput
                          {...field}
                          onChange={(value) => {
                            field.onChange(value)
                            updateCalculatedMonthlyService({
                              loanServed: value,
                            })
                          }}
                          placeholder="0.00"
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
                      <FormLabel>Monthly repayment</FormLabel>
                      <FormControl>
                        <CurrencyFormInput {...field} />
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
                      <FormLabel>Extra savings each month</FormLabel>
                      <FormControl>
                        <CurrencyFormInput
                          {...field}
                          placeholder="0.00"
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <dl className="grid gap-4 rounded-(--ui-radius-control) bg-muted p-4 sm:col-span-2 sm:grid-cols-3">
                  {[
                    ["Still owed", formatAmount(pendingAmount)],
                    ["Paid each month", formatAmount(totalMonthlyDeduction)],
                    ["Last payment", estimatedEndMonth ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-base text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="text-lg font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </section>
        ) : (
          <p className="rounded-(--ui-radius-control) border border-border bg-muted px-4 py-3">
            They have not confirmed their email yet. You can approve once they
            do.
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:justify-end">
          <Button
            size="touch"
            disabled={isBusy}
            onClick={() => setIsDeclineOpen(true)}
            type="button"
            variant="outline"
          >
            Decline
          </Button>
          {canApprove ? (
            <Button size="touch" disabled={isBusy} type="submit">
              {isApproving ? "Approving…" : "Approve"}
            </Button>
          ) : null}
        </div>
      </form>

      <AlertDialog onOpenChange={setIsDeclineOpen} open={isDeclineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline {request.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              We will email them. They will not be able to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
            <Button
              disabled={isRejecting}
              onClick={onDecline}
              type="button"
              variant="destructive"
            >
              {isRejecting ? "Declining…" : "Decline"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  )
}
