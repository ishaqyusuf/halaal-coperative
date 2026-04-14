"use client"

import { useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@halaal-vest/ui/components/button"
import { Input } from "@halaal-vest/ui/components/input"
import { useNotifications } from "@halaal-vest/notifications-react"
import { useZodForm } from "@/hooks/use-zod-form"
import { applyDevFormFill } from "@/lib/dev-form-fill"
import {
  getOnboardingDefaultsFromVerification,
  onboardingFormSchema,
  type OnboardingFormInput,
  type SignupVerificationPayload,
} from "@/lib/signup-flow"

type OnboardingResult = {
  dashboardUrl: string
  primaryDashboardHostname: string
  primarySiteHostname: string
  siteUrl: string
  tenantId: string
  tenantName: string
  workspaceReadyDeliveryError: string | null
  workspaceReadyEmail: {
    bodyText: string
    subject: string
  }
}

export function OnboardingForm({
  devMode,
  token,
  verification,
}: {
  devMode: boolean
  token: string
  verification: SignupVerificationPayload
}) {
  const defaultValues = {
    ...getOnboardingDefaultsFromVerification(verification),
    token: "",
  }
  const form = useZodForm<OnboardingFormInput>(onboardingFormSchema, {
    defaultValues: {
      ...defaultValues,
      token,
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(values: OnboardingFormInput) {
    try {
      setSubmitting(true)

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const payload = (await response.json()) as OnboardingResult | { error?: string }

      if (!response.ok || !("tenantId" in payload)) {
        throw new Error(("error" in payload && payload.error) || "We could not provision the workspace.")
      }

      setResult(payload)
      showSuccess("Workspace created", `${payload.tenantName} is ready to open.`)
    } catch (error) {
      showError(
        "Onboarding could not finish",
        error instanceof Error ? error.message : "Something went wrong.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-900/70">
            Workspace Ready
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            {result.tenantName} has been provisioned.
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Your dashboard and public site are ready. Financial rules can be configured next
            from inside the workspace.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-950">Dashboard</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{result.primaryDashboardHostname}</p>
          </div>
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-950">Public site</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{result.primarySiteHostname}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-950">
            {result.workspaceReadyEmail.subject}
          </p>
          <pre className="mt-4 whitespace-pre-wrap text-sm leading-6 text-emerald-950">
            {result.workspaceReadyEmail.bodyText}
          </pre>
        </div>

        {result.workspaceReadyDeliveryError ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Workspace email needs attention</p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              The tenant workspace was created, but the follow-up email could not be delivered:
              {" "}
              {result.workspaceReadyDeliveryError}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link className={buttonVariants({ size: "lg" })} href={result.dashboardUrl}>
            Open dashboard
          </Link>
          <Link className={buttonVariants({ size: "lg", variant: "outline" })} href={result.siteUrl}>
            View public site
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-900/70">
            Onboarding
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            Share a few details about the cooperative.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
            The primary contact email is already verified from signup. We only need a short
            cooperative profile now, and financial rules can be configured later in the dashboard.
          </p>
        </div>
        {devMode ? (
          <Button
            variant="outline"
            onClick={() =>
              applyDevFormFill(form, "onboarding", {
                cooperativeName: verification.cooperativeName,
                primaryContactEmail: verification.primaryContactEmail,
                primaryContactFullName: verification.primaryContactFullName,
                token: form.getValues("token"),
              })
            }
          >
            Autofill dev data
          </Button>
        ) : null}
      </div>

      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <input type="hidden" {...form.register("token")} />

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-stone-900" htmlFor="cooperativeName">
              Cooperative name
            </label>
            <Input id="cooperativeName" {...form.register("cooperativeName")} />
            <p className="text-sm text-red-600">{form.formState.errors.cooperativeName?.message}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-900" htmlFor="primaryContactFullName">
              Primary contact full name
            </label>
            <Input id="primaryContactFullName" {...form.register("primaryContactFullName")} />
            <p className="text-sm text-red-600">
              {form.formState.errors.primaryContactFullName?.message}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-900" htmlFor="primaryContactEmail">
              Verified primary contact email
            </label>
            <Input id="primaryContactEmail" readOnly {...form.register("primaryContactEmail")} />
            <p className="text-sm text-red-600">
              {form.formState.errors.primaryContactEmail?.message}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-900" htmlFor="currentSize">
              Current cooperative size
            </label>
            <Input
              id="currentSize"
              inputMode="numeric"
              placeholder="125"
              {...form.register("currentSize")}
            />
            <p className="text-sm text-red-600">{form.formState.errors.currentSize?.message}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-900" htmlFor="startDate">
              Cooperative start date
            </label>
            <Input id="startDate" type="date" {...form.register("startDate")} />
            <p className="text-sm text-red-600">{form.formState.errors.startDate?.message}</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-stone-900" htmlFor="officeAddress">
              Office address
            </label>
            <textarea
              id="officeAddress"
              className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="12 Emir Road, Kaduna North, Kaduna State"
              {...form.register("officeAddress")}
            />
            <p className="text-sm text-red-600">{form.formState.errors.officeAddress?.message}</p>
          </div>
        </div>

        <Button size="lg" disabled={submitting} type="submit">
          {submitting ? "Provisioning workspace..." : "Create workspace"}
        </Button>
      </form>
    </div>
  )
}
