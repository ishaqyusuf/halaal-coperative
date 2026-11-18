"use client"

import { type ClipboardEvent, type Ref, useState } from "react"
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
import { ChevronDownIcon, GlobeIcon } from "lucide-react"
import PhoneInput from "react-phone-number-input/input-max"
import {
  countryFlag,
  movePhoneToCountry,
  PHONE_COUNTRIES,
  parsePastedInternationalPhone,
  phoneCountry,
  phonePlaceholder,
} from "@/lib/international-phone"

/**
 * Phone InputGroup (ported from ewatrade's SignupPhoneInput): a flag picker and
 * calling code before the number. The value is E.164. Changing the country
 * keeps the typed digits; pasting "+44 …" switches the country.
 */
export function SignupPhoneInput({
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  country,
  id,
  inputRef,
  name,
  onBlur,
  onChange,
  onCountryChange,
  popupClassName,
  suggestedCountries,
  value,
}: {
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  country: string
  id?: string
  inputRef?: Ref<HTMLInputElement>
  name?: string
  onBlur?: () => void
  onChange: (value: string) => void
  /** The user picked a country on the phone itself. */
  onCountryChange: (country: string) => void
  popupClassName: string
  /** ISO codes listed first: the cooperative's country, then Nigeria. */
  suggestedCountries: readonly string[]
  value: string
}) {
  const [open, setOpen] = useState(false)
  const selected = phoneCountry(country)
  const current = PHONE_COUNTRIES.find((item) => item.code === selected)
  const suggested = PHONE_COUNTRIES.filter((item) =>
    suggestedCountries.includes(item.code)
  ).sort(
    (a, b) =>
      suggestedCountries.indexOf(a.code) - suggestedCountries.indexOf(b.code)
  )
  const rest = PHONE_COUNTRIES.filter(
    (item) => !suggestedCountries.includes(item.code)
  )

  function choose(code: string) {
    if (code !== selected) {
      onCountryChange(code)
      onChange(movePhoneToCountry(value, selected, code))
    }
    setOpen(false)
  }

  function renderItem(item: (typeof PHONE_COUNTRIES)[number]) {
    return (
      <CommandItem
        data-checked={item.code === selected}
        key={item.code}
        onSelect={() => choose(item.code)}
        value={`${item.name} ${item.code} +${item.callingCode}`}
      >
        <span aria-hidden="true" className="su-flag">
          {countryFlag(item.code)}
        </span>
        <span className="su-item-name">{item.name}</span>
        <span className="su-item-code">+{item.callingCode}</span>
      </CommandItem>
    )
  }

  return (
    <InputGroup className="su-phone">
      <InputGroupAddon align="inline-start" className="gap-0 py-0 pl-0">
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger
            aria-label={
              current
                ? `Phone country: ${current.name}, +${current.callingCode}. Change country`
                : "Select phone country"
            }
            className="su-flag-btn"
          >
            {selected ? (
              <span aria-hidden="true" className="su-flag">
                {countryFlag(selected)}
              </span>
            ) : (
              <GlobeIcon aria-hidden="true" className="size-[18px] text-[var(--muted)]" />
            )}
            <ChevronDownIcon aria-hidden="true" className="su-chev" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            alignOffset={-6}
            className={`${popupClassName} w-[320px] max-w-[calc(100vw-32px)]`}
            sideOffset={10}
          >
            <PopoverTitle className="sr-only">Phone country</PopoverTitle>
            <Command>
              <CommandInput
                aria-label="Search country or calling code"
                placeholder="Search country or code"
              />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                {suggested.length ? (
                  <>
                    <CommandGroup heading="Suggested">
                      {suggested.map(renderItem)}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                ) : null}
                <CommandGroup heading="All countries">
                  {rest.map(renderItem)}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <span aria-label="Calling code" className="su-calling">
          {current ? `+${current.callingCode}` : "+"}
        </span>
      </InputGroupAddon>
      <PhoneInput
        aria-describedby={describedBy}
        aria-invalid={invalid}
        autoComplete="tel-national"
        country={selected}
        id={id}
        inputComponent={InputGroupInput}
        inputMode="tel"
        international={selected ? true : undefined}
        name={name}
        onBlur={onBlur}
        onChange={(next) => onChange(next ?? "")}
        onPaste={(event: ClipboardEvent<HTMLInputElement>) => {
          const pasted = parsePastedInternationalPhone(
            event.clipboardData.getData("text")
          )
          if (!pasted) return
          event.preventDefault()
          onCountryChange(pasted.country)
          onChange(pasted.number)
        }}
        placeholder={phonePlaceholder(selected)}
        ref={inputRef}
        value={value || undefined}
        withCountryCallingCode={selected ? false : undefined}
      />
    </InputGroup>
  )
}
