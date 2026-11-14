"use client"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Search } from "lucide-react"
import { useNotificationsFilterParams } from "@/hooks/use-notifications-filter-params"

export function NotificationSearch() {
  const { filters, setFilters } = useNotificationsFilterParams()

  return (
    <InputGroup className="max-w-xl">
      <InputGroupAddon>
        <Search aria-hidden="true" className="size-5" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label="Search by email address"
        onChange={(event) => setFilters({ search: event.target.value || null })}
        placeholder="Search by email address"
        type="search"
        value={filters.search ?? ""}
      />
    </InputGroup>
  )
}
