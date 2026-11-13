"use client"

import { useNotifications } from "@halaalvest/notifications-react"
import type { TenantBusinessProfitPolicySettings } from "@halaalvest/db"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { usePreservedFormState } from "@halaalvest/ui/hooks/use-preserved-form-state"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  businessProfitPolicySchema,
  PercentageFormInput,
  SelectFormInput,
  type BusinessProfitPolicyValues,
} from "@/components/forms/tenant-finance-forms"
import { updateTenantBusinessProfitPolicyAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import {
  buildProfitPolicyPayload,
  defaultHistoricalProfitMigrationMode,
  financialYearStartMonthOptions,
  historicalProfitMigrationModeOptions,
  profitFrequencyOptions,
  profitPolicyFixedFields,
  profitSharingBasisFact,
  reserveForSharedPercentage,
  summarizeProfitSplit,
  type OnePathSavePreparer,
} from "@/lib/getting-started/one-path-finance"

// Draft state for the profit policy half of step 8. `prepareSave` runs the
// existing policy rules (including the 100% split) and returns the save.
export function useProfitPolicyDraft({
  businessPolicy,
}: {
  businessPolicy: TenantBusinessProfitPolicySettings
}) {
  const { showError } = useNotifications()
  const form = useZodForm<BusinessProfitPolicyValues>(
    businessProfitPolicySchema,
    {
      defaultValues: {
        defaultDistributablePercentage: String(
          businessPolicy.defaultDistributablePercentage
        ),
        distributionBasis: profitPolicyFixedFields.distributionBasis,
        expenseTreatment: profitPolicyFixedFields.expenseTreatment,
        financialYearStartMonth: String(businessPolicy.financialYearStartMonth),
        historicalProfitMigrationMode:
          businessPolicy.historicalProfitMigrationMode ??
          defaultHistoricalProfitMigrationMode,
        profitDistributionFrequency: businessPolicy.profitDistributionFrequency,
        requiresProfitDistributionApproval:
          businessPolicy.requiresProfitDistributionApproval,
        // Show a 0% reserve as 0, not blank.
        reserveRetentionPercentage: String(
          businessPolicy.reserveRetentionPercentage
        ),
      },
    }
  )
  const clearPreservedPolicy = usePreservedFormState(form, {
    baselineKey: `one-path-profit-policy-v1:${JSON.stringify(businessPolicy)}`,
    storageKey: "getting-started:profit-policy",
  })

  const prepareSave: OnePathSavePreparer = async () => {
    const isValid = await form.trigger()

    if (!isValid) {
      showError(
        "Check your profit sharing",
        "Fix the highlighted fields, then continue."
      )
      return null
    }

    const payload = buildProfitPolicyPayload(form.getValues())

    return async () => {
      await updateTenantBusinessProfitPolicyAction(objectToFormData(payload))
      clearPreservedPolicy()
    }
  }

  return { form, prepareSave }
}

type ProfitPolicyDraft = ReturnType<typeof useProfitPolicyDraft>

export function ProfitPolicyFields({
  disabled,
  draft,
  isBroughtForward,
}: {
  disabled: boolean
  draft: ProfitPolicyDraft
  isBroughtForward: boolean
}) {
  const { form } = draft
  const split = summarizeProfitSplit(
    form.watch("defaultDistributablePercentage"),
    form.watch("reserveRetentionPercentage")
  )
  const sharedWidth = Math.min(100, Math.max(0, split.sharedPercent))
  const reserveWidth = Math.min(
    100 - sharedWidth,
    Math.max(0, split.reservePercent)
  )

  return (
    <Form {...form}>
      <section aria-labelledby="one-path-profit-split" className="grid gap-6">
        <DashboardQuickFill
          enabled={!disabled}
          form={form}
          onFill={() =>
            form.reset({
              ...form.getValues(),
              defaultDistributablePercentage: "80",
              financialYearStartMonth: "1",
              profitDistributionFrequency: "annual",
              requiresProfitDistributionApproval: true,
              reserveRetentionPercentage: "20",
            })
          }
        />
        <div className="grid gap-3">
          <h3
            className="text-base font-medium text-foreground"
            id="one-path-profit-split"
          >
            How is profit split?
          </h3>
          <div className="grid max-w-xl gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="defaultDistributablePercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shared with members %</FormLabel>
                  <FormControl>
                    <PercentageFormInput
                      disabled={disabled}
                      onChange={(value) => {
                        field.onChange(value)
                        const reserve = reserveForSharedPercentage(value)

                        if (reserve !== null) {
                          form.setValue("reserveRetentionPercentage", reserve, {
                            shouldDirty: true,
                            shouldValidate: form.formState.isSubmitted,
                          })
                        }
                      }}
                      placeholder="100"
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reserveRetentionPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kept in reserve %</FormLabel>
                  <FormControl>
                    <PercentageFormInput
                      disabled={disabled}
                      onChange={field.onChange}
                      placeholder="0"
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid max-w-xl gap-1.5">
            <div
              aria-hidden
              className="flex h-2 w-full overflow-hidden bg-muted"
              data-profit-split-bar
            >
              <span
                className="h-full bg-primary transition-[width]"
                style={{ width: `${sharedWidth}%` }}
              />
              <span
                className="h-full bg-primary/35 transition-[width]"
                style={{ width: `${reserveWidth}%` }}
              />
            </div>
            <p
              aria-live="polite"
              className={cn(
                "text-xs",
                split.isComplete
                  ? "text-muted-foreground"
                  : "font-medium text-destructive"
              )}
            >
              {split.message}
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="profitDistributionFrequency"
          render={({ field }) => (
            <FormItem>
              <p
                className="text-base font-medium text-foreground"
                id="one-path-profit-frequency"
              >
                How often do you share profit?
              </p>
              <FormControl>
                <RadioGroup
                  aria-labelledby="one-path-profit-frequency"
                  className="grid grid-cols-2 gap-2 lg:grid-cols-4"
                  disabled={disabled}
                  onValueChange={(value) => field.onChange(value)}
                  value={field.value}
                >
                  {profitFrequencyOptions.map((option) => (
                    <label
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 border border-border/70 bg-background px-3 py-2 text-sm transition-colors",
                        "hover:border-foreground/30 hover:bg-muted/20",
                        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                        "has-[[data-slot=radio-group-item][data-checked]]:border-primary has-[[data-slot=radio-group-item][data-checked]]:bg-primary/5"
                      )}
                      key={option.value}
                    >
                      <RadioGroupItem value={option.value} />
                      <span className="font-medium text-foreground">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="financialYearStartMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your financial year starts in</FormLabel>
                <FormControl>
                  <SelectFormInput
                    disabled={disabled}
                    onChange={field.onChange}
                    options={financialYearStartMonthOptions}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {isBroughtForward ? null : (
            <FormField
              control={form.control}
              name="historicalProfitMigrationMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profit from before today</FormLabel>
                  <FormControl>
                    <SelectFormInput
                      disabled={disabled}
                      onChange={field.onChange}
                      options={[...historicalProfitMigrationModeOptions]}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="requiresProfitDistributionApproval"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              </FormControl>
              <FormLabel className="font-normal">
                A leader approves each season before profit is shared
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Basis and expense treatment have one option each, so they are
            stated as a fact; buildProfitPolicyPayload still sends both, and
            the current history mode in brought-forward setup. */}
        <p className="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground">
          {profitSharingBasisFact}
        </p>
      </section>
    </Form>
  )
}
