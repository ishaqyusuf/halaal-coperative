"use client"

import { useTransition } from "react"
import { z } from "zod"
import {
  cooperativeCountryOptions,
  cooperativeSizeRanges,
  isCooperativeCountry,
  parseCooperativeSizeRangeValue,
} from "@halaalvest/domain"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
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
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { updateCooperativeProfileAction } from "@/lib/dashboard-actions"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"

const profileSchema = z.object({
  city: z.string().trim().optional(),
  country: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || isCooperativeCountry(value),
      "Choose a country from the list."
    ),
  currentSize: z
    .string()
    .optional()
    .refine(
      (value) => !value || parseCooperativeSizeRangeValue(value) !== null,
      "Choose a size from the list."
    ),
  memberNumberPrefix: z.string().optional(),
  name: z.string().trim().min(1, "Enter the cooperative's name."),
  officeAddress: z.string().optional(),
  state: z.string().trim().optional(),
  timezone: z.string().min(1, "Choose a time zone."),
})

type ProfileValues = z.infer<typeof profileSchema>

/** Time zones our cooperatives use; a saved one outside the list stays. */
const commonTimeZones = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "America/New_York",
]

const fieldClass = "h-11 text-base"

export function CooperativeProfileForm({
  defaultValues,
  devMode,
  onSuccess,
}: {
  defaultValues: ProfileValues & { startDate?: string }
  devMode: boolean
  onSuccess?: () => Promise<void> | void
}) {
  const form = useZodForm<ProfileValues>(profileSchema, { defaultValues })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const timeZones = commonTimeZones.includes(defaultValues.timezone)
    ? commonTimeZones
    : [defaultValues.timezone, ...commonTimeZones]

  function onSubmit(values: ProfileValues) {
    startTransition(async () => {
      try {
        await updateCooperativeProfileAction(objectToFormData(values))
        showSuccess("Details saved", "Your cooperative's details are updated.")
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
    <Form {...form}>
      <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
        {devMode ? (
          <div className="flex justify-end">
            <DashboardQuickFill
              className="h-11 w-full sm:w-auto"
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(
                  form,
                  "cooperative_profile",
                  undefined,
                  { emailDomain }
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} className={fieldClass} />
              </FormControl>
              <FormDescription>
                Members see this on statements and emails.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="currentSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of members</FormLabel>
                <FormControl>
                  <NativeSelect
                    {...field}
                    className="w-full [&_select]:text-base"
                    size="default"
                    value={field.value ?? ""}
                  >
                    <option value="">Choose</option>
                    {cooperativeSizeRanges.map((range) => (
                      <option key={range.value} value={String(range.value)}>
                        {range.label}
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
            name="memberNumberPrefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member numbers start with</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className={fieldClass}
                    placeholder="MEM-"
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
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time zone</FormLabel>
              <FormControl>
                <NativeSelect {...field} className="w-full [&_select]:text-base" size="default">
                  {timeZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone.replace(/_/g, " ")}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="border-t border-border pt-5 text-lg font-semibold text-foreground">
          Office
        </h3>
        <FormField
          control={form.control}
          name="officeAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="text-base"
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Town or city</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className={fieldClass}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className={fieldClass}
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
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <NativeSelect
                  {...field}
                  className="w-full [&_select]:text-base"
                  size="default"
                  value={field.value ?? ""}
                >
                  {cooperativeCountryOptions.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-base text-muted-foreground">
          The date your records start is changed in Finance setup.
        </p>

        <div className="border-t border-border pt-4 sm:flex sm:justify-end">
          <Button
            className="h-11 w-full text-base sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving…" : "Save details"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
