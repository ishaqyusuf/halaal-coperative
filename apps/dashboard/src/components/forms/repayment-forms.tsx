"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { z } from "zod"
import { formatCurrency } from "@halaalvest/utils"
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
import { qaDateOffset } from "@halaalvest/utils"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import { LoanAmountInput } from "@/components/forms/loan-forms"
import {
  postRepaymentAction,
  recordCollectionFollowUpAction,
} from "@/lib/dashboard-actions"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import { formatDayMonthYear } from "@/utils/format"

const fieldLabel = "text-base"
const fieldControl = "h-11 text-base"
// NativeSelect puts className on its wrapper; size the select inside it.
const selectControl = "w-full [&_select]:h-11 [&_select]:text-base"

/** Today as YYYY-MM-DD in the browser's own time zone. */
function localToday() {
  return new Date().toLocaleDateString("en-CA")
}

/* ------------------------------------------------------------------------ */
/* Record a repayment                                                        */
/* ------------------------------------------------------------------------ */

export type RepaymentLoanChoice = {
  id: string
  memberName: string
  outstandingPrincipal: number
  productName: string
  status: string
}

const repaymentSchema = z.object({
  amount: z
    .string()
    .min(1, "Enter the amount.")
    .refine((value) => Number(value) > 0, "Enter the amount."),
  loanId: z.string().min(1, "Choose the loan."),
  paidAt: z.string().min(1, "Choose the date it was paid."),
  reference: z.string().max(120).optional(),
})

type RepaymentValues = z.infer<typeof repaymentSchema>

