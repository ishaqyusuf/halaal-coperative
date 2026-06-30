"use client"

import { OverviewActionLink } from "./overview-ui"
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
    <section className="border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-amber-950">
            Setup needs attention
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Resolve setup warnings before treating the dashboard as a live
            operating view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {warnings.map((warning) => (
            <OverviewActionLink
              key={warning.key}
              href={warning.href}
              variant="secondary"
            >
              {warning.label}
            </OverviewActionLink>
          ))}
        </div>
      </div>
    </section>
  )
}
