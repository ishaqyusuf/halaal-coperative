"use client"

import { useState, useTransition } from "react"
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
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { useQaQuickFill } from "@/components/qa-quick-fill-provider"
import { objectToFormData } from "@/lib/form-submit"
import { submitMemberOnboardingAction } from "@/lib/public-actions"

const memberSignupSchema = z
  .object({
    confirmPassword: z.string().min(8, "Confirm your password."),
    email: z.string().email("Enter a valid email."),
    fullName: z.string().min(1, "Full name is required."),
    memberNumber: z.string().min(1, "Cooperative number is required."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    phoneNumber: z.string().min(1, "Phone number is required."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

type MemberSignupValues = z.infer<typeof memberSignupSchema>

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
  const quickFill = useQaQuickFill()
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
  const { publishQaPreviews, showError, showSuccess } = useNotifications()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [qaPreview, setQaPreview] = useState<QaNotificationPreview | null>(null)
  const [isPending, startTransition] = useTransition()
  const isLocked = isPending || isSubmitted

  function onSubmit(values: MemberSignupValues) {
    startTransition(async () => {
      try {
        const result = await submitMemberOnboardingAction(
          objectToFormData({ ...values, signupToken: signupToken ?? "" }),
        )
        publishQaPreviews(result.qaPreviews)
        setQaPreview(result.qaPreviews.at(-1) ?? null)
        showSuccess(
          "Verification email sent",
          `We sent a verification link to ${result.email}. Confirm it to enter the ${tenantName} approval queue.`,
        )
        form.reset({
          ...values,
          confirmPassword: "",
          password: "",
        })
        setIsSubmitted(true)
      } catch (error) {
        showError(
          "Could not submit signup",
          error instanceof Error ? error.message : "Something went wrong.",
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="md:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                {signupToken ? "Invited member onboarding" : "Member onboarding"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Start your membership signup
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Submit your personal details, verify your email, and wait for
                cooperative approval before your dashboard access is activated.
              </p>
            </div>
            {devMode ? (
              <Button
                disabled={isLocked}
                type="button"
                variant="outline"
                onClick={() =>
                  applyDashboardDevFormFill(
                    form,
                    "member_signup",
                    undefined,
                    { emailDomain: quickFill.emailDomain },
                  )
                }
              >
                Quick fill
              </Button>
            ) : null}
          </div>
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isLocked}
                  placeholder="Amina Yusuf"
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isLocked}
                  type="email"
                  placeholder="amina@example.com"
                />
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
              <FormLabel>Phone number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isLocked}
                  placeholder="+234 800 000 0000"
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
              <FormLabel>UID / cooperative number</FormLabel>
              <FormControl>
                {memberNumberPrefix ? (
                  <InputGroup>
                    <InputGroupText>{memberNumberPrefix}</InputGroupText>
                    <InputGroupInput
                      {...field}
                      disabled={isLocked}
                      placeholder="1024"
                    />
                  </InputGroup>
                ) : (
                  <Input {...field} disabled={isLocked} placeholder="1024" />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isLocked}
                  type="password"
                  placeholder="At least 8 characters"
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
            <FormItem className="md:col-span-2">
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isLocked}
                  type="password"
                  placeholder="Repeat your password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
          <Button disabled={isLocked} type="submit" size="lg">
            {isSubmitted
              ? "Verification email sent"
              : "Create account and send verification"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Your dashboard access will remain pending until cooperative
            approval.
          </p>
        </div>
        {qaPreview ? (
          <div className="md:col-span-2">
            <QaNotificationPreviewCard preview={qaPreview} />
          </div>
        ) : null}
      </form>
    </Form>
  )
}
