"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

function isArrayParser(parser: unknown) {
  return typeof parser === "object" && parser !== null && "parseAll" in parser
}

type SearchFilterContextValue = {
  filterSchema?: Partial<Record<string, unknown>>
  filters: Record<string, unknown>
  hasFilters: boolean
  isOpen: boolean
  optionSelected: (key: string, option: { label?: string; value: string }) => void
  setFilters: (
    values:
      | Record<string, unknown>
      | null,
    options?: Record<string, unknown>,
  ) => Promise<unknown> | void
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const SearchFilterContext = createContext<SearchFilterContextValue | null>(null)

export function SearchFilterProvider({
  children,
  filterSchema,
  filters,
  setFilters,
}: {
  children: React.ReactNode
  filterSchema?: Partial<Record<string, unknown>>
  filters: Record<string, unknown>
  setFilters: (
    values:
      | Record<string, unknown>
      | null,
    options?: Record<string, unknown>,
  ) => Promise<unknown> | void
}) {
  const [hasFilters, setHasFilters] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const frame = window.setTimeout(() => {
      setHasFilters(
        Object.entries(filters).some(([key, value]) => {
          if (key === "q" || key === "search") {
            return false
          }

          if (value == null || value === "") {
            return false
          }

          return !Array.isArray(value) || value.length > 0
        }),
      )
    }, 100)

    return () => window.clearTimeout(frame)
  }, [filters])

  const value = useMemo<SearchFilterContextValue>(() => {
    function optionSelected(key: string, option: { value: string }) {
      const parser = filterSchema?.[key]
      const currentValue = filters[key]

      if (isArrayParser(parser)) {
        const currentItems = Array.isArray(currentValue) ? currentValue : []
        const nextValue = currentItems.includes(option.value)
          ? currentItems.filter((item) => item !== option.value)
          : [...currentItems, option.value]

        setFilters({ [key]: nextValue.length ? nextValue : null }, { shallow: false })
        return
      }

      setFilters({ [key]: option.value || null }, { shallow: false })
    }

    return {
      filterSchema,
      filters,
      hasFilters,
      isOpen,
      optionSelected,
      setFilters,
      setIsOpen,
    }
  }, [filterSchema, filters, hasFilters, isOpen, setFilters])

  return <SearchFilterContext.Provider value={value}>{children}</SearchFilterContext.Provider>
}

export function useSearchFilterContext() {
  const context = useContext(SearchFilterContext)

  if (!context) {
    throw new Error("useSearchFilterContext must be used within SearchFilterProvider")
  }

  return context
}
