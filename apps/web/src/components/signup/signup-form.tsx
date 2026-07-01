"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import {
  InputGroup,
  InputGroupInput,
  InputGroupText,
} from "@halaalvest/ui/components/input-group"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@halaalvest/ui/components/progress"
import { Separator } from "@halaalvest/ui/components/separator"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { useNotifications } from "@halaalvest/notifications-react"
import { applyDevFormFill } from "@/lib/dev-form-fill"
import {
  createWorkspaceSlugSuggestion,
  normalizeWorkspaceSlug,
  signupIntentSchema,
  type SignupIntentInput,
} from "@/lib/signup-flow"

type SignupApiSuccess = {
  devMode: boolean
  deliveryTriggerError?: string | null
  emailDeliveryConfigured: boolean
  expiresAt: string
  onboardingUrl: string
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
  devMode,
  workspaceUrlSuffix,
}: {
  devMode: boolean
  workspaceUrlSuffix: string
}) {
  const form = useZodForm<SignupIntentInput>(signupIntentSchema, {
    defaultValues: {
      cooperativeName: "",
      primaryContactEmail: "",
      primaryContactFullName: "",
      primaryContactMemberNumber: "",
      workspaceSlug: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [result, setResult] = useState<SignupApiSuccess | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [workspaceSlugEdited, setWorkspaceSlugEdited] = useState(false)
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
        "Signup could not continue",
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
        body: JSON.stringify(values),
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
      showSuccess(
        payload.verificationDelivery.status === "sent"
          ? "Verification email sent"
          : "Verification queued",
        payload.emailDeliveryConfigured
          ? "The delivery job is handling the verification email."
          : "Email transport is not configured in this environment."
      )
    } catch (error) {
      showError(
        "Signup could not continue",
        error instanceof Error ? error.message : "Something went wrong."
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    const emailWasSent = result.verificationDelivery.status === "sent"
    const deliveryTitle = emailWasSent
      ? "Check the primary contact inbox."
      : result.emailDeliveryConfigured
        ? "Verification email is queued."
        : "Email delivery is not configured."
    const deliveryDescription = emailWasSent
      ? `The verification email was sent to ${result.verificationEmail.recipient.value}. The secure link expires ${formatExpiry(result.expiresAt)}.`
      : result.emailDeliveryConfigured
        ? `The verification notice is saved in the outbox for ${result.verificationEmail.recipient.value}. The delivery job is sending it now. The secure link expires ${formatExpiry(result.expiresAt)}.`
        : `The verification notice is saved in the outbox, but this environment has no email transport configured. The secure link expires ${formatExpiry(result.expiresAt)}.`
    const deliveryLabel = emailWasSent
      ? "Sent to inbox"
      : result.emailDeliveryConfigured
        ? "Queued for job"
        : "Queued locally"
    const showSecureLink = result.devMode || !result.emailDeliveryConfigured

    return (
      <Card>
        <CardHeader>
          <CardAction>
            <Badge>{emailWasSent ? "Email sent" : "Notification queued"}</Badge>
          </CardAction>
          <CardTitle className="text-2xl">{deliveryTitle}</CardTitle>
          <CardDescription>{deliveryDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={50}>
            <ProgressLabel>Signup progress</ProgressLabel>
            <ProgressValue>Step 1 of 2</ProgressValue>
          </Progress>

          <Alert>
            <AlertTitle>
              {emailWasSent
                ? "Verification comes before setup"
                : "Outbox job owns delivery"}
            </AlertTitle>
            <AlertDescription>
              {emailWasSent
                ? "Use the email action to continue into onboarding. The cooperative workspace is not created until the verified profile is submitted."
                : "Signup verification is queued as an outbox notification. The cooperative workspace is not created until the verified profile is submitted."}
            </AlertDescription>
          </Alert>

          {result.deliveryTriggerError ? (
            <Alert>
              <AlertTitle>Delivery job was not started</AlertTitle>
              <AlertDescription>{result.deliveryTriggerError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Recipient</p>
              <p className="mt-1 truncate text-sm font-medium">
                {result.verificationEmail.recipient.value}
              </p>
            </div>
            <div className="border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="mt-1 text-sm font-medium">{deliveryLabel}</p>
            </div>
            <div className="border bg-muted/35 p-3">
              <p className="text-xs text-muted-foreground">Next screen</p>
              <p className="mt-1 text-sm font-medium">Cooperative profile</p>
            </div>
          </div>

          <details className="border p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Review notification copy
            </summary>
            <div className="mt-4 flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">
                {result.verificationEmail.subject}
              </p>
              <p>{result.verificationEmail.previewText}</p>
              <pre className="text-xs leading-6 whitespace-pre-wrap text-foreground">
                {result.verificationEmail.bodyText}
              </pre>
            </div>
          </details>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {showSecureLink ? (
            <Link
              className={buttonVariants({ size: "lg" })}
              href={result.verificationEmail.actionUrl}
            >
              {result.emailDeliveryConfigured
                ? result.verificationEmail.actionLabel
                : "Continue with secure link"}
            </Link>
          ) : null}
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
          {devMode ? (
            <CardAction>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => applyDevFormFill(form, "signup")}
              >
                Autofill dev data
              </Button>
            </CardAction>
          ) : null}
          <CardTitle className="text-2xl">
            Open the verification step.
          </CardTitle>
          <CardDescription>
            Capture the accountable admin, reserve the cooperative URL, and send the
            secure email link before any workspace is created.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={25}>
            <ProgressLabel>Signup progress</ProgressLabel>
            <ProgressValue>Step 1 of 2</ProgressValue>
          </Progress>

          <form
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="primaryContactFullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Amina Yusuf" {...field} />
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
                        placeholder="admin@noorcoop.ng"
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
                  <FormItem>
                    <FormLabel>Admin member number</FormLabel>
                    <FormControl>
                      <Input placeholder="PC-1001" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use the number your cooperative already recognizes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cooperativeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cooperative name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Noor Cooperative Society"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workspaceSlug"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Workspace URL</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput
                          placeholder="noor"
                          {...field}
                          onChange={(event) => {
                            setWorkspaceSlugEdited(true)
                            field.onChange(
                              normalizeWorkspaceSlug(event.target.value)
                            )
                          }}
                        />
                        <InputGroupText>{workspaceUrlSuffix}</InputGroupText>
                      </InputGroup>
                    </FormControl>
                    <FormDescription>
                      This becomes the cooperative workspace URL after verification.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FieldGroup>

            {availability.status === "checking" ? (
              <Alert>
                <AlertTitle>Checking availability</AlertTitle>
                <AlertDescription>
                  We are checking the cooperative name and workspace URL.
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
                <AlertTitle>Workspace availability</AlertTitle>
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
                        URL
                      </Badge>
                      <span>
                        {availability.workspaceSlug.available
                          ? `${formatWorkspaceUrlPreview(availability.workspaceSlug.normalized, workspaceUrlSuffix)} is available.`
                          : "That workspace URL is not available."}
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
                <AlertTitle>Suggested workspace</AlertTitle>
                <AlertDescription>
                  Your workspace URL will use{" "}
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
