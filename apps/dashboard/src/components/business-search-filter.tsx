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
import { useBusinessFilterParams } from "@/hooks/use-business-filter-params"

const statusFilters = [
  { id: "planned", name: "Planned" },
  { id: "active", name: "Active" },
  { id: "completed", name: "Completed" },
  { id: "archived", name: "Archived" },
]

const profitStatusFilters = [
  { id: "draft", name: "Draft" },
  { id: "pending", name: "Pending" },
  { id: "reviewed", name: "Reviewed" },
  { id: "completed", name: "Completed" },
  { id: "approved", name: "Approved" },
  { id: "archived", name: "Archived" },
]

const sourceTypeFilters = [
  { id: "manual", name: "Manual" },
  { id: "backfill", name: "Backfill" },
  { id: "import", name: "Import" },
]

const hasProfitEntryFilters = [
  { id: "true", name: "Has profit entries" },
  { id: "false", name: "No profit entries" },
]

export function BusinessSearchFilter() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { filter, hasFilters, setFilter } = useBusinessFilterParams()
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
    dividendPeriodId: filter.dividendPeriodId,
    hasProfitEntries:
      filter.hasProfitEntries === null
        ? null
        : String(filter.hasProfitEntries),
    profitStatus: filter.profitStatus,
    sourceType: filter.sourceType,
    startFrom: filter.startFrom,
    startTo: filter.startTo,
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
            ref={inputRef}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="w-full pr-8 pl-9 sm:w-[350px]"
            onChange={handleSearch}
            placeholder="Search businesses..."
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
            hasProfitEntries: hasProfitEntryFilters,
            profitStatus: profitStatusFilters,
            sourceType: sourceTypeFilters,
            status: statusFilters,
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
              <span>Business status</span>
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Latest profit status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {profitStatusFilters.map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.profitStatus === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({ profitStatus: checked ? item.id : null })
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
              <span>Source type</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {sourceTypeFilters.map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.sourceType === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({ sourceType: checked ? item.id : null })
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
              <span>Profit entries</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                <DropdownMenuCheckboxItem
                  checked={filter.hasProfitEntries === true}
                  onCheckedChange={(checked) => {
                    setFilter({ hasProfitEntries: checked ? true : null })
                  }}
                  onSelect={(event) => event.preventDefault()}
                >
                  Has profit entries
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filter.hasProfitEntries === false}
                  onCheckedChange={(checked) => {
                    setFilter({ hasProfitEntries: checked ? false : null })
                  }}
                  onSelect={(event) => event.preventDefault()}
                >
                  No profit entries
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Start date</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="w-64 space-y-3 p-3"
                sideOffset={14}
              >
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  From
                  <Input
                    defaultValue={filter.startFrom ?? ""}
                    onChange={(event) =>
                      setFilter({ startFrom: event.target.value || null })
                    }
                    type="date"
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  To
                  <Input
                    defaultValue={filter.startTo ?? ""}
                    onChange={(event) =>
                      setFilter({ startTo: event.target.value || null })
                    }
                    type="date"
                  />
                </label>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        {hasFilters ? (
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() =>
                setFilter({
                  dividendPeriodId: null,
                  hasProfitEntries: null,
                  profitStatus: null,
                  q: null,
                  sourceType: null,
                  startFrom: null,
                  startTo: null,
                  status: null,
                })
              }
              onSelect={() => setInput("")}
            >
              Clear filters
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
