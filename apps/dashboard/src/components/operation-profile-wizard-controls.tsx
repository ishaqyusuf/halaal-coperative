"use client"

import {
  type BaseSyntheticEvent,
  type MouseEvent,
  type ReactNode,
  useTransition,
} from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { useTenantRouter } from "@halaalvest/tenant-url/next"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@halaalvest/ui/components/form"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { cn } from "@halaalvest/ui/lib/utils"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { z } from "zod"
import { objectToFormData } from "@/lib/form-submit"
import { saveTenantOperationProfileAction } from "@/lib/dashboard-actions"

const operationProfileWizardSchema = z.object({
  changeReason: z.string().optional(),
  commitmentCollection: z.string().optional(),
  foodPurchaseMaximumActiveObligationsPerMember: z.string().optional(),
  foodPurchaseOffered: z.string().optional(),
  foodPurchaseRequestChannel: z.string().optional(),
  foodPurchaseRequiresOpenCycle: z.string().optional(),
  procurementMaximumActiveObligationsPerMember: z.string().optional(),
  procurementOffered: z.string().optional(),
  procurementRequestChannel: z.string().optional(),
  redirectTo: z.string().optional(),
  supportAccess: z.string().optional(),
})

type OperationProfileWizardValues = z.infer<typeof operationProfileWizardSchema>

export function OperationProfileWizardForm({
  children,
  className,
  id,
  nextHref,
}: {
  children: ReactNode
  className?: string
  id: string
  nextHref: string
}) {
  const router = useTenantRouter()
  const { showError } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const form = useZodForm<OperationProfileWizardValues>(
    operationProfileWizardSchema,
    { defaultValues: {} }
  )

  function onSubmit(
    values: OperationProfileWizardValues,
    event?: BaseSyntheticEvent
  ) {
    const formElement =
      event?.currentTarget instanceof HTMLFormElement
        ? event.currentTarget
        : event?.target instanceof HTMLFormElement
          ? event.target
          : null
    const payload: Record<string, string> = {}

    if (formElement) {
      for (const field of Array.from(
        formElement.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          "input[name], textarea[name]"
        )
      )) {
        if (field instanceof HTMLInputElement && field.type === "checkbox") {
          payload[field.name] = field.checked ? "true" : "false"
          continue
        }

        payload[field.name] = field.value
      }
    }

    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "string" && value.length > 0) {
        payload[key] = value
      }
    }

    const formData = objectToFormData(payload)

    startTransition(async () => {
      try {
        await saveTenantOperationProfileAction(formData)
        router.push(nextHref)
      } catch (error) {
        showError(
          "Could not save operation profile",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        aria-busy={isPending}
        className={className}
        id={id}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {children}
      </form>
    </Form>
  )
}

export function OperationProfileRadioCards({
  className,
  defaultValue,
  name,
  options,
}: {
  className?: string
  defaultValue: string
  name: keyof OperationProfileWizardValues
  options: Array<{
    description: string
    title: string
    value: string
  }>
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => {
        const value =
          typeof field.value === "string" && field.value.length > 0
            ? field.value
            : defaultValue

        function submitChoice(
          event: MouseEvent<HTMLLabelElement>,
          nextValue: string
        ) {
          field.onChange(nextValue)

          const form = event.currentTarget.closest("form")
          const hiddenInput = form?.querySelector<HTMLInputElement>(
            `input[type="hidden"][name="${name}"]`
          )

          if (hiddenInput) {
            hiddenInput.value = nextValue
          }

          window.requestAnimationFrame(() => {
            form
              ?.querySelector<HTMLButtonElement>('button[type="submit"]')
              ?.click()
          })
        }

        return (
          <FormItem>
            <FormControl>
              <RadioGroup
                className={cn("grid gap-3", className)}
                onValueChange={field.onChange}
                value={value}
              >
                <input name={name} type="hidden" value={value} />
                {options.map((option) => (
                  <label
                    className={cn(
                      "flex min-h-28 cursor-pointer gap-3 border border-border/70 bg-background p-4 text-sm transition-all duration-200",
                      "hover:border-foreground/30 hover:bg-muted/20",
                      "has-[[data-slot=radio-group-item][data-checked]]:border-primary has-[[data-slot=radio-group-item][data-checked]]:bg-primary/5 has-[[data-slot=radio-group-item][data-checked]]:shadow-sm"
                    )}
                    key={option.value}
                    onDoubleClick={(event) => submitChoice(event, option.value)}
                  >
                    <RadioGroupItem className="mt-1" value={option.value} />
                    <span>
                      <span className="block text-base font-semibold text-foreground">
                        {option.title}
                      </span>
                      <span className="mt-1 block leading-6 text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export function OperationProfileButtonGroup({
  className,
  defaultValue,
  name,
  options,
}: {
  className?: string
  defaultValue: string
  name: keyof OperationProfileWizardValues
  options: Array<{
    label: string
    value: string
  }>
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => {
        const value =
          typeof field.value === "string" && field.value.length > 0
            ? field.value
            : defaultValue

        return (
          <FormItem>
            <FormControl>
              <RadioGroup
                className={cn("flex w-fit items-stretch gap-0", className)}
                onValueChange={field.onChange}
                value={value}
              >
                <input name={name} type="hidden" value={value} />
                {options.map((option, index) => (
                  <label
                    className={cn(
                      "relative inline-flex h-9 min-w-10 cursor-pointer items-center justify-center border border-input bg-background px-3 text-xs font-medium transition-all",
                      "hover:bg-muted hover:text-foreground",
                      "focus-within:z-10 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
                      "has-[[data-slot=radio-group-item][data-checked]]:z-10 has-[[data-slot=radio-group-item][data-checked]]:border-primary has-[[data-slot=radio-group-item][data-checked]]:bg-primary has-[[data-slot=radio-group-item][data-checked]]:text-primary-foreground",
                      index > 0 && "-ml-px"
                    )}
                    key={option.value}
                  >
                    <RadioGroupItem className="sr-only" value={option.value} />
                    {option.label}
                  </label>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export function OperationProfileCheckboxField({
  defaultChecked,
  description,
  name,
  title,
}: {
  defaultChecked: boolean
  description: string
  name: keyof OperationProfileWizardValues
  title: string
}) {
  return (
    <FormField
      name={name}
      render={({ field }) => {
        const checked =
          typeof field.value === "string"
            ? field.value === "true"
            : defaultChecked

        return (
          <FormItem className="flex gap-3 border border-border/70 bg-muted/20 p-3 text-sm">
            <FormControl>
              <Checkbox
                checked={checked}
                className="mt-1"
                onCheckedChange={(nextChecked) =>
                  field.onChange(nextChecked === true ? "true" : "false")
                }
              />
            </FormControl>
            <input
              name={name}
              type="hidden"
              value={checked ? "true" : "false"}
            />
            <span>
              <span className="block font-medium text-foreground">{title}</span>
              <span className="mt-1 block text-muted-foreground">
                {description}
              </span>
            </span>
          </FormItem>
        )
      }}
    />
  )
}
