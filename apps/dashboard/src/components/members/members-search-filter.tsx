"use client"

import { Calendar } from "@halaalvest/ui/components/calendar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatISO, parseISO } from "date-fns"
import {
  BadgeCheck,
  CalendarDays,
  CircleDot,
  ListFilter,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { type ReactNode, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import {
  MemberFilterList,
  type MemberFilterValue,
} from "@/components/member-filter-list"
import type { MembersFilterParams } from "@/hooks/use-members-filter-params"
import { useMembersFilterParams } from "@/hooks/use-members-filter-params"
import { hasActiveMemberFilters } from "@/lib/members/member-filters"

type MemberStatusFilter =
  | "pending"
  | "active"
  | "inactive"
  | "suspended"
  | "exited"
type MemberTypeFilter = "individual" | "civil_servant" | "business"
type KycStatusFilter = "not_started" | "pending" | "verified" | "rejected"

type FilterItem<T extends string> = {
  id: T
  name: string
}

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

const statusFilters: FilterItem<MemberStatusFilter>[] = [
  { id: "pending", name: "Pending" },
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
  { id: "suspended", name: "Suspended" },
  { id: "exited", name: "Exited" },
]

const memberTypeFilters: FilterItem<MemberTypeFilter>[] = [
  { id: "individual", name: "Individual" },
  { id: "civil_servant", name: "Civil servant" },
  { id: "business", name: "Business" },
]

const kycStatusFilters: FilterItem<KycStatusFilter>[] = [
  { id: "not_started", name: "Not started" },
  { id: "pending", name: "Pending" },
  { id: "verified", name: "Verified" },
  { id: "rejected", name: "Rejected" },
]

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

function MemberDateRangeFilter({
  end,
  onSelect,
  start,
}: {
  end: string | null | undefined
  onSelect: (range: {
    joinedFrom: string | null
    joinedTo: string | null
  }) => void
  start: string | null | undefined
}) {
  return (
    <div className="flex flex-col">
      <Calendar
        defaultMonth={start ? parseISO(start) : new Date()}
        mode="range"
        numberOfMonths={2}
        selected={{
          from: start ? parseISO(start) : undefined,
          to: end ? parseISO(end) : undefined,
        }}
        onSelect={(range) => {
          onSelect({
            joinedFrom: range?.from
              ? formatISO(range.from, { representation: "date" })
              : null,
            joinedTo: range?.to
              ? formatISO(range.to, { representation: "date" })
              : null,
          })
        }}
      />
    </div>
  )
}

export function MembersSearchFilter() {
  const [isOpen, setIsOpen] = useState(false)
  const { filters, setFilters } = useMembersFilterParams()
  const hasFilters = hasActiveMemberFilters(filters)

  useHotkeys("esc", () => setFilters({ q: null }, { shallow: false }), {
    enableOnFormTags: true,
  })

  function setMemberFilter(
    key: "kycStatus" | "memberType" | "status",
    value: string | null
  ) {
    setFilters({ [key]: value } as Partial<MembersFilterParams>, {
      shallow: false,
    })
  }

  function removeMemberFilters(update: { [key: string]: null }) {
    setFilters(update as Partial<MembersFilterParams>, { shallow: false })
  }

  function setDateRangeFilter(update: {
    joinedFrom: string | null
    joinedTo: string | null
  }) {
    setFilters(update, { shallow: false })
  }

  function processFiltersForList(): Partial<MemberFilterValue> {
    const processed = {
      joinedFrom: filters.joinedFrom ?? undefined,
      joinedTo: filters.joinedTo ?? undefined,
      kycStatus: filters.kycStatus ?? undefined,
      memberType: filters.memberType ?? undefined,
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
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 items-stretch sm:items-center w-full md:w-auto">
        <form
          className="relative flex-1 sm:flex-initial"
          onSubmit={(event) => event.preventDefault()}
        >
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-[11px] size-4 text-muted-foreground"
          />
          <Input
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="pl-9 w-full sm:w-[350px] pr-8"
            onChange={(event) =>
              setFilters(
                { q: event.target.value || null },
                { shallow: false }
              )
            }
            placeholder="Search members..."
            spellCheck="false"
            value={filters.q ?? ""}
          />

          <DropdownMenuTrigger
            className={cn(
              "absolute z-10 right-3 top-[10px] text-muted-foreground opacity-50 transition-opacity duration-300 hover:opacity-100",
              hasFilters && "opacity-100 text-foreground",
              isOpen && "opacity-100 text-foreground"
            )}
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <ListFilter size={16} />
            <span className="sr-only">Toggle member filters</span>
          </DropdownMenuTrigger>
        </form>

        <MemberFilterList
          filters={processFiltersForList()}
          onRemove={removeMemberFilters}
          options={{
            kycStatus: kycStatusFilters,
            memberType: memberTypeFilters,
            status: statusFilters,
          }}
        />
      </div>

      <DropdownMenuContent
        align="end"
        alignOffset={-11}
        className="w-[350px]"
        side="top"
        sideOffset={19}
      >
        <FilterMenuItem icon={CircleDot} label="Status">
          {statusFilters.map(({ id, name }) => (
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

        <FilterMenuItem icon={CalendarDays} label="Joined date">
          <MemberDateRangeFilter
            end={filters.joinedTo}
            onSelect={setDateRangeFilter}
            start={filters.joinedFrom}
          />
        </FilterMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
