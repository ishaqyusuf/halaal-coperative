"use client"

import { formatDateFilterValue } from "@/components/search-filter/search-filter-utils"

import {
  MobileFilterGroup,
  filterOptionSummary,
} from "@/components/search-filter/mobile-filter-group"

import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { useState } from "react"
import {
  businessHasProfitEntryFilters,
  businessProfitStatusFilters,
  businessSortOptions,
  businessSourceTypeFilters,
  businessStatusFilters,
} from "@/components/business-filter-options"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import { DateRangeFilter } from "@/components/search-filter/date-range-filter"
import { useBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

type BusinessFilterDraft = {
  dateRange: string[] | null
  dividendPeriodId: string | null
  hasProfitEntries: boolean | null
  profitStatus: string | null
  q: string | null
  sort: string[] | null
  sourceType: string | null
  status: string | null
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

  async function applyFilters() {
    const { sort, ...nextFilters } = draft
    await Promise.all([
      setFilter({ ...nextFilters, q: filter.q }),
      setParams({
        sort: sortValue === "startDate,desc" ? null : sort,
      }),
    ])
  }

  function clearFilters() {
    setDraft({
      dateRange: null,
      dividendPeriodId: null,
      hasProfitEntries: null,
      profitStatus: null,
      q: filter.q,
      sort: null,
      sourceType: null,
      status: null,
    })
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
      <div className="space-y-0">
        <MobileFilterGroup
          title="Business status"
          summary={filterOptionSummary(draft.status, businessStatusFilters)}
        >
          <FilterRadioGroup
            idPrefix="status"
            onValueChange={(status) =>
              setDraft((current) => ({ ...current, status }))
            }
            options={businessStatusFilters}
            value={draft.status}
          />
        </MobileFilterGroup>

        <MobileFilterGroup
          title="Latest profit status"
          summary={filterOptionSummary(
            draft.profitStatus,
            businessProfitStatusFilters
          )}
        >
          <FilterRadioGroup
            idPrefix="profit-status"
            onValueChange={(profitStatus) =>
              setDraft((current) => ({ ...current, profitStatus }))
            }
            options={businessProfitStatusFilters}
            value={draft.profitStatus}
          />
        </MobileFilterGroup>

        <MobileFilterGroup
          title="Profit evidence"
          summary={filterOptionSummary(
            draft.hasProfitEntries === null
              ? null
              : String(draft.hasProfitEntries),
            businessHasProfitEntryFilters
          )}
        >
          <FilterRadioGroup
            idPrefix="profit-entry"
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                hasProfitEntries: value === null ? null : value === "true",
              }))
            }
            options={businessHasProfitEntryFilters}
            value={
              draft.hasProfitEntries === null
                ? null
                : String(draft.hasProfitEntries)
            }
          />
        </MobileFilterGroup>

        <MobileFilterGroup
          title="Source"
          summary={filterOptionSummary(
            draft.sourceType,
            businessSourceTypeFilters
          )}
        >
          <FilterRadioGroup
            idPrefix="source"
            onValueChange={(sourceType) =>
              setDraft((current) => ({ ...current, sourceType }))
            }
            options={businessSourceTypeFilters}
            value={draft.sourceType}
          />
        </MobileFilterGroup>

        {dividendPeriods.length ? (
          <>
            <MobileFilterGroup
              title="Dividend period"
              summary={filterOptionSummary(
                draft.dividendPeriodId,
                dividendPeriods.map((period) => ({
                  id: period.id,
                  name: period.label,
                }))
              )}
            >
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
            </MobileFilterGroup>
          </>
        ) : null}

        <MobileFilterGroup
          title="Business start date"
          summary={formatDateFilterValue(draft.dateRange)}
        >
          <div className="border border-border">
            <DateRangeFilter
              mobile
              onChange={(dateRange) =>
                setDraft((current) => ({ ...current, dateRange }))
              }
              value={draft.dateRange}
            />
          </div>
        </MobileFilterGroup>

        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sortValue, businessSortOptions)}
        >
          <RadioGroup
            onValueChange={(nextSort) =>
              setDraft((current) => ({
                ...current,
                sort:
                  nextSort === "startDate,desc" ? null : nextSort.split(","),
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
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}
