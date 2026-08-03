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
import { Separator } from "@halaalvest/ui/components/separator"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import {
  QaNotificationPreviewCard,
  useNotifications,
} from "@halaalvest/notifications-react"
import type { QaQuickFillContext } from "@halaalvest/utils"
import { applyDevFormFill } from "@/lib/dev-form-fill"
import {
  createWorkspaceSlugSuggestion,
  normalizeWorkspaceSlug,
  signupIntentSchema,
  type SignupIntentInput,
} from "@/lib/signup-flow"
import { useSignupJourneyStage } from "./signup-journey-state"
import { SetupContextStrip } from "./setup-context-strip"

type SignupApiSuccess = {
  devMode: boolean
  emailDeliveryConfigured: boolean
  expiresAt: string
  onboardingUrl: string
  qaPreviews?: QaNotificationPreview[]
  verificationDelivery: {
    attempts: number
    errorMessage?: string | null
    messageId: string
    status: "failed" | "queued" | "sent"
  }
  verificationEmail: {
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
      workspaceSlug: {
        available: boolean
        hostname: string
        normalized: string
      }
    }
  | { status: "error"; message: string }

function formatWorkspaceUrlPreview(slug: string, suffix: string) {
  return `${slug}${suffix}`
}

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
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
      cooperativeName: defaultValues?.cooperativeName ?? "",
      memberNumberPrefix: "",
      primaryContactEmail: defaultValues?.primaryContactEmail ?? "",
      primaryContactFullName: defaultValues?.primaryContactFullName ?? "",
      primaryContactMemberNumber: "",
      workspaceSlug: initialWorkspaceSlug,
    },
  })
  const { publishQaPreviews, showError, showSuccess } = useNotifications()
  const [result, setResult] = useState<SignupApiSuccess | null>(null)
  useSignupJourneyStage(result ? "verify" : "workspace")
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
  const workspaceSlug = useWatch({
    control: form.control,
    name: "workspaceSlug",
  })
  const normalizedWorkspaceSlug = normalizeWorkspaceSlug(workspaceSlug ?? "")
  const canSubmit =
    availability.status !== "checking" &&
    (availability.status !== "ready" ||
      (availability.cooperativeName.available &&
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

    if (normalizedName.length < 2 || normalizedWorkspaceSlug.length < 2) {
      setAvailability({ status: "idle" })
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      try {
        setAvailability({ status: "checking" })

        const params = new URLSearchParams({
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
  }, [cooperativeName, normalizedWorkspaceSlug])

  async function onSubmit(values: SignupIntentInput) {
    if (
      availability.status === "ready" &&
      (!availability.cooperativeName.available ||
        !availability.workspaceSlug.available)
    ) {
      showError(
        "Setup could not continue",
        "Choose an available name and subdomain."
      )
      return
    }

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
        | { error?: string }

      if (!response.ok || !("verificationEmail" in payload)) {
        throw new Error(
          ("error" in payload && payload.error) ||
            "We could not prepare the verification step."
        )
      }

      setResult(payload)
      publishQaPreviews(payload.qaPreviews)
      showSuccess(
        payload.verificationDelivery.status === "sent"
          ? "Verification email sent"
          : "Verification prepared",
        payload.emailDeliveryConfigured
          ? "The direct email sender handled the verification step."
          : "Email transport is not configured in this environment."
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

  if (result) {
    const emailWasSent = result.verificationDelivery.status === "sent"
    const emailFailed = result.verificationDelivery.status === "failed"
    const successTitle = emailWasSent
      ? "Verification email sent"
      : emailFailed
        ? "Verification link created"
        : result.emailDeliveryConfigured
          ? "Verification email ready"
          : "Verification link ready"
    const successDescription = emailWasSent
      ? "Ask the admin to open the email and continue setup from the secure link."
      : emailFailed
        ? "The email could not be delivered, but the secure verification link was created."
        : result.emailDeliveryConfigured
          ? "The email is prepared and ready for the configured delivery service."
          : "Email delivery is not configured here, so use the secure link to continue."
    const deliveryLabel = emailWasSent
      ? "Sent to inbox"
      : emailFailed
        ? "Send failed"
        : result.emailDeliveryConfigured
          ? "Prepared"
          : "Local only"
    const qaPreview = result.qaPreviews?.at(-1)
    const showSecureLink =
      result.devMode || !result.emailDeliveryConfigured || Boolean(qaPreview)

    return (
      <Card>
        <CardHeader>
          <CardAction>
            <Badge variant={emailFailed ? "outline" : "default"}>
              {emailFailed ? "Link ready" : "Success"}
            </Badge>
          </CardAction>
          <CardTitle className="text-2xl">{successTitle}</CardTitle>
          <CardDescription>{successDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Alert variant={emailFailed ? "destructive" : "default"}>
            <AlertTitle>Next step</AlertTitle>
            <AlertDescription>
              {emailWasSent
                ? "Open the email to continue onboarding. The workspace is created after the verified profile is submitted."
                : "Use the secure link to continue onboarding. The workspace is created after the verified profile is submitted."}
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border-l-2 border-primary bg-muted/30 py-2 pl-3">
              <p className="text-xs text-muted-foreground">Recipient</p>
              <p className="mt-1 truncate text-sm font-medium">
                {result.verificationEmail.recipient.value}
              </p>
            </div>
            <div className="border-l-2 border-primary bg-muted/30 py-2 pl-3">
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="mt-1 text-sm font-medium">{deliveryLabel}</p>
            </div>
            <div className="border-l-2 border-primary bg-muted/30 py-2 pl-3">
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="mt-1 text-sm font-medium">
                {formatExpiry(result.expiresAt)}
              </p>
            </div>
          </div>
          {qaPreview ? <QaNotificationPreviewCard preview={qaPreview} /> : null}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-2">
          {showSecureLink ? (
            <Link
              className={buttonVariants({ size: "lg" })}
              href={result.verificationEmail.actionUrl}
            >
              {result.emailDeliveryConfigured
                ? result.verificationEmail.actionLabel
                : "Continue with secure link"}
            </Link>
          ) : (
            <p className="text-xs leading-5 text-muted-foreground">
              The admin can continue from the verification email.
            </p>
          )}
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setResult(null)
              setWorkspaceSlugEdited(false)
              form.reset()
            }}
          >
            Start over
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <Card>
        <CardHeader>
          {quickFill.enabled ? (
            <CardAction>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  void applyDevFormFill(
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
              >
                Quick fill
              </Button>
            </CardAction>
          ) : null}
          <CardTitle className="text-2xl">
            Choose the cooperative workspace.
          </CardTitle>
          <CardDescription>
            Confirm the accountable admin, reserve the workspace address, and
            send the secure email link before any records are created.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <SetupContextStrip
              items={[
                {
                  label: "Accountable admin",
                  body: "The verified contact becomes the first workspace owner.",
                },
                {
                  label: "Workspace identity",
                  body: "Reserve the cooperative name and private operating address.",
                },
              ]}
            />

            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="cooperativeName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Cooperative name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter cooperative name"
                        readOnly={approvalLocked}
                        {...field}
                      />
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
                      <Input
                        placeholder="Enter your name"
                        readOnly={approvalLocked}
                        {...field}
                      />
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
                    <FormLabel>Admin email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter admin email"
                        readOnly={approvalLocked}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primaryContactMemberNumber"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      Admin Membership No (Leave prefix blank if you do not have
                      a Membership No Prefix).
                    </FormLabel>
                    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
                      <FormField
                        control={form.control}
                        name="memberNumberPrefix"
                        render={({ field: prefixField }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <Input
                                aria-label="Member number prefix"
                                className="w-32 px-2 text-center uppercase"
                                placeholder="Prefix"
                                {...prefixField}
                                onChange={(event) =>
                                  prefixField.onChange(
                                    event.target.value.toUpperCase()
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormControl>
                        <Input
                          placeholder="Enter admin membership no"
                          {...field}
                        />
                      </FormControl>
                    </div>
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
                          placeholder="Enter workspace name"
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldGroup>

            {availability.status === "checking" ? (
              <Alert>
                <AlertTitle>Checking availability</AlertTitle>
                <AlertDescription>
                  We are checking the cooperative name and website.
                </AlertDescription>
              </Alert>
            ) : availability.status === "ready" ? (
              <Alert
                variant={
                  availability.cooperativeName.available &&
                  availability.workspaceSlug.available
                    ? "default"
                    : "destructive"
                }
              >
                <AlertTitle>Website availability</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          availability.workspaceSlug.available
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        Website
                      </Badge>
                      <span>
                        {availability.workspaceSlug.available
                          ? `${formatWorkspaceUrlPreview(availability.workspaceSlug.normalized, workspaceUrlSuffix)} is available.`
                          : "That website is not available."}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          availability.cooperativeName.available
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        Name
                      </Badge>
                      <span>
                        {availability.cooperativeName.available
                          ? "Cooperative name is available."
                          : "That cooperative name is already in use."}
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : availability.status === "error" ? (
              <Alert>
                <AlertTitle>Availability check paused</AlertTitle>
                <AlertDescription>{availability.message}</AlertDescription>
              </Alert>
            ) : normalizedWorkspaceSlug ? (
              <Alert>
                <AlertTitle>Suggested website</AlertTitle>
                <AlertDescription>
                  Your website will use{" "}
                  <span className="font-medium">{normalizedWorkspaceSlug}</span>
                  .
                </AlertDescription>
              </Alert>
            ) : null}

            <Separator />

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                disabled={submitting || !canSubmit}
                type="submit"
              >
                {submitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Preparing verification
                  </>
                ) : (
                  "Send verification email"
                )}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                The workspace opens only after email verification and
                onboarding.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </Form>
  )
}
