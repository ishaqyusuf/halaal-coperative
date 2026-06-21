"use client"

import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { Badge } from "@halaalvest/ui/components/badge"

export type DevLoginAccount = {
  email: string
  fullName: string
  isPlatformOwner: boolean
  roleLabel: string
  tenantName: string
  userId: string
}

export function DevLoginFab({
  accounts,
  action,
  nextPath,
}: {
  accounts: DevLoginAccount[]
  action: string
  nextPath: string
}) {
  const [open, setOpen] = useState(false)

  if (!accounts.length) {
    return null
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <div className="w-[min(24rem,calc(100vw-2rem))] rounded-[1.5rem] border border-border/70 bg-background/95 p-4 shadow-[0_24px_80px_rgba(88,52,24,0.18)] backdrop-blur">
          <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Dev Quick Login
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick any seeded or database-backed user and log in immediately.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              size="icon-sm"
              variant="ghost"
              aria-label="Close quick login"
            >
              <span className="text-base leading-none">×</span>
            </Button>
          </div>

          <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {accounts.map((account) => (
              <form
                key={account.userId}
                action={action}
                method="post"
                className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-3"
              >
                <input type="hidden" name="userId" value={account.userId} />
                <input type="hidden" name="next" value={nextPath} />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{account.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{account.tenantName}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <Badge variant="outline">{account.roleLabel}</Badge>
                    {account.isPlatformOwner ? <Badge variant="secondary">Platform owner</Badge> : null}
                  </div>
                </div>

                <Button type="submit" variant="outline" className="mt-3 w-full justify-center">
                  Login as {account.fullName}
                </Button>
              </form>
            ))}
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        size="icon"
        className="size-14 rounded-full shadow-[0_18px_48px_rgba(88,52,24,0.28)]"
        aria-label="Open dev quick login"
      >
        <span className="text-lg font-semibold">Dev</span>
      </Button>
    </div>
  )
}
