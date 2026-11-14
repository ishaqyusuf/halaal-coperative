"use client"

import { useState, useTransition } from "react"
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
  InputGroupAddon,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import { MemberCombobox } from "@/components/member-combobox"
import { formatChargeAmount } from "@/lib/charges/charge-words"
import {
  applyChargeAction,
  createChargeDefinitionAction,
} from "@/lib/dashboard-actions"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import { formatDayMonthYear } from "@/utils/format"

const fieldLabel = "text-base"
const fieldControl = "h-11 text-base"

function AmountInput({
  isPercent,
  onChange,
  value,
}: {
  isPercent: boolean
  onChange: (value: string) => void
  value?: string
}) {
  if (isPercent) {
    return (
      <InputGroup className={fieldControl}>
        <InputGroupInput
          className="text-right text-base"
          inputMode="decimal"
          onChange={(event) =>
            onChange(event.target.value.replace(/[^0-9.]/g, ""))
          }
          placeholder="2"
          value={value ?? ""}
        />
        <InputGroupAddon align="inline-end">%</InputGroupAddon>
      </InputGroup>
    )
  }

  return (
    <CurrencyInput
      allowNegative={false}
      className="text-base"
      decimalScale={2}
      inputMode="decimal"
      placeholder="2,500"
      value={value ?? ""}
      valueIsNumericString
      onValueChange={(values) => onChange(values.value)}
    />
  )
}

const chargeTypeSchema = z.object({
  amount: z.string().min(1, "Enter the amount."),
  appliesToLoanRequests: z.boolean().default(false),
  appliesToLoans: z.boolean().default(false),
  appliesToMembers: z.boolean().default(true),
  effectiveFrom: z.string().min(1, "Pick the start date."),
  isMonthlyLevy: z.boolean().default(false),
  kind: z.enum(["fixed", "percentage"]),
  name: z.string().trim().min(1, "Enter a name."),
  purpose: z
    .enum(["general", "member_share", "loan_fee", "membership_fee", "penalty"])
    .default("general"),
})

type ChargeTypeValues = z.infer<typeof chargeTypeSchema>

const emptyChargeType: ChargeTypeValues = {
  amount: "",
  appliesToLoanRequests: false,
  appliesToLoans: false,
  appliesToMembers: true,
  effectiveFrom: "",
  isMonthlyLevy: false,
  kind: "fixed",
  name: "",
  purpose: "general",
}

const whoPaysOptions: Array<{
  hint?: string
  label: string
  name:
    | "appliesToLoanRequests"
    | "appliesToLoans"
    | "appliesToMembers"
    | "isMonthlyLevy"
}> = [
  {
    label: "Every monthly payment",
    hint: "Added when a member's monthly payment is received.",
    name: "appliesToMembers",
  },
  {
    label: "This is the monthly levy",
    hint: "Kept apart from savings on monthly records.",
    name: "isMonthlyLevy",
  },
  { label: "Loan requests", name: "appliesToLoanRequests" },
  { label: "Loans", name: "appliesToLoans" },
]

