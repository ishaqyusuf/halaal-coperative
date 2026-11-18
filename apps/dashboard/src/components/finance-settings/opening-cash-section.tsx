"use client"

import { z } from "zod"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyFormInput } from "@halaalvest/ui/components/currency-input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { formatCurrency } from "@halaalvest/utils"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { FinanceSettingsSection } from "@/components/finance-settings/finance-settings-frame"
import { useFinanceSettingsSave } from "@/components/finance-settings/use-finance-settings-save"
import { setTenantOpeningCashAction } from "@/lib/dashboard-actions"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"

const openingCashSchema = z.object({
  amount: z
    .string()
    .refine(
      (value) => value.trim() === "" || Number(value) >= 0,
      "Enter ₦0 or more."
    ),
})

type OpeningCashValues = z.infer<typeof openingCashSchema>

const title = "Other cash on hand when you joined Halaalvest"
const explainer =
  "Money the cooperative already held that isn't in members' savings or shares, for example profit you kept in the bank. It adds to the money you can lend. Leave it at ₦0 if there is none."

/**
 * Cooperative opening cash (triage 1.9). Optional, one figure for the whole
 * cooperative, recorded in the ledger once and changeable until go-live.
 */
export function OpeningCashSection({
  amount,
  canChange,
}: {
  amount: number
  canChange: boolean
}) {
  if (!canChange) {
    return (
      <FinanceSettingsSection title={title}>
        <p className="text-3xl font-semibold text-foreground tabular-nums">
          {formatCurrency(amount)}
        </p>
        <p className="text-base text-muted-foreground">
          Recorded when you went live. It can't change now.
        </p>
      </FinanceSettingsSection>
    )
  }

  return (
    <FinanceSettingsSection title={title}>
      <OpeningCashForm amount={amount} />
    </FinanceSettingsSection>
  )
}

function OpeningCashForm({ amount }: { amount: number }) {
  const form = useZodForm<OpeningCashValues>(openingCashSchema, {
    defaultValues: { amount: amount > 0 ? String(amount) : "" },
  })
  const { isPending, save } = useFinanceSettingsSave({
    successTitle: "Cash on hand saved",
  })

  function onSubmit(values: OpeningCashValues) {
    save(
      () => setTenantOpeningCashAction(objectToFormData(values)),
      () => form.reset(values)
    )
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-(--ui-radius-control) border border-border p-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <DashboardQuickFill
          form={form}
          onFill={({ emailDomain }) =>
            applyDashboardDevFormFill(form, "opening_cash", undefined, {
              emailDomain,
            })
          }
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (optional)</FormLabel>
              <FormControl>
                <CurrencyFormInput {...field} placeholder="₦0" />
              </FormControl>
              <FormDescription>{explainer}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-sm text-muted-foreground">
          You can change it until you go live.
        </p>
        <div className="flex justify-end">
          <Button
            className="w-full sm:w-auto md:h-9"
            disabled={isPending || !form.formState.isDirty}
            size="touch"
            type="submit"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
