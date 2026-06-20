"use client"

import { useMemo, useState } from "react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { buildTenantDashboardUrl, buildTenantSiteUrl } from "@halaalvest/utils"

export type DevTenantFabTenant = {
  id: string
  memberCount: number
  name: string
  slug: string
}

export function DevTenantFab({
  tenants,
}: {
  tenants: DevTenantFabTenant[]
}) {
  const [open, setOpen] = useState(false)
  const currentOrigin = useMemo(
    () => (typeof window === "undefined" ? undefined : window.location.origin),
    [],
  )

  if (!tenants.length) {
    return null
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <div className="w-[min(25rem,calc(100vw-2rem))] rounded-[1.5rem] border border-border/70 bg-background/95 p-4 shadow-[0_24px_80px_rgba(27,42,38,0.18)] backdrop-blur">
          <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Dev Tenant Picker
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Jump into any seeded cooperative site or dashboard for quick local testing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ size: "icon-sm", variant: "ghost" }))}
              aria-label="Close tenant picker"
            >
              <span className="text-base leading-none">×</span>
            </button>
          </div>

          <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {tenants.map((tenant) => {
              const siteUrl = buildTenantSiteUrl(tenant.slug, {
                currentOrigin,
                pathname: "/",
              })
              const dashboardUrl = buildTenantDashboardUrl(tenant.slug, {
                currentOrigin,
                pathname: "/login",
              })

              return (
                <article
                  key={tenant.id}
                  className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{tenant.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{tenant.slug}</p>
                    </div>
                    <Badge variant="outline">{tenant.memberCount} members</Badge>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <a
                      className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
                      href={siteUrl}
                    >
                      Open site
                    </a>
                    <a
                      className={cn(buttonVariants({}), "w-full justify-center")}
                      href={dashboardUrl}
                    >
                      Open dashboard
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="size-14 rounded-full shadow-[0_18px_48px_rgba(27,42,38,0.28)]"
        aria-label="Open dev tenant picker"
      >
        Dev
      </Button>
    </div>
  )
}
