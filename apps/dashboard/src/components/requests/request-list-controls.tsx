"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Plus, Search } from "lucide-react"
import { FinanceFilterList } from "@/components/finance-filter-list"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import {
  MobileFilterGroup,
  filterOptionSummary,
} from "@/components/search-filter/mobile-filter-group"
import {
  MiddayFilterIcon,
  SearchFilterDropdownInput,
} from "@/components/search-filter-dropdown-input"
import { useSortParams } from "@/hooks/use-sort-params"

// One search, filter and sort toolbar for the request pages (procurement,
// project financing, foodstuff). Each page passes its URL filter state and a
// config; the wording and options are the only differences between them.

export type RequestListOption<T extends string = string> = {
  id: T
  name: string
}

export type RequestListControlsConfig<S extends string> = {
  /** Prefix for element ids, e.g. "procurement". */
  idPrefix: string
  /** Plain name of the list for screen readers, e.g. "procurement requests". */
  listName: string
  searchPlaceholder: string
  statusOptions: ReadonlyArray<RequestListOption<S>>
  sortOptions: ReadonlyArray<RequestListOption>
  defaultSort: string
  drawerTitle: string
  drawerDescription: string
}

export type RequestListFilter<S extends string> = {
  q: string | null
  status: S | null
}

export type RequestListFilterState<S extends string> = {
  filter: RequestListFilter<S>
  setFilter: (next: Partial<RequestListFilter<S>>) => Promise<unknown>
}

export function RequestSearchFilter<S extends string>({
  config,
  filter,
  setFilter,
}: RequestListFilterState<S> & { config: RequestListControlsConfig<S> }) {
  const { setParams: setSortParams } = useSortParams()
  const [input, setInput] = useState(filter.q ?? "")
  const [isOpen, setIsOpen] = useState(false)

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value

    if (value) {
      setInput(value)
    } else {
      void setFilter({ q: null })
      setInput("")
    }
  }

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    void setFilter({ q: input.length > 0 ? input : null })
  }

  const validFilters = { status: filter.status }
  const hasValidFilters = validFilters.status !== null

  async function clearFilters() {
    await Promise.all([
      setFilter({ q: null, status: null }),
      setSortParams({ sort: null }),
    ])
    setInput("")
    setIsOpen(false)
  }

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
            placeholder={config.searchPlaceholder}
            spellCheck="false"
            value={input}
          />
        </form>

        <FinanceFilterList
          filters={validFilters}
          onRemove={(next) => void setFilter(next)}
          options={{ status: [...config.statusOptions] }}
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
                {config.statusOptions.map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.status === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      void setFilter({ status: checked ? item.id : null })
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void clearFilters()}>
          Clear filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RequestFilterOptions<T extends string>({
  idPrefix,
  onChange,
  options,
  value,
}: {
  idPrefix: string
  onChange: (value: T | null) => void
  options: ReadonlyArray<RequestListOption<T>>
  value: T | null
}) {
  const displayedOptions: ReadonlyArray<RequestListOption<T | "all">> = [
    { id: "all", name: "Any" },
    ...options,
  ]

  return (
    <RadioGroup
      className="divide-y divide-border border-y border-border"
      onValueChange={(next) => onChange(next === "all" ? null : (next as T))}
      value={value ?? "all"}
    >
      {displayedOptions.map((option) => (
        <label
          className="flex min-h-11 cursor-pointer items-center gap-3 px-1 py-2 text-sm"
          htmlFor={`${idPrefix}-${option.id}`}
          key={option.id}
        >
          <RadioGroupItem id={`${idPrefix}-${option.id}`} value={option.id} />
          <span>{option.name}</span>
        </label>
      ))}
    </RadioGroup>
  )
}

function RequestFilterDrawer<S extends string>({
  config,
  filter,
  onOpenChange,
  open,
  setFilter,
}: RequestListFilterState<S> & {
  config: RequestListControlsConfig<S>
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { params, setParams } = useSortParams()
  const [status, setStatus] = useState<S | null>(filter.status)
  const [sort, setSort] = useState(params.sort?.join(",") ?? config.defaultSort)

  async function apply() {
    await Promise.all([
      setFilter({ status }),
      setParams({
        sort: sort === config.defaultSort ? null : sort.split(","),
      }),
    ])
  }

  function clear() {
    setStatus(null)
    setSort(config.defaultSort)
  }

  return (
    <MobileFilterDrawer
      description={config.drawerDescription}
      onApply={apply}
      onClear={clear}
      onOpenChange={onOpenChange}
      open={open}
      title={config.drawerTitle}
    >
      <div className="space-y-0">
        <MobileFilterGroup
          title="Status"
          summary={filterOptionSummary(status, config.statusOptions)}
        >
          <RequestFilterOptions
            idPrefix={`${config.idPrefix}-status`}
            onChange={setStatus}
            options={config.statusOptions}
            value={status}
          />
        </MobileFilterGroup>
        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sort, config.sortOptions)}
        >
          <RequestFilterOptions
            idPrefix={`${config.idPrefix}-sort`}
            onChange={(value) => setSort(value ?? config.defaultSort)}
            options={config.sortOptions}
            value={sort}
          />
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}

export function RequestMobileToolbar<S extends string>({
  canCreate,
  config,
  createDisabled = false,
  createDisabledReason,
  filter,
  onCreate,
  setFilter,
}: RequestListFilterState<S> & {
  canCreate: boolean
  config: RequestListControlsConfig<S>
  createDisabled?: boolean
  createDisabledReason?: string
  onCreate: () => void
}) {
  const { params, setParams: setSortParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveControls = Boolean(filter.q || filter.status || params.sort)
  const disabledReasonId = `${config.idPrefix}-create-disabled`

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="flex items-center gap-2">
          <InputGroup className="h-12 min-w-0 flex-1">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label={`Search ${config.listName}`}
              onChange={(event) =>
                void setFilter({ q: event.target.value || null })
              }
              placeholder="Search"
              type="search"
              value={filter.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label={`Filter ${config.listName}`}
                className="size-11"
                onClick={() => setFilterOpen(true)}
                size="icon-sm"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {canCreate ? (
            <Button
              aria-describedby={createDisabled ? disabledReasonId : undefined}
              className="h-12 px-4"
              disabled={createDisabled}
              onClick={onCreate}
              type="button"
            >
              <Plus data-icon="inline-start" />
              New
            </Button>
          ) : null}
        </div>
        {canCreate && createDisabled && createDisabledReason ? (
          <p className="sr-only" id={disabledReasonId}>
            {createDisabledReason}
          </p>
        ) : null}
        {hasActiveControls ? (
          <Button
            className="h-11 px-0"
            onClick={() =>
              void Promise.all([
                setFilter({ q: null, status: null }),
                setSortParams({ sort: null }),
              ])
            }
            type="button"
            variant="link"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
      {filterOpen ? (
        <RequestFilterDrawer
          config={config}
          filter={filter}
          onOpenChange={setFilterOpen}
          open={filterOpen}
          setFilter={setFilter}
        />
      ) : null}
    </>
  )
}
