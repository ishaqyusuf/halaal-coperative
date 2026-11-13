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

export type MemberComboboxOption = {
  id: string
  label: string
}

const searchDelayMs = 250

function toOption(member: {
  fullName: string
  id: string
  memberNumber: string
}): MemberComboboxOption {
  return {
    id: member.id,
    label: `${member.fullName} (${member.memberNumber})`,
  }
}

/**
 * Lazy member picker: searches `members.options` (name or member number,
 * 20 rows) only while open, instead of the page loading every member. The
 * value is the member id ("" for none).
 */
export function MemberCombobox({
  disabled,
  emptyLabel,
  id,
  name,
  onValueChange,
  placeholder = "Search members",
  value,
}: {
  disabled?: boolean
  /** Adds a "no member" choice with this label. */
  emptyLabel?: string
  id?: string
  /** Renders a hidden input for FormData submits. */
  name?: string
  onValueChange: (memberId: string) => void
  placeholder?: string
  value: string
}) {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<MemberComboboxOption | null>(null)
  const emptyOption = useMemo(
    () => (emptyLabel ? { id: "", label: emptyLabel } : null),
    [emptyLabel]
  )

  // The input shows the selected label; only typed text is a search.
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
    trpc.members.options.queryOptions(
      { ids: value ? [value] : [] },
      { enabled: Boolean(value) && selected?.id !== value }
    )
  )
  const selectedOption =
    value && selected?.id === value
      ? selected
      : value && selectedLookup.data?.[0]
        ? toOption(selectedLookup.data[0])
        : null

  const searchResults = useQuery(
    trpc.members.options.queryOptions(
      { q: search || undefined },
      { enabled: open, placeholderData: keepPreviousData }
    )
  )
  const items = useMemo(
    () => [
      ...(emptyOption ? [emptyOption] : []),
      ...(searchResults.data ?? []).map(toOption),
    ],
    [emptyOption, searchResults.data]
  )

  return (
    <>
      {name ? <input name={name} type="hidden" value={value} /> : null}
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
            {searchResults.isFetching ? "Searching…" : "No members found"}
          </ComboboxEmpty>
          <ComboboxList>
            {(item: MemberComboboxOption) => (
              <ComboboxItem key={item.id || "none"} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </>
  )
}
