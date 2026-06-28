"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { LabeledSelectInput } from "@/components/labeled-select-input"

type MemberMigrationInputPanelsProps = {
  activity?: ReactNode
  commitment: ReactNode
  loan: ReactNode
  profit?: ReactNode
}

export function MemberMigrationInputPanels({
  activity,
  commitment,
  loan,
  profit,
}: MemberMigrationInputPanelsProps) {
  const [mode, setMode] = useState<
    "activity" | "commitment" | "loan" | "profit"
  >(
    "commitment"
  )
  const modeOptions = [
    { label: "Commitment", value: "commitment" },
    { label: "Loan", value: "loan" },
    ...(profit ? [{ label: "Profit", value: "profit" }] : []),
    ...(activity ? [{ label: "Activity", value: "activity" }] : []),
  ]

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
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Input type
          <LabeledSelectInput
            options={modeOptions}
            value={mode}
            triggerClassName="min-w-48"
            onValueChange={(value) =>
              setMode(value as "activity" | "commitment" | "loan" | "profit")
            }
          />
        </label>
      </div>
      <div className="mt-4">
        {mode === "commitment"
          ? commitment
          : mode === "loan"
            ? loan
            : mode === "profit"
              ? profit
              : activity}
      </div>
    </div>
  )
}
