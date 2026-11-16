"use client"

import { useTransition } from "react"
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
import { SheetHeader, SheetTitle } from "@halaalvest/ui/components/sheet"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { useRouter } from "next/navigation"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useDomainParams } from "@/hooks/use-domain-params"
import { createTenantDomainAction } from "@/lib/dashboard-actions"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

const hostnamePattern =
  /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

const domainSchema = z.object({
  hostname: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) =>
      value.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    )
    .refine((value) => hostnamePattern.test(value), {
      message: "Enter an address like coop.example.org",
    }),
})

type DomainValues = z.input<typeof domainSchema>

function AddDomainForm({
  devMode,
  onDone,
}: {
  devMode: boolean
  onDone: () => void
}) {
  const router = useRouter()
  const form = useZodForm<DomainValues>(domainSchema, {
    defaultValues: { hostname: "" },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: DomainValues) {
    const hostname = domainSchema.parse(values).hostname

    startTransition(async () => {
      try {
        await createTenantDomainAction(objectToFormData({ hostname }))
        showSuccess("Address added", `Now point ${hostname} to Halaalvest.`)
        form.reset()
        onDone()
        router.refresh()
      } catch (error) {
        showError(
          "Could not add",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-5 px-4 pb-1 sm:px-6"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {devMode ? (
          <DashboardQuickFill
            className="h-11 w-full sm:w-auto"
            form={form}
            onFill={({ emailDomain }) =>
              applyDashboardDevFormFill(form, "custom_domain", undefined, {
                emailDomain,
              })
            }
          />
        ) : null}
        <FormField
          control={form.control}
          name="hostname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoCapitalize="none"
                  autoComplete="off"
                  className="h-11 text-base"
                  placeholder="coop.example.org"
                />
              </FormControl>
              <FormDescription>
                An address you already own. After adding it, you point it to
                Halaalvest at your domain provider. When it shows Ready, contact
                support so we can finish connecting it.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="border-t border-border pt-4 sm:flex sm:justify-end">
          <Button
            size="touch"
            className="w-full text-base sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Adding…" : "Add address"}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export function AddDomainDialog({ devMode }: { devMode: boolean }) {
  const { domainDialog, setParams } = useDomainParams()
  const isOpen = domainDialog === "add"

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("domain", "add")}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) void setParams(null)
      }}
    >
      {isOpen ? (
        <>
          <SheetHeader>
            <SheetTitle>Add your own address</SheetTitle>
          </SheetHeader>
          <AddDomainForm devMode={devMode} onDone={() => setParams(null)} />
        </>
      ) : null}
    </WorkflowPresentation>
  )
}
