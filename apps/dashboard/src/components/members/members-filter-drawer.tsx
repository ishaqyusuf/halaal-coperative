"use client"

import type { TenantMigrationSetupMode } from "@halaalvest/db"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Separator } from "@halaalvest/ui/components/separator"
import { useState, type ReactNode } from "react"
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

  function applyFilters() {
    void setParams(draft)
    onOpenChange(false)
  }

  function clearFilters() {
    setDraft(clearedMembersControlsParams)
    void setParams(clearedMembersControlsParams)
    onOpenChange(false)
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
      <div className="space-y-6">
        <FilterSection title="Member status">
          <FilterRadioGroup
            idPrefix="status"
            onValueChange={(status) =>
              setDraft((current) => ({ ...current, status }))
            }
            options={memberStatusFilters}
            value={draft.status}
          />
        </FilterSection>

        <Separator />

        <FilterSection title="Member type">
          <FilterRadioGroup
            idPrefix="type"
            onValueChange={(memberType) =>
              setDraft((current) => ({ ...current, memberType }))
            }
            options={memberTypeFilters}
            value={draft.memberType}
          />
        </FilterSection>

        <Separator />

        <FilterSection title="KYC status">
          <FilterRadioGroup
            idPrefix="kyc"
            onValueChange={(kycStatus) =>
              setDraft((current) => ({ ...current, kycStatus }))
            }
            options={kycStatusFilters}
            value={draft.kycStatus}
          />
        </FilterSection>

        <Separator />

        <FilterSection title={`${migrationLabel} setup`}>
          <FilterRadioGroup
            idPrefix="migration"
            onValueChange={(migrationStatus) =>
              setDraft((current) => ({ ...current, migrationStatus }))
            }
            options={migrationStatusFilters}
            value={draft.migrationStatus}
          />
        </FilterSection>

        <Separator />

        <FilterSection title="Joined date">
          <div className="border border-border">
            <DateRangeFilter
              onChange={(dateRange) =>
                setDraft((current) => ({ ...current, dateRange }))
              }
              value={draft.dateRange}
            />
          </div>
        </FilterSection>

        <Separator />

        <FilterSection title="Sort by">
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
        </FilterSection>
      </div>
    </MobileFilterDrawer>
  )
}
