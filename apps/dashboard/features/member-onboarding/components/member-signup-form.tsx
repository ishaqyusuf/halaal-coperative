"use client"

import { useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaal-vest/notifications-react"
import { Button } from "@halaal-vest/ui/components/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaal-vest/ui/components/form"
import { Input } from "@halaal-vest/ui/components/input"
import { useZodForm } from "@halaal-vest/ui/hooks/use-zod-form"
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

export function MemberSignupForm({ tenantName }: { tenantName: string }) {
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
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberSignupValues) {
    startTransition(async () => {
      try {
        const result = await submitMemberOnboardingAction(objectToFormData(values))
        showSuccess(
          "Verification email sent",
          `We sent a verification link to ${result.email}. Confirm it to enter the ${tenantName} approval queue.`,
        )
        form.reset()
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
        className="grid gap-4 rounded-[2rem] border border-border/70 bg-background/92 p-6 shadow-sm md:grid-cols-2"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="md:col-span-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Public member onboarding</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Start your membership signup</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Submit your personal details, verify your email, and wait for cooperative approval before your dashboard access is activated.
          </p>
        </div>

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Amina Yusuf" />
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
                <Input {...field} type="email" placeholder="amina@example.com" />
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
                <Input {...field} placeholder="+234 800 000 0000" />
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
                <Input {...field} placeholder="MEM-1024" />
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
                <Input {...field} type="password" placeholder="At least 8 characters" />
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
                <Input {...field} type="password" placeholder="Repeat your password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
          <Button disabled={isPending} type="submit" size="lg" className="rounded-full px-5">
            Create account and send verification
          </Button>
          <p className="text-sm text-muted-foreground">Your dashboard access will remain pending until cooperative approval.</p>
        </div>
      </form>
    </Form>
  )
}
