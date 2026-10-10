"use client"

import { formatDateFilterValue } from "@/components/search-filter/search-filter-utils"

import {
  MobileFilterGroup,
  filterOptionSummary,
} from "@/components/search-filter/mobile-filter-group"

import type { TenantMigrationSetupMode } from "@halaalvest/db"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { useState } from "react"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import { DateRangeFilter } from "@/components/search-filter/date-range-filter"
import {
  getMigrationStatusFilters,
  kycStatusFilters,
  memberSortOptions,
  memberStatusFilters,
  memberTypeFilters,
} from "@/components/members/member-filter-options"
import {
  clearedMembersControlsParams,
  type MembersFilterParams,
  useMembersControlsParams,
} from "@/hooks/use-members-filter-params"

type MembersControlDraft = MembersFilterParams & {
  sort: string[] | null
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
          htmlFor={`member-filter-${idPrefix}-${option.id}`}
          key={option.id}
        >
          <RadioGroupItem
            id={`member-filter-${idPrefix}-${option.id}`}
            value={option.id}
          />
          <span>{option.name}</span>
        </label>
      ))}
    </RadioGroup>
  )
}

export function MembersFilterDrawer({
  migrationSetupMode,
  onOpenChange,
  open,
}: {
  migrationSetupMode: TenantMigrationSetupMode
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { params, setParams } = useMembersControlsParams()
  const [draft, setDraft] = useState<MembersControlDraft>({
    dateRange: params.dateRange,
    kycStatus: params.kycStatus,
    memberType: params.memberType,
    migrationStatus: params.migrationStatus,
    q: params.q,
    sort: params.sort,
    status: params.status,
  })
  const migrationLabel =
    migrationSetupMode === "brought_forward" ? "Brought forward" : "Backfill"
  const migrationStatusFilters = getMigrationStatusFilters(migrationLabel)
  const sortValue = draft.sort?.join(",") ?? "joinedAt,desc"

  async function applyFilters() {
    await setParams({ ...draft, q: params.q })
  }

  function clearFilters() {
    setDraft({ ...clearedMembersControlsParams, q: params.q })
  }

  return (
    <MobileFilterDrawer
      description="Filter and sort the member directory."
      onApply={applyFilters}
      onClear={clearFilters}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter members"
    >
      <div className="space-y-0">
        <MobileFilterGroup
          title="Member status"
          summary={filterOptionSummary(draft.status, memberStatusFilters)}
        >
          <FilterRadioGroup
            idPrefix="status"
            onValueChange={(status) =>
              setDraft((current) => ({ ...current, status }))
            }
            options={memberStatusFilters}
            value={draft.status}
          />
        </MobileFilterGroup>

        <MobileFilterGroup
          title="Member type"
          summary={filterOptionSummary(draft.memberType, memberTypeFilters)}
        >
          <FilterRadioGroup
            idPrefix="type"
            onValueChange={(memberType) =>
              setDraft((current) => ({ ...current, memberType }))
            }
            options={memberTypeFilters}
            value={draft.memberType}
          />
        </MobileFilterGroup>

        <MobileFilterGroup
          title="KYC status"
          summary={filterOptionSummary(draft.kycStatus, kycStatusFilters)}
        >
          <FilterRadioGroup
            idPrefix="kyc"
            onValueChange={(kycStatus) =>
              setDraft((current) => ({ ...current, kycStatus }))
            }
            options={kycStatusFilters}
            value={draft.kycStatus}
          />
        </MobileFilterGroup>

        <MobileFilterGroup
          title={`${migrationLabel} setup`}
          summary={filterOptionSummary(
            draft.migrationStatus,
            migrationStatusFilters
          )}
        >
          <FilterRadioGroup
            idPrefix="migration"
            onValueChange={(migrationStatus) =>
              setDraft((current) => ({ ...current, migrationStatus }))
            }
            options={migrationStatusFilters}
            value={draft.migrationStatus}
          />
        </MobileFilterGroup>

        <MobileFilterGroup
          title="Joined date"
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
          summary={filterOptionSummary(sortValue, memberSortOptions)}
        >
          <RadioGroup
            onValueChange={(nextSort) =>
              setDraft((current) => ({
                ...current,
                sort: nextSort === "joinedAt,desc" ? null : nextSort.split(","),
              }))
            }
            value={sortValue}
          >
            {memberSortOptions.map((option) => (
              <label
                className="flex min-h-11 items-center gap-3 border border-border px-3 py-2 text-xs"
                htmlFor={`member-sort-${option.id}`}
                key={option.id}
              >
                <RadioGroupItem
                  id={`member-sort-${option.id}`}
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
