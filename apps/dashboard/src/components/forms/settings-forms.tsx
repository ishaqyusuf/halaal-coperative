"use client"

import { useTransition } from "react"
import { z } from "zod"
import {
  cooperativeCountryOptions,
  cooperativeSizeRanges,
  formatCooperativeSizeRangeLabel,
  isCooperativeCountry,
  parseCooperativeSizeRangeValue,
} from "@halaalvest/domain"
import { useNotifications } from "@halaalvest/notifications-react"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@halaalvest/ui/components/select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { useQaQuickFill } from "@/components/qa-quick-fill-provider"
import { objectToFormData } from "@/lib/form-submit"
import {
  provisionTenantUserRoleAction,
  updateCooperativeProfileAction,
  updateTenantTrustProfileAction,
} from "@/lib/dashboard-actions"

const profileSchema = z.object({
  city: z.string().trim().optional(),
  country: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || isCooperativeCountry(value),
      "Select a valid cooperative country."
    ),
  currentSize: z
    .string()
    .optional()
    .refine(
      (value) => !value || parseCooperativeSizeRangeValue(value) !== null,
      "Select a valid cooperative size."
    ),
  memberNumberPrefix: z.string().optional(),
  name: z.string().min(1, "Cooperative name is required."),
  officeAddress: z.string().optional(),
  state: z.string().trim().optional(),
  timezone: z.string().min(1, "Timezone is required."),
})

type ProfileValues = z.infer<typeof profileSchema>

export function CooperativeProfileForm({
  defaultValues,
  devMode,
}: {
  defaultValues: ProfileValues & { startDate?: string }
  devMode: boolean
}) {
  const form = useZodForm<ProfileValues>(profileSchema, { defaultValues })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ProfileValues) {
    startTransition(async () => {
      try {
        await updateCooperativeProfileAction(objectToFormData(values))
        showSuccess("Profile saved", "Cooperative profile updated.")
      } catch (error) {
        showError(
          "Could not save profile",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Update cooperative profile
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Standardized on the shared dashboard form system.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "cooperative_profile")
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cooperative name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currentSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current size</FormLabel>
              <Select
                value={field.value ? String(field.value) : ""}
                onValueChange={(value) => field.onChange(value ?? "")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select cooperative size">
                      {field.value
                        ? formatCooperativeSizeRangeLabel(field.value, "")
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    {cooperativeSizeRanges.map((range) => (
                      <SelectItem key={range.value} value={String(range.value)}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="memberNumberPrefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member prefix</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="MEM-"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
          <p className="text-sm font-medium text-foreground">
            Finance start date
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {defaultValues.startDate || "Not set yet"}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Managed from Finance setup because it controls historical charge,
            share, and member backfill calculations.
          </p>
        </div>
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Lagos Island"
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
                  value={field.value ?? ""}
                  placeholder="Lagos"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(value) => field.onChange(value ?? "")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    {cooperativeCountryOptions.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="officeAddress"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Office address</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button disabled={isPending} type="submit">
            Save cooperative profile
          </Button>
        </div>
      </form>
    </Form>
  )
}

function isOptionalUrl(value: string | undefined) {
  if (!value?.trim()) {
    return true
  }

  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

const trustProfileSchema = z.object({
  backupRetentionNote: z.string().optional(),
  dataProcessingUrl: z
    .string()
    .optional()
    .refine(isOptionalUrl, "Enter a valid http or https URL."),
  incidentContactEmail: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Enter a valid email address."
    ),
  incidentContactName: z.string().optional(),
  legalTermsUrl: z
    .string()
    .optional()
    .refine(isOptionalUrl, "Enter a valid http or https URL."),
  privacyPolicyUrl: z
    .string()
    .optional()
    .refine(isOptionalUrl, "Enter a valid http or https URL."),
  recoveryPointObjective: z.string().optional(),
  recoveryTimeObjective: z.string().optional(),
})

type TrustProfileValues = z.infer<typeof trustProfileSchema>

export function TenantTrustProfileForm({
  defaultValues,
}: {
  defaultValues: TrustProfileValues
}) {
  const form = useZodForm<TrustProfileValues>(trustProfileSchema, {
    defaultValues,
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: TrustProfileValues) {
    startTransition(async () => {
      try {
        await updateTenantTrustProfileAction(objectToFormData(values))
        showSuccess("Trust profile saved", "Pilot readiness evidence updated.")
      } catch (error) {
        showError(
          "Could not save trust profile",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="legalTermsUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Terms URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/terms" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="privacyPolicyUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Privacy URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/privacy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dataProcessingUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data-processing URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/dpa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="incidentContactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Incident email</FormLabel>
              <FormControl>
                <Input placeholder="support@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="incidentContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Incident contact</FormLabel>
              <FormControl>
                <Input placeholder="Support desk" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="recoveryPointObjective"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recovery point objective</FormLabel>
              <FormControl>
                <Input placeholder="24 hours" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="recoveryTimeObjective"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recovery time objective</FormLabel>
              <FormControl>
                <Input placeholder="2 business days" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <FormField
            control={form.control}
            name="backupRetentionNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Backup retention note</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Daily database backups retained by the hosting provider."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="md:col-span-2">
          <Button disabled={isPending} type="submit">
            Save trust profile
          </Button>
        </div>
      </form>
    </Form>
  )
}

const roleSchema = z.object({
  email: z.string().email("Valid email is required."),
  fullName: z.string().min(1, "Full name is required."),
  makeDefault: z.boolean().default(false),
  role: z.string().min(1, "Role is required."),
})

type RoleValues = z.infer<typeof roleSchema>

export function RoleAssignmentForm({
  devMode,
  roles,
}: {
  devMode: boolean
  roles: Array<{ label: string; value: string }>
}) {
  const quickFill = useQaQuickFill()
  const form = useZodForm<RoleValues>(roleSchema, {
    defaultValues: {
      email: "",
      fullName: "",
      makeDefault: false,
      role: "member",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: RoleValues) {
    startTransition(async () => {
      try {
        await provisionTenantUserRoleAction(objectToFormData(values))
        showSuccess("Role saved", "Workspace role provisioned.")
        form.reset()
      } catch (error) {
        showError(
          "Could not save role",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex items-start justify-between gap-4 md:col-span-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Assign workspace role
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Add a role to an existing tenant user or create the tenant user
              and role together.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(
                  form,
                  "role_assignment",
                  undefined,
                  { emailDomain: quickFill.emailDomain },
                )
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
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
          name="makeDefault"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3 pt-8">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              </FormControl>
              <FormLabel>Make this the default workspace role</FormLabel>
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <Button disabled={isPending} type="submit">
            Save workspace role
          </Button>
        </div>
      </form>
    </Form>
  )
}
