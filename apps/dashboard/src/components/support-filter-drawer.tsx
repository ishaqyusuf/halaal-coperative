"use client"

import {
  MobileFilterGroup,
  filterOptionSummary,
} from "@/components/search-filter/mobile-filter-group"

import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { useState } from "react"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import {
  supportCategoryFilters,
  supportPriorityFilters,
  supportStatusFilters,
} from "@/components/support-search-filter"
import {
  clearedSupportFilters,
  useSupportFilterParams,
} from "@/hooks/use-support-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

type SupportFilterDraft = {
  assignedToUserId: string | null
  category: string | null
  priority: string | null
  q: string | null
  sort: string[] | null
  status: string | null
}

const supportSortOptions = [
  { id: "updatedAt,desc", name: "Recently updated" },
  { id: "updatedAt,asc", name: "Oldest update first" },
  { id: "createdAt,desc", name: "Recently opened" },
  { id: "createdAt,asc", name: "Oldest opened first" },
  { id: "priority,desc", name: "Highest priority first" },
] as const

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
      className="divide-y divide-border border-y border-border"
      onValueChange={(nextValue) =>
        onValueChange(nextValue === "all" ? null : nextValue)
      }
      value={value ?? "all"}
    >
      {[{ id: "all", name: "Any" }, ...options].map((option) => (
        <label
          className="flex min-h-11 items-center gap-3 px-1 py-2 text-xs"
          htmlFor={`support-filter-${idPrefix}-${option.id}`}
          key={option.id}
        >
          <RadioGroupItem
            id={`support-filter-${idPrefix}-${option.id}`}
            value={option.id}
          />
          <span className="min-w-0 truncate">{option.name}</span>
        </label>
      ))}
    </RadioGroup>
  )
}

export function SupportFilterDrawer({
  assignees,
  mode,
  onOpenChange,
  open,
}: {
  assignees: Array<{ id: string; label: string }>
  mode: "member" | "staff"
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useSupportFilterParams()
  const { params, setParams } = useSortParams()
  const [draft, setDraft] = useState<SupportFilterDraft>({
    ...filter,
    sort: params.sort,
  })
  const sortValue = draft.sort?.join(",") ?? "updatedAt,desc"

  async function applyFilters() {
    const { sort, ...nextFilters } = draft
    await Promise.all([
      setFilter(
        mode === "staff"
          ? { ...nextFilters, q: filter.q }
          : {
              ...nextFilters,
              q: filter.q,
              assignedToUserId: null,
              category: null,
            }
      ),
      setParams({ sort: sortValue === "updatedAt,desc" ? null : sort }),
    ])
  }

  function clearFilters() {
    setDraft({ ...clearedSupportFilters, q: filter.q, sort: null })
  }

  return (
    <MobileFilterDrawer
      description="Filter and sort the support queue."
      onApply={applyFilters}
      onClear={clearFilters}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter support cases"
    >
      <div className="space-y-0">
        <MobileFilterGroup
          title="Status"
          summary={filterOptionSummary(draft.status, supportStatusFilters)}
        >
          <FilterRadioGroup
            idPrefix="status"
            onValueChange={(status) =>
              setDraft((current) => ({ ...current, status }))
            }
            options={supportStatusFilters}
            value={draft.status}
          />
        </MobileFilterGroup>

        <MobileFilterGroup
          title="Priority"
          summary={filterOptionSummary(draft.priority, supportPriorityFilters)}
        >
          <FilterRadioGroup
            idPrefix="priority"
            onValueChange={(priority) =>
              setDraft((current) => ({ ...current, priority }))
            }
            options={supportPriorityFilters}
            value={draft.priority}
          />
        </MobileFilterGroup>

        {mode === "staff" ? (
          <>
            <MobileFilterGroup
              title="Category"
              summary={filterOptionSummary(
                draft.category,
                supportCategoryFilters
              )}
            >
              <FilterRadioGroup
                idPrefix="category"
                onValueChange={(category) =>
                  setDraft((current) => ({ ...current, category }))
                }
                options={supportCategoryFilters}
                value={draft.category}
              />
            </MobileFilterGroup>

            {assignees.length ? (
              <>
                <MobileFilterGroup
                  title="Assignee"
                  summary={filterOptionSummary(
                    draft.assignedToUserId,
                    assignees.map((assignee) => ({
                      id: assignee.id,
                      name: assignee.label,
                    }))
                  )}
                >
                  <FilterRadioGroup
                    idPrefix="assignee"
                    onValueChange={(assignedToUserId) =>
                      setDraft((current) => ({
                        ...current,
                        assignedToUserId,
                      }))
                    }
                    options={assignees.map((assignee) => ({
                      id: assignee.id,
                      name: assignee.label,
                    }))}
                    value={draft.assignedToUserId}
                  />
                </MobileFilterGroup>
              </>
            ) : null}
          </>
        ) : null}

        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sortValue, supportSortOptions)}
        >
          <RadioGroup
            className="divide-y divide-border border-y border-border"
            onValueChange={(nextSort) =>
              setDraft((current) => ({
                ...current,
                sort:
                  nextSort === "updatedAt,desc" ? null : nextSort.split(","),
              }))
            }
            value={sortValue}
          >
            {supportSortOptions.map((option) => (
              <label
                className="flex min-h-11 items-center gap-3 px-1 py-2 text-xs"
                htmlFor={`support-sort-${option.id}`}
                key={option.id}
              >
                <RadioGroupItem
                  id={`support-sort-${option.id}`}
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
