"use client"

import { useTransition } from "react"
import { z } from "zod"
import { formatCurrency } from "@halaalvest/utils"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { qaFirstOfNextMonth } from "@halaalvest/utils"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import { GuarantorCombobox } from "@/components/guarantor-combobox"
import { MemberCombobox } from "@/components/member-combobox"
import { WorkflowConfirmFooter } from "@/components/workflow-confirm-footer"
import {
  disburseLoanAction,
  reviewLoanGuarantorApprovalAction,
  reviewLoanRequestAction,
  submitLoanRequestAction,
} from "@/lib/dashboard-actions"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"

const fieldLabel = "text-base"
const fieldControl = "h-11 text-base"
// NativeSelect puts className on its wrapper; size the select inside it.
const selectControl = "w-full [&_select]:h-11 [&_select]:text-base"

export function LoanAmountInput({
  disabled = false,
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
      className={fieldControl}
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

/* ------------------------------------------------------------------------ */
/* Ask for a loan                                                            */
/* ------------------------------------------------------------------------ */

const loanRequestSchema = z
  .object({
    extraMonthlySavingsAmount: z.string().optional(),
    guarantorOneMemberId: z.string().optional(),
    guarantorTwoMemberId: z.string().optional(),
    loanProductId: z.string().min(1, "Choose the type of loan."),
    memberId: z.string().min(1, "Choose the member."),
    purpose: z.string().max(500).optional(),
    requestedAmount: z
      .string()
      .min(1, "Enter the amount.")
      .refine((value) => Number(value) > 0, "Enter the amount."),
    requestedTermMonths: z
      .string()
      .min(1, "Enter the number of months.")
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) > 0,
        "Enter whole months, for example 6."
      ),
  })
  .refine(
    (values) =>
      !values.guarantorOneMemberId ||
      values.guarantorOneMemberId !== values.guarantorTwoMemberId,
    {
      message: "Choose two different guarantors.",
      path: ["guarantorTwoMemberId"],
    }
  )
  .refine(
    (values) =>
      values.memberId !== values.guarantorOneMemberId &&
      values.memberId !== values.guarantorTwoMemberId,
    {
      message: "A member cannot guarantee their own loan.",
      path: ["guarantorOneMemberId"],
    }
  )

type LoanRequestValues = z.infer<typeof loanRequestSchema>

export type LoanProductChoice = {
  id: string
  label: string
  termMonths: number
}

export type LoanRequestChargeChoice = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  id: string
  name: string
}

const emptyLoanRequest = (memberId = ""): LoanRequestValues => ({
  extraMonthlySavingsAmount: "",
  guarantorOneMemberId: "",
  guarantorTwoMemberId: "",
  loanProductId: "",
  memberId,
  purpose: "",
  requestedAmount: "",
  requestedTermMonths: "",
})

