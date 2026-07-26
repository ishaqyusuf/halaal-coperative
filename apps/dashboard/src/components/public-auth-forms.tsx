"use client"

import type { ComponentProps } from "react"
import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"

type FormAction = ComponentProps<"form">["action"]

export function PasswordResetRequestForm({
  action,
  existingAccountEmails = [],
}: {
  action: string
  existingAccountEmails?: string[]
}) {
  const [email, setEmail] = useState("")

  return (
    <form
      action={action}
      className="mt-6 space-y-4"
      data-quick-fill-exempt="true"
      method="post"
    >
      {existingAccountEmails.length > 0 ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setEmail(existingAccountEmails[0] ?? "")}
          >
            Quick fill
          </Button>
        </div>
      ) : null}
      <label className="grid gap-2 text-sm text-foreground">
        <span>Email</span>
        <Input
          type="email"
          name="email"
          placeholder="name@cooperative.com"
          required
          className="h-11"
          list="password-reset-qa-accounts"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {existingAccountEmails.length > 0 ? (
          <datalist id="password-reset-qa-accounts">
            {existingAccountEmails.map((accountEmail) => (
              <option key={accountEmail} value={accountEmail} />
            ))}
          </datalist>
        ) : null}
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
    <form
      action={action}
      className="mt-6 space-y-4"
      method="post"
    >
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
    <form action={action} data-quick-fill-exempt="true">
      <Button type="submit" size="lg">
        Resend verification email
      </Button>
    </form>
  )
}
