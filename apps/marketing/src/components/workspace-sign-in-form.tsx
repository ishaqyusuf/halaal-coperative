"use client"

import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
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
import { Spinner } from "@halaalvest/ui/components/spinner"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { ArrowRightIcon } from "lucide-react"
import { z } from "zod"
import { getMarketingErrorMessage } from "@/lib/error-response"
import {
  buildLoginPrefillAction,
  getMemberCodeFromSignInInput,
} from "@/lib/workspace-sign-in"

const workspaceSignInSchema = z.object({
  workspace: z
    .string()
    .trim()
    .min(1, "Enter your workspace address or member code.")
    .max(253, "That address is too long."),
})

type WorkspaceSignInInput = z.infer<typeof workspaceSignInSchema>

export function WorkspaceSignInForm({
  workspaceUrlSuffix,
}: {
  workspaceUrlSuffix: string
}) {
  const form = useZodForm<WorkspaceSignInInput>(workspaceSignInSchema, {
    defaultValues: { workspace: "" },
  })
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(values: WorkspaceSignInInput) {
    setSubmitting(true)

    try {
      const response = await fetch("/api/workspace-sign-in", {
        body: JSON.stringify(values),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
      const payload = (await response.json().catch(() => null)) as {
        loginUrl?: string
      } | null

      if (!response.ok || !payload?.loginUrl) {
        form.setError("workspace", {
          message: getMarketingErrorMessage(
            payload,
            "We couldn't look that up. Try again in a moment."
          ),
        })
        setSubmitting(false)
        return
      }

      const memberCode = getMemberCodeFromSignInInput(values.workspace)

      if (!memberCode) {
        window.location.assign(payload.loginUrl)
        return
      }

      // Top-level POST so the code reaches the tenant's /login without
      // appearing in any URL.
      const prefillForm = document.createElement("form")
      prefillForm.action = buildLoginPrefillAction(payload.loginUrl)
      prefillForm.method = "post"
      prefillForm.hidden = true
      const identifier = document.createElement("input")
      identifier.name = "identifier"
      identifier.type = "hidden"
      identifier.value = memberCode
      prefillForm.append(identifier)
      document.body.append(prefillForm)
      prefillForm.submit()
    } catch {
      form.setError("workspace", {
        message:
          "We couldn't reach Halaalvest. Check your connection and try again.",
      })
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="workspace"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace address or member code</FormLabel>
              <FormControl>
                <Input
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  className="h-12 text-base"
                  placeholder={`your-coop${workspaceUrlSuffix} or ABC-0001`}
                  spellCheck={false}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Your workspace address is in your welcome email. Your member
                code is the one you sign in with, such as ABC-0001.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          className="h-12 w-full rounded-full !bg-[#0B1F36] text-base !text-white hover:!bg-[#123455] sm:w-auto sm:self-start sm:px-7"
          disabled={submitting}
          size="lg"
          type="submit"
        >
          {submitting ? (
            <>
              <Spinner data-icon="inline-start" />
              Finding your cooperative
            </>
          ) : (
            <>
              Continue to sign in
              <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
            </>
          )}
        </Button>
      </form>
    </Form>
  )
}
