"use client"

import { useState } from "react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@halaalvest/ui/components/tooltip"
import { formatCurrency } from "@halaalvest/utils"

import {
  MemberProfitSeasonAdjustmentPopover,
  type MemberProfitSeasonAdjustmentValue,
} from "./member-profit-season-adjustment-popover"

export type MemberProfitSeasonAdjustmentEntry = {
  businessName: string
  editableAvailableAmount: number
  id: string
  profitDate: string
  profitAmount: number
}

export type MemberProfitSeasonAdjustmentSeason = {
  businessNames: string[]
  editableAvailableAmount: number
  entries: MemberProfitSeasonAdjustmentEntry[]
  key: string
  label: string
  memberMigrationAdjustmentAmount: number
  memberMigrationAdjustmentSharePercentage: number | null
  periodEnd?: string | null
  periodStart?: string | null
  status?: string | null
}

function displayEnum(value: string) {
  return value.replaceAll("_", " ")
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function createInitialAdjustment(
  season: MemberProfitSeasonAdjustmentSeason
): MemberProfitSeasonAdjustmentValue {
  return {
    amount:
      season.memberMigrationAdjustmentAmount > 0
        ? String(season.memberMigrationAdjustmentAmount)
        : "",
    mode:
      season.memberMigrationAdjustmentSharePercentage == null
        ? "fixed"
        : "percentage",
    sharePercentage:
      season.memberMigrationAdjustmentSharePercentage == null
        ? ""
        : String(season.memberMigrationAdjustmentSharePercentage),
  }
}

function hasAdjustment(value: MemberProfitSeasonAdjustmentValue) {
  if (value.mode === "percentage") {
    return value.sharePercentage.trim().length > 0
  }

  const amount = Number(value.amount || 0)

  return Number.isFinite(amount) && amount > 0
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function createQuickFillAmount(maxAmount: number) {
  const safeMaxAmount = Math.floor(maxAmount)

  if (safeMaxAmount <= 0) {
    return ""
  }

  const minAmount = Math.max(1, Math.floor(safeMaxAmount * 0.05))
  const maxTargetAmount = Math.max(
    minAmount,
    Math.floor(safeMaxAmount * 0.35)
  )

  return String(Math.min(safeMaxAmount, randomInt(minAmount, maxTargetAmount)))
}

export function MemberProfitSeasonAdjustmentTable({
  disabled,
  seasons,
}: {
  disabled: boolean
  seasons: MemberProfitSeasonAdjustmentSeason[]
}) {
  const [adjustments, setAdjustments] = useState<
    Record<string, MemberProfitSeasonAdjustmentValue>
  >(() =>
    Object.fromEntries(
      seasons.map((season) => [season.key, createInitialAdjustment(season)])
    )
  )
  const hasQuickFillTargets = seasons.some((season) => {
    const value = adjustments[season.key] ?? createInitialAdjustment(season)

    return season.editableAvailableAmount > 0 && !hasAdjustment(value)
  })

  function updateAdjustment(
    seasonKey: string,
    value: MemberProfitSeasonAdjustmentValue
  ) {
    setAdjustments((currentAdjustments) => ({
      ...currentAdjustments,
      [seasonKey]: value,
    }))
  }

  function quickFillSeasons() {
    setAdjustments((currentAdjustments) => {
      const nextAdjustments = { ...currentAdjustments }

      for (const season of seasons) {
        const currentValue =
          nextAdjustments[season.key] ?? createInitialAdjustment(season)

        if (
          hasAdjustment(currentValue) ||
          season.editableAvailableAmount <= 0
        ) {
          continue
        }

        nextAdjustments[season.key] = {
          ...currentValue,
          amount: createQuickFillAmount(season.editableAvailableAmount),
          mode: "fixed",
        }
      }

      return nextAdjustments
    })
  }

  return (
    <div className="grid gap-2">
      <div className="flex justify-end">
        <Button
          disabled={disabled || !hasQuickFillTargets}
          onClick={quickFillSeasons}
          size="sm"
          type="button"
          variant="ghost"
        >
          Quick fill
        </Button>
      </div>
      <div className="grid gap-3">
        {seasons.map((season) => {
          const visibleBusinessNames = season.businessNames.slice(0, 1)
          const hiddenBusinessCount =
            season.businessNames.length - visibleBusinessNames.length
          const value =
            adjustments[season.key] ?? createInitialAdjustment(season)

          return (
            <div
              className="grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem] sm:items-start"
              key={season.key}
            >
              <div>
                <input name="seasonKey" type="hidden" value={season.key} />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          className="text-left font-medium underline-offset-4 hover:underline"
                          type="button"
                        />
                      }
                    >
                      {season.label}
                    </TooltipTrigger>
                    <TooltipContent
                      align="start"
                      className="grid max-w-[460px] gap-2 rounded-sm border border-border bg-popover p-3 text-popover-foreground shadow-xl [&>*:last-child]:bg-popover [&>*:last-child]:fill-popover"
                      side="right"
                      sideOffset={12}
                    >
                      <div className="border-b border-border/70 pb-2">
                        <p className="text-sm font-semibold">
                          Profit entries
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {season.periodStart && season.periodEnd
                            ? `${formatDate(season.periodStart)} - ${formatDate(season.periodEnd)}`
                            : season.label}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {season.entries.map((entry) => (
                          <div
                            className="grid gap-1 border-b border-border/70 pb-2 last:border-b-0 last:pb-0"
                            key={entry.id}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">
                                {entry.businessName}
                              </span>
                              <span className="tabular-nums">
                                {formatCurrency(entry.profitAmount)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-muted-foreground">
                              <span>{formatDate(entry.profitDate)}</span>
                              <span>
                                available{" "}
                                {formatCurrency(entry.editableAvailableAmount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="mt-1 flex flex-wrap gap-1">
                  {visibleBusinessNames.map((businessName) => (
                    <Badge
                      key={`${season.key}-${businessName}`}
                      variant="secondary"
                    >
                      {businessName}
                    </Badge>
                  ))}
                  {hiddenBusinessCount > 0 ? (
                    <Badge variant="outline">+{hiddenBusinessCount}</Badge>
                  ) : null}
                  {season.status ? (
                    <Badge variant="outline">
                      {displayEnum(season.status)}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium text-muted-foreground">
                  Available
                </p>
                <p className="mt-1 text-sm">
                  {formatCurrency(season.editableAvailableAmount)}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground sm:text-right">
                  Amount
                </p>
                <MemberProfitSeasonAdjustmentPopover
                  disabled={disabled}
                  onChange={(nextValue) =>
                    updateAdjustment(season.key, nextValue)
                  }
                  seasonKey={season.key}
                  value={value}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
