"use client"

import { useEffect, useRef, useState } from "react"
import type { LegalAcknowledgement } from "@halaalvest/db"
import { PlatformLegalAcceptance } from "./platform-legal-acceptance"
import Link from "next/link"
import type { QaNotificationPreview } from "@halaalvest/notifications"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
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
import {
  QaNotificationPreviewCard,
  useNotifications,
} from "@halaalvest/notifications-react"
import type { QaQuickFillContext } from "@halaalvest/utils"
import { previewCooperativeAccessCode } from "@halaalvest/utils"
import {
  cooperativeCountryOptions,
  cooperativeSizeRanges,
  formatCooperativeSizeRangeLabel,
} from "@halaalvest/domain"
import { ArrowLeftIcon, ChevronDownIcon, ExternalLinkIcon } from "lucide-react"
import { DatePickerInput } from "@/components/date-picker-input"
import { applyDevFormFill } from "@/lib/dev-form-fill"
import {
  createCompletedOnboardingPath,
  getOnboardingDefaultsFromVerification,
  onboardingFormSchema,
  type OnboardingFormInput,
  type SignupVerificationPayload,
} from "@/lib/signup-flow"
import { JourneyStep } from "./journey-step"
import { useSignupJourneyStage } from "./signup-journey-state"
import {
  getMarketingErrorMessage,
  type MarketingErrorEnvelope,
} from "@/lib/error-response"

type OnboardingResult = {
  dashboardUrl: string
  devDashboardUrlVariants?: {
    description: string
    label: string
    url: string
  }[]
  primaryDashboardHostname: string
  primarySiteHostname: string
  qaPreviews?: QaNotificationPreview[]
  // One-time sign-in handoff to the tenant dashboard. Present only for the
  // canonical tenant host; the token is posted, never put in a URL.
  sessionHandoff?: {
    action: string
    expiresAt: string
    token: string
  }
  siteUrl: string
  tenantId: string
  tenantName: string
  vercelDomainProvisioning?: {
    publicMessage: string | null
    status: "failed" | "pending_verification" | "skipped" | "verified"
  }
  workspaceReadyDeliveryError: string | null
  workspaceReadyEmail?: {
    bodyText: string
    subject: string
  }
}

