"use client"

import { Button } from "@halaalvest/ui/components/button"

type FilterOption = {
  id: string
  name: string
}

type FilterValue = string | null | undefined

export function FinanceFilterList({
  filters,
  onRemove,
  options,
}: {
  filters: Record<string, FilterValue>
  onRemove: (filters: Record<string, null>) => void
  options: Record<string, FilterOption[]>
}) {
  const renderFilter = (key: string, value: FilterValue) => {
    if (!value) {
      return null
    }

    return options[key]?.find((filter) => filter.id === value)?.name ?? value
  }

  return (
    <ul className="flex space-x-2">
      {Object.entries(filters)
        .filter(([, value]) => value !== null)
        .map(([key, value]) => {
          const label = renderFilter(key, value)

          if (!label) {
            return null
          }

          return (
            <li key={key}>
              <Button
                className="group flex h-9 items-center space-x-1 rounded-none bg-secondary px-2 font-normal text-[#878787] hover:bg-secondary"
                onClick={() => onRemove({ [key]: null })}
                type="button"
              >
                <span className="w-0 scale-0 transition-all group-hover:w-4 group-hover:scale-100">
                  <svg
                    aria-hidden="true"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </span>
                <span>{label}</span>
              </Button>
            </li>
          )
        })}
    </ul>
  )
}
