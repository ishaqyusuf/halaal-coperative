"use client"

import { Button } from "@halaalvest/ui/components/button"
import { format, parseISO } from "date-fns"
import { X } from "lucide-react"

type MemberFilterKey =
  | "joinedFrom"
  | "joinedTo"
  | "kycStatus"
  | "memberType"
  | "status"

export type MemberFilterValue = {
  joinedFrom: string
  joinedTo: string
  kycStatus: string
  memberType: string
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

function formatDate(value: string) {
  return format(parseISO(value), "MMM d, yyyy")
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
      case "joinedFrom": {
        if (value && filters.joinedTo) {
          return `${formatDate(value)} - ${formatDate(filters.joinedTo)}`
        }

        return value ? formatDate(value) : null
      }

      case "joinedTo":
        return value ? `Joined to: ${formatDate(value)}` : null

      case "kycStatus":
      case "memberType":
      case "status":
        return (
          options?.[key]?.find((filter) => filter.id === value)?.name ??
          displayEnum(value)
        )

      default:
        return null
    }
  }

  const handleOnRemove = (key: MemberFilterKey) => {
    if (key === "joinedFrom" || key === "joinedTo") {
      onRemove({ joinedFrom: null, joinedTo: null })
      return
    }

    onRemove({ [key]: null })
  }

  return (
    <ul className="flex space-x-2">
      {Object.entries(filters)
        .filter(([key, value]) => value !== null && key !== "joinedTo")
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
                className="h-9 px-2 bg-secondary hover:bg-secondary font-normal text-[#878787] flex space-x-1 items-center group rounded-none"
                onClick={() => handleOnRemove(filterKey)}
                type="button"
              >
                <X className="scale-0 group-hover:scale-100 transition-all w-0 group-hover:w-4" />
                <span>{label}</span>
              </Button>
            </li>
          )
        })}
    </ul>
  )
}
