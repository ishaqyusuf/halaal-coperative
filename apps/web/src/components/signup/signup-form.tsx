"use client"

import { useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@halaal-vest/ui/components/button"
import { Input } from "@halaal-vest/ui/components/input"
import { useNotifications } from "@halaal-vest/notifications-react"
import { applyDevFormFill } from "@/lib/dev-form-fill"
import { signupIntentSchema, type SignupIntentInput } from "@/lib/signup-flow"
import { useZodForm } from "@/hooks/use-zod-form"

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

export function SignupForm({ devMode }: { devMode: boolean }) {
  const form = useZodForm<SignupIntentInput>(signupIntentSchema, {
    defaultValues: {
      cooperativeName: "",
      primaryContactEmail: "",
      primaryContactFullName: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [result, setResult] = useState<SignupApiSuccess | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(values: SignupIntentInput) {
    try {
      setSubmitting(true)

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      const payload = (await response.json()) as SignupApiSuccess | { error?: string }

      if (!response.ok || !("verificationEmail" in payload)) {
        throw new Error(("error" in payload && payload.error) || "We could not prepare the verification step.")
      }

      setResult(payload)
      showSuccess("Verification prepared", "Use the email link to continue into onboarding.")
    } catch (error) {
      showError(
        "Signup could not continue",
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
            Verification Ready
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            Continue from the verification link.
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            We generated the email payload for <strong>{result.verificationEmail.recipient.value}</strong>.
            Verify the primary contact email first, then continue with a short cooperative profile.
            The link expires on {new Date(result.expiresAt).toLocaleString()}.
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-950">{result.verificationEmail.subject}</p>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            {result.verificationEmail.previewText}
          </p>
          <pre className="mt-4 whitespace-pre-wrap text-sm leading-6 text-emerald-950">
            {result.verificationEmail.bodyText}
          </pre>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link className={buttonVariants({ size: "lg" })} href={result.verificationEmail.actionUrl}>
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-900/70">
            Signup
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            Start your cooperative workspace.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
            We verify the primary contact email first, then ask only for the core cooperative
            information needed to open the workspace.
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
        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-900" htmlFor="primaryContactFullName">
            Primary contact full name
          </label>
          <Input
            id="primaryContactFullName"
            placeholder="Amina Yusuf"
            {...form.register("primaryContactFullName")}
          />
          <p className="text-sm text-red-600">
            {form.formState.errors.primaryContactFullName?.message}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-900" htmlFor="primaryContactEmail">
            Primary contact email
          </label>
          <Input
            id="primaryContactEmail"
            type="email"
            placeholder="admin@noorcoop.ng"
            {...form.register("primaryContactEmail")}
          />
          <p className="text-sm text-red-600">
            {form.formState.errors.primaryContactEmail?.message}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-900" htmlFor="cooperativeName">
            Cooperative name
          </label>
          <Input
            id="cooperativeName"
            placeholder="Noor Cooperative Society"
            {...form.register("cooperativeName")}
          />
          <p className="text-sm text-red-600">{form.formState.errors.cooperativeName?.message}</p>
        </div>

        <Button size="lg" disabled={submitting} type="submit">
          {submitting ? "Preparing verification..." : "Continue to verification"}
        </Button>
      </form>
    </div>
  )
}
