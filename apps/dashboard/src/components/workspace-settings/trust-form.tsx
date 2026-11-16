"use client"

import { useTransition } from "react"
import type { Control } from "react-hook-form"
import { z } from "zod"
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
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { updateTenantTrustProfileAction } from "@/lib/dashboard-actions"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import { isSecureLink } from "@/lib/settings/legal-readiness"

const optionalLink = z
  .string()
  .optional()
  .refine(
    (value) => !value?.trim() || isSecureLink(value.trim()),
    "Enter a full link that starts with https://"
  )

const trustProfileSchema = z.object({
  backupRetentionNote: z.string().optional(),
  dataProcessingUrl: optionalLink,
  incidentContactEmail: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Enter a working email address."
    ),
  incidentContactName: z.string().optional(),
  legalTermsUrl: optionalLink,
  privacyPolicyUrl: optionalLink,
  recoveryPointObjective: z.string().optional(),
  recoveryTimeObjective: z.string().optional(),
})

type TrustProfileValues = z.infer<typeof trustProfileSchema>

const fieldClass = "h-11 text-base"

function TextField({
  control,
  description,
  label,
  name,
  placeholder,
  type,
}: {
  control: Control<TrustProfileValues>
  description?: string
  label: string
  name: keyof TrustProfileValues
  placeholder?: string
  type?: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              className={fieldClass}
              placeholder={placeholder}
              type={type}
              value={field.value ?? ""}
            />
          </FormControl>
          {description ? (
            <FormDescription>{description}</FormDescription>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function TenantTrustProfileForm({
  defaultValues,
  onSuccess,
}: {
  defaultValues: TrustProfileValues
  onSuccess?: () => Promise<void> | void
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
        showSuccess("Details saved", "Your trust checklist is updated.")
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
        <DashboardQuickFill
          className="h-11 w-full sm:w-auto"
          form={form}
          onFill={({ emailDomain }) =>
            applyDashboardDevFormFill(form, "trust_profile", undefined, {
              emailDomain,
            })
          }
        />

        <h3 className="text-lg font-semibold text-foreground">
          Legal documents
        </h3>
        <TextField
          control={form.control}
          label="Link to your terms for members"
          name="legalTermsUrl"
          placeholder="https://"
          type="url"
        />
        <TextField
          control={form.control}
          label="Link to your privacy notice"
          name="privacyPolicyUrl"
          placeholder="https://"
          type="url"
        />
        <TextField
          control={form.control}
          label="Link to your data agreement"
          name="dataProcessingUrl"
          placeholder="https://"
          type="url"
        />

        <h3 className="border-t border-border pt-5 text-lg font-semibold text-foreground">
          If something goes wrong
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            label="Contact name"
            name="incidentContactName"
          />
          <TextField
            control={form.control}
            label="Contact email"
            name="incidentContactEmail"
            type="email"
          />
        </div>

        <h3 className="border-t border-border pt-5 text-lg font-semibold text-foreground">
          Backups
        </h3>
        <FormField
          control={form.control}
          name="backupRetentionNote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How your records are backed up</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="text-base"
                  placeholder="For example: daily copies kept for 30 days."
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            control={form.control}
            label="Most recent work you could lose"
            name="recoveryPointObjective"
            placeholder="For example: 24 hours"
          />
          <TextField
            control={form.control}
            label="Time to get running again"
            name="recoveryTimeObjective"
            placeholder="For example: 2 days"
          />
        </div>

        <div className="border-t border-border pt-4 sm:flex sm:justify-end">
          <Button
            size="touch"
            className="w-full text-base sm:w-auto"
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
