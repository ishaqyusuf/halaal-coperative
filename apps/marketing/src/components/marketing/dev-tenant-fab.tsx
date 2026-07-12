"use client"

import { useMemo } from "react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { buildTenantDashboardUrl } from "@halaalvest/utils"

export type DevTenantFabTenant = {
  id: string
  memberCount: number
  name: string
  slug: string
}

function getPortlessCurrentOrigin(currentOrigin?: string) {
  if (!currentOrigin) return undefined

  try {
    const url = new URL(currentOrigin)
    const isLocalHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "0.0.0.0" ||
      url.hostname.endsWith(".localhost")

    if (isLocalHost) {
      url.protocol = "http:"
    }

    if (url.hostname.endsWith(".localhost")) {
      url.port = ""
      return url.origin
    }
  } catch {
    return currentOrigin
  }

  return currentOrigin
}

export function DevTenantFab({
  tenants,
}: {
  tenants: DevTenantFabTenant[]
}) {
  const currentOrigin = useMemo(
    () =>
      getPortlessCurrentOrigin(
        typeof window === "undefined" ? undefined : window.location.origin,
      ),
    [],
  )

  if (!tenants.length) {
    return null
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Open dev cooperative picker"
              className="size-14 rounded-full shadow-[0_18px_48px_rgba(27,42,38,0.28)]"
              type="button"
            />
          }
        >
          Dev
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[min(22rem,calc(100vw-2rem))] p-1"
          side="top"
          sideOffset={10}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 py-2">
              Dev Cooperative Picker
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {tenants.map((tenant) => {
              const dashboardUrl = buildTenantDashboardUrl(tenant.slug, {
                currentOrigin,
                pathname: "/",
              })

              return (
                <DropdownMenuItem
                  className="items-start justify-between gap-3 px-3 py-3"
                  key={tenant.id}
                  render={<a href={dashboardUrl} />}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {tenant.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {tenant.slug}
                    </span>
                  </span>
                  <Badge className="shrink-0" variant="outline">
                    {tenant.memberCount} members
                  </Badge>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
