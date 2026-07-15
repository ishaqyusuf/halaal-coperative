"use client"

import { useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import { createTenantDomainAction } from "@/lib/dashboard-actions"

const domainSchema = z.object({
  hostname: z.string().min(3, "Hostname is required."),
})

export function CustomDomainForm({ devMode }: { devMode: boolean }) {
  const form = useZodForm<z.infer<typeof domainSchema>>(domainSchema, {
    defaultValues: { hostname: "" },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: z.infer<typeof domainSchema>) {
    startTransition(async () => {
      try {
        await createTenantDomainAction(objectToFormData(values))
        showSuccess("Domain added", "Custom domain saved.")
        form.reset()
      } catch (error) {
        showError("Could not add domain", error instanceof Error ? error.message : "Something went wrong.")
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="hostname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom hostname</FormLabel>
              <FormControl>
                <Input {...field} placeholder="coop.example.org" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {devMode ? (
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={() => applyDashboardDevFormFill(form, "custom_domain")}>
              Quick fill
            </Button>
          </div>
        ) : null}
        <div className="flex items-end">
          <Button disabled={isPending} type="submit">Add custom domain</Button>
        </div>
      </form>
    </Form>
  )
}
