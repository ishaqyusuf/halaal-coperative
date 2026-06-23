"use client"

import type { ReactNode } from "react"
import { useState } from "react"

type MemberMigrationInputPanelsProps = {
  activity?: ReactNode
  commitment: ReactNode
  loan: ReactNode
}

export function MemberMigrationInputPanels({
  activity,
  commitment,
  loan,
}: MemberMigrationInputPanelsProps) {
  const [mode, setMode] = useState<"activity" | "commitment" | "loan">(
    "commitment"
  )

  return (
    <div className="mt-5 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Preview member input
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add dated migration inputs, then the generated ledger refreshes from
            the saved history.
          </p>
        </div>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Input type
          <select
            className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            onChange={(event) =>
              setMode(event.target.value as "activity" | "commitment" | "loan")
            }
            value={mode}
          >
            <option value="commitment">Commitment</option>
            <option value="loan">Loan</option>
            {activity ? <option value="activity">Activity</option> : null}
          </select>
        </label>
      </div>
      <div className="mt-4">
        {mode === "commitment" ? commitment : mode === "loan" ? loan : activity}
      </div>
    </div>
  )
}
