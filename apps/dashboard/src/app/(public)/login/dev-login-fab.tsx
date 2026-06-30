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
    <div className="fixed right-4 bottom-4 z-50 hidden flex-col items-end gap-3 sm:right-6 sm:bottom-6 sm:flex">
      {open ? (
        <div className="w-[min(23rem,calc(100vw-2rem))] rounded-md border border-[#d6a63a]/60 bg-[#fff8df] p-3 shadow-lg backdrop-blur dark:border-[#d6a63a]/40 dark:bg-[#201b0d]">
          <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <p className="text-xs font-semibold text-[#0b1f36] dark:text-[#f7faf7]">
                Dev quick login
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Seeded and database-backed accounts for local access.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              size="icon-sm"
              variant="ghost"
              aria-label="Close quick login"
            >
              <span className="text-base leading-none">x</span>
            </Button>
          </div>

          <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {accounts.map((account) => (
              <form
                key={account.userId}
                action={action}
                method="post"
                className="rounded-md border border-[#d6a63a]/35 bg-background/85 p-3 dark:bg-background/60"
              >
                <input type="hidden" name="userId" value={account.userId} />
                <input type="hidden" name="next" value={nextPath} />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {account.fullName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {account.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {account.tenantName}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <Badge variant="outline">{account.roleLabel}</Badge>
                    {account.isPlatformOwner ? (
                      <Badge variant="secondary">Platform owner</Badge>
                    ) : null}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  className="mt-3 w-full justify-center"
                >
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
        className="size-12 rounded-md border-[#d6a63a] bg-[#d6a63a] text-[#0b1f36] shadow-lg hover:bg-[#c9952d]"
        aria-label="Open dev quick login"
      >
        <span className="text-xs font-semibold">DEV</span>
      </Button>
    </div>
  )
}
