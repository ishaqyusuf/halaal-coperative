"use client"

import { cn } from "@halaalvest/ui/lib/utils"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { Input } from "@halaalvest/ui/components/input"
import { FilterHorizontalIcon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { ChangeEvent, FormEvent } from "react"
import { useRef, useState } from "react"
import { FinanceFilterList } from "@/components/finance-filter-list"
import { useShareFilterParams } from "@/hooks/use-share-filter-params"

const valueTypeFilters = [
  { id: "fixed_amount", name: "Fixed amount" },
  { id: "percentage", name: "Percentage after charges" },
]

const statusFilters = [
  { id: "current", name: "Current" },
  { id: "historical", name: "Historical" },
]

export function ShareSearchFilter() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { filter, setFilter } = useShareFilterParams()
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

  const validFilters = Object.fromEntries(
    Object.entries(filter).filter(([key]) => key !== "q")
  )
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
            ref={inputRef}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="w-full pr-8 pl-9 sm:w-[350px]"
            onChange={handleSearch}
            placeholder="Search share rules..."
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
          options={{
            status: statusFilters,
            valueType: valueTypeFilters,
          }}
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
              <span>Rule</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {valueTypeFilters.map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.valueType === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({ valueType: checked ? item.id : null })
                    }}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {item.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

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
                    }}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {item.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() =>
              setFilter({
                effectiveFrom: null,
                effectiveTo: null,
                q: null,
                status: null,
                valueType: null,
              })
            }
          >
            Clear filters
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
