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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { FieldGroup } from "@halaalvest/ui/components/field"
import {
  Form,
  FormControl,
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@halaalvest/ui/components/select"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  cooperativeCountryOptions,
  cooperativeSizeRanges,
  formatCooperativeSizeRangeLabel,
} from "@halaalvest/domain"
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react"
import { DatePickerInput } from "@/components/date-picker-input"
import { applyDevFormFill } from "@/lib/dev-form-fill"
import {
  getOnboardingDefaultsFromVerification,
  onboardingFormSchema,
  type OnboardingFormInput,
  type SignupVerificationPayload,
} from "@/lib/signup-flow"

type OnboardingResult = {
  dashboardUrl: string
  devDashboardUrlVariants?: {
    description: string
    label: string
    url: string
  }[]
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
    const devDashboardUrlVariants = result.devDashboardUrlVariants ?? []

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
            The cooperative workspace is provisioned. Open it now to finish
            charges, shares, member import, migration, loans, and monthly
            commitments.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={100}>
            <ProgressLabel>Setup progress</ProgressLabel>
            <ProgressValue>Complete</ProgressValue>
          </Progress>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Workspace</p>
              <p className="mt-1 truncate text-sm font-medium">
                {result.tenantName}
              </p>
            </div>
            <div className="border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Cooperative host</p>
              <p className="mt-1 truncate text-sm font-medium">
                {result.primarySiteHostname}
              </p>
            </div>
            <div className="border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Next action</p>
              <p className="mt-1 text-sm font-medium">Get Started</p>
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
              <AlertTitle>Cooperative domain still needs attention</AlertTitle>
              <AlertDescription>
                {result.vercelDomainProvisioning?.errorMessage ??
                  "Vercel accepted the cooperative hostname, but verification is still pending."}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {devMode && devDashboardUrlVariants.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="lg" type="button" />}>
                Get Started
                <ChevronDownIcon data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[min(26rem,calc(100vw-2rem))] p-1"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-3 py-2">
                    Tenant URL variants
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {devDashboardUrlVariants.map((variant) => (
                    <DropdownMenuItem
                      className="items-start justify-between gap-3 px-3 py-3"
                      key={variant.url}
                      render={<a href={variant.url} />}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">
                          {variant.label}
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {variant.url}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {variant.description}
                        </span>
                      </span>
                      <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              className={buttonVariants({ size: "lg" })}
              href={result.dashboardUrl}
            >
              Get Started
            </Link>
          )}
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
                  void applyDevFormFill(form, "onboarding", {
                    cooperativeName: verification.cooperativeName,
                    primaryContactEmail: verification.primaryContactEmail,
                    primaryContactFullName: verification.primaryContactFullName,
                    memberNumberPrefix: verification.memberNumberPrefix,
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
            <ProgressLabel>Setup progress</ProgressLabel>
            <ProgressValue>Step 2 of 2</ProgressValue>
          </Progress>

          <form
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <input type="hidden" {...form.register("token")} />
            <input
              type="hidden"
              value={verification.cooperativeName}
              {...form.register("cooperativeName")}
            />
            <input
              type="hidden"
              value={verification.memberNumberPrefix}
              {...form.register("memberNumberPrefix")}
            />
            <input
              type="hidden"
              value={verification.primaryContactEmail}
              {...form.register("primaryContactEmail")}
            />
            <input
              type="hidden"
              value={verification.primaryContactFullName}
              {...form.register("primaryContactFullName")}
            />
            <input
              type="hidden"
              value={verification.primaryContactMemberNumber}
              {...form.register("primaryContactMemberNumber")}
            />

            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="currentSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current cooperative size</FormLabel>
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
                            <SelectItem
                              key={range.value}
                              value={String(range.value)}
                            >
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooperative start date</FormLabel>
                    <FormControl>
                      <DatePickerInput
                        allowClear={false}
                        placeholder="Select start date"
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                      />
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
                      <Textarea placeholder="Enter office address" {...field} />
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
                      <Input placeholder="Enter city" {...field} />
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
                      <Input placeholder="Enter state" {...field} />
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
