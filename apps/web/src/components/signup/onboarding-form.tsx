"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@halaalvest/ui/components/card"
import { FieldGroup } from "@halaalvest/ui/components/field"
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
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@halaalvest/ui/components/progress"
import { Separator } from "@halaalvest/ui/components/separator"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { useNotifications } from "@halaalvest/notifications-react"
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
    const domainNeedsAttention =
      result.vercelDomainProvisioning &&
      result.vercelDomainProvisioning.status !== "verified" &&
      result.vercelDomainProvisioning.status !== "skipped"

    return (
      <Card>
        <CardHeader>
          <CardAction>
            <Badge>Workspace ready</Badge>
          </CardAction>
          <CardTitle className="text-2xl">
            {result.tenantName} is ready for guided setup.
          </CardTitle>
          <CardDescription>
            The tenant workspace is provisioned. Open it now to finish charges,
            shares, member import, migration, loans, and monthly commitments.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={100}>
            <ProgressLabel>Signup progress</ProgressLabel>
            <ProgressValue>{() => "Complete"}</ProgressValue>
          </Progress>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Workspace</p>
              <p className="mt-1 truncate text-sm font-medium">
                {result.tenantName}
              </p>
            </div>
            <div className="border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Tenant host</p>
              <p className="mt-1 truncate text-sm font-medium">
                {result.primarySiteHostname}
              </p>
            </div>
            <div className="border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Next action</p>
              <p className="mt-1 text-sm font-medium">Open guided setup</p>
            </div>
          </div>

          <Alert>
            <AlertTitle>Start in the dashboard</AlertTitle>
            <AlertDescription>
              Empty workspaces open the first-run checklist automatically, so
              the admin lands in setup before day-to-day operations.
            </AlertDescription>
          </Alert>

          {result.workspaceReadyDeliveryError ? (
            <Alert>
              <AlertTitle>Workspace email needs attention</AlertTitle>
              <AlertDescription>
                The workspace was created, but the follow-up email could not be
                delivered: {result.workspaceReadyDeliveryError}
              </AlertDescription>
            </Alert>
          ) : null}

          {domainNeedsAttention ? (
            <Alert>
              <AlertTitle>Tenant domain still needs attention</AlertTitle>
              <AlertDescription>
                {result.vercelDomainProvisioning?.errorMessage ??
                  "Vercel accepted the tenant hostname, but verification is still pending."}
              </AlertDescription>
            </Alert>
          ) : null}

          <details className="border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Review workspace notification
            </summary>
            <div className="mt-4 flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">
                {result.workspaceReadyEmail.subject}
              </p>
              <pre className="whitespace-pre-wrap text-xs leading-6 text-foreground">
                {result.workspaceReadyEmail.bodyText}
              </pre>
            </div>
          </details>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Link
            className={buttonVariants({ size: "lg" })}
            href={result.dashboardUrl}
          >
            Open guided setup
          </Link>
          <Link
            className={buttonVariants({ size: "lg", variant: "outline" })}
            href={result.siteUrl}
          >
            View public site
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <Card>
        <CardHeader>
          {devMode ? (
            <CardAction>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  applyDevFormFill(form, "onboarding", {
                    cooperativeName: verification.cooperativeName,
                    primaryContactEmail: verification.primaryContactEmail,
                    primaryContactFullName:
                      verification.primaryContactFullName,
                    primaryContactMemberNumber:
                      verification.primaryContactMemberNumber,
                    token: form.getValues("token"),
                  })
                }
              >
                Autofill dev data
              </Button>
            </CardAction>
          ) : null}
          <CardTitle className="text-2xl">
            Finish the verified workspace profile.
          </CardTitle>
          <CardDescription>
            The admin email is verified. Add the operating profile and first
            password before opening the tenant setup checklist.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={75}>
            <ProgressLabel>Signup progress</ProgressLabel>
            <ProgressValue>{() => "Step 2 of 2"}</ProgressValue>
          </Progress>

          <Alert>
            <AlertTitle>Verified contact</AlertTitle>
            <AlertDescription>
              {verification.primaryContactEmail} will become the first tenant
              admin for this cooperative workspace.
            </AlertDescription>
          </Alert>

          <form
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <input type="hidden" {...form.register("token")} />

            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="cooperativeName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
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
                name="primaryContactFullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Verified admin email</FormLabel>
                    <FormControl>
                      <Input readOnly {...field} />
                    </FormControl>
                    <FormDescription>
                      This value is locked from the verification link.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primaryContactMemberNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin member number</FormLabel>
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
                    <FormLabel>Current cooperative size</FormLabel>
                    <FormControl>
                      <Input
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
                      <Input type="date" {...field} />
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
                        placeholder="12 Emir Road, Kaduna North, Kaduna State"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldGroup>

            <Separator />

            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="At least 8 characters"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm admin password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repeat your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldGroup>

            <Separator />

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" disabled={submitting} type="submit">
                {submitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Creating workspace
                  </>
                ) : (
                  "Create workspace"
                )}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                The dashboard will open the first-run setup checklist next.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </Form>
  )
}