export function OnboardingForm({
  quickFill,
  token,
  verification,
}: {
  quickFill: QaQuickFillContext
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
  const { publishQaPreviews, showError, showSuccess } = useNotifications()
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [subStep, setSubStep] = useState<"cooperative-details" | "password">(
    "cooperative-details"
  )
  const [handoffFailed, setHandoffFailed] = useState(false)
  const handoffFormRef = useRef<HTMLFormElement>(null)
  useSignupJourneyStage(result ? "setup-mode" : subStep, {
    onSelect: (stepKey) => {
      if (stepKey === "cooperative-details") setSubStep(stepKey)
    },
    selectable:
      !result && subStep === "password" ? ["cooperative-details"] : [],
    workspaceCreated: Boolean(result),
  })
  const [submitting, setSubmitting] = useState(false)
  const [legalState, setLegalState] = useState<{
    ready: boolean
    acknowledgement?: LegalAcknowledgement
  }>({ ready: false })
  const accessCode =
    previewCooperativeAccessCode(
      verification.cooperativeCodePrefix,
      verification.primaryContactMemberNumber
    ).code ?? verification.primaryContactEmail
  const cooperativeShortName =
    verification.cooperativeName.split(/\s+/)[0] ?? verification.cooperativeName

  useEffect(() => {
    if (!result) {
      return
    }

    window.history.replaceState(
      window.history.state,
      "",
      createCompletedOnboardingPath(window.location.href)
    )

    const refreshRestoredPage = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
      }
    }

    window.addEventListener("pageshow", refreshRestoredPage)

    return () => {
      window.removeEventListener("pageshow", refreshRestoredPage)
    }
  }, [result])

  // Top-level POST navigation to the tenant dashboard's /auth/handoff. If the
  // submit cannot start, fall back to the "Your workspace is ready" state.
  useEffect(() => {
    if (!result?.sessionHandoff || handoffFailed) return

    try {
      handoffFormRef.current?.submit()
    } catch {
      setHandoffFailed(true)
    }
  }, [handoffFailed, result])

  async function continueToPassword() {
    const valid = await form.trigger([
      "currentSize",
      "startDate",
      "officeAddress",
      "city",
      "state",
      "country",
    ])

    if (valid) {
      setSubStep("password")
      window.scrollTo({ top: 0 })
    }
  }

  async function onSubmit(values: OnboardingFormInput) {
    if (!legalState.ready) return
    try {
      setSubmitting(true)

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          legalAcknowledgement: legalState.acknowledgement,
        }),
      })

      const payload = (await response.json()) as
        | OnboardingResult
        | MarketingErrorEnvelope

      if (!response.ok || !("tenantId" in payload)) {
        throw new Error(
          getMarketingErrorMessage(
            payload,
            "We could not provision the workspace."
          )
        )
      }

      setResult(payload)
      publishQaPreviews(payload.qaPreviews)
      showSuccess("Workspace created", `Opening ${payload.tenantName}.`)
    } catch (error) {
      showError(
        "Onboarding could not finish",
        error instanceof Error ? error.message : "Something went wrong."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (result?.sessionHandoff && !handoffFailed) {
    return (
      <JourneyStep
        eyebrow="Workspace created"
        lede="Signing you in and continuing to setup. Nothing to re-enter."
        stepKey="setup-mode"
        title="Opening your workspace…"
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner />
          <span>Taking you to {result.primarySiteHostname}</span>
        </div>
        <form
          action={result.sessionHandoff.action}
          className="hidden"
          method="post"
          ref={handoffFormRef}
        >
          <input
            name="token"
            type="hidden"
            value={result.sessionHandoff.token}
          />
        </form>
      </JourneyStep>
    )
  }

  if (result) {
    const domainNeedsAttention =
      result.vercelDomainProvisioning &&
      result.vercelDomainProvisioning.status !== "verified" &&
      result.vercelDomainProvisioning.status !== "skipped"
    const devDashboardUrlVariants = result.devDashboardUrlVariants ?? []
    const qaPreview = result.qaPreviews?.at(-1)

    return (
      <JourneyStep
        eyebrow="Workspace created"
        lede={`${result.tenantName} is set up at ${result.primarySiteHostname}. Sign in to continue with step 5, Where records start.`}
        primary={
          <div className="flex flex-wrap gap-2">
            <Link
              className={buttonVariants({ size: "lg" })}
              href={result.dashboardUrl}
            >
              Open your workspace
            </Link>
            {quickFill.enabled && devDashboardUrlVariants.length ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button size="lg" type="button" variant="outline" />}
                >
                  URL variants
                  <ChevronDownIcon data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
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
            ) : null}
          </div>
        }
        stepKey="setup-mode"
        title="Your workspace is ready"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Sign in with <b className="text-foreground">{accessCode}</b> or your
            email and the password you just created.
          </p>

          {result.workspaceReadyDeliveryError ? (
            <Alert>
              <AlertTitle>The welcome email did not send</AlertTitle>
              <AlertDescription>
                Your workspace is fine. You can open it from here.
              </AlertDescription>
            </Alert>
          ) : null}

          {qaPreview ? <QaNotificationPreviewCard preview={qaPreview} /> : null}

          {domainNeedsAttention ? (
            <Alert>
              <AlertTitle>Cooperative domain still needs attention</AlertTitle>
              <AlertDescription>
                {result.vercelDomainProvisioning?.publicMessage ??
                  "Vercel accepted the cooperative hostname, but verification is still pending."}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </JourneyStep>
    )
  }

  const onPasswordStep = subStep === "password"

  return (
    <Form {...form}>
      <JourneyStep
        action={
          quickFill.enabled ? (
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() =>
                void applyDevFormFill(
                  form,
                  "onboarding",
                  {
                    cooperativeName: verification.cooperativeName,
                    cooperativeCodePrefix: verification.cooperativeCodePrefix,
                    primaryContactEmail: verification.primaryContactEmail,
                    primaryContactFullName: verification.primaryContactFullName,
                    primaryContactMemberNumber:
                      verification.primaryContactMemberNumber,
                    token: form.getValues("token"),
                  },
                  {
                    emailDomain: quickFill.emailDomain,
                  }
                )
              }
            >
              Quick fill
            </Button>
          ) : null
        }
        aside={
          onPasswordStep ? (
            <p>
              We create{" "}
              <b className="font-semibold text-[#0B1F36]">
                {verification.workspaceSlug}
              </b>
              , sign you in, and continue straight to setup. Nothing to
              re-enter.
            </p>
          ) : (
            <p>
              The start date is the first month your records can go back to. The
              address appears on member statements.
            </p>
          )
        }
        asideTitle={onPasswordStep ? "What happens next" : "Why we ask"}
        back={
          onPasswordStep ? (
            <Button
              onClick={() => setSubStep("cooperative-details")}
              size="lg"
              type="button"
              variant="ghost"
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Back
            </Button>
          ) : null
        }
        eyebrow={
          onPasswordStep ? "Last step before your workspace" : "Email verified"
        }
        lede={
          onPasswordStep ? (
            <>
              You&apos;ll use it with{" "}
              <b className="font-semibold text-foreground">{accessCode}</b> or
              your email to sign in.
            </>
          ) : (
            "Basic details for your profile and statements. You can edit them later in Settings."
          )
        }
        primary={
          onPasswordStep ? (
            <Button
              disabled={submitting || !legalState.ready}
              form="one-path-onboarding-form"
              size="lg"
              type="submit"
            >
              {submitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Creating workspace
                </>
              ) : (
                "Create workspace"
              )}
            </Button>
          ) : (
            <Button
              onClick={() => void continueToPassword()}
              size="lg"
              type="button"
            >
              Continue
            </Button>
          )
        }
        stepKey={subStep}
        title={
          onPasswordStep
            ? "Create your password"
            : `Tell us about ${cooperativeShortName}`
        }
      >
        <form
          className="flex flex-col gap-5"
          id="one-path-onboarding-form"
          onSubmit={(event) => {
            if (!onPasswordStep) {
              event.preventDefault()
              void continueToPassword()
              return
            }
            void form.handleSubmit(onSubmit, (errors) => {
              const detailFields = [
                "currentSize",
                "startDate",
                "officeAddress",
                "city",
                "state",
                "country",
              ]
              if (
                Object.keys(errors).some((key) => detailFields.includes(key))
              ) {
                setSubStep("cooperative-details")
              }
            })(event)
          }}
        >
          <input type="hidden" {...form.register("token")} />
          <input
            type="hidden"
            value={verification.cooperativeName}
            {...form.register("cooperativeName")}
          />
          <input
            type="hidden"
            value={verification.cooperativeCodePrefix}
            {...form.register("cooperativeCodePrefix")}
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

          <FieldGroup
            className="grid gap-4 md:grid-cols-2"
            hidden={onPasswordStep}
          >
            <FormField
              control={form.control}
              name="currentSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many members do you have?</FormLabel>
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a range">
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
                  <FormLabel>When did the cooperative start?</FormLabel>
                  <FormControl>
                    <DatePickerInput
                      allowClear={false}
                      placeholder="Select start date"
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Your first month of records. Shares and savings are counted
                    from here.
                  </FormDescription>
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
                      autoComplete="street-address"
                      placeholder="Enter office address"
                      {...field}
                    />
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

          <div className="flex flex-col gap-5" hidden={!onPasswordStep}>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="new-password"
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
                    <FormLabel>Type it again</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="new-password"
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

            <PlatformLegalAcceptance onChange={setLegalState} />
          </div>
        </form>
      </JourneyStep>
    </Form>
  )
}
