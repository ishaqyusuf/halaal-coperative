"use client"

import { type ReactNode, useState, useTransition } from "react"
import { useTenantRouter } from "@halaalvest/tenant-url/next"
import type { TenantOperationProfileReadModel } from "@halaalvest/db"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Button } from "@halaalvest/ui/components/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@halaalvest/ui/components/form"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import { AlertCircleIcon } from "lucide-react"
import { z } from "zod"
import { OnePathStep } from "@/components/one-path/one-path-step"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { saveTenantOperationProfileAction } from "@/lib/dashboard-actions"
import { navigateWithFreshWizardState } from "@/lib/getting-started/navigate-with-fresh-state"
import {
  buildOperationProfileSetupFormData,
  commitmentCollectionChoices,
  commitmentCollectionLabels,
  getOperationProfileSetupInitialValues,
  keepsExistingRecordsWhenNotOffered,
  serviceOfferedChoices,
  serviceOfferedLabels,
  serviceRequestChannelChoices,
  serviceRequestChannelLabels,
  supportAccessChoices,
  supportAccessLabels,
  type OperationProfileSetupValues,
} from "@/lib/getting-started/operation-profile-setup"

const operationProfileSetupFormId = "operation-profile-setup-form"

const operationProfileSetupSchema = z.object({
  commitmentCollection: z.enum(commitmentCollectionChoices, {
    error: "Choose how members pay their monthly savings.",
  }),
  foodPurchaseOffered: z.enum(serviceOfferedChoices, {
    error: "Choose whether you run Foodstuff Purchase.",
  }),
  foodPurchaseRequestChannel: z.enum(serviceRequestChannelChoices, {
    error: "Choose who starts a Foodstuff Purchase application.",
  }),
  procurementOffered: z.enum(serviceOfferedChoices, {
    error: "Choose whether you buy items for members to repay.",
  }),
  procurementRequestChannel: z.enum(serviceRequestChannelChoices, {
    error: "Choose who starts a request.",
  }),
  supportAccess: z.enum(supportAccessChoices, {
    error: "Choose how members get help.",
  }),
}) satisfies z.ZodType<OperationProfileSetupValues>

type ChoiceOption<TValue extends string> = {
  hint?: string
  label: string
  value: TValue
}

function toOptions<TValue extends string>(
  values: readonly TValue[],
  labels: Record<TValue, string>
): ChoiceOption<TValue>[] {
  return values.map((value) => ({ label: labels[value], value }))
}

