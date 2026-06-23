"use client"

import { useId, useMemo, useState } from "react"

type MemberAutocompleteOption = {
  id: string
  label: string
}

type MemberAutocompleteSelectProps = {
  disabled?: boolean
  label: string
  name: string
  options: MemberAutocompleteOption[]
  placeholder?: string
  value?: string | null
}

export function MemberAutocompleteSelect({
  disabled = false,
  label,
  name,
  options,
  placeholder = "Search member",
  value,
}: MemberAutocompleteSelectProps) {
  const inputId = useId()
  const listId = useId()
  const selectedOption = options.find((option) => option.id === value)
  const selectedDisplayValue = selectedOption
    ? `${selectedOption.label} (${selectedOption.id.slice(0, 8)})`
    : ""
  const [query, setQuery] = useState(selectedDisplayValue)
  const [selectedId, setSelectedId] = useState(selectedOption?.id ?? "")

  const optionEntries = useMemo(() => {
    return options
      .map((option) => ({
        ...option,
        displayValue: `${option.label} (${option.id.slice(0, 8)})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [options])

  return (
    <div>
      <input name={name} type="hidden" value={selectedId} />
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <input
        autoComplete="off"
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
        disabled={disabled}
        id={inputId}
        list={listId}
        onChange={(event) => {
          const nextQuery = event.target.value
          const nextOption = optionEntries.find(
            (option) => option.displayValue === nextQuery
          )

          setQuery(nextQuery)
          setSelectedId(nextOption?.id ?? "")
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