/** New charge type (sheet `chargeOperationSheetType=definition`). */
export function ChargeTypeForm({
  devMode,
  onSuccess,
}: {
  devMode: boolean
  onSuccess?: () => Promise<void> | void
}) {
  const form = useZodForm<ChargeTypeValues>(chargeTypeSchema, {
    defaultValues: emptyChargeType,
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const isPercent = form.watch("kind") === "percentage"

  function onSubmit(values: ChargeTypeValues) {
    startTransition(async () => {
      try {
        await createChargeDefinitionAction(objectToFormData(values))
        showSuccess("Charge saved", `${values.name} is ready to use.`)
        form.reset(emptyChargeType)
        await onSuccess?.()
      } catch (error) {
        showError(
          "Could not save the charge",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="grid gap-5 pb-6" onSubmit={form.handleSubmit(onSubmit)}>
        {devMode ? (
          <div className="flex justify-end">
            <DashboardQuickFill
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(
                  form,
                  "charge_definition",
                  undefined,
                  {
                    emailDomain,
                  }
                )
              }
            />
          </div>
        ) : null}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className={fieldControl}
                  placeholder="Monthly levy"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>Charged as</FormLabel>
                <FormControl>
                  <NativeSelect {...field} className={fieldControl}>
                    <option value="fixed">A naira amount</option>
                    <option value="percentage">A percent</option>
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
                <FormLabel className={fieldLabel}>Amount</FormLabel>
                <FormControl>
                  <AmountInput
                    isPercent={isPercent}
                    onChange={field.onChange}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={fieldLabel}>What it is for</FormLabel>
                <FormControl>
                  <NativeSelect
                    {...field}
                    className={fieldControl}
                    onChange={(event) => {
                      const purpose = event.target
                        .value as ChargeTypeValues["purpose"]
                      field.onChange(purpose)
                      const isLoanFee = purpose === "loan_fee"
                      form.setValue("appliesToLoanRequests", isLoanFee)
                      form.setValue("appliesToLoans", false)
                      form.setValue("appliesToMembers", !isLoanFee)
                    }}
                  >
                    <option value="general">General</option>
                    <option value="membership_fee">Membership fee</option>
                    <option value="loan_fee">Loan fee</option>
                    <option value="member_share">Shares</option>
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
                <FormLabel className={fieldLabel}>Starts on</FormLabel>
                <FormControl>
                  <DatePickerInput
                    {...field}
                    allowClear={false}
                    placeholder="Pick a date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <fieldset className="grid gap-1">
          <legend className="mb-2 text-base font-medium">
            Add it automatically to
          </legend>
          {whoPaysOptions.map((option) => (
            <FormField
              control={form.control}
              key={option.name}
              name={option.name}
              render={({ field }) => (
                <FormItem className="flex min-h-11 flex-row items-start gap-3 py-1">
                  <FormControl>
                    <Checkbox
                      checked={Boolean(field.value)}
                      className="mt-0.5 size-5"
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  </FormControl>
                  <div className="grid gap-0.5">
                    <FormLabel className={fieldLabel}>{option.label}</FormLabel>
                    {option.hint ? (
                      <p className="text-sm text-muted-foreground">
                        {option.hint}
                      </p>
                    ) : null}
                  </div>
                </FormItem>
              )}
            />
          ))}
          <p className="text-sm text-muted-foreground">
            Leave all unticked to add it to members yourself.
          </p>
        </fieldset>
        <Button
          className="h-11 w-full text-base sm:w-auto sm:justify-self-start"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Saving…" : "Save charge"}
        </Button>
      </form>
    </Form>
  )
}

const chargeMemberSchema = z.object({
  assessedAt: z.string().min(1, "Pick the date."),
  chargeDefinitionId: z.string().min(1, "Pick a charge."),
  memberId: z.string().min(1, "Pick a member."),
  notes: z.string().optional(),
})

type ChargeMemberValues = z.infer<typeof chargeMemberSchema>

const emptyChargeMember: ChargeMemberValues = {
  assessedAt: "",
  chargeDefinitionId: "",
  memberId: "",
  notes: "",
}

/**
 * Charge one member (sheet `chargeOperationSheetType=application`). Only
 * active naira-amount charges can be added by hand; the server uses the
 * amount in force on the chosen date. A confirm comes before posting.
 */
export function ChargeMemberForm({
  chargeTypes,
  devMode,
  onSuccess,
}: {
  chargeTypes: Array<{
    amount: number
    id: string
    name: string
    versions: Array<{ amount: number; effectiveFrom: string }>
  }>
  devMode: boolean
  onSuccess?: () => Promise<void> | void
}) {
  const form = useZodForm<ChargeMemberValues>(chargeMemberSchema, {
    defaultValues: emptyChargeMember,
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [memberLabel, setMemberLabel] = useState("")
  const [pendingValues, setPendingValues] = useState<ChargeMemberValues | null>(
    null
  )
  const selectedCharge = chargeTypes.find(
    (charge) => charge.id === form.watch("chargeDefinitionId")
  )
  const assessedAt = form.watch("assessedAt")
  // The amount in force on the chosen date (the server uses the same rule).
  const chargeAmount = selectedCharge
    ? (selectedCharge.versions.find(
        (version) => !assessedAt || version.effectiveFrom <= assessedAt
      )?.amount ?? selectedCharge.amount)
    : null
  const chargeAmountLabel =
    chargeAmount === null
      ? ""
      : formatChargeAmount(chargeAmount, "fixed_amount")

  function postCharge() {
    if (!pendingValues) return

    startTransition(async () => {
      try {
        await applyChargeAction(objectToFormData(pendingValues))
        showSuccess(
          "Charge added",
          `${memberLabel || "The member"} was charged.`
        )
        setPendingValues(null)
        form.reset(emptyChargeMember)
        await onSuccess?.()
      } catch (error) {
        setPendingValues(null)
        showError(
          "Could not add the charge",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-5 pb-6"
        onSubmit={form.handleSubmit((values) => setPendingValues(values))}
      >
        {devMode ? (
          <div className="flex justify-end">
            <DashboardQuickFill
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(
                  form,
                  "charge_application",
                  { chargeDefinitionId: chargeTypes[0]?.id ?? "" },
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
            <FormItem>
              <FormLabel className={fieldLabel}>Member</FormLabel>
              <FormControl>
                <MemberCombobox
                  onLabelChange={setMemberLabel}
                  onValueChange={field.onChange}
                  placeholder="Type a name or member number"
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="chargeDefinitionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>Charge</FormLabel>
              <FormControl>
                <NativeSelect {...field} className={fieldControl}>
                  <option value="">Pick a charge</option>
                  {chargeTypes.map((charge) => (
                    <option key={charge.id} value={charge.id}>
                      {charge.name} ·{" "}
                      {formatChargeAmount(charge.amount, "fixed_amount")}
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
          name="assessedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={fieldLabel}>Date</FormLabel>
              <FormControl>
                <DatePickerInput
                  {...field}
                  allowClear={false}
                  placeholder="Pick a date"
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
            <FormItem>
              <FormLabel className={fieldLabel}>Note (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="min-h-20 text-base"
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base">
            Amount{" "}
            <span className="font-semibold tabular-nums">
              {chargeAmountLabel || "—"}
            </span>
          </p>
          <Button
            className="h-11 w-full text-base sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            Charge member
          </Button>
        </div>
      </form>
      <ConfirmActionDialog
        actionLabel="Charge member"
        description={`${selectedCharge?.name ?? "This charge"} comes out of their savings. You can undo it later if it was a mistake.`}
        onCancel={() => setPendingValues(null)}
        onConfirm={postCharge}
        open={Boolean(pendingValues)}
        pending={isPending}
        title={`Charge ${memberLabel || "this member"} ${chargeAmountLabel}?`}
      >
        {pendingValues ? (
          <p className="text-base text-muted-foreground">
            Date: {formatDayMonthYear(pendingValues.assessedAt)}
          </p>
        ) : null}
      </ConfirmActionDialog>
    </Form>
  )
}
