"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@halaalvest/ui/components/combobox"
import { useTRPC } from "@/trpc/client"

type GuarantorOption = {
  id: string
  label: string
}

const searchDelayMs = 250

/**
 * Guarantor picker for a member asking for a loan: searches
 * `loans.guarantorOptions` (names of ready members of the same cooperative,
 * never the asker) only while open. The value is the member id ("" for none).
 */
export function GuarantorCombobox({
  disabled,
  emptyLabel = "No guarantor",
  id,
  onValueChange,
  placeholder = "Search by name",
  value,
}: {
  disabled?: boolean
  emptyLabel?: string
  id?: string
  onValueChange: (memberId: string) => void
  placeholder?: string
  value: string
}) {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<GuarantorOption | null>(null)
  const emptyOption = useMemo(
    () => ({ id: "", label: emptyLabel }),
    [emptyLabel]
  )

  // The input shows the selected name; only typed text is a search.
  const typedSearch =
    selected && inputValue === selected.label ? "" : inputValue.trim()

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setSearch(typedSearch),
      searchDelayMs
    )

    return () => window.clearTimeout(timeout)
  }, [typedSearch])

  // A parent reset (for example after submit) clears the selection.
  const [previousValue, setPreviousValue] = useState(value)
  if (value !== previousValue) {
    setPreviousValue(value)
    if (!value) {
      setSelected(null)
      setInputValue("")
    }
  }

  const selectedLookup = useQuery(
    trpc.loans.guarantorOptions.queryOptions(
      { ids: value ? [value] : [] },
      { enabled: Boolean(value) && selected?.id !== value }
    )
  )
  const selectedOption =
    value && selected?.id === value
      ? selected
      : value && selectedLookup.data?.[0]
        ? {
            id: selectedLookup.data[0].id,
            label: selectedLookup.data[0].fullName,
          }
        : null

  const searchResults = useQuery(
    trpc.loans.guarantorOptions.queryOptions(
      { q: search || undefined },
      { enabled: open, placeholderData: keepPreviousData }
    )
  )
  const items = useMemo(
    () => [
      emptyOption,
      ...(searchResults.data ?? []).map((option) => ({
        id: option.id,
        label: option.fullName,
      })),
    ],
    [emptyOption, searchResults.data]
  )

  return (
    <Combobox
      disabled={disabled}
      filter={null}
      inputValue={inputValue}
      isItemEqualToValue={(item, current) => item.id === current.id}
      itemToStringLabel={(item) => item.label}
      items={items}
      onInputValueChange={setInputValue}
      onOpenChange={setOpen}
      onValueChange={(option) => {
        const next = option && option.id ? option : null
        setSelected(next)
        onValueChange(next?.id ?? "")
      }}
      open={open}
      value={selectedOption}
    >
      <ComboboxInput
        className="w-full"
        disabled={disabled}
        id={id}
        placeholder={placeholder}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {searchResults.isFetching
            ? "Searching…"
            : "No verified members found"}
        </ComboboxEmpty>
        <ComboboxList>
          {(item: GuarantorOption) => (
            <ComboboxItem key={item.id || "none"} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
