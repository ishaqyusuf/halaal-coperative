"use client"

import { useState } from "react"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"

export function LoginForm({
  action,
  memberSignupHref,
  nextPath,
  resetPasswordHref,
  showMemberSignupCta,
}: {
  action: string
  memberSignupHref: string
  nextPath: string
  resetPasswordHref: string
  showMemberSignupCta: boolean
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  return (
    <form
      action={action}
      className="mt-6 space-y-4"
      data-quick-fill-exempt="true"
      method="post"
    >
      <input type="hidden" name="next" value={nextPath} />
      <label
        className="grid gap-1.5 text-sm font-medium text-foreground"
        htmlFor="identifier"
      >
        Email or cooperative access code
        <Input
          id="identifier"
          type="text"
          name="identifier"
          placeholder="name@cooperative.com or AMN-0042"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10 bg-background text-sm md:text-sm"
        />
      </label>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="password"
          >
            Password
          </label>
          <a
            className="text-xs font-medium text-[#1f7a3d] underline-offset-4 hover:underline dark:text-[#71d98b]"
            href={resetPasswordHref}
          >
            Reset password
          </a>
        </div>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="Enter your password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
          }}
          className="h-10 bg-background text-sm md:text-sm"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-10 w-full bg-[#1f7a3d] text-white hover:bg-[#176332] dark:bg-[#3fbf70] dark:text-[#071b2c] dark:hover:bg-[#71d98b]"
      >
        Sign in
      </Button>

      {showMemberSignupCta ? (
        <a
          className={cn(
            buttonVariants({ size: "lg", variant: "outline" }),
            "h-10 w-full border-[#1f7a3d]/35 text-[#1f7a3d] hover:bg-[#1f7a3d]/10 dark:border-[#71d98b]/45 dark:text-[#71d98b]"
          )}
          href={memberSignupHref}
        >
          Start member signup
        </a>
      ) : null}
    </form>
  )
}
