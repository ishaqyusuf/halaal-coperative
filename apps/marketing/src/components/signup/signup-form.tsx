"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { QaNotificationPreview } from "@halaalvest/notifications"
import { useWatch } from "react-hook-form"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@halaalvest/ui/components/input-group"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import {
  QaNotificationPreviewCard,
  useNotifications,
} from "@halaalvest/notifications-react"
import type { QaQuickFillContext } from "@halaalvest/utils"
import { QaQuickFillButton } from "@halaalvest/ui/components/qa-quick-fill-button"
import { previewCooperativeAccessCode } from "@halaalvest/utils"
import { CheckCircle2Icon, CircleAlertIcon, MailIcon } from "lucide-react"
import { applyDevFormFill } from "@/lib/dev-form-fill"
import {
  createWorkspaceSlugSuggestion,
  normalizeWorkspaceSlug,
  signupIntentSchema,
  type SignupIntentInput,
} from "@/lib/signup-flow"
import { JourneyStep } from "./journey-step"
import { useSignupJourneyStage } from "./signup-journey-state"
import {
  getMarketingErrorMessage,
  type MarketingErrorEnvelope,
} from "@/lib/error-response"

type SignupApiSuccess = {
  devMode: boolean
  emailDeliveryConfigured: boolean
  expiresAt: string
  onboardingUrl?: string
  qaPreviews?: QaNotificationPreview[]
  verificationDelivery: {
    attempts: number
    errorMessage?: string | null
    messageId: string
    status: "failed" | "queued" | "sent"
  }
  verificationEmail?: {
    actionLabel: string
    actionUrl: string
    bodyText: string
    previewText: string
    recipient: {
      displayName?: string
      value: string
    }
    subject: string
  }
}

type AvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  | {
      status: "ready"
      cooperativeName: {
        available: boolean
        normalized: string
      }
      cooperativeCodePrefix: {
        available: boolean
        normalized: string
      }
      workspaceSlug: {
        available: boolean
        hostname: string
        normalized: string
      }
    }
  | { status: "error"; message: string }

const signupFormId = "one-path-signup-form"

const DEFAULT_ADMIN_MEMBER_NUMBER = "0001"

function formatWorkspaceUrlPreview(slug: string, suffix: string) {
  return `${slug}${suffix}`
}

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function AvailabilityLine({
  available,
  children,
}: {
  available: boolean
  children: React.ReactNode
}) {
  return (
    <p
      className={`flex items-center gap-1.5 text-[13px] ${
        available ? "text-[#1F7A3D]" : "text-destructive"
      }`}
      role="status"
    >
      {available ? (
        <CheckCircle2Icon aria-hidden="true" className="size-3.5 shrink-0" />
      ) : (
        <CircleAlertIcon aria-hidden="true" className="size-3.5 shrink-0" />
      )}
      {children}
    </p>
  )
}

