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
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { Input } from "@halaalvest/ui/components/input"
import { cn } from "@halaalvest/ui/lib/utils"
import { FilterHorizontalIcon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { FinanceFilterList } from "@/components/finance-filter-list"
import { useSupportFilterParams } from "@/hooks/use-support-filter-params"

const statusFilters = [
  { id: "open", name: "Open" },
  { id: "in_progress", name: "In progress" },
  { id: "waiting_on_member", name: "Waiting on member" },
  { id: "resolved", name: "Resolved" },
  { id: "closed", name: "Closed" },
]

const priorityFilters = [
  { id: "low", name: "Low" },
  { id: "normal", name: "Normal" },
  { id: "high", name: "High" },
  { id: "urgent", name: "Urgent" },
]

export function SupportSearchFilter() {
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

  const validFilters = {
    priority: filter.priority,
    status: filter.status,
  }
  const hasValidFilters = Object.values(validFilters).some(
    (value) => value !== null
  )

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex w-full flex-col items-start space-y-4 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        <form className="relative w-full sm:w-auto" onSubmit={handleSubmit}>
          <HugeiconsIcon
            className="pointer-events-none absolute top-[11px] left-3"
            icon={Search01Icon}
            size={16}
          />
          <Input
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="w-full pr-8 pl-9 sm:w-[350px]"
            onChange={handleSearch}
            placeholder="Search support..."
            spellCheck="false"
            value={input}
          />

          <DropdownMenuTrigger
            className={cn(
              "absolute top-[10px] right-3 z-10 opacity-50 transition-opacity duration-300 hover:opacity-100",
              hasValidFilters && "opacity-100",
              isOpen && "opacity-100"
            )}
            onClick={() => setIsOpen((current) => !current)}
            type="button"
          >
            <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
          </DropdownMenuTrigger>
        </form>

        <FinanceFilterList
          filters={validFilters}
          onRemove={setFilter}
          options={{ priority: priorityFilters, status: statusFilters }}
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
            <DropdownMenuSubTrigger>
              <span>Status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {statusFilters.map((item) => (
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
                {priorityFilters.map((item) => (
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
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
