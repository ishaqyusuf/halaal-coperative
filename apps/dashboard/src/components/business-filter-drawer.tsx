"use client"

import { Calendar } from "@halaalvest/ui/components/calendar"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Separator } from "@halaalvest/ui/components/separator"
import { formatISO, parseISO } from "date-fns"
import { useState, type ReactNode } from "react"
import {
  businessHasProfitEntryFilters,
  businessProfitStatusFilters,
  businessSortOptions,
  businessSourceTypeFilters,
  businessStatusFilters,
} from "@/components/business-filter-options"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import { useBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

type BusinessFilterDraft = {
  dividendPeriodId: string | null
  hasProfitEntries: boolean | null
  profitStatus: string | null
  q: string | null
  sort: string[] | null
  sourceType: string | null
  startFrom: string | null
  startTo: string | null
  status: string | null
}

function FilterSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function FilterRadioGroup({
  idPrefix,
  onValueChange,
  options,
  value,
}: {
  idPrefix: string
  onValueChange: (value: string | null) => void
  options: ReadonlyArray<{ id: string; name: string }>
  value: string | null
}) {
  return (
    <RadioGroup
      onValueChange={(nextValue) =>
        onValueChange(nextValue === "all" ? null : nextValue)
      }
      value={value ?? "all"}
    >
      {[{ id: "all", name: "Any" }, ...options].map((option) => (
        <label
          className="flex min-h-11 items-center gap-3 border border-border px-3 py-2 text-xs"
          htmlFor={`business-filter-${idPrefix}-${option.id}`}
          key={option.id}
        >
          <RadioGroupItem
            id={`business-filter-${idPrefix}-${option.id}`}
            value={option.id}
          />
          <span>{option.name}</span>
        </label>
      ))}
    </RadioGroup>
  )
}

export function BusinessFilterDrawer({
  dividendPeriods,
  onOpenChange,
  open,
}: {
  dividendPeriods: Array<{ id: string; label: string }>
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useBusinessFilterParams()
  const { params, setParams } = useSortParams()
  const [draft, setDraft] = useState<BusinessFilterDraft>({
    ...filter,
    sort: params.sort,
  })
  const sortValue = draft.sort?.join(",") ?? "startDate,desc"

  function applyFilters() {
    const { sort, ...nextFilters } = draft
    void Promise.all([
      setFilter(nextFilters),
      setParams({
        sort: sortValue === "startDate,desc" ? null : sort,
      }),
    ])
    onOpenChange(false)
  }

  function clearFilters() {
    const cleared: BusinessFilterDraft = {
      dividendPeriodId: null,
      hasProfitEntries: null,
      profitStatus: null,
      q: null,
      sort: null,
      sourceType: null,
      startFrom: null,
      startTo: null,
      status: null,
    }
    setDraft(cleared)
    void Promise.all([
      setFilter({
        dividendPeriodId: null,
        hasProfitEntries: null,
        profitStatus: null,
        q: null,
        sourceType: null,
        startFrom: null,
        startTo: null,
        status: null,
      }),
      setParams({ sort: null }),
    ])
    onOpenChange(false)
  }

  return (
    <MobileFilterDrawer
      description="Filter and sort cooperative business records."
      onApply={applyFilters}
      onClear={clearFilters}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter businesses"
    >
      <div className="space-y-6">
        <FilterSection title="Business status">
          <FilterRadioGroup
            idPrefix="status"
            onValueChange={(status) =>
              setDraft((current) => ({ ...current, status }))
            }
            options={businessStatusFilters}
            value={draft.status}
          />
        </FilterSection>

        <Separator />

        <FilterSection title="Latest profit status">
          <FilterRadioGroup
            idPrefix="profit-status"
            onValueChange={(profitStatus) =>
              setDraft((current) => ({ ...current, profitStatus }))
            }
            options={businessProfitStatusFilters}
            value={draft.profitStatus}
          />
        </FilterSection>

        <Separator />

        <FilterSection title="Profit evidence">
          <FilterRadioGroup
            idPrefix="profit-entry"
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                hasProfitEntries:
                  value === null ? null : value === "true",
              }))
            }
            options={businessHasProfitEntryFilters}
            value={
              draft.hasProfitEntries === null
                ? null
                : String(draft.hasProfitEntries)
            }
          />
        </FilterSection>

        <Separator />

        <FilterSection title="Source">
          <FilterRadioGroup
            idPrefix="source"
            onValueChange={(sourceType) =>
              setDraft((current) => ({ ...current, sourceType }))
            }
            options={businessSourceTypeFilters}
            value={draft.sourceType}
          />
        </FilterSection>

        {dividendPeriods.length ? (
          <>
            <Separator />
            <FilterSection title="Dividend period">
              <FilterRadioGroup
                idPrefix="dividend-period"
                onValueChange={(dividendPeriodId) =>
                  setDraft((current) => ({
                    ...current,
                    dividendPeriodId,
                  }))
                }
                options={dividendPeriods.map((period) => ({
                  id: period.id,
                  name: period.label,
                }))}
                value={draft.dividendPeriodId}
              />
            </FilterSection>
          </>
        ) : null}

        <Separator />

        <FilterSection title="Business start date">
          <div className="overflow-x-auto border border-border">
            <Calendar
              defaultMonth={
                draft.startFrom ? parseISO(draft.startFrom) : new Date()
              }
              mode="range"
              numberOfMonths={1}
              onSelect={(range) =>
                setDraft((current) => ({
                  ...current,
                  startFrom: range?.from
                    ? formatISO(range.from, { representation: "date" })
                    : null,
                  startTo: range?.to
                    ? formatISO(range.to, { representation: "date" })
                    : null,
                }))
              }
              selected={{
                from: draft.startFrom
                  ? parseISO(draft.startFrom)
                  : undefined,
                to: draft.startTo ? parseISO(draft.startTo) : undefined,
              }}
            />
          </div>
        </FilterSection>

        <Separator />

        <FilterSection title="Sort by">
          <RadioGroup
            onValueChange={(nextSort) =>
              setDraft((current) => ({
                ...current,
                sort:
                  nextSort === "startDate,desc"
                    ? null
                    : nextSort.split(","),
              }))
            }
            value={sortValue}
          >
            {businessSortOptions.map((option) => (
              <label
                className="flex min-h-11 items-center gap-3 border border-border px-3 py-2 text-xs"
                htmlFor={`business-sort-${option.id}`}
                key={option.id}
              >
                <RadioGroupItem
                  id={`business-sort-${option.id}`}
                  value={option.id}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </RadioGroup>
        </FilterSection>
      </div>
    </MobileFilterDrawer>
  )
}