export function SignupForm({
  approvalToken,
  defaultValues,
  quickFill,
  workspaceUrlSuffix,
}: {
  approvalToken?: string | null
  defaultValues?: Partial<SignupIntentInput>
  quickFill: QaQuickFillContext
  workspaceUrlSuffix: string
}) {
  const approvalLocked = Boolean(approvalToken)
  const initialWorkspaceSlug = defaultValues?.workspaceSlug
    ? normalizeWorkspaceSlug(defaultValues.workspaceSlug)
    : createWorkspaceSlugSuggestion(defaultValues?.cooperativeName ?? "")
  const form = useZodForm<SignupIntentInput>(signupIntentSchema, {
    defaultValues: {
      cooperativeCodePrefix: defaultValues?.cooperativeCodePrefix ?? "",
      cooperativeName: defaultValues?.cooperativeName ?? "",
      primaryContactEmail: defaultValues?.primaryContactEmail ?? "",
      primaryContactFullName: defaultValues?.primaryContactFullName ?? "",
      // The preview card shows this number, so the field starts with it too.
      primaryContactMemberNumber:
        defaultValues?.primaryContactMemberNumber ??
        DEFAULT_ADMIN_MEMBER_NUMBER,
      workspaceSlug: initialWorkspaceSlug,
    },
  })
  const { publishQaPreviews, showError, showSuccess } = useNotifications()
  const [result, setResult] = useState<SignupApiSuccess | null>(null)
  const [submittedValues, setSubmittedValues] =
    useState<SignupIntentInput | null>(null)
  useSignupJourneyStage(result ? "verify-email" : "sign-up", {
    onSelect: (stepKey) => {
      if (stepKey === "sign-up") setResult(null)
    },
    selectable: result ? ["sign-up"] : [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [workspaceSlugEdited, setWorkspaceSlugEdited] = useState(
    Boolean(defaultValues?.workspaceSlug)
  )
  const [availability, setAvailability] = useState<AvailabilityState>({
    status: "idle",
  })
  const cooperativeName = useWatch({
    control: form.control,
    name: "cooperativeName",
  })
  const cooperativeCodePrefix = useWatch({
    control: form.control,
    name: "cooperativeCodePrefix",
  })
  const memberNumber = useWatch({
    control: form.control,
    name: "primaryContactMemberNumber",
  })
  const workspaceSlug = useWatch({
    control: form.control,
    name: "workspaceSlug",
  })
  const normalizedWorkspaceSlug = normalizeWorkspaceSlug(workspaceSlug ?? "")
  const accessCodePreview = previewCooperativeAccessCode(
    cooperativeCodePrefix,
    memberNumber
  )
  const exampleCode =
    previewCooperativeAccessCode(cooperativeCodePrefix, "0042").code ??
    "AMN-0042"
  const canSubmit =
    availability.status !== "checking" &&
    (availability.status !== "ready" ||
      (availability.cooperativeName.available &&
        availability.cooperativeCodePrefix.available &&
        availability.workspaceSlug.available))

  useEffect(() => {
    if (workspaceSlugEdited) return

    const suggestedSlug = createWorkspaceSlugSuggestion(cooperativeName ?? "")

    if (suggestedSlug !== form.getValues("workspaceSlug")) {
      form.setValue("workspaceSlug", suggestedSlug, {
        shouldValidate: true,
      })
    }
  }, [cooperativeName, form, workspaceSlugEdited])

  useEffect(() => {
    const normalizedName = cooperativeName?.trim() ?? ""

    if (
      normalizedName.length < 2 ||
      !/^[a-zA-Z]{3,5}$/.test(cooperativeCodePrefix ?? "") ||
      normalizedWorkspaceSlug.length < 2
    ) {
      setAvailability({ status: "idle" })
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        setAvailability({ status: "checking" })

        const params = new URLSearchParams({
          cooperativeCodePrefix: cooperativeCodePrefix ?? "",
          cooperativeName: normalizedName,
          workspaceSlug: normalizedWorkspaceSlug,
        })
        const response = await fetch(`/api/signup/availability?${params}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("Availability check failed.")
        }

        setAvailability({
          status: "ready",
          ...((await response.json()) as Omit<
            Extract<AvailabilityState, { status: "ready" }>,
            "status"
          >),
        })
      } catch (error) {
        if (controller.signal.aborted) return

        setAvailability({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Availability check failed.",
        })
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [cooperativeCodePrefix, cooperativeName, normalizedWorkspaceSlug])

  async function requestVerification(values: SignupIntentInput) {
    try {
      setSubmitting(true)

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          approvalToken: approvalToken ?? undefined,
        }),
      })

      const payload = (await response.json()) as
        | SignupApiSuccess
        | MarketingErrorEnvelope

      if (!response.ok || !("verificationDelivery" in payload)) {
        throw new Error(
          getMarketingErrorMessage(
            payload,
            "We could not prepare the verification step."
          )
        )
      }

      setSubmittedValues(values)
      setResult(payload)
      publishQaPreviews(payload.qaPreviews)
      showSuccess(
        payload.verificationDelivery.status === "sent"
          ? "Verification email sent"
          : "Verification prepared",
        payload.emailDeliveryConfigured
          ? "Open the email to continue setup."
          : "Email delivery is not configured here. Use the secure link."
      )
    } catch (error) {
      showError(
        "Setup could not continue",
        error instanceof Error ? error.message : "Something went wrong."
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function onSubmit(values: SignupIntentInput) {
    if (
      availability.status === "ready" &&
      (!availability.cooperativeName.available ||
        !availability.cooperativeCodePrefix.available ||
        !availability.workspaceSlug.available)
    ) {
      showError(
        "Setup could not continue",
        "Choose an available member code, name and workspace address."
      )
      return
    }

    await requestVerification(values)
  }

  if (result) {
    const emailWasSent = result.verificationDelivery.status === "sent"
    const emailFailed = result.verificationDelivery.status === "failed"
    const recipient =
      result.verificationEmail?.recipient.value ??
      submittedValues?.primaryContactEmail ??
      "your email"
    const qaPreview = result.qaPreviews?.at(-1)
    const showSecureLink =
      result.devMode || !result.emailDeliveryConfigured || Boolean(qaPreview)

    return (
      <JourneyStep
        aside={
          <p>
            The verified email becomes the owner of the workspace. We don&apos;t
            create anything until it&apos;s confirmed.
          </p>
        }
        eyebrow="Check your inbox"
        lede={
          <>
            Open the email we sent to{" "}
            <span className="font-medium text-foreground">{recipient}</span> and
            select the button. The link works for 24 hours.
          </>
        }
        stepKey="verify-email"
        title="We sent you a link"
      >
        <div className="flex flex-col gap-5">
          {emailFailed ? (
            <Alert variant="destructive">
              <AlertTitle>The email could not be delivered</AlertTitle>
              <AlertDescription>
                Your secure link was still created. Send it again, or check the
                address.
              </AlertDescription>
            </Alert>
          ) : !emailWasSent ? (
            <Alert>
              <MailIcon aria-hidden="true" />
              <AlertTitle>
                {result.emailDeliveryConfigured
                  ? "Your email is on its way"
                  : "Email is not sent in this environment"}
              </AlertTitle>
              <AlertDescription>
                {result.emailDeliveryConfigured
                  ? "It can take a minute to arrive."
                  : "Use the secure link below to continue."}
              </AlertDescription>
            </Alert>
          ) : null}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Sent to</dt>
              <dd className="mt-0.5 truncate font-medium">{recipient}</dd>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <dt className="text-xs text-muted-foreground">Link expires</dt>
              <dd className="mt-0.5 font-medium">
                {formatExpiry(result.expiresAt)}
              </dd>
            </div>
          </dl>

          {qaPreview ? <QaNotificationPreviewCard preview={qaPreview} /> : null}

          {showSecureLink && result.verificationEmail?.actionUrl ? (
            <Link
              className={buttonVariants({ className: "w-fit", size: "lg" })}
              href={result.verificationEmail.actionUrl}
            >
              {result.emailDeliveryConfigured
                ? result.verificationEmail.actionLabel
                : "Continue with secure link"}
            </Link>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Button
              className="min-h-11 px-0"
              disabled={submitting || !submittedValues}
              onClick={() => {
                if (submittedValues) void requestVerification(submittedValues)
              }}
              type="button"
              variant="link"
            >
              {submitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Sending
                </>
              ) : (
                "Send it again"
              )}
            </Button>
            <Button
              className="min-h-11 px-0"
              onClick={() => setResult(null)}
              type="button"
              variant="link"
            >
              Wrong email? Change it
            </Button>
            <span className="text-xs text-muted-foreground">
              Nothing in your inbox? Check spam.
            </span>
          </div>
        </div>
      </JourneyStep>
    )
  }

  const prefixAvailability =
    availability.status === "ready" ? availability.cooperativeCodePrefix : null
  const slugAvailability =
    availability.status === "ready" ? availability.workspaceSlug : null
  const nameAvailability =
    availability.status === "ready" ? availability.cooperativeName : null

  return (
    <Form {...form}>
      <JourneyStep
        action={
          quickFill.enabled ? (
            <QaQuickFillButton
              form={form}
              qaDomain={quickFill.emailDomain}
              visible={quickFill.enabled}
              onFill={() =>
                applyDevFormFill(
                  form,
                  "signup",
                  approvalLocked
                    ? {
                        ...defaultValues,
                        workspaceSlug: initialWorkspaceSlug,
                      }
                    : undefined,
                  { emailDomain: quickFill.emailDomain }
                )
              }
            />
          ) : null
        }
        aside={
          <p>
            Members sign in with a code like{" "}
            <b className="font-semibold text-[#0B1F36]">{exampleCode}</b>. The
            letters are unique to your cooperative and can&apos;t be changed
            later, so pick something short your members will recognise.
          </p>
        }
        eyebrow="Sign up · the web workspace is free"
        lede="This is where your team and members will sign in. It takes about a minute."
        primary={
          <Button
            disabled={submitting || !canSubmit}
            form={signupFormId}
            size="lg"
            type="submit"
          >
            {submitting ? (
              <>
                <Spinner data-icon="inline-start" />
                Sending
              </>
            ) : (
              "Send verification email"
            )}
          </Button>
        }
        stepKey="sign-up"
        title="Create your cooperative's workspace"
      >
        <form
          className="flex flex-col gap-5"
          id={signupFormId}
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="cooperativeName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Cooperative name</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="organization"
                      placeholder="Enter cooperative name"
                      readOnly={approvalLocked}
                      {...field}
                    />
                  </FormControl>
                  {approvalLocked ? (
                    <FormDescription>
                      From your approved request
                    </FormDescription>
                  ) : nameAvailability && !nameAvailability.available ? (
                    <AvailabilityLine available={false}>
                      That cooperative name is already in use.
                    </AvailabilityLine>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryContactFullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your name</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="name"
                      placeholder="Enter your name"
                      readOnly={approvalLocked}
                      {...field}
                    />
                  </FormControl>
                  {approvalLocked ? (
                    <FormDescription>
                      From your approved request
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryContactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your email</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="email"
                      type="email"
                      placeholder="Enter your email"
                      readOnly={approvalLocked}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {approvalLocked
                      ? "From your approved request"
                      : "You'll own the workspace"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workspaceSlug"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Workspace address</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupInput
                        autoComplete="off"
                        placeholder="Enter workspace name"
                        spellCheck={false}
                        {...field}
                        onChange={(event) => {
                          setWorkspaceSlugEdited(true)
                          field.onChange(
                            normalizeWorkspaceSlug(event.target.value)
                          )
                        }}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>{workspaceUrlSuffix}</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  </FormControl>
                  {slugAvailability ? (
                    <AvailabilityLine available={slugAvailability.available}>
                      {slugAvailability.available
                        ? `${formatWorkspaceUrlPreview(slugAvailability.normalized, workspaceUrlSuffix)} is available`
                        : `${formatWorkspaceUrlPreview(normalizedWorkspaceSlug, workspaceUrlSuffix)} is taken. Try another.`}
                    </AvailabilityLine>
                  ) : !workspaceSlugEdited && normalizedWorkspaceSlug ? (
                    <FormDescription>
                      Suggested from your cooperative&apos;s name.
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryContactMemberNumber"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Member code</FormLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="cooperativeCodePrefix"
                      render={({ field: prefixField }) => (
                        <FormItem className="space-y-0">
                          <InputGroup>
                            <InputGroupAddon align="inline-start">
                              <InputGroupText>Letters</InputGroupText>
                            </InputGroupAddon>
                            <FormControl>
                              <InputGroupInput
                                aria-label="Member code letters"
                                autoComplete="off"
                                className="uppercase"
                                maxLength={5}
                                placeholder="AMN"
                                {...prefixField}
                                onChange={(event) =>
                                  prefixField.onChange(
                                    event.target.value.toUpperCase()
                                  )
                                }
                              />
                            </FormControl>
                          </InputGroup>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <InputGroupText>Your no.</InputGroupText>
                      </InputGroupAddon>
                      <FormControl>
                        <InputGroupInput
                          aria-label="Your member number"
                          autoComplete="off"
                          inputMode="numeric"
                          placeholder="0001"
                          {...field}
                        />
                      </FormControl>
                    </InputGroup>
                  </div>
                  {prefixAvailability ? (
                    <AvailabilityLine available={prefixAvailability.available}>
                      {prefixAvailability.available
                        ? `${prefixAvailability.normalized} is yours`
                        : `${prefixAvailability.normalized} is used by another cooperative.`}
                    </AvailabilityLine>
                  ) : (
                    <FormDescription>
                      Use 3 to 5 letters. Your no. is your own member number.
                      Keep 0001 or use the one from your records.
                    </FormDescription>
                  )}
                  <FormMessage />
                  <div
                    aria-live="polite"
                    className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#0B1F36] px-4 py-3 text-white"
                  >
                    <div>
                      <p className="text-xs text-white/70">
                        You will sign in with
                      </p>
                      <p className="font-mono text-lg font-semibold tracking-wide">
                        {accessCodePreview.code ??
                          `${accessCodePreview.prefix ?? "AMN"}-${memberNumber?.trim() ? memberNumber.trim().toUpperCase() : "····"}`}
                      </p>
                    </div>
                    <p className="text-right text-[12.5px] leading-5 text-white/70">
                      Every member&apos;s code
                      <br />
                      starts with{" "}
                      <b className="text-white">
                        {accessCodePreview.prefix ?? "—"}
                      </b>
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </FieldGroup>

          {availability.status === "checking" ? (
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Spinner /> Checking availability
            </p>
          ) : availability.status === "error" ? (
            <Alert>
              <AlertTitle>Availability check paused</AlertTitle>
              <AlertDescription>{availability.message}</AlertDescription>
            </Alert>
          ) : null}

          <nav
            aria-label="Legal and support"
            className="flex flex-wrap gap-x-4 text-sm text-muted-foreground"
          >
            <a className="min-h-11 py-3 underline" href="/terms">
              Platform terms
            </a>
            <a className="min-h-11 py-3 underline" href="/privacy">
              Privacy notice
            </a>
            <a className="min-h-11 py-3 underline" href="/support">
              Support
            </a>
          </nav>
        </form>
      </JourneyStep>
    </Form>
  )
}
