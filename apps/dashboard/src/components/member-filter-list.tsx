"use client"

import { Button } from "@halaalvest/ui/components/button"
import { X } from "lucide-react"
import { formatDateFilterValue } from "@/components/search-filter/search-filter-utils"

type MemberFilterKey =
  | "dateRange"
  | "kycStatus"
  | "memberType"
  | "migrationStatus"
  | "status"

export type MemberFilterValue = {
  dateRange: string[]
  kycStatus: string
  memberType: string
  migrationStatus: string
  status: string
}

type FilterValueProps = {
  key: MemberFilterKey
  value: MemberFilterValue[MemberFilterKey]
}

type FilterOption = {
  id: string
  name: string
}

function displayEnum(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function MemberFilterList({
  filters,
  onRemove,
  options,
}: {
  filters: Partial<MemberFilterValue>
  onRemove: (filters: { [key: string]: null }) => void
  options?: Partial<Record<MemberFilterKey, FilterOption[]>>
}) {
  const renderFilter = ({ key, value }: FilterValueProps) => {
    switch (key) {
      case "dateRange":
        return formatDateFilterValue(value)

      case "kycStatus":
      case "memberType":
      case "migrationStatus":
      case "status":
        return (
          options?.[key]?.find((filter) => filter.id === value)?.name ??
          displayEnum(String(value))
        )

      default:
        return null
    }
  }

  const handleOnRemove = (key: MemberFilterKey) => {
    onRemove({ [key]: null })
  }

  return (
    <ul className="flex space-x-2">
      {Object.entries(filters)
        .filter(([, value]) => value !== null)
        .map(([key, value]) => {
          const filterKey = key as MemberFilterKey
          const label = value
            ? renderFilter({
                key: filterKey,
                value: value as MemberFilterValue[MemberFilterKey],
              })
            : null

          if (!label) {
            return null
          }

          return (
            <li key={key}>
              <Button
                className="group flex h-9 items-center space-x-1 rounded-none bg-secondary px-2 font-normal text-[#878787] hover:bg-secondary"
                onClick={() => handleOnRemove(filterKey)}
                type="button"
              >
                <X className="w-0 scale-0 transition-all group-hover:w-4 group-hover:scale-100" />
                <span>{label}</span>
              </Button>
            </li>
          )
        })}
    </ul>
  )
}
