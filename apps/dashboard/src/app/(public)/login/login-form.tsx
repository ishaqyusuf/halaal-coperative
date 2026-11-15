"use client"

import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { PasswordInput } from "@/components/password-input"
import { PublicAuthField } from "@/components/public-auth-forms"

export function LoginForm({
  action,
  codeExample,
  defaultIdentifier = "",
  nextPath,
  resetPasswordHref,
}: {
  action: string
  codeExample: string | null
  defaultIdentifier?: string
  nextPath: string
  resetPasswordHref: string
}) {
  const [identifier, setIdentifier] = useState(defaultIdentifier)
  const [password, setPassword] = useState("")

  return (
    <form
      action={action}
      className="grid gap-6"
      data-quick-fill-exempt="true"
      method="post"
    >
      <input name="next" type="hidden" value={nextPath} />
      <PublicAuthField htmlFor="identifier" label="Email or member code">
        <Input
          autoCapitalize="none"
          autoComplete="username"
          id="identifier"
          name="identifier"
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder={codeExample ? `For example ${codeExample}` : undefined}
          required
          spellCheck={false}
          type="text"
          value={identifier}
        />
      </PublicAuthField>

      <PublicAuthField
        action={
          <a
            className="inline-flex min-h-11 items-center text-base font-semibold text-primary underline underline-offset-4"
            href={resetPasswordHref}
          >
            Forgot password?
          </a>
        }
        htmlFor="password"
        label="Password"
      >
        <PasswordInput
          autoComplete="current-password"
          autoFocus={Boolean(defaultIdentifier)}
          id="password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          value={password}
        />
      </PublicAuthField>

      <Button className="w-full" size="lg" type="submit">
        Sign in
      </Button>
    </form>
  )
}
