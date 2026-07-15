import type { ComponentProps } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"

type FormAction = ComponentProps<"form">["action"]

export function PasswordResetRequestForm({ action }: { action: string }) {
  return (
    <form action={action} method="post" className="mt-6 space-y-4">
      <label className="grid gap-2 text-sm text-foreground">
        <span>Email</span>
        <Input
          type="email"
          name="email"
          placeholder="name@cooperative.com"
          required
          className="h-11"
        />
      </label>

      <Button type="submit" size="lg" className="w-full">
        Send reset link
      </Button>
    </form>
  )
}

export function PasswordResetConfirmForm({
  action,
  token,
}: {
  action: string
  token: string
}) {
  return (
    <form action={action} method="post" className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />

      <label className="grid gap-2 text-sm text-foreground">
        <span>New password</span>
        <Input
          type="password"
          name="password"
          placeholder="Enter a new password"
          required
          minLength={8}
          className="h-11"
        />
      </label>

      <label className="grid gap-2 text-sm text-foreground">
        <span>Confirm password</span>
        <Input
          type="password"
          name="confirmPassword"
          placeholder="Confirm your new password"
          required
          minLength={8}
          className="h-11"
        />
      </label>

      <Button type="submit" size="lg" className="w-full">
        Save password
      </Button>
    </form>
  )
}

export function ResendMemberVerificationForm({
  action,
}: {
  action: FormAction
}) {
  return (
    <form action={action}>
      <Button type="submit" size="lg">
        Resend verification email
      </Button>
    </form>
  )
}
