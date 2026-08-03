"use client"

import type { TenantMigrationSetupMode } from "@halaalvest/db"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import {
  BadgeCheck,
  CalendarDays,
  CircleDot,
  History,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import {
  MemberFilterList,
  type MemberFilterValue,
} from "@/components/member-filter-list"
import {
  getMigrationStatusFilters,
  kycStatusFilters,
  memberStatusFilters,
  memberTypeFilters,
} from "@/components/members/member-filter-options"
import { SearchFilterDropdownInput } from "@/components/search-filter-dropdown-input"
import { DateRangeFilter } from "@/components/search-filter/date-range-filter"
import type { MembersFilterParams } from "@/hooks/use-members-filter-params"
import { useMembersFilterParams } from "@/hooks/use-members-filter-params"
import { hasActiveMemberFilters } from "@/lib/members/member-filters"

type FilterMenuItemProps = {
  children: ReactNode
  icon: LucideIcon
  label: string
}

type FilterCheckboxItemProps = {
  checked?: boolean
  className?: string
  id: string
  name: string
  onCheckedChange: (checked: boolean) => void
}

function FilterMenuItem({ icon: Icon, label, children }: FilterMenuItemProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Icon className="mr-2 size-4" />
          <span>{label}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent
            alignOffset={-4}
            className="p-0"
            sideOffset={14}
          >
            {children}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  )
}

function FilterCheckboxItem({
  checked = false,
  className,
  id,
  name,
  onCheckedChange,
}: FilterCheckboxItemProps) {
  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      className={className}
      key={id}
      onCheckedChange={onCheckedChange}
      onSelect={(event) => event.preventDefault()}
    >
      {name}
    </DropdownMenuCheckboxItem>
  )
}

export function MembersSearchFilter({
  migrationSetupMode = "historical_backfill",
}: {
  migrationSetupMode?: TenantMigrationSetupMode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { filters, setFilters } = useMembersFilterParams()
  const hasFilters = hasActiveMemberFilters(filters)
  const migrationLabel =
    migrationSetupMode === "brought_forward" ? "Brought forward" : "Backfill"
  const migrationStatusFilters = getMigrationStatusFilters(migrationLabel)

  useHotkeys("esc", () => setFilters({ q: null }, { shallow: false }), {
    enableOnFormTags: true,
  })

  function setMemberFilter(
    key: "kycStatus" | "memberType" | "migrationStatus" | "status",
    value: string | null
  ) {
    setFilters({ [key]: value } as Partial<MembersFilterParams>, {
      shallow: false,
    })
  }

  function removeMemberFilters(update: { [key: string]: null }) {
    setFilters(update as Partial<MembersFilterParams>, { shallow: false })
  }

  function processFiltersForList(): Partial<MemberFilterValue> {
    const processed = {
      dateRange: filters.dateRange ?? undefined,
      kycStatus: filters.kycStatus ?? undefined,
      memberType: filters.memberType ?? undefined,
      migrationStatus: filters.migrationStatus ?? undefined,
      status: filters.status ?? undefined,
    }

    return Object.fromEntries(
      Object.entries(processed).filter(
        ([, value]) => value !== undefined && value !== null
      )
    ) as Partial<MemberFilterValue>
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex w-full flex-col items-stretch space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4 md:w-auto">
        <form
          data-quick-fill-exempt="true"
          className="relative flex-1 sm:flex-initial"
          onSubmit={(event) => event.preventDefault()}
        >
          <SearchFilterDropdownInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            filterActive={hasFilters}
            filterOpen={isOpen}
            onChange={(event) =>
              setFilters({ q: event.target.value || null }, { shallow: false })
            }
            placeholder="Search members..."
            spellCheck="false"
            type="search"
            value={filters.q ?? ""}
          />
        </form>

        <MemberFilterList
          filters={processFiltersForList()}
          onRemove={removeMemberFilters}
          options={{
            kycStatus: kycStatusFilters,
            memberType: memberTypeFilters,
            migrationStatus: migrationStatusFilters,
            status: memberStatusFilters,
          }}
        />
      </div>

      <DropdownMenuContent
        align="end"
        alignOffset={-11}
        className="w-[calc(100vw-2rem)] max-w-[350px]"
        side="bottom"
        sideOffset={19}
      >
        <FilterMenuItem icon={CircleDot} label="Member status">
          {memberStatusFilters.map(({ id, name }) => (
            <FilterCheckboxItem
              checked={filters.status === id}
              id={id}
              key={id}
              name={name}
              onCheckedChange={(checked) =>
                setMemberFilter("status", checked ? id : null)
              }
            />
          ))}
        </FilterMenuItem>

        <FilterMenuItem icon={UserRound} label="Member type">
          {memberTypeFilters.map(({ id, name }) => (
            <FilterCheckboxItem
              checked={filters.memberType === id}
              id={id}
              key={id}
              name={name}
              onCheckedChange={(checked) =>
                setMemberFilter("memberType", checked ? id : null)
              }
            />
          ))}
        </FilterMenuItem>

        <FilterMenuItem icon={BadgeCheck} label="KYC">
          {kycStatusFilters.map(({ id, name }) => (
            <FilterCheckboxItem
              checked={filters.kycStatus === id}
              id={id}
              key={id}
              name={name}
              onCheckedChange={(checked) =>
                setMemberFilter("kycStatus", checked ? id : null)
              }
            />
          ))}
        </FilterMenuItem>

        <FilterMenuItem icon={History} label={migrationLabel}>
          {migrationStatusFilters.map(({ id, name }) => (
            <FilterCheckboxItem
              checked={filters.migrationStatus === id}
              id={id}
              key={id}
              name={name}
              onCheckedChange={(checked) =>
                setMemberFilter("migrationStatus", checked ? id : null)
              }
            />
          ))}
        </FilterMenuItem>

        <FilterMenuItem icon={CalendarDays} label="Joined date">
          <DateRangeFilter
            onChange={(dateRange) =>
              setFilters({ dateRange }, { shallow: false })
            }
            value={filters.dateRange}
          />
        </FilterMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
