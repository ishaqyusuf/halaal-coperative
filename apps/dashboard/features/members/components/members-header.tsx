"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@halaal-vest/ui/components/button"
import { Input } from "@halaal-vest/ui/components/input"
import { Select } from "@halaal-vest/ui/components/select"
import { DashboardSectionCard } from "@/components/dashboard/primitives"
import type { MemberFilterValues } from "../lib/member-filters"
import { MemberFilterList } from "./member-filter-list"

function buildMembersUrl(pathname: string, filters: MemberFilterValues) {
  const params = new URLSearchParams()
  if (filters.search) params.set("search", filters.search)
  if (filters.status) params.set("status", filters.status)
  if (filters.memberType) params.set("memberType", filters.memberType)
  if (filters.kycStatus) params.set("kycStatus", filters.kycStatus)
  if (filters.joinedFrom) params.set("joinedFrom", filters.joinedFrom)
  if (filters.joinedTo) params.set("joinedTo", filters.joinedTo)
  return params.toString() ? `${pathname}?${params.toString()}` : pathname
}

export function MembersHeader({
  activeFilters,
  createAction,
  defaultValues,
  importPanel,
}: {
  activeFilters: Array<{ key: string; label: string }>
  createAction?: React.ReactNode
  defaultValues: MemberFilterValues
  importPanel?: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [filters, setFilters] = useState(defaultValues)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    Boolean(defaultValues.status || defaultValues.memberType || defaultValues.kycStatus || defaultValues.joinedFrom || defaultValues.joinedTo),
  )
  const [showImportPanel, setShowImportPanel] = useState(false)

  function applyFilters() {
    router.push(buildMembersUrl(pathname, filters))
  }

  function clearFilters() {
    setFilters({
      joinedFrom: "",
      joinedTo: "",
      kycStatus: "",
      memberType: "",
      search: "",
      status: "",
    })
    router.push(pathname)
  }

  return (
    <div className="space-y-4">
      <DashboardSectionCard className="p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
              <Input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search members..."
                className="h-10 rounded-full"
              />
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowAdvancedFilters((current) => !current)}>
                {showAdvancedFilters ? "Hide filters" : "Filters"}
              </Button>
              <Button type="button" className="rounded-full" onClick={applyFilters}>
                Apply
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {importPanel ? (
              <Button
                type="button"
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

        {showAdvancedFilters ? (
          <div className="mt-4 grid gap-3 border-t border-border/70 pt-4 md:grid-cols-5">
            <Select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="exited">Exited</option>
            </Select>
            <Select value={filters.memberType} onChange={(event) => setFilters((current) => ({ ...current, memberType: event.target.value }))}>
              <option value="">All member types</option>
              <option value="individual">Individual</option>
              <option value="civil_servant">Civil servant</option>
              <option value="business">Business</option>
            </Select>
            <Select value={filters.kycStatus} onChange={(event) => setFilters((current) => ({ ...current, kycStatus: event.target.value }))}>
              <option value="">All KYC states</option>
              <option value="not_started">Not started</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Input type="date" value={filters.joinedFrom} onChange={(event) => setFilters((current) => ({ ...current, joinedFrom: event.target.value }))} />
            <Input type="date" value={filters.joinedTo} onChange={(event) => setFilters((current) => ({ ...current, joinedTo: event.target.value }))} />
          </div>
        ) : null}

        <div className="mt-4">
          <MemberFilterList filters={activeFilters} onClear={clearFilters} />
        </div>
      </DashboardSectionCard>

      {showImportPanel ? importPanel : null}
    </div>
  )
}
