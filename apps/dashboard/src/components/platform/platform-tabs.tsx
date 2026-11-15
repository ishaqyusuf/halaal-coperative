"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@halaalvest/ui/lib/utils"

const pages = [
  { href: "/platform/privacy-requests", label: "Privacy requests" },
  { href: "/platform/refund-reviews", label: "Refund reviews" },
  { href: "/platform/bills", label: "Halaalvest bills" },
  { href: "/platform/qa-maintenance", label: "Test data" },
] as const

/**
 * The platform pages have no sidebar links (the sidebar is per cooperative),
 * so each one opens with the same four plain links. Wraps on phones.
 */
export function PlatformTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Platform pages" className="flex flex-wrap gap-2">
      {pages.map((page) => {
        const active = pathname === page.href
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-base font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:bg-muted"
            )}
            href={page.href}
            key={page.href}
          >
            {page.label}
          </Link>
        )
      })}
    </nav>
  )
}
