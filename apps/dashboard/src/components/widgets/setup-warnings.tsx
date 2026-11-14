"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { CircleAlert } from "lucide-react"
import type { OverviewSummary } from "./overview-utils"

export function SetupWarnings({
  warnings,
}: {
  warnings: OverviewSummary["setupWarnings"]
}) {
  if (warnings.length === 0) {
    return null
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-(--ui-radius-surface) border border-amber-300 bg-amber-50 p-5 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
    >
      <p className="flex items-start gap-3 text-base font-medium">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        Setup is not finished. Some numbers may be incomplete.
      </p>
      <Link
        className={buttonVariants({ variant: "default" })}
        href={warnings[0]?.href ?? "/getting-started"}
      >
        Finish setup
      </Link>
    </section>
  )
}
