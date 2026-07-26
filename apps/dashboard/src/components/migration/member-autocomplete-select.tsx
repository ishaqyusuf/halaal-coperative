"use client"

import { useId, useMemo, useState } from "react"
import { Input } from "@halaalvest/ui/components/input"

type MemberAutocompleteOption = {
  id: string
  label: string
}

type MemberAutocompleteSelectProps = {
  disabled?: boolean
  id?: string
  label: string
  name: string
  onValueChange?: (value: string) => void
  options: MemberAutocompleteOption[]
  placeholder?: string
  promotedOptionIds?: readonly string[]
  showIdSuffix?: boolean
  value?: string | null
}

export function MemberAutocompleteSelect({
  disabled = false,
  id,
  label,
  name,
  onValueChange,
  options,
  placeholder = "Search member",
  promotedOptionIds = [],
  showIdSuffix = true,
  value,
}: MemberAutocompleteSelectProps) {
  const generatedInputId = useId()
  const inputId = id ?? generatedInputId
  const listId = useId()
  const selectedOption = options.find((option) => option.id === value)
  const selectedDisplayValue = selectedOption
    ? showIdSuffix
      ? `${selectedOption.label} (${selectedOption.id.slice(0, 8)})`
      : selectedOption.label
    : ""
  const [query, setQuery] = useState(selectedDisplayValue)
  const [selectedId, setSelectedId] = useState(selectedOption?.id ?? "")
  const promotedOptionOrder = useMemo(() => {
    const order = new Map<string, number>()

    for (const id of promotedOptionIds) {
      if (id && !order.has(id)) {
        order.set(id, order.size)
      }
    }

    return order
  }, [promotedOptionIds])

  const optionEntries = useMemo(() => {
    return options
      .map((option) => ({
        ...option,
        displayValue: showIdSuffix
          ? `${option.label} (${option.id.slice(0, 8)})`
          : option.label,
      }))
      .sort((a, b) => {
        const aPromotedIndex =
          promotedOptionOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER
        const bPromotedIndex =
          promotedOptionOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER

        if (aPromotedIndex !== bPromotedIndex) {
          return aPromotedIndex - bPromotedIndex
        }

        return a.label.localeCompare(b.label)
      })
  }, [options, promotedOptionOrder, showIdSuffix])

  return (
    <div>
      <input
        name={name}
        onInput={(event) => {
          const nextSelectedId = event.currentTarget.value
          const nextOption = optionEntries.find(
            (option) => option.id === nextSelectedId
          )

          setSelectedId(nextSelectedId)
          setQuery(nextOption?.displayValue ?? "")
          onValueChange?.(nextSelectedId)
        }}
        type="hidden"
        value={selectedId}
      />
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <Input
        autoComplete="off"
        disabled={disabled}
        id={inputId}
        list={listId}
        onChange={(event) => {
          const nextQuery = event.target.value
          const nextOption = optionEntries.find(
            (option) => option.displayValue === nextQuery
          )
          const nextSelectedId = nextOption?.id ?? ""

          setQuery(nextQuery)
          setSelectedId(nextSelectedId)
          onValueChange?.(nextSelectedId)
        }}
        placeholder={placeholder}
        type="text"
        value={query}
      />
      <datalist id={listId}>
        {optionEntries.map((option) => (
          <option key={option.id} value={option.displayValue} />
        ))}
      </datalist>
    </div>
  )
}
