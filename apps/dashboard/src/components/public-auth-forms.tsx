"use client"

import type { ComponentProps, ReactNode } from "react"
import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { PasswordInput } from "@/components/password-input"
import {
  getPasswordSetupCopy,
  type PasswordSetupPurpose,
} from "@/lib/password-setup-copy"

type FormAction = ComponentProps<"form">["action"]

// Label above its control, both large enough to read and tap.
export function PublicAuthField({
  action,
  children,
  htmlFor,
  label,
}: {
  action?: ReactNode
  children: ReactNode
  htmlFor: string
  label: string
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-end justify-between gap-3">
        <label className="text-lg font-semibold text-foreground" htmlFor={htmlFor}>
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}

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
      className="grid gap-6"
      data-quick-fill-exempt="true"
      method="post"
    >
      {existingAccountEmails.length > 0 ? (
        <div className="flex justify-end">
          <Button
            onClick={() => setEmail(existingAccountEmails[0] ?? "")}
            size="sm"
            type="button"
            variant="outline"
          >
            Quick fill
          </Button>
        </div>
      ) : null}
      <PublicAuthField htmlFor="reset-email" label="Email">
        <Input
          autoComplete="email"
          id="reset-email"
          inputMode="email"
          list={
            existingAccountEmails.length > 0
              ? "password-reset-qa-accounts"
              : undefined
          }
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </PublicAuthField>
      {existingAccountEmails.length > 0 ? (
        <datalist id="password-reset-qa-accounts">
          {existingAccountEmails.map((accountEmail) => (
            <option key={accountEmail} value={accountEmail} />
          ))}
        </datalist>
      ) : null}

      <Button className="w-full" size="lg" type="submit">
        Send me a link
      </Button>
    </form>
  )
}

export function PasswordResetConfirmForm({
  action,
  purpose = "reset",
  token,
}: {
  action: string
  purpose?: PasswordSetupPurpose
  token: string
}) {
  const copy = getPasswordSetupCopy(purpose)

  return (
    <form action={action} className="grid gap-6" method="post">
      <input name="token" type="hidden" value={token} />
      <input name="purpose" type="hidden" value={purpose} />

      <PublicAuthField htmlFor="new-password" label={copy.passwordLabel}>
        <PasswordInput
          autoComplete="new-password"
          id="new-password"
          minLength={8}
          name="password"
          required
        />
      </PublicAuthField>

      <PublicAuthField htmlFor="confirm-password" label="Type it again">
        <PasswordInput
          autoComplete="new-password"
          id="confirm-password"
          minLength={8}
          name="confirmPassword"
          required
        />
      </PublicAuthField>

      <Button className="w-full" size="lg" type="submit">
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
      <Button className="w-full" size="lg" type="submit">
        Send the email again
      </Button>
    </form>
  )
}
