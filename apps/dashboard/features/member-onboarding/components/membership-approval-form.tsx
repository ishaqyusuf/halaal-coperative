"use client"

import { useMemo, useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaal-vest/notifications-react"
import { Button } from "@halaal-vest/ui/components/button"
import { Checkbox } from "@halaal-vest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaal-vest/ui/components/form"
import { Input } from "@halaal-vest/ui/components/input"
import { Textarea } from "@halaal-vest/ui/components/textarea"
import { useZodForm } from "@halaal-vest/ui/hooks/use-zod-form"
import { objectToFormData } from "@/lib/form-submit"
import {
  approveMemberOnboardingAction,
  rejectMemberOnboardingAction,
} from "@/lib/dashboard-actions"

const membershipApprovalSchema = z
  .object({
    currentSavingsBalance: z.string().optional(),
    hasServingLoan: z.boolean().default(false),
    loanAmount: z.string().optional(),
    loanMonthlyCommitment: z.string().optional(),
    loanServed: z.string().optional(),
    loanStartDate: z.string().optional(),
    monthlyCommitment: z.string().optional(),
    reason: z.string().optional(),
    requestId: z.string().min(1),
  })
  .superRefine((values, ctx) => {
    if (!values.hasServingLoan) return

    const amount = Number(values.loanAmount ?? "")
    const served = Number(values.loanServed ?? "0")
    const monthly = Number(values.loanMonthlyCommitment ?? "")

    if (!values.loanStartDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Loan start date is required.", path: ["loanStartDate"] })
    }
    if (!values.loanAmount || Number.isNaN(amount) || amount <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Loan amount must be greater than 0.", path: ["loanAmount"] })
    }
    if (!values.loanMonthlyCommitment || Number.isNaN(monthly) || monthly <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Monthly servicing must be greater than 0.", path: ["loanMonthlyCommitment"] })
    }
    if (Number.isNaN(served) || served < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Served amount cannot be negative.", path: ["loanServed"] })
    }
    if (!Number.isNaN(amount) && !Number.isNaN(served) && served > amount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Served amount cannot be more than the loan amount.", path: ["loanServed"] })
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
      loanServed: "",
      loanStartDate: "",
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
  const loanServed = Number(form.watch("loanServed") || 0)
  const loanMonthlyCommitment = Number(form.watch("loanMonthlyCommitment") || 0)
  const loanStartDate = form.watch("loanStartDate")
  const pendingAmount = Math.max(0, loanAmount - loanServed)
  const estimatedEndMonth = useMemo(() => {
    if (!hasServingLoan || !loanStartDate || !loanMonthlyCommitment || pendingAmount <= 0) {
      return null
    }

    const remainingMonths = Math.ceil(pendingAmount / loanMonthlyCommitment)
    const endDate = new Date(`${loanStartDate}T00:00:00.000Z`)
    endDate.setUTCMonth(endDate.getUTCMonth() + remainingMonths)

    return endDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  }, [hasServingLoan, loanMonthlyCommitment, loanStartDate, pendingAmount])

  function onApprove(values: MembershipApprovalValues) {
    startApproveTransition(async () => {
      try {
        await approveMemberOnboardingAction(objectToFormData(values))
        showSuccess("Member approved", "The member now has dashboard access.")
      } catch (error) {
        showError("Could not approve member", error instanceof Error ? error.message : "Something went wrong.")
      }
    })
  }

  function onReject() {
    startRejectTransition(async () => {
      try {
        const values = form.getValues()
        await rejectMemberOnboardingAction(
          objectToFormData({ requestId: values.requestId, reason: values.reason }),
        )
        showSuccess("Request rejected", "The applicant was updated with the rejection status.")
      } catch (error) {
        showError("Could not reject request", error instanceof Error ? error.message : "Something went wrong.")
      }
    })
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onApprove)}>
        <input type="hidden" name="requestId" value={requestId} />

        <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Approval metadata</h3>
            <p className="mt-1 text-sm text-muted-foreground">Confirm the member’s existing balance and monthly cooperative commitments before approval.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="currentSavingsBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current balance</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="decimal" placeholder="0.00" />
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
                    <Input {...field} inputMode="decimal" placeholder="25000" />
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
                  <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel>Serving loan</FormLabel>
                  <p className="text-sm text-muted-foreground">Seed an active loan snapshot during approval.</p>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {hasServingLoan ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField
                control={form.control}
                name="loanStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan start date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
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
                      <Input {...field} inputMode="decimal" placeholder="500000" />
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
                    <FormLabel>Served</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder="200000" />
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
                    <FormLabel>Monthly commitment</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder="50000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 xl:col-span-4 grid gap-3 rounded-[1.25rem] border border-border/60 bg-muted/25 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Pending</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{Number.isFinite(pendingAmount) ? pendingAmount.toLocaleString() : "0"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Estimated end month</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{estimatedEndMonth ?? "Waiting for loan inputs"}</p>
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
                  <Textarea {...field} value={field.value ?? ""} placeholder="Optional reason if you need to reject this request." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={isApproving} type="submit" className="rounded-full px-5">
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
