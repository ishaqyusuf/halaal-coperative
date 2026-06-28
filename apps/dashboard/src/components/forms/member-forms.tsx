"use client"

import { useMemo, useState, useTransition } from "react"
import { z } from "zod"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { formatCurrency } from "@halaalvest/utils"
import {
  applyDashboardDevFormFill,
  applyDashboardRandomDevFormFill,
} from "@/lib/dev-form-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import { objectToFormData } from "@/lib/form-submit"
import {
  createMemberAction,
  createMemberDocumentAction,
  setMemberContributionPlanAction,
  updateMemberDocumentReviewAction,
  updateMemberKycAction,
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

const commitmentHistoryRowSchema = z.object({
  amount: z.string().optional(),
  effectiveFrom: z.string().optional(),
  notes: z.string().optional(),
})

const legacyLoanHistoryRowSchema = z.object({
  closedAt: z.string().optional(),
  guarantorOneMemberId: z.string().optional(),
  guarantorTwoMemberId: z.string().optional(),
  loanLabel: z.string().optional(),
  openedAt: z.string().optional(),
  outstandingPrincipalBalance: z.string().optional(),
  principalAmount: z.string().optional(),
  savingsDuringLoan: z.string().optional(),
  scheduledMonthlyPrincipalRepayment: z.string().optional(),
  notes: z.string().optional(),
})

type CommitmentHistoryRow = z.infer<typeof commitmentHistoryRowSchema> & {
  id: string
}

type LegacyLoanHistoryRow = z.infer<typeof legacyLoanHistoryRowSchema> & {
  id: string
}

function createMemberFormRowId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}

