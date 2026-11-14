"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useState } from "react"
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
import { FinanceFilterList } from "@/components/finance-filter-list"
import { SearchFilterDropdownInput } from "@/components/search-filter-dropdown-input"
import { useSupportFilterParams } from "@/hooks/use-support-filter-params"
import {
  supportMemberShowFilterOptions,
  supportPriorityOptions,
  supportShowFilterOptions,
  supportTopicOptions,
} from "@/lib/support/support-words"

export const supportStatusFilters = [...supportShowFilterOptions]

export const supportPriorityFilters = supportPriorityOptions.map((option) => ({
  id: option.value,
  name: option.label,
}))

export const supportCategoryFilters = supportTopicOptions.map((option) => ({
  id: option.value,
  name: option.label,
}))

export function getSupportStatusFilters(mode: "member" | "staff") {
  return mode === "staff"
    ? supportStatusFilters
    : [...supportMemberShowFilterOptions]
}

export function SupportSearchFilter({
  assignees,
  mode,
}: {
  assignees: Array<{ id: string; label: string }>
  mode: "member" | "staff"
}) {
  const { filter, setFilter } = useSupportFilterParams()
  const [input, setInput] = useState(filter.q ?? "")
  const [isOpen, setIsOpen] = useState(false)

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value

    if (value) {
      setInput(value)
    } else {
      setFilter({ q: null })
      setInput("")
    }
  }

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    setFilter({ q: input.length > 0 ? input : null })
  }

  const validFilters =
    mode === "staff"
      ? {
          assignedToUserId: filter.assignedToUserId,
          category: filter.category,
          priority: filter.priority,
          status: filter.status,
        }
      : {
          status: filter.status,
        }
  const hasValidFilters = Object.values(validFilters).some(
    (value) => value !== null
  )

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex w-full flex-col items-start space-y-4 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        <form className="relative w-full sm:w-auto" onSubmit={handleSubmit}>
          <SearchFilterDropdownInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            filterActive={hasValidFilters}
            filterOpen={isOpen}
            onChange={handleSearch}
            placeholder="Search cases"
            spellCheck="false"
            value={input}
          />
        </form>

        <FinanceFilterList
          filters={validFilters}
          onRemove={setFilter}
          options={{
            assignedToUserId: assignees.map((assignee) => ({
              id: assignee.id,
              name: assignee.label,
            })),
            category: supportCategoryFilters,
            priority: supportPriorityFilters,
            status: getSupportStatusFilters(mode),
          }}
        />
      </div>

      <DropdownMenuContent
        align="start"
        alignOffset={-11}
        className="w-[350px]"
        side="bottom"
        sideOffset={19}
      >
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Show</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {getSupportStatusFilters(mode).map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.status === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({ status: checked ? item.id : null })
                      setIsOpen(false)
                    }}
                  >
                    {item.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {mode === "staff" ? (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span>Priority</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent
                    alignOffset={-4}
                    className="p-0"
                    sideOffset={14}
                  >
                    {supportPriorityFilters.map((item) => (
                      <DropdownMenuCheckboxItem
                        checked={filter.priority === item.id}
                        key={item.id}
                        onCheckedChange={(checked) => {
                          setFilter({ priority: checked ? item.id : null })
                          setIsOpen(false)
                        }}
                      >
                        {item.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <span>About</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent
                    alignOffset={-4}
                    className="p-0"
                    sideOffset={14}
                  >
                    {supportCategoryFilters.map((item) => (
                      <DropdownMenuCheckboxItem
                        checked={filter.category === item.id}
                        key={item.id}
                        onCheckedChange={(checked) => {
                          setFilter({ category: checked ? item.id : null })
                          setIsOpen(false)
                        }}
                      >
                        {item.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              {assignees.length ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Handled by</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent
                      alignOffset={-4}
                      className="max-h-72 overflow-y-auto p-0"
                      sideOffset={14}
                    >
                      {assignees.map((assignee) => (
                        <DropdownMenuCheckboxItem
                          checked={filter.assignedToUserId === assignee.id}
                          key={assignee.id}
                          onCheckedChange={(checked) => {
                            setFilter({
                              assignedToUserId: checked ? assignee.id : null,
                            })
                            setIsOpen(false)
                          }}
                        >
                          {assignee.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              ) : null}
            </>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
