"use client"

import { useState, useTransition, type ComponentProps } from "react"
import { z } from "zod"
import type { QaNotificationPreview } from "@halaalvest/notifications"
import {
  QaNotificationPreviewCard,
  useNotifications,
} from "@halaalvest/notifications-react"
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@halaalvest/ui/components/input-group"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { PasswordInput } from "@/components/password-input"
import { PublicAuthNotice } from "@/components/public-auth-notice"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import { submitMemberOnboardingAction } from "@/lib/public-actions"

const memberSignupSchema = z
  .object({
    confirmPassword: z.string().min(1, "Type your password again."),
    email: z.string().trim().email("Enter an email like name@example.com."),
    fullName: z.string().trim().min(1, "Enter your full name."),
    memberNumber: z.string().trim().min(1, "Enter your member number."),
    password: z.string().min(8, "Use at least 8 characters."),
    phoneNumber: z.string().trim().min(1, "Enter your phone number."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The two passwords are different.",
    path: ["confirmPassword"],
  })

type MemberSignupValues = z.infer<typeof memberSignupSchema>

const labelClassName = "text-lg font-semibold"

// FormControl puts the field id on its child, so the prefix group forwards
// every prop to the real input to keep the label linked.
function PrefixedInput({
  prefix,
  ...props
}: ComponentProps<"input"> & { prefix: string }) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText className="text-base font-semibold text-foreground">
          {prefix}
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput {...props} />
    </InputGroup>
  )
}

export function MemberSignupForm({
  devMode = false,
  memberNumberPrefix,
  signupToken,
  tenantName,
}: {
  devMode?: boolean
  memberNumberPrefix?: string | null
  signupToken?: string | null
  tenantName: string
}) {
  const form = useZodForm<MemberSignupValues>(memberSignupSchema, {
    defaultValues: {
      confirmPassword: "",
      email: "",
      fullName: "",
      memberNumber: "",
      password: "",
      phoneNumber: "",
    },
  })
  const { publishQaPreviews, showError } = useNotifications()
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [qaPreview, setQaPreview] = useState<QaNotificationPreview | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberSignupValues) {
    startTransition(async () => {
      try {
        const result = await submitMemberOnboardingAction(
          objectToFormData({ ...values, signupToken: signupToken ?? "" })
        )
        publishQaPreviews(result.qaPreviews)
        setQaPreview(result.qaPreviews.at(-1) ?? null)
        setSubmittedEmail(result.email)
      } catch (error) {
        showError(
          "We could not create your account",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  if (submittedEmail) {
    return (
      <div className="grid gap-6">
        <PublicAuthNotice title="Check your email" tone="success">
          We sent a link to <strong>{submittedEmail}</strong>. Open it to
          confirm your email. Then {tenantName} will review your request.
        </PublicAuthNotice>
        {qaPreview ? <QaNotificationPreviewCard preview={qaPreview} /> : null}
      </div>
    )
  }

  return (
    <Form {...form}>
      <form className="grid gap-6" onSubmit={form.handleSubmit(onSubmit)}>
        {devMode ? (
          <div className="flex justify-end">
            <DashboardQuickFill
              enabled={!isPending}
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(form, "member_signup", undefined, {
                  emailDomain,
                })
              }
            />
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>Full name</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="name" disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>Phone number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="tel"
                  disabled={isPending}
                  inputMode="tel"
                  type="tel"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoCapitalize="none"
                  autoComplete="email"
                  disabled={isPending}
                  inputMode="email"
                  type="email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="memberNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>Member number</FormLabel>
              <FormControl>
                {memberNumberPrefix ? (
                  <PrefixedInput
                    {...field}
                    disabled={isPending}
                    inputMode="numeric"
                    prefix={memberNumberPrefix}
                  />
                ) : (
                  <Input {...field} disabled={isPending} />
                )}
              </FormControl>
              <FormDescription className="text-base">
                From your passbook or member card.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  {...field}
                  autoComplete="new-password"
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription className="text-base">
                At least 8 characters.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClassName}>
                Type your password again
              </FormLabel>
              <FormControl>
                <PasswordInput
                  {...field}
                  autoComplete="new-password"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="w-full" disabled={isPending} size="lg" type="submit">
          {isPending ? "Creating your account…" : "Create my account"}
        </Button>
      </form>
    </Form>
  )
}