const memberCreateSchema = z
  .object({
    address: z.string().optional(),
    currentSavingsBalance: z.string().optional(),
    email: z
      .string()
      .email("Enter a valid email.")
      .optional()
      .or(z.literal("")),
    fullName: z.string().min(1, "Full name is required."),
    hasServingLoan: z.boolean().default(false),
    joinedAt: z.string().min(1, "Joined date is required."),
    loanAmount: z.string().optional(),
    loanMonthlyCommitment: z.string().optional(),
    loanPaymentMonths: z.string().optional(),
    loanServed: z.string().optional(),
    loanStartDate: z.string().optional(),
    loanTopupAmount: z.string().optional(),
    monthlyCommitment: z.string().optional(),
    memberNumber: z.string().min(1, "Member number is required."),
    memberType: z.enum(["individual", "civil_servant", "business"]),
    occupation: z.string().optional(),
    phoneNumber: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.hasServingLoan) {
      return
    }

    if (!values.loanStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Loan start date is required.",
        path: ["loanStartDate"],
      })
    }

    const amount = Number(values.loanAmount ?? "")
    const paymentMonths = Number(values.loanPaymentMonths ?? "")
    const served = Number(values.loanServed ?? "0")
    const monthly = Number(values.loanMonthlyCommitment ?? "")
    const topup = Number(values.loanTopupAmount ?? "0")

    if (!values.loanAmount || Number.isNaN(amount) || amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Loan amount must be greater than 0.",
        path: ["loanAmount"],
      })
    }

    if (values.loanServed && (Number.isNaN(served) || served < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Served amount cannot be negative.",
        path: ["loanServed"],
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

    if (values.loanTopupAmount && (Number.isNaN(topup) || topup < 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Topup amount cannot be negative.",
        path: ["loanTopupAmount"],
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

type MemberCreateValues = z.infer<typeof memberCreateSchema>

const memberCommitmentSchema = z.object({
  amount: z.string().min(1, "Monthly commitment is required."),
  memberId: z.string().min(1),
  name: z.string().optional(),
  startsAt: z.string().min(1, "Effective date is required."),
})

type MemberCommitmentValues = z.infer<typeof memberCommitmentSchema>

export function MemberCommitmentForm({
  defaultStartDate,
  defaultAmount,
  memberId,
}: {
  defaultStartDate?: string
  defaultAmount?: string
  memberId: string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const form = useZodForm<MemberCommitmentValues>(memberCommitmentSchema, {
    defaultValues: {
      amount: defaultAmount ?? "",
      memberId,
      name: "Monthly commitment",
      startsAt: defaultStartDate ?? today,
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberCommitmentValues) {
    startTransition(async () => {
      try {
        await setMemberContributionPlanAction(objectToFormData(values))
        showSuccess("Commitment saved", "Monthly commitment history updated.")
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
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <input type="hidden" {...form.register("memberId")} />
        <input type="hidden" {...form.register("name")} />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly amount</FormLabel>
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
                <FormLabel>Starts</FormLabel>
                <FormControl>
                  <DatePickerInput
                    {...field}
                    allowClear={false}
                    placeholder="Select start date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-end">
            <Button
              aria-label="Save dated commitment update"
              className="size-10 shrink-0 rounded-full p-0"
              disabled={isPending}
              type="submit"
              variant="outline"
            >
              <HugeiconsIcon icon={Tick02Icon} size={16} />
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export function MemberCreateForm({
  devMode,
  inModal = false,
  memberNumberPrefix,
  onSuccess,
}: {
  devMode: boolean
  inModal?: boolean
  memberNumberPrefix?: string | null
  onSuccess?: () => void
}) {
  const form = useZodForm<MemberCreateValues>(memberCreateSchema, {
    defaultValues: {
      address: "",
      currentSavingsBalance: "",
      email: "",
      fullName: "",
      hasServingLoan: false,
      joinedAt: "",
      loanAmount: "",
      loanMonthlyCommitment: "",
      loanPaymentMonths: "",
      loanServed: "",
      loanStartDate: "",
      loanTopupAmount: "",
      monthlyCommitment: "",
      memberNumber: "",
      memberType: "individual",
      occupation: "",
      phoneNumber: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [commitmentHistoryRows, setCommitmentHistoryRows] = useState<
    CommitmentHistoryRow[]
  >([])
  const [legacyLoanHistoryRows, setLegacyLoanHistoryRows] = useState<
    LegacyLoanHistoryRow[]
  >([])
  const hasServingLoan = form.watch("hasServingLoan")
  const currentSavingsBalance = Number(form.watch("currentSavingsBalance") || 0)
  const fullName = form.watch("fullName")
  const joinedAt = form.watch("joinedAt")
  const loanAmount = Number(form.watch("loanAmount") || 0)
  const loanPaymentMonths = Number(form.watch("loanPaymentMonths") || 0)
  const loanServed = Number(form.watch("loanServed") || 0)
  const loanMonthlyCommitment = Number(form.watch("loanMonthlyCommitment") || 0)
  const loanTopupAmount = Number(form.watch("loanTopupAmount") || 0)
  const loanStartDate = form.watch("loanStartDate")
  const memberNumber = form.watch("memberNumber")
  const memberType = form.watch("memberType")
  const monthlyCommitment = Number(form.watch("monthlyCommitment") || 0)
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
        MemberCreateValues,
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

  function appendCommitmentHistoryRow() {
    setCommitmentHistoryRows((rows) => [
      ...rows,
      {
        id: createMemberFormRowId(),
        amount: form.getValues("monthlyCommitment") ?? "",
        effectiveFrom: joinedAt || "",
        notes: "",
      },
    ])
  }

  function updateCommitmentHistoryRow(
    rowId: string,
    values: Partial<CommitmentHistoryRow>
  ) {
    setCommitmentHistoryRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, ...values } : row))
    )
  }

  function removeCommitmentHistoryRow(rowId: string) {
    setCommitmentHistoryRows((rows) => rows.filter((row) => row.id !== rowId))
  }

  function appendLegacyLoanHistoryRow() {
    setLegacyLoanHistoryRows((rows) => [
      ...rows,
      {
        id: createMemberFormRowId(),
        closedAt: "",
        guarantorOneMemberId: "",
        guarantorTwoMemberId: "",
        loanLabel: "",
        openedAt: form.getValues("loanStartDate") || joinedAt || "",
        outstandingPrincipalBalance: "",
        principalAmount: "",
        savingsDuringLoan: form.getValues("monthlyCommitment") ?? "",
        scheduledMonthlyPrincipalRepayment: "",
        notes: "",
      },
    ])
  }

  function updateLegacyLoanHistoryRow(
    rowId: string,
    values: Partial<LegacyLoanHistoryRow>
  ) {
    setLegacyLoanHistoryRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, ...values } : row))
    )
  }

  function removeLegacyLoanHistoryRow(rowId: string) {
    setLegacyLoanHistoryRows((rows) => rows.filter((row) => row.id !== rowId))
  }

  function serializeCommitmentRows(rows: CommitmentHistoryRow[]) {
    return rows.map(({ id: _id, ...row }) => row)
  }

  function serializeLegacyLoanRows(rows: LegacyLoanHistoryRow[]) {
    return rows.map(({ id: _id, ...row }) => row)
  }

  function onSubmit(values: MemberCreateValues) {
    startTransition(async () => {
      try {
        const formData = objectToFormData(values)
        formData.append(
          "commitmentHistoryJson",
          JSON.stringify(
            serializeCommitmentRows(
              commitmentHistoryRows.filter(
                (row) => row.effectiveFrom?.trim() || row.amount?.trim()
              )
            )
          )
        )
        formData.append(
          "legacyLoanHistoryJson",
          JSON.stringify(
            serializeLegacyLoanRows(
              legacyLoanHistoryRows.filter(
                (row) => row.openedAt?.trim() || row.principalAmount?.trim()
              )
            )
          )
        )

        await createMemberAction(formData)
        showSuccess("Member added", "Member record created.")
        setCommitmentHistoryRows([])
        setLegacyLoanHistoryRows([])
        form.reset({
          address: "",
          currentSavingsBalance: "",
          email: "",
          fullName: "",
          hasServingLoan: false,
          joinedAt: "",
          loanAmount: "",
          loanMonthlyCommitment: "",
          loanPaymentMonths: "",
          loanServed: "",
          loanStartDate: "",
          loanTopupAmount: "",
          monthlyCommitment: "",
          memberNumber: "",
          memberType: "individual",
          occupation: "",
          phoneNumber: "",
        })
        onSuccess?.()
      } catch (error) {
        showError(
          "Could not add member",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className={
          inModal
            ? "space-y-6"
            : "grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5"
        }
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div
          className={
            inModal
              ? "flex items-start justify-between gap-4"
              : "flex items-start justify-between gap-4 xl:col-span-5"
          }
        >
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              New member
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Capture the member profile and current cooperative state in one
              pass.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardRandomDevFormFill(form, "member_create")
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <div
          className={
            inModal
              ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]"
              : "contents"
          }
        >
          <div className={inModal ? "grid gap-6" : "contents"}>
            <div
              className={
                inModal
                  ? "grid gap-4 md:grid-cols-2 xl:grid-cols-5"
                  : "contents"
              }
            >
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="xl:col-span-2">
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Amina Yusuf" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memberNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member number</FormLabel>
                    <FormControl>
                      {memberNumberPrefix ? (
                        <InputGroup>
                          <InputGroupText>{memberNumberPrefix}</InputGroupText>
                          <InputGroupInput {...field} placeholder="1024" />
                        </InputGroup>
                      ) : (
                        <Input {...field} placeholder="1024" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memberType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member type</FormLabel>
                    <FormControl>
                      <NativeSelect {...field}>
                        <option value="individual">Individual</option>
                        <option value="civil_servant">Civil servant</option>
                        <option value="business">Business</option>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="joinedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Joined date</FormLabel>
                    <FormControl>
                      <DatePickerInput
                        {...field}
                        allowClear={false}
                        placeholder="Select joined date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occupation</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Trader" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+234 800 000 0000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="amina@example.com"
                        type="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="xl:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="No. 12 Cooperative Road" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-4">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-foreground">
                  Current state
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set the member’s opening savings balance and active commitment
                  at the point of onboarding.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="currentSavingsBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening savings balance</FormLabel>
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
              <div className="mt-5 rounded-[1rem] border border-border/60 bg-background/70">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Commitment updates
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dated savings changes used to prefill migration months.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={appendCommitmentHistoryRow}
                  >
                    Add row
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead className="bg-muted/35 text-left text-xs font-medium text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="w-24 px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commitmentHistoryRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-4 text-sm text-muted-foreground"
                          >
                            No dated updates added.
                          </td>
                        </tr>
                      ) : (
                        commitmentHistoryRows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-border/60"
                          >
                            <td className="px-3 py-2 align-top">
                              <DatePickerInput
                                min={joinedAt || undefined}
                                placeholder="Select date"
                                value={row.effectiveFrom ?? ""}
                                onChange={(date) =>
                                  updateCommitmentHistoryRow(row.id, {
                                    effectiveFrom: date,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <CurrencyFormInput
                                placeholder="25000"
                                value={row.amount ?? ""}
                                onChange={(value) =>
                                  updateCommitmentHistoryRow(row.id, {
                                    amount: value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <Input
                                placeholder="Optional"
                                value={row.notes ?? ""}
                                onChange={(event) =>
                                  updateCommitmentHistoryRow(row.id, {
                                    notes: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2 text-right align-top">
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={() =>
                                  removeCommitmentHistoryRow(row.id)
                                }
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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
                        Create an active loan snapshot with separate repayment
                        and savings topup amounts.
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
                            min={joinedAt || undefined}
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
                              updateCalculatedMonthlyService({
                                loanServed: value,
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Loan history
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Backfill legacy loans with dated repayment and savings
                    commitments.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={appendLegacyLoanHistoryRow}
                >
                  Add row
                </Button>
              </div>
              <div className="mt-4 overflow-x-auto rounded-[1rem] border border-border/60">
                <table className="w-full min-w-[1180px] text-sm">
                  <thead className="bg-muted/35 text-left text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Guarantor 1 ID</th>
                      <th className="px-3 py-2">Guarantor 2 ID</th>
                      <th className="px-3 py-2">Repayment</th>
                      <th className="px-3 py-2">Commitment</th>
                      <th className="px-3 py-2">Outstanding</th>
                      <th className="px-3 py-2">Closed</th>
                      <th className="px-3 py-2">Label</th>
                      <th className="w-24 px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legacyLoanHistoryRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-3 py-4 text-sm text-muted-foreground"
                        >
                          No loan history rows added.
                        </td>
                      </tr>
                    ) : (
                      legacyLoanHistoryRows.map((row) => (
                        <tr key={row.id} className="border-t border-border/60">
                          <td className="px-3 py-2 align-top">
                            <DatePickerInput
                              min={joinedAt || undefined}
                              placeholder="Opened date"
                              value={row.openedAt ?? ""}
                              onChange={(date) =>
                                updateLegacyLoanHistoryRow(row.id, {
                                  openedAt: date,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <CurrencyFormInput
                              placeholder="500000"
                              value={row.principalAmount ?? ""}
                              onChange={(value) =>
                                updateLegacyLoanHistoryRow(row.id, {
                                  principalAmount: value,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Input
                              placeholder="Member ID"
                              value={row.guarantorOneMemberId ?? ""}
                              onChange={(event) =>
                                updateLegacyLoanHistoryRow(row.id, {
                                  guarantorOneMemberId: event.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Input
                              placeholder="Member ID"
                              value={row.guarantorTwoMemberId ?? ""}
                              onChange={(event) =>
                                updateLegacyLoanHistoryRow(row.id, {
                                  guarantorTwoMemberId: event.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <CurrencyFormInput
                              placeholder="50000"
                              value={
                                row.scheduledMonthlyPrincipalRepayment ?? ""
                              }
                              onChange={(value) =>
                                updateLegacyLoanHistoryRow(row.id, {
                                  scheduledMonthlyPrincipalRepayment: value,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <CurrencyFormInput
                              placeholder="10000"
                              value={row.savingsDuringLoan ?? ""}
                              onChange={(value) =>
                                updateLegacyLoanHistoryRow(row.id, {
                                  savingsDuringLoan: value,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <CurrencyFormInput
                              placeholder="Optional"
                              value={row.outstandingPrincipalBalance ?? ""}
                              onChange={(value) =>
                                updateLegacyLoanHistoryRow(row.id, {
                                  outstandingPrincipalBalance: value,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <DatePickerInput
                              min={joinedAt || undefined}
                              placeholder="Closed date"
                              value={row.closedAt ?? ""}
                              onChange={(date) =>
                                updateLegacyLoanHistoryRow(row.id, {
                                  closedAt: date,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Input
                              placeholder="Optional"
                              value={row.loanLabel ?? ""}
                              onChange={(event) =>
                                updateLegacyLoanHistoryRow(row.id, {
                                  loanLabel: event.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right align-top">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 rounded-full px-3 text-xs"
                              onClick={() => removeLegacyLoanHistoryRow(row.id)}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {inModal ? (
            <aside className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-4 xl:sticky xl:top-0 xl:self-start">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Overview
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {fullName.trim() || "New member"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {memberNumber
                      ? `${memberNumberPrefix ?? ""}${memberNumber}`
                      : "Member number pending"}{" "}
                    - {memberType.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      Savings balance
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(currentSavingsBalance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      Monthly savings
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(monthlyCommitment)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Loan balance</span>
                    <span className="font-medium text-foreground">
                      {hasServingLoan
                        ? formatCurrency(pendingAmount)
                        : "No active loan"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Loan monthly</span>
                    <span className="font-medium text-foreground">
                      {hasServingLoan
                        ? formatCurrency(loanMonthlyCommitment)
                        : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                    <span className="text-muted-foreground">Total monthly</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        monthlyCommitment +
                          (hasServingLoan ? totalMonthlyDeduction : 0)
                      )}
                    </span>
                  </div>
                </div>
                <div className="rounded-[1rem] border border-border/60 bg-background/80 p-3 text-xs text-muted-foreground">
                  <p>
                    {hasServingLoan
                      ? `Loan ends around ${estimatedEndMonth ?? "the selected term"}.`
                      : "Loan capture is off."}
                  </p>
                </div>
              </div>
            </aside>
          ) : null}
        </div>

        <div
          className={
            inModal
              ? "flex justify-end gap-3 border-t border-border/70 pt-4"
              : "xl:col-span-5"
          }
        >
          <Button
            disabled={isPending}
            type="submit"
            className={inModal ? "rounded-full px-5" : undefined}
          >
            Add member
          </Button>
        </div>
      </form>
    </Form>
  )
}

const memberKycSchema = z.object({
  governmentIdNumber: z.string().optional(),
  kycDocumentType: z.string().optional(),
  kycDocumentUrl: z.string().optional(),
  kycReviewNotes: z.string().optional(),
  kycStatus: z.enum(["not_started", "pending", "verified", "rejected"]),
  memberId: z.string().min(1),
})

type MemberKycValues = z.infer<typeof memberKycSchema>

export function MemberKycForm({
  defaultValues,
  devMode,
}: {
  defaultValues: MemberKycValues
  devMode: boolean
}) {
  const form = useZodForm<MemberKycValues>(memberKycSchema, { defaultValues })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberKycValues) {
    startTransition(async () => {
      try {
        await updateMemberKycAction(objectToFormData(values))
        showSuccess("KYC saved", "Member KYC details updated.")
      } catch (error) {
        showError(
          "Could not save KYC",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              KYC details
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Identity fields now follow the same shared dashboard form
              standard.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "member_kyc", {
                  memberId: defaultValues.memberId,
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="kycStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>KYC status</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="not_started">Not started</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kycDocumentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document type</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="National ID"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="governmentIdNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID number</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kycDocumentUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document URL</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kycReviewNotes"
          render={({ field }) => (
            <FormItem className="md:col-span-4">
              <FormLabel>Review notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  className="min-h-24"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-4">
          <Button disabled={isPending} type="submit">
            Save KYC
          </Button>
        </div>
      </form>
    </Form>
  )
}

const memberDocumentSchema = z.object({
  documentType: z.string().min(1, "Document type is required."),
  documentUrl: z.string().url("Document URL must be valid."),
  memberId: z.string().min(1),
  reviewNotes: z.string().optional(),
  reviewStatus: z.enum(["pending", "verified", "rejected"]),
})

type MemberDocumentValues = z.infer<typeof memberDocumentSchema>

export function MemberDocumentForm({
  defaultMemberId,
  devMode,
}: {
  defaultMemberId: string
  devMode: boolean
}) {
  const form = useZodForm<MemberDocumentValues>(memberDocumentSchema, {
    defaultValues: {
      documentType: "",
      documentUrl: "",
      memberId: defaultMemberId,
      reviewNotes: "",
      reviewStatus: "pending",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberDocumentValues) {
    startTransition(async () => {
      try {
        await createMemberDocumentAction(objectToFormData(values))
        showSuccess(
          "Document added",
          "KYC document attached to the member profile."
        )
        form.reset({
          documentType: "",
          documentUrl: "",
          memberId: defaultMemberId,
          reviewNotes: "",
          reviewStatus: "pending",
        })
      } catch (error) {
        showError(
          "Could not add document",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Add KYC document
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Keep multiple identity and compliance documents on one member
              profile.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.reset({
                  documentType: "National ID",
                  documentUrl: "https://example.com/kyc/member-document.pdf",
                  memberId: defaultMemberId,
                  reviewNotes: "Imported during KYC review.",
                  reviewStatus: "pending",
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="documentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document type</FormLabel>
              <FormControl>
                <Input {...field} placeholder="National ID" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reviewStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial review status</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="documentUrl"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Document URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reviewNotes"
          render={({ field }) => (
            <FormItem className="md:col-span-4">
              <FormLabel>Review notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  className="min-h-24"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-4">
          <Button disabled={isPending} type="submit">
            Add document
          </Button>
        </div>
      </form>
    </Form>
  )
}

const memberDocumentReviewSchema = z.object({
  documentId: z.string().min(1),
  reviewNotes: z.string().optional(),
  reviewStatus: z.enum(["pending", "verified", "rejected"]),
})

type MemberDocumentReviewValues = z.infer<typeof memberDocumentReviewSchema>

export function MemberDocumentReviewForm({
  defaultValues,
}: {
  defaultValues: MemberDocumentReviewValues
}) {
  const form = useZodForm<MemberDocumentReviewValues>(
    memberDocumentReviewSchema,
    { defaultValues }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberDocumentReviewValues) {
    startTransition(async () => {
      try {
        await updateMemberDocumentReviewAction(objectToFormData(values))
        showSuccess("Document review saved", "Document review state updated.")
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
        className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="reviewStatus"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reviewNotes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Review notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button disabled={isPending} size="sm" type="submit" variant="outline">
          Update review
        </Button>
      </form>
    </Form>
  )
}
