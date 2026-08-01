"use client"

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
import type { ChangeEvent, FormEvent } from "react"
import { useRef, useState } from "react"
import { FinanceFilterList } from "@/components/finance-filter-list"
import { membershipApprovalStatusFilters } from "@/components/membership-approval-filter-options"
import { SearchFilterDropdownInput } from "@/components/search-filter-dropdown-input"
import { useMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"

export function MembershipApprovalsSearchFilter() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { filter, setFilter } = useMembershipApprovalsFilterParams()
  const [isOpen, setIsOpen] = useState(false)
  const hasStatusFilter = Boolean(filter.status)

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    setFilter({ search: event.target.value || null })
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault()
  }

  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
      <div className="flex w-full min-w-0 flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
        <form className="w-full sm:w-auto" onSubmit={handleSubmit}>
          <SearchFilterDropdownInput
            ref={inputRef}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            filterActive={hasStatusFilter}
            filterOpen={isOpen}
            onChange={handleSearch}
            placeholder="Search membership requests..."
            spellCheck="false"
            value={filter.search ?? ""}
          />
        </form>

        <FinanceFilterList
          filters={{ status: filter.status }}
          onRemove={setFilter}
          options={{ status: membershipApprovalStatusFilters }}
        />
      </div>

      <DropdownMenuContent
        align="end"
        alignOffset={-11}
        className="w-[350px]"
        side="bottom"
        sideOffset={19}
      >
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {membershipApprovalStatusFilters.map((status) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.status === status.id}
                    key={status.id}
                    onCheckedChange={(checked) =>
                      setFilter({ status: checked ? status.id : null })
                    }
                    onSelect={(event) => event.preventDefault()}
                  >
                    {status.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
