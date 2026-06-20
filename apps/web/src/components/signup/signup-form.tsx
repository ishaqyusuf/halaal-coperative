"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useWatch } from "react-hook-form"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
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
  expiresAt: string
  onboardingUrl: string
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

export function SignupForm({ devMode }: { devMode: boolean }) {
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
      showError("Signup could not continue", "Choose an available name and subdomain.")
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
        "Verification prepared",
        "Use the email link to continue into onboarding."
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
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium tracking-[0.24em] text-emerald-900/70 uppercase">
            Verification Ready
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            Continue from the verification link.
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            We generated the email payload for{" "}
            <strong>{result.verificationEmail.recipient.value}</strong>. Verify
            the primary contact email first, then continue with a short
            cooperative profile. The link expires on{" "}
            {new Date(result.expiresAt).toLocaleString()}.
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-950">
            {result.verificationEmail.subject}
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            {result.verificationEmail.previewText}
          </p>
          <pre className="mt-4 text-sm leading-6 whitespace-pre-wrap text-emerald-950">
            {result.verificationEmail.bodyText}
          </pre>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className={buttonVariants({ size: "lg" })}
            href={result.verificationEmail.actionUrl}
          >
            {result.verificationEmail.actionLabel}
          </Link>
          {result.devMode ? (
            <Link
              className={buttonVariants({ size: "lg", variant: "outline" })}
              href={result.onboardingUrl}
            >
              Continue without verification
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
              Signup
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Start your cooperative workspace.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
              We verify the primary contact email first, then ask only for the
              core cooperative information needed to open the workspace.
            </p>
          </div>
          {devMode ? (
            <Button
              variant="outline"
              onClick={() => applyDevFormFill(form, "signup")}
            >
              Autofill dev data
            </Button>
          ) : null}
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="primaryContactFullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary contact full name</FormLabel>
                <FormControl>
                  <Input
                    id="primaryContactFullName"
                    placeholder="Amina Yusuf"
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
                <FormLabel>Primary contact email</FormLabel>
                <FormControl>
                  <Input
                    id="primaryContactEmail"
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
                <FormLabel>Primary contact cooperative number</FormLabel>
                <FormControl>
                  <Input
                    id="primaryContactMemberNumber"
                    placeholder="PC-1001"
                    {...field}
                  />
                </FormControl>
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
                    id="cooperativeName"
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
              <FormItem>
                <FormLabel>Workspace subdomain</FormLabel>
                <FormControl>
                  <Input
                    id="workspaceSlug"
                    placeholder="noor"
                    {...field}
                    onChange={(event) => {
                      setWorkspaceSlugEdited(true)
                      field.onChange(normalizeWorkspaceSlug(event.target.value))
                    }}
                  />
                </FormControl>
                <div className="space-y-1 text-sm leading-6 text-stone-600">
                  {availability.status === "checking" ? (
                    <p>Checking workspace availability...</p>
                  ) : availability.status === "ready" ? (
                    <>
                      <p
                        className={
                          availability.workspaceSlug.available
                            ? "text-emerald-700"
                            : "text-red-700"
                        }
                      >
                        {availability.workspaceSlug.available
                          ? `${availability.workspaceSlug.hostname} is available.`
                          : "That workspace subdomain is not available."}
                      </p>
                      <p
                        className={
                          availability.cooperativeName.available
                            ? "text-emerald-700"
                            : "text-red-700"
                        }
                      >
                        {availability.cooperativeName.available
                          ? "Cooperative name is available."
                          : "That cooperative name is already in use."}
                      </p>
                    </>
                  ) : availability.status === "error" ? (
                    <p className="text-amber-700">{availability.message}</p>
                  ) : normalizedWorkspaceSlug ? (
                    <p>
                      Your workspace will use{" "}
                      <span className="font-medium">{normalizedWorkspaceSlug}</span>.
                    </p>
                  ) : (
                    <p>
                      We will suggest one from the cooperative name without
                      the word cooperative.
                    </p>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button size="lg" disabled={submitting || !canSubmit} type="submit">
            {submitting
              ? "Preparing verification..."
              : "Continue to verification"}
          </Button>
        </form>
      </div>
    </Form>
  )
}
