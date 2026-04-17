"use client"

import { useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@halaal-vest/ui/components/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaal-vest/ui/components/form"
import { Input } from "@halaal-vest/ui/components/input"
import { Textarea } from "@halaal-vest/ui/components/textarea"
import { useZodForm } from "@halaal-vest/ui/hooks/use-zod-form"
import { useNotifications } from "@halaal-vest/notifications-react"
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
  vercelDomainProvisioning?: {
    errorMessage: string | null
    status: "failed" | "pending_verification" | "skipped" | "verified"
  }
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

      const payload = (await response.json()) as
        | OnboardingResult
        | { error?: string }

      if (!response.ok || !("tenantId" in payload)) {
        throw new Error(
          ("error" in payload && payload.error) ||
            "We could not provision the workspace."
        )
      }

      setResult(payload)
      showSuccess(
        "Workspace created",
        `${payload.tenantName} is ready to open.`
      )
    } catch (error) {
      showError(
        "Onboarding could not finish",
        error instanceof Error ? error.message : "Something went wrong."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium tracking-[0.24em] text-emerald-900/70 uppercase">
            Workspace Ready
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            {result.tenantName} has been provisioned.
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Your tenant host is ready. Members and staff will use the same site
            for the public homepage, login, and the authenticated workspace
            under <code>/app</code>.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-950">
              Authenticated app
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {result.dashboardUrl}
            </p>
          </div>
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-stone-950">Tenant host</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {result.primarySiteHostname}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-950">
            {result.workspaceReadyEmail.subject}
          </p>
          <pre className="mt-4 text-sm leading-6 whitespace-pre-wrap text-emerald-950">
            {result.workspaceReadyEmail.bodyText}
          </pre>
        </div>

        {result.workspaceReadyDeliveryError ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Workspace email needs attention
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              The tenant workspace was created, but the follow-up email could
              not be delivered: {result.workspaceReadyDeliveryError}
            </p>
          </div>
        ) : null}

        {result.vercelDomainProvisioning &&
        result.vercelDomainProvisioning.status !== "verified" &&
        result.vercelDomainProvisioning.status !== "skipped" ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Tenant domain still needs attention
            </p>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {result.vercelDomainProvisioning.errorMessage ??
                "Vercel accepted the tenant hostname, but verification is still pending."}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link
            className={buttonVariants({ size: "lg" })}
            href={result.dashboardUrl}
          >
            Open dashboard
          </Link>
          <Link
            className={buttonVariants({ size: "lg", variant: "outline" })}
            href={result.siteUrl}
          >
            View public site
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.24em] text-emerald-900/70 uppercase">
              Onboarding
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Share a few details about the cooperative.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              The primary contact email is already verified from signup. We only
              need a short cooperative profile now, and financial rules can be
              configured later in the dashboard.
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
            <FormField
              control={form.control}
              name="cooperativeName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Cooperative name</FormLabel>
                  <FormControl>
                    <Input id="cooperativeName" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryContactFullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary contact full name</FormLabel>
                  <FormControl>
                    <Input id="primaryContactFullName" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryContactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verified primary contact email</FormLabel>
                  <FormControl>
                    <Input id="primaryContactEmail" readOnly {...field} />
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
                  <FormLabel>Current cooperative size</FormLabel>
                  <FormControl>
                    <Input
                      id="currentSize"
                      inputMode="numeric"
                      placeholder="125"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cooperative start date</FormLabel>
                  <FormControl>
                    <Input id="startDate" type="date" {...field} />
                  </FormControl>
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
                    <Textarea
                      id="officeAddress"
                      placeholder="12 Emir Road, Kaduna North, Kaduna State"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button size="lg" disabled={submitting} type="submit">
            {submitting ? "Provisioning workspace..." : "Create workspace"}
          </Button>
        </form>
      </div>
    </Form>
  )
}
