"use client"

import { useState } from "react"
import {
  cooperativeCountryCodes,
  cooperativeCountryOptions,
  defaultCooperativeCountry,
  type CooperativeCountry,
} from "@halaalvest/domain"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@halaalvest/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
import { ChevronDownIcon, GlobeIcon } from "lucide-react"
import { countryFlag } from "@/lib/international-phone"

const suggested = [defaultCooperativeCountry] as const
const others = cooperativeCountryOptions
  .filter((country) => !(suggested as readonly string[]).includes(country))
  .slice()
  .sort((a, b) => a.localeCompare(b, "en"))

/**
 * The cooperative's country: a shadcn combobox (Popover + Command) with flags,
 * Nigeria under Suggested. Only the countries onboarding supports are listed.
 */
export function CountryCombobox({
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  id,
  onBlur,
  onChange,
  popupClassName,
  value,
}: {
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  id?: string
  onBlur?: () => void
  onChange: (country: CooperativeCountry) => void
  /** `.su` theme + font variables; popovers portal outside the page. */
  popupClassName: string
  value: string
}) {
  const [open, setOpen] = useState(false)
  const selected = (cooperativeCountryOptions as readonly string[]).includes(
    value
  )
    ? (value as CooperativeCountry)
    : null

  function choose(country: CooperativeCountry) {
    onChange(country)
    setOpen(false)
    onBlur?.()
  }

  function renderItem(country: CooperativeCountry) {
    return (
      <CommandItem
        data-checked={country === selected}
        key={country}
        onSelect={() => choose(country)}
        value={`${country} ${cooperativeCountryCodes[country]}`}
      >
        <span aria-hidden="true" className="su-flag">
          {countryFlag(cooperativeCountryCodes[country])}
        </span>
        <span className="su-item-name">{country}</span>
      </CommandItem>
    )
  }

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur?.()
      }}
      open={open}
    >
      <PopoverTrigger
        aria-describedby={describedBy}
        aria-invalid={invalid}
        className="su-trigger"
        data-empty={selected ? undefined : ""}
        id={id}
      >
        <span className="su-trigger-value">
          {selected ? (
            <>
              <span aria-hidden="true" className="su-flag">
                {countryFlag(cooperativeCountryCodes[selected])}
              </span>
              <span>{selected}</span>
            </>
          ) : (
            <>
              <GlobeIcon aria-hidden="true" className="size-[18px] text-[var(--muted)]" />
              <span>Select country</span>
            </>
          )}
        </span>
        <ChevronDownIcon aria-hidden="true" className="su-chev" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={`${popupClassName} w-(--anchor-width) min-w-[260px]`}
        sideOffset={4}
      >
        <PopoverTitle className="sr-only">Cooperative country</PopoverTitle>
        <Command>
          <CommandInput
            aria-label="Search countries"
            placeholder="Search countries"
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup heading="Suggested">
              {suggested.map(renderItem)}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="All countries">
              {others.map(renderItem)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