export function LoanRequestForm({
  devMode,
  disabledReason,
  fixedMember,
  loanProducts,
  loanRequestCharges = [],
  onSuccess,
}: {
  devMode: boolean
  disabledReason?: string | null
  /**
   * A member asking for themselves: no member picker, and guarantors come
   * from the members-safe search (names of verified members only).
   */
  fixedMember?: { id: string; label: string }
  loanProducts: LoanProductChoice[]
  loanRequestCharges?: LoanRequestChargeChoice[]
  onSuccess?: () => Promise<void> | void
}) {
  const form = useZodForm<LoanRequestValues>(loanRequestSchema, {
    defaultValues: emptyLoanRequest(fixedMember?.id),
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const amount = Number(form.watch("requestedAmount") || 0)
  const months = Number(form.watch("requestedTermMonths") || 0)
  const product = loanProducts.find(
    (option) => option.id === form.watch("loanProductId")
  )
  const monthlyPayment =
    amount > 0 && months > 0 ? Math.round((amount / months) * 100) / 100 : 0
  const charges = loanRequestCharges.map((charge) => ({
    ...charge,
    estimatedAmount:
      charge.chargeValueType === "percentage"
        ? Number(((amount * charge.amount) / 100).toFixed(2))
        : charge.amount,
  }))
  const chargeTotal = charges.reduce(
    (total, charge) => total + charge.estimatedAmount,
    0
  )
  const isDisabled = Boolean(disabledReason)

  function onSubmit(values: LoanRequestValues) {
    startTransition(async () => {
      try {
        await submitLoanRequestAction(objectToFormData(values))
        showSuccess(
          "Request sent",
          fixedMember
            ? "We will tell you when it has been checked."
            : "It is now in the list to check."
        )
        form.reset(emptyLoanRequest(fixedMember?.id))
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not send the request",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {devMode ? (
          <div className="flex justify-end">
            <DashboardQuickFill
              enabled={!isDisabled}
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(
                  form,
                  "loan_request",
                  {
                    loanProductId: loanProducts[0]?.id ?? "",
                    memberId: form.getValues("memberId"),
                  },
                  { emailDomain }
                )
              }
            />
          </div>
        ) : null}

        {disabledReason ? (
          <p className="border-y border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-950">
            {disabledReason}
          </p>
        ) : null}

        {fixedMember ? (
          <input name="memberId" type="hidden" value={fixedMember.id} />
        ) : (
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel} htmlFor="loan-member">
                  Member
                </FormLabel>
                <MemberCombobox
                  disabled={isDisabled}
                  id="loan-member"
                  onValueChange={field.onChange}
                  placeholder="Search by name or number"
                  value={field.value}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="loanProductId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>Type of loan</FormLabel>
              <FormControl>
                <NativeSelect
                  {...field}
                  className={selectControl}
                  disabled={isDisabled}
                >
                  <option value="">Choose</option>
                  {loanProducts.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="requestedAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>Amount</FormLabel>
                <FormControl>
                  <LoanAmountInput
                    {...field}
                    disabled={isDisabled}
                    placeholder="150,000"
                  />
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
                <FormLabel className={fieldLabel}>Months to pay back</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className={fieldControl}
                    disabled={isDisabled}
                    inputMode="numeric"
                    placeholder={product ? `Up to ${product.termMonths}` : "12"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {monthlyPayment > 0 ? (
          <div className="border-y border-border py-3 text-base">
            <p className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">Pays back each month</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(monthlyPayment)}
              </span>
            </p>
            {charges.length ? (
              <p className="mt-2 flex items-baseline justify-between gap-4">
                <span className="text-muted-foreground">
                  {charges.length === 1 ? charges[0]!.name : "Charges"}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(chargeTotal)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="guarantorOneMemberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel} htmlFor="loan-guarantor-1">
                  Guarantor (optional)
                </FormLabel>
                {fixedMember ? (
                  <GuarantorCombobox
                    disabled={isDisabled}
                    id="loan-guarantor-1"
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  />
                ) : (
                  <MemberCombobox
                    disabled={isDisabled}
                    emptyLabel="No guarantor"
                    id="loan-guarantor-1"
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  />
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="guarantorTwoMemberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel} htmlFor="loan-guarantor-2">
                  Second guarantor (optional)
                </FormLabel>
                {fixedMember ? (
                  <GuarantorCombobox
                    disabled={isDisabled}
                    id="loan-guarantor-2"
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  />
                ) : (
                  <MemberCombobox
                    disabled={isDisabled}
                    emptyLabel="No guarantor"
                    id="loan-guarantor-2"
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  />
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="extraMonthlySavingsAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>
                Extra savings each month (optional)
              </FormLabel>
              <FormControl>
                <LoanAmountInput
                  {...field}
                  disabled={isDisabled}
                  placeholder="0"
                  value={field.value ?? ""}
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
              <FormLabel className={fieldLabel}>
                What is it for? (optional)
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="min-h-24 text-base"
                  disabled={isDisabled}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t border-border pt-4">
          <Button
            className="h-12 w-full text-base sm:w-auto"
            disabled={isPending || isDisabled}
            type="submit"
          >
            {isPending ? "Sending…" : "Send request"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

/* ------------------------------------------------------------------------ */
/* Confirms (AlertDialog bodies)                                             */
/* ------------------------------------------------------------------------ */

function ConfirmHeader({
  description,
  title,
}: {
  description?: string
  title: string
}) {
  return (
    <AlertDialogHeader className="mb-4">
      <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
      {description ? (
        <AlertDialogDescription className="text-base">
          {description}
        </AlertDialogDescription>
      ) : null}
    </AlertDialogHeader>
  )
}

const noteSchema = z.object({ notes: z.string().max(500).optional() })
const reasonSchema = z.object({
  notes: z.string().trim().min(1, "Give a short reason.").max(500),
})

type NoteValues = { notes?: string }

function NoteField({
  disabled,
  form,
  label,
}: {
  disabled?: boolean
  form: ReturnType<typeof useZodForm<NoteValues>>
  label: string
}) {
  return (
    <FormField
      control={form.control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <FormLabel className={fieldLabel}>{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              className="min-h-20 text-base"
              disabled={disabled}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export type LoanDecision = "approved" | "rejected" | "under_review"

const decisionCopy: Record<
  LoanDecision,
  { action: string; done: string; note: string; title: string }
> = {
  approved: {
    action: "Approve",
    done: "Loan approved",
    note: "Note (optional)",
    title: "Approve this loan?",
  },
  rejected: {
    action: "Decline",
    done: "Request declined",
    note: "Reason",
    title: "Decline this request?",
  },
  under_review: {
    action: "Mark as being checked",
    done: "Marked as being checked",
    note: "Note (optional)",
    title: "Mark as being checked?",
  },
}

/** Approve, decline or mark a request as being checked. */
export function LoanDecisionConfirm({
  blockedReason,
  decision,
  loanRequestId,
  onSuccess,
  summary,
}: {
  /** Why approval cannot happen yet (for example a guarantor has not agreed). */
  blockedReason?: string | null
  decision: LoanDecision
  loanRequestId: string
  onSuccess?: () => Promise<void> | void
  /** "Fatima Lawal · ₦40,000 over 3 months" once the request has loaded. */
  summary?: string
}) {
  const copy = decisionCopy[decision]
  const form = useZodForm<NoteValues>(
    decision === "rejected" ? reasonSchema : noteSchema,
    { defaultValues: { notes: "" } }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const blocked = decision === "approved" && Boolean(blockedReason)

  function onSubmit(values: NoteValues) {
    startTransition(async () => {
      try {
        await reviewLoanRequestAction(
          objectToFormData({
            loanRequestId,
            notes: values.notes ?? "",
            status: decision,
          })
        )
        showSuccess(copy.done, summary ?? "")
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not save",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <ConfirmHeader description={summary} title={copy.title} />
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          {blocked ? (
            <p className="border-y border-amber-200 bg-amber-50 px-3 py-3 text-base text-amber-950">
              {blockedReason}
            </p>
          ) : (
            <NoteField disabled={isPending} form={form} label={copy.note} />
          )}
          <WorkflowConfirmFooter disabled={isPending}>
            <Button
              className="h-11"
              disabled={isPending || blocked}
              type="submit"
              variant={decision === "rejected" ? "destructive" : "default"}
            >
              {isPending ? "Saving…" : copy.action}
            </Button>
          </WorkflowConfirmFooter>
        </form>
      </Form>
    </>
  )
}

/** Staff record a guarantor's answer given in person or by phone. */
export function GuarantorAnswerConfirm({
  answer,
  guarantorApprovalId,
  guarantorName,
  onSuccess,
  summary,
}: {
  answer: "approved" | "rejected"
  guarantorApprovalId: string
  guarantorName?: string
  onSuccess?: () => Promise<void> | void
  summary?: string
}) {
  const name = guarantorName ?? "the guarantor"
  const form = useZodForm<NoteValues>(
    answer === "rejected" ? reasonSchema : noteSchema,
    { defaultValues: { notes: "" } }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: NoteValues) {
    startTransition(async () => {
      try {
        await reviewLoanGuarantorApprovalAction(
          objectToFormData({
            guarantorApprovalId,
            notes: values.notes ?? "",
            status: answer,
          })
        )
        showSuccess(
          "Answer saved",
          answer === "approved" ? `${name} agreed.` : `${name} said no.`
        )
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not save the answer",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <ConfirmHeader
        description={summary}
        title={
          answer === "approved"
            ? `Record that ${name} agreed?`
            : `Record that ${name} said no?`
        }
      />
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <NoteField
            disabled={isPending}
            form={form}
            label={answer === "approved" ? "Note (optional)" : "Reason"}
          />
          <p className="text-base text-muted-foreground">
            This cannot be changed later.
          </p>
          <WorkflowConfirmFooter disabled={isPending}>
            <Button
              className="h-11"
              disabled={isPending}
              type="submit"
              variant={answer === "approved" ? "default" : "destructive"}
            >
              {isPending
                ? "Saving…"
                : answer === "approved"
                  ? "Yes, they agreed"
                  : "Yes, they said no"}
            </Button>
          </WorkflowConfirmFooter>
        </form>
      </Form>
    </>
  )
}

const disburseSchema = z.object({ firstRepaymentDueAt: z.string().optional() })
type DisburseValues = z.infer<typeof disburseSchema>

/** Pay out an approved loan: money leaves the cooperative. */
export function LoanPayOutConfirm({
  amount,
  loanId,
  memberName,
  onSuccess,
  shortfall,
}: {
  amount?: number
  loanId: string
  memberName?: string
  onSuccess?: () => Promise<void> | void
  /** Set when the loan is larger than the money available to lend. */
  shortfall?: string | null
}) {
  const form = useZodForm<DisburseValues>(disburseSchema, {
    defaultValues: { firstRepaymentDueAt: "" },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const amountText = amount === undefined ? "this loan" : formatCurrency(amount)

  function onSubmit(values: DisburseValues) {
    startTransition(async () => {
      try {
        await disburseLoanAction(
          objectToFormData({
            firstRepaymentDueAt: values.firstRepaymentDueAt ?? "",
            loanId,
          })
        )
        showSuccess("Loan paid out", "The payment plan has started.")
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not pay out",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <ConfirmHeader
        description="This records the money leaving the cooperative and starts the payment plan. It cannot be undone here."
        title={
          memberName
            ? `Pay out ${amountText} to ${memberName}?`
            : `Pay out ${amountText}?`
        }
      />
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <DashboardQuickFill
            form={form}
            onFill={() =>
              form.reset({ firstRepaymentDueAt: qaFirstOfNextMonth() })
            }
          />
          {shortfall ? (
            <p className="border-y border-amber-200 bg-amber-50 px-3 py-3 text-base text-amber-950">
              {shortfall}
            </p>
          ) : null}
          <FormField
            control={form.control}
            name="firstRepaymentDueAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>First payment due</FormLabel>
                <FormControl>
                  <DatePickerInput
                    {...field}
                    placeholder="One month from today"
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription className="text-base">
                  Leave empty for one month from today.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <WorkflowConfirmFooter disabled={isPending}>
            <Button className="h-11" disabled={isPending} type="submit">
              {isPending ? "Paying out…" : "Pay out"}
            </Button>
          </WorkflowConfirmFooter>
        </form>
      </Form>
    </>
  )
}
