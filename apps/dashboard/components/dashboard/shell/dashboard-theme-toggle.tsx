"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { buttonVariants } from "@halaal-vest/ui/components/button"
import { cn } from "@halaal-vest/ui/lib/utils"

export function DashboardThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const nextTheme = isDark ? "light" : "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "rounded-full px-3")}
      aria-label={mounted ? `Switch to ${nextTheme} theme` : "Toggle theme"}
      title={mounted ? `Switch to ${nextTheme} theme` : "Toggle theme"}
    >
      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {mounted ? (isDark ? "Dark" : "Light") : "Theme"}
      </span>
    </button>
  )
}