function SetupQuestion<TName extends keyof OperationProfileSetupValues>({
  children,
  hint,
  name,
  nested = false,
  options,
  question,
}: {
  children?: ReactNode
  hint?: string
  name: TName
  nested?: boolean
  options: ChoiceOption<OperationProfileSetupValues[TName]>[]
  question: string
}) {
  const questionId = `operation-profile-setup-${name}-label`

  return (
    <FormField<OperationProfileSetupValues, TName>
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            "min-w-0",
            nested && "border-l-2 border-primary/30 pl-4"
          )}
        >
          <div className="space-y-1">
            <p
              className={cn(
                "font-medium text-foreground",
                nested ? "text-sm" : "text-base"
              )}
              id={questionId}
            >
              {question}
            </p>
            {hint ? <FormDescription>{hint}</FormDescription> : null}
          </div>
          <FormControl>
            <RadioGroup
              aria-labelledby={questionId}
              className="grid gap-2 sm:grid-cols-2"
              onValueChange={(nextValue) => field.onChange(nextValue)}
              value={field.value}
            >
              {options.map((option) => (
                <label
                  className={cn(
                    "flex min-h-11 min-w-0 cursor-pointer items-start gap-3 border border-border/70 bg-background px-4 py-3 text-sm transition-colors",
                    "hover:border-foreground/30 hover:bg-muted/20",
                    "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                    "has-[[data-slot=radio-group-item][data-checked]]:border-primary has-[[data-slot=radio-group-item][data-checked]]:bg-primary/5"
                  )}
                  key={option.value}
                >
                  <RadioGroupItem className="mt-0.5" value={option.value} />
                  <span className="min-w-0 break-words">
                    <span className="block font-medium text-foreground">
                      {option.label}
                    </span>
                    {option.hint ? (
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {option.hint}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
          {children}
        </FormItem>
      )}
    />
  )
}

function offeredOptions(keepsExistingRecords: boolean) {
  return toOptions(serviceOfferedChoices, serviceOfferedLabels).map((option) =>
    option.value === "no" && keepsExistingRecords
      ? { ...option, hint: "Existing records stay visible." }
      : option
  )
}

export function OperationProfileSetupForm({
  backHref,
  operationProfile,
  redirectTo,
  tenantName,
}: {
  backHref?: string | null
  operationProfile: TenantOperationProfileReadModel
  redirectTo: string
  tenantName: string
}) {
  const router = useTenantRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useZodForm<OperationProfileSetupValues>(
    operationProfileSetupSchema,
    { defaultValues: getOperationProfileSetupInitialValues(operationProfile) }
  )
  const procurementOffered = form.watch("procurementOffered") === "yes"
  const foodPurchaseOffered = form.watch("foodPurchaseOffered") === "yes"
  const channelOptions = toOptions(
    serviceRequestChannelChoices,
    serviceRequestChannelLabels
  )

  function onSubmit(values: OperationProfileSetupValues) {
    setServerError(null)
    const formData = buildOperationProfileSetupFormData(
      values,
      operationProfile
    )

    startTransition(async () => {
      try {
        await saveTenantOperationProfileAction(formData)
        navigateWithFreshWizardState(router, redirectTo)
      } catch (error) {
        setServerError(
          error instanceof Error && error.message
            ? error.message
            : "Something went wrong. Check your answers and try again."
        )
      }
    })
  }

  return (
    <OnePathStep
      aside={
        <p>
          This decides which menus your staff see and what members can request
          in the app. Change it later in Settings.
        </p>
      }
      backHref={backHref}
      lede={`Which services does ${tenantName} run today?`}
      primary={
        <Button
          className="h-11"
          disabled={isPending}
          form={operationProfileSetupFormId}
          type="submit"
        >
          {isPending ? "Saving…" : "Continue"}
        </Button>
      }
      stepKey="operation-profile"
      title="Services you offer"
    >
      <Form {...form}>
        <form
          aria-busy={isPending}
          className="grid gap-8"
          id={operationProfileSetupFormId}
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <DashboardQuickFill
            form={form}
            onFill={() =>
              form.reset({
                commitmentCollection: "mixed",
                foodPurchaseOffered: "yes",
                foodPurchaseRequestChannel: "member",
                procurementOffered: "yes",
                procurementRequestChannel: "member",
                supportAccess: "member",
              })
            }
          />
          {serverError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>We couldn&apos;t save your services</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <SetupQuestion
            name="commitmentCollection"
            options={toOptions(
              commitmentCollectionChoices,
              commitmentCollectionLabels
            )}
            question="How do members pay their monthly savings?"
          />

          <SetupQuestion
            hint="For example a laptop or a motorcycle, repaid in monthly instalments."
            name="procurementOffered"
            options={offeredOptions(
              keepsExistingRecordsWhenNotOffered(
                operationProfile.services.procurement.accessMode
              )
            )}
            question="Do you buy items for members to repay over time?"
          >
            {procurementOffered ? (
              <div className="pt-3">
                <SetupQuestion
                  name="procurementRequestChannel"
                  nested
                  options={channelOptions}
                  question="Who starts a request?"
                />
              </div>
            ) : null}
          </SetupQuestion>

          <SetupQuestion
            name="foodPurchaseOffered"
            options={offeredOptions(
              keepsExistingRecordsWhenNotOffered(
                operationProfile.services.food_purchase.accessMode
              )
            )}
            question="Do you run foodstuff purchase?"
          >
            {foodPurchaseOffered ? (
              <div className="pt-3">
                <SetupQuestion
                  name="foodPurchaseRequestChannel"
                  nested
                  options={channelOptions}
                  question="Who starts an application?"
                />
              </div>
            ) : null}
          </SetupQuestion>

          <SetupQuestion
            name="supportAccess"
            options={toOptions(supportAccessChoices, supportAccessLabels)}
            question="How do members get help?"
          />
        </form>
      </Form>
    </OnePathStep>
  )
}