export function RepaymentPostForm({
  defaultLoanId,
  devMode,
  loans,
  onSuccess,
}: {
  defaultLoanId?: string
  devMode: boolean
  loans: RepaymentLoanChoice[]
  onSuccess?: () => Promise<void> | void
}) {
  const form = useZodForm<RepaymentValues>(repaymentSchema, {
    defaultValues: {
      amount: "",
      loanId: defaultLoanId ?? "",
      paidAt: localToday(),
      reference: "",
    },
  })
  const router = useRouter()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState<RepaymentValues | null>(null)
  const loan = loans.find((option) => option.id === form.watch("loanId"))
  const amount = Number(form.watch("amount") || 0)
  const after = loan ? Math.max(loan.outstandingPrincipal - amount, 0) : null

  function review(values: RepaymentValues) {
    const chosen = loans.find((option) => option.id === values.loanId)

    if (chosen && Number(values.amount) > chosen.outstandingPrincipal) {
      form.setError("amount", {
        message: `This loan only owes ${formatCurrency(chosen.outstandingPrincipal)}.`,
      })
      return
    }

    setConfirming(values)
  }

  function post() {
    const values = confirming
    const chosen = loans.find((option) => option.id === values?.loanId)
    if (!values || !chosen) return

    startTransition(async () => {
      try {
        // The balance and status shown here travel with the post: if the loan
        // changed meanwhile (or this is a repeat submit) the server refuses it.
        await postRepaymentAction(
          objectToFormData({
            amount: values.amount,
            expectedOutstandingPrincipal: chosen.outstandingPrincipal.toFixed(2),
            expectedStatus: chosen.status,
            loanId: values.loanId,
            paidAt: values.paidAt,
            reference: values.reference ?? "",
          })
        )
        setConfirming(null)
        showSuccess(
          "Payment recorded",
          `${formatCurrency(Number(values.amount))} from ${chosen.memberName}.`
        )
        form.reset({
          amount: "",
          loanId: defaultLoanId ?? "",
          paidAt: localToday(),
          reference: "",
        })
        await onSuccess?.()
      } catch (error) {
        setConfirming(null)
        showError(
          "Could not record the payment",
          error instanceof Error ? error.message : "Something went wrong."
        )
        // A refused post usually means the balance moved: show the new one.
        router.refresh()
      }
    })
  }

  return (
    <Form {...form}>
      <form className="grid gap-6" onSubmit={form.handleSubmit(review)}>
        {devMode ? (
          <div className="flex justify-end">
            <DashboardQuickFill
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(
                  form,
                  "repayment_post",
                  { loanId: form.getValues("loanId") || loans[0]?.id || "" },
                  { emailDomain }
                )
              }
            />
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="loanId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>Whose loan</FormLabel>
              <FormControl>
                <NativeSelect {...field} className={selectControl}>
                  <option value="">Choose</option>
                  {loans.map((option) => (
                    <option key={option.id} value={option.id}>
                      {`${option.memberName} · owes ${formatCurrency(option.outstandingPrincipal)}`}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {loan ? (
          <p className="flex items-baseline justify-between gap-4 border-y border-border py-3 text-base">
            <span className="text-muted-foreground">Still owes</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(loan.outstandingPrincipal)}
            </span>
          </p>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>Amount paid</FormLabel>
                <FormControl>
                  <LoanAmountInput {...field} placeholder="25,000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paidAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>Date paid</FormLabel>
                <FormControl>
                  <DatePickerInput
                    {...field}
                    allowClear={false}
                    className={fieldControl}
                    max={localToday()}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>
                Receipt or bank reference (optional)
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className={fieldControl}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {loan && amount > 0 && after !== null ? (
          <p className="flex items-baseline justify-between gap-4 text-base">
            <span className="text-muted-foreground">Will still owe</span>
            <span className="font-semibold tabular-nums">
              {after === 0 ? "Nothing. Fully repaid" : formatCurrency(after)}
            </span>
          </p>
        ) : null}

        <div className="border-t border-border pt-4">
          <Button
            className="h-12 w-full text-base sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            Record payment
          </Button>
        </div>
      </form>

      <AlertDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open && !isPending) setConfirming(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">
              Record{" "}
              {confirming ? formatCurrency(Number(confirming.amount)) : ""} from{" "}
              {loans.find((option) => option.id === confirming?.loanId)
                ?.memberName ?? "this member"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Paid on {formatDayMonthYear(confirming?.paidAt) ?? "—"}. This goes
              into the books and cannot be edited later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={isPending}>
              Go back
            </AlertDialogCancel>
            <Button
              className="h-11"
              disabled={isPending}
              onClick={post}
              type="button"
            >
              {isPending ? "Recording…" : "Yes, record it"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  )
}

/* ------------------------------------------------------------------------ */
/* Follow-up note on a late payment (records no money)                       */
/* ------------------------------------------------------------------------ */

const followUpSchema = z
  .object({
    assignedToUserId: z.string().optional(),
    escalate: z.boolean(),
    nextActionAt: z.string().optional(),
    note: z.string().trim().min(1, "Write what happened.").max(1000),
    promiseToPayAt: z.string().optional(),
    status: z.enum(["reminded", "promise_to_pay", "unreachable", "settled"]),
  })
  .refine(
    (values) => values.status !== "promise_to_pay" || values.promiseToPayAt,
    { message: "When did they promise to pay?", path: ["promiseToPayAt"] }
  )

type FollowUpValues = z.infer<typeof followUpSchema>

const followUpOutcomes = [
  { label: "Reminded them", value: "reminded" },
  { label: "They promised to pay", value: "promise_to_pay" },
  { label: "Could not reach them", value: "unreachable" },
  { label: "Sorted out", value: "settled" },
] as const

const emptyFollowUp: FollowUpValues = {
  assignedToUserId: "",
  escalate: false,
  nextActionAt: "",
  note: "",
  promiseToPayAt: "",
  status: "reminded",
}

/**
 * The case stage, priority and resolution the API records, derived from the
 * outcome and the escalate box so staff answer fewer questions.
 */
export function toCollectionFollowUpPayload(
  values: FollowUpValues,
  repaymentScheduleItemId: string
) {
  const resolved = values.status === "settled"

  return {
    assignedToUserId: values.assignedToUserId ?? "",
    caseStage: resolved
      ? "resolved"
      : values.escalate
        ? "escalated"
        : values.status === "promise_to_pay"
          ? "promise_tracking"
          : "active",
    nextActionAt: values.nextActionAt ?? "",
    note: values.note,
    priority: values.escalate ? "high" : "normal",
    promiseToPayAt:
      values.status === "promise_to_pay" ? (values.promiseToPayAt ?? "") : "",
    repaymentScheduleItemId,
    resolutionStatus: resolved ? "resolved" : "open",
    status: values.status,
  }
}

export function CollectionFollowUpForm({
  assignees,
  onSuccess,
  repaymentScheduleItemId,
}: {
  assignees: Array<{ id: string; label: string }>
  onSuccess?: () => Promise<void> | void
  repaymentScheduleItemId: string
}) {
  const form = useZodForm<FollowUpValues>(followUpSchema, {
    defaultValues: emptyFollowUp,
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const status = form.watch("status")

  function onSubmit(values: FollowUpValues) {
    startTransition(async () => {
      try {
        await recordCollectionFollowUpAction(
          objectToFormData(
            toCollectionFollowUpPayload(values, repaymentScheduleItemId)
          )
        )
        showSuccess("Note saved", "No money was recorded.")
        form.reset(emptyFollowUp)
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not save the note",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="grid gap-6" onSubmit={form.handleSubmit(onSubmit)}>
        <DashboardQuickFill
          form={form}
          onFill={() =>
            form.reset({
              ...emptyFollowUp,
              assignedToUserId: assignees[0]?.id ?? "",
              nextActionAt: qaDateOffset(3),
              note: "Member confirmed a transfer after Friday market day.",
              promiseToPayAt: qaDateOffset(2),
              status: "promise_to_pay",
            })
          }
        />
        <p className="text-base text-muted-foreground">
          A note only. To record money, use Record payment.
        </p>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>What happened</FormLabel>
              <FormControl>
                <NativeSelect {...field} className={selectControl}>
                  {followUpOutcomes.map((outcome) => (
                    <option key={outcome.value} value={outcome.value}>
                      {outcome.label}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {status === "promise_to_pay" ? (
          <FormField
            control={form.control}
            name="promiseToPayAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>They will pay by</FormLabel>
                <FormControl>
                  <DatePickerInput
                    {...field}
                    className={fieldControl}
                    min={localToday()}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>Note</FormLabel>
              <FormControl>
                <Textarea {...field} className="min-h-24 text-base" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nextActionAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>
                  Check again on (optional)
                </FormLabel>
                <FormControl>
                  <DatePickerInput
                    {...field}
                    className={fieldControl}
                    min={localToday()}
                    value={field.value ?? ""}
                  />
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
                <FormLabel className={fieldLabel}>
                  Who follows up (optional)
                </FormLabel>
                <FormControl>
                  <NativeSelect
                    {...field}
                    className={selectControl}
                    value={field.value ?? ""}
                  >
                    <option value="">Anyone</option>
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
        </div>

        {status === "settled" ? null : (
          <FormField
            control={form.control}
            name="escalate"
            render={({ field }) => (
              <FormItem className="flex min-h-11 flex-row items-center gap-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    className="size-6"
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                  />
                </FormControl>
                <FormLabel className={fieldLabel}>
                  A senior person needs to step in
                </FormLabel>
              </FormItem>
            )}
          />
        )}

        <div className="border-t border-border pt-4">
          <Button
            className="h-12 w-full text-base sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving…" : "Save note"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
