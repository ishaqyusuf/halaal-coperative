"use client"

import { useState, useTransition } from "react"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import {
  TenantLink as Link,
  useTenantRouter,
} from "@halaalvest/tenant-url/next"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@halaalvest/ui/components/form"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { AlertCircleIcon } from "lucide-react"
import { z } from "zod"
import { finalizeInitialMigrationAction } from "@/lib/dashboard-actions"
import {
  getGoLiveConfirmationLabel,
  getGoLiveReadinessRows,
  goLiveSuccessHref,
  isReadyToGoLive,
} from "@/lib/getting-started/go-live-readiness"

const goLiveFormSchema = z.object({
  confirmed: z.boolean(),
})

type GoLiveFormValues = z.infer<typeof goLiveFormSchema>

export function GoLiveChecklist({
  migrationSnapshot,
  tenantHost,
  tenantName,
}: {
  migrationSnapshot: InitialMigrationSnapshot
  tenantName: string
  tenantHost: string | null
}) {
  const router = useTenantRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useZodForm<GoLiveFormValues>(goLiveFormSchema, {
    defaultValues: { confirmed: false },
  })
  const rows = getGoLiveReadinessRows(migrationSnapshot)
  const ready = isReadyToGoLive(migrationSnapshot)
  const confirmed = form.watch("confirmed")
  const canSubmit = ready && confirmed && !isPending

  function onSubmit(values: GoLiveFormValues) {
    if (!ready || !values.confirmed) return

    setServerError(null)
    const formData = new FormData()
    formData.set("confirmed", "on")

    startTransition(async () => {
      try {
        await finalizeInitialMigrationAction(formData)
        router.push(goLiveSuccessHref)
      } catch (error) {
        setServerError(
          error instanceof Error && error.message
            ? error.message
            : "We couldn't go live. Try again."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        aria-busy={isPending}
        className="grid gap-5"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {serverError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>We couldn&apos;t go live</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <ul className="divide-y divide-border/70 border border-border/70">
          {rows.map((row) => (
            <li
              className="flex items-center justify-between gap-3 px-3 py-2.5"
              key={row.key}
            >
              <span className="text-sm font-medium">{row.label}</span>
              <span className="flex items-center gap-3">
                {row.ready ? null : (
                  <Link
                    className="text-sm text-primary underline-offset-4 hover:underline"
                    href={row.fixHref}
                  >
                    Fix
                  </Link>
                )}
                <Badge variant={row.ready ? "default" : "secondary"}>
                  {row.ready ? "Ready" : "Missing"}
                </Badge>
              </span>
            </li>
          ))}
        </ul>

        {tenantHost ? (
          <p className="text-sm text-muted-foreground">
            After you go live, members sign in at {tenantHost} with their
            member code.
          </p>
        ) : null}

        <FormField
          control={form.control}
          name="confirmed"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  disabled={!ready || isPending}
                  name={field.name}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              </FormControl>
              <FormLabel className="leading-5 font-normal">
                {getGoLiveConfirmationLabel(tenantName)}
              </FormLabel>
            </FormItem>
          )}
        />

        <Button className="w-fit" disabled={!canSubmit} type="submit">
          {isPending ? "Going live…" : "Go live"}
        </Button>
      </form>
    </Form>
  )
}
