"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { cn } from "@halaalvest/ui/lib/utils"
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

export function getUserInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  return initials || "?"
}

const subscribeToNothing = () => () => {}

/** Account menu in the top bar: who is signed in, theme and sign out. */
export function DashboardUserMenu({
  roleLabel,
  userName,
}: {
  roleLabel: string
  userName: string
}) {
  const { resolvedTheme, setTheme } = useTheme()
  // False on the server and during hydration, true after: the theme is only
  // known in the browser.
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  )

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Your account"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-11 gap-2 rounded-full px-1.5 lg:pr-3"
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          {getUserInitials(userName)}
        </span>
        <span className="hidden max-w-[180px] text-left lg:block">
          <span className="block truncate text-sm font-medium text-foreground">
            {userName}
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {roleLabel}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="hidden size-4 lg:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        // Opaque: the shared menu is see-through, which is hard to read here.
        className="w-64 bg-popover before:hidden"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2">
            <span className="block truncate text-base font-medium text-foreground">
              {userName}
            </span>
            <span className="block truncate text-sm text-muted-foreground">
              {roleLabel}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-11 px-3 text-base"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? (
            <Sun aria-hidden="true" className="size-5" />
          ) : (
            <Moon aria-hidden="true" className="size-5" />
          )}
          {isDark ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 px-3 text-base"
          render={<Link href="/auth/logout" />}
        >
          <LogOut aria-hidden="true" className="size-5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
