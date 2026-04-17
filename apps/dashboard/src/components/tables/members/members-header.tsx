"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@halaal-vest/ui/components/button"
import { Input } from "@halaal-vest/ui/components/input"
import { Select } from "@halaal-vest/ui/components/select"
import { cn } from "@halaal-vest/ui/lib/utils"
import { buildMembersPath, type MemberFilterValues } from "@/lib/members/member-filters"
import { MemberFilterList } from "./member-filter-list"

export function MembersHeader({
  activeFilters,
  createAction,
  defaultValues,
  importPanel,
  startWithImportPanelOpen = false,
  secondaryActions,
}: {
  activeFilters: Array<{ key: string; label: string }>
  createAction?: React.ReactNode
  defaultValues: MemberFilterValues
  importPanel?: React.ReactNode
  startWithImportPanelOpen?: boolean
  secondaryActions?: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const filterMenuRef = useRef<HTMLDivElement>(null)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const [filters, setFilters] = useState(defaultValues)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    Boolean(defaultValues.status || defaultValues.memberType || defaultValues.kycStatus || defaultValues.joinedFrom || defaultValues.joinedTo),
  )
  const [showImportPanel, setShowImportPanel] = useState(startWithImportPanelOpen)
  const activeFilterCount = activeFilters.length

  function applyFilters() {
    router.push(buildMembersPath(filters, pathname))
  }

  function clearFilters() {
    const next = {
      joinedFrom: "",
      joinedTo: "",
      kycStatus: "",
      memberType: "",
      search: "",
      status: "",
    }
    setFilters(next)
    router.push(pathname)
  }

  function removeFilter(key: string) {
    const next = {
      ...filters,
      [key]: "",
    }
    setFilters(next)
    router.push(buildMembersPath(next, pathname))
  }

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (
        showAdvancedFilters &&
        !filterMenuRef.current?.contains(target) &&
        !filterTriggerRef.current?.contains(target)
      ) {
        setShowAdvancedFilters(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowAdvancedFilters(false)
      }
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [showAdvancedFilters])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 items-start sm:items-center w-full">
            <form
              className="relative w-full sm:w-auto"
              onSubmit={(event) => {
                event.preventDefault()
                applyFilters()
              }}
            >
              <div className="relative w-full md:max-w-[380px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg
                    aria-hidden="true"
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>

                <Input
                  value={filters.search}
                  onChange={(event) => {
                    const value = event.target.value
                    setFilters((current) => ({ ...current, search: value }))

                    if (!value && !activeFilterCount) {
                      router.push(pathname)
                    }
                  }}
                  placeholder="Search members..."
                  className="pl-9 w-full sm:w-[350px] pr-8"
                />

                <button
                  ref={filterTriggerRef}
                  type="button"
                  aria-label={showAdvancedFilters ? "Hide filters" : "Show filters"}
                  className={cn(
                    "absolute z-10 right-3 top-[10px] inline-flex size-5 items-center justify-center text-muted-foreground opacity-50 transition-opacity duration-300 hover:opacity-100",
                    (showAdvancedFilters || activeFilterCount > 0) && "opacity-100 text-foreground",
                  )}
                  onClick={() => setShowAdvancedFilters((current) => !current)}
                >
                  <svg
                    aria-hidden="true"
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  {activeFilterCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium leading-4 text-background">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>

                {showAdvancedFilters ? (
                  <div
                    ref={filterMenuRef}
                    className="absolute right-0 top-[calc(100%+19px)] z-30 w-full rounded-xl border border-border bg-popover p-1 shadow-[0_16px_40px_rgba(15,23,42,0.16)] md:w-[350px]"
                  >
                    <div className="rounded-lg px-2 py-2 text-xs font-medium text-foreground">
                      Filter members
                    </div>

                    <div className="space-y-1">
                      <div className="rounded-lg px-2 py-2">
                        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Status</p>
                        <Select
                          className="h-9 rounded-lg border-border bg-background shadow-none"
                          value={filters.status}
                          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                        >
                          <option value="">All statuses</option>
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                          <option value="exited">Exited</option>
                        </Select>
                      </div>

                      <div className="rounded-lg px-2 py-2">
                        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Member type</p>
                        <Select
                          className="h-9 rounded-lg border-border bg-background shadow-none"
                          value={filters.memberType}
                          onChange={(event) => setFilters((current) => ({ ...current, memberType: event.target.value }))}
                        >
                          <option value="">All member types</option>
                          <option value="individual">Individual</option>
                          <option value="civil_servant">Civil servant</option>
                          <option value="business">Business</option>
                        </Select>
                      </div>

                      <div className="rounded-lg px-2 py-2">
                        <p className="mb-2 text-[11px] font-medium text-muted-foreground">KYC</p>
                        <Select
                          className="h-9 rounded-lg border-border bg-background shadow-none"
                          value={filters.kycStatus}
                          onChange={(event) => setFilters((current) => ({ ...current, kycStatus: event.target.value }))}
                        >
                          <option value="">All KYC states</option>
                          <option value="not_started">Not started</option>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </Select>
                      </div>

                      <div className="rounded-lg px-2 py-2">
                        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Joined between</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            className="h-9 rounded-lg border-border bg-background shadow-none"
                            type="date"
                            value={filters.joinedFrom}
                            onChange={(event) => setFilters((current) => ({ ...current, joinedFrom: event.target.value }))}
                          />
                          <Input
                            className="h-9 rounded-lg border-border bg-background shadow-none"
                            type="date"
                            value={filters.joinedTo}
                            onChange={(event) => setFilters((current) => ({ ...current, joinedTo: event.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2 border-t border-border px-2 py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          clearFilters()
                          setShowAdvancedFilters(false)
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        className="h-8 rounded-md px-3 text-xs"
                        onClick={() => {
                          applyFilters()
                          setShowAdvancedFilters(false)
                        }}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </form>

            <MemberFilterList filters={activeFilters} onClear={clearFilters} onRemove={removeFilter} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {secondaryActions}
            {importPanel ? (
              <Button
                type="button"
                size="sm"
                variant={showImportPanel ? "default" : "outline"}
                className="rounded-full"
                onClick={() => {
                  setShowImportPanel((current) => !current)
                }}
              >
                Import members
              </Button>
            ) : null}
            {createAction}
          </div>
        </div>

      </div>

      {showImportPanel ? <div id="member-import">{importPanel}</div> : null}
    </div>
  )
}
