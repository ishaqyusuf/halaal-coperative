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
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@halaalvest/ui/components/form"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import { AlertCircleIcon, CircleAlertIcon, CircleCheckIcon } from "lucide-react"
import { z } from "zod"
import { finalizeInitialMigrationAction } from "@/lib/dashboard-actions"
import {
  getGoLiveConfirmationLabel,
  getGoLiveFinancingSummary,
  getGoLiveReadinessRows,
  goLiveSuccessHref,
  isReadyToGoLive,
  type GoLiveChecklistData,
  type GoLiveFinancingProductLine,
} from "@/lib/getting-started/go-live-readiness"

const goLiveFormSchema = z.object({
  confirmed: z.boolean(),
  openFinancingCycle: z.boolean(),
})

const productStatusLabels: Record<
  GoLiveFinancingProductLine["status"],
  string
> = {
  created_at_go_live: "Created when you go live",
  name_taken: "Set up in Finance settings",
  ready: "Ready",
  turned_off: "Turned off",
}

type GoLiveFormValues = z.infer<typeof goLiveFormSchema>

export function GoLiveChecklist({
  checklist = null,
  migrationSnapshot,
  tenantHost,
  tenantName,
}: {
  /** Owner KYC and financing; loaded by the Go live step. */
  checklist?: GoLiveChecklistData | null
  migrationSnapshot: InitialMigrationSnapshot
  tenantName: string
  tenantHost: string | null
}) {
  const financing = checklist
    ? getGoLiveFinancingSummary(checklist.financing)
    : null
  const router = useTenantRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useZodForm<GoLiveFormValues>(goLiveFormSchema, {
    defaultValues: {
      confirmed: false,
      openFinancingCycle: financing?.canOpenCycle ?? false,
    },
  })
  const rows = getGoLiveReadinessRows(migrationSnapshot, checklist)
  const ready = isReadyToGoLive(migrationSnapshot, checklist)
  const confirmed = form.watch("confirmed")
  const canSubmit = ready && confirmed && !isPending

  function onSubmit(values: GoLiveFormValues) {
    if (!ready || !values.confirmed) return

    setServerError(null)
    const formData = new FormData()
    formData.set("confirmed", "on")
    if (financing?.canOpenCycle && values.openFinancingCycle) {
      formData.set("openFinancingCycle", "on")
    }

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

        <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
          {rows.map((row) => (
            <li
              className="flex min-h-14 items-center justify-between gap-3 px-4 py-2"
              key={row.key}
            >
              <span className="flex min-w-0 items-center gap-3">
                {row.ready ? (
                  <CircleCheckIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-primary"
                  />
                ) : (
                  <CircleAlertIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-amber-700 dark:text-amber-400"
                  />
                )}
                <span className="text-base font-medium">{row.label}</span>
                <span className="sr-only">
                  {row.ready ? "Ready" : "Missing"}
                </span>
              </span>
              {row.ready ? (
                <span
                  aria-hidden="true"
                  className="text-sm text-muted-foreground"
                >
                  Ready
                </span>
              ) : (
                <Link
                  aria-label={`Fix ${row.label}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "h-11 shrink-0"
                  )}
                  href={row.fixHref}
                >
                  Fix
                </Link>
              )}
            </li>
          ))}
        </ul>

        {financing ? (
          <section
            aria-labelledby="go-live-financing"
            className="grid gap-3 rounded-xl border border-border/70 p-4"
          >
            <h3 className="text-base font-semibold" id="go-live-financing">
              Financing
            </h3>
            <ul className="grid gap-2">
              {financing.products.map((product) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 text-base"
                  key={product.loanType}
                >
                  <span>
                    <span className="font-medium">{product.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {product.detail}
                    </span>
                  </span>
                  <Badge
                    variant={
                      product.status === "turned_off" ||
                      product.status === "name_taken"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {productStatusLabels[product.status]}
                  </Badge>
                </li>
              ))}
            </ul>
            {financing.canOpenCycle ? (
              <FormField
                control={form.control}
                name="openFinancingCycle"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        disabled={isPending}
                        name={field.name}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    </FormControl>
                    <div className="grid gap-1">
                      <FormLabel className="text-base leading-6 font-normal">
                        {financing.cycleLabel}
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {financing.cycleDetail}
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            ) : (
              <div className="grid gap-1 text-base">
                <p className="font-medium">{financing.cycleLabel}</p>
                <p className="text-muted-foreground">{financing.cycleDetail}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Change these later in{" "}
              <span className="font-medium text-foreground">
                Settings → Finance → Loans
              </span>
              .
            </p>
          </section>
        ) : null}

        {tenantHost ? (
          <p className="text-base text-muted-foreground">
            Members will sign in at{" "}
            <span className="font-medium break-all text-foreground">
              {tenantHost}
            </span>{" "}
            with their member code.
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
              <FormLabel className="text-base leading-6 font-normal">
                {getGoLiveConfirmationLabel(tenantName)}
              </FormLabel>
            </FormItem>
          )}
        />

        {ready ? null : (
          <p className="text-base text-muted-foreground">
            Fix the items above to go live.
          </p>
        )}

        <Button
          className="h-11 w-full sm:w-fit"
          disabled={!canSubmit}
          type="submit"
        >
          {isPending ? "Going live…" : "Go live"}
        </Button>
      </form>
    </Form>
  )
}
