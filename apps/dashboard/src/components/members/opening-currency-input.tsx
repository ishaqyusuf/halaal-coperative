"use client"

import { useState } from "react"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"

export function OpeningCurrencyInput({
  disabled,
  id,
  name,
  required,
}: {
  disabled?: boolean
  id: string
  name: string
  required?: boolean
}) {
  const [value, setValue] = useState("")

  return (
    <>
      <CurrencyInput
        allowNegative={false}
        decimalScale={2}
        disabled={disabled}
        id={id}
        inputMode="decimal"
        placeholder="0"
        required={required}
        value={value}
        valueIsNumericString
        onValueChange={(values) => setValue(values.value)}
      />
      <input
        name={name}
        onInput={(event) => setValue(event.currentTarget.value)}
        type="hidden"
        value={value}
      />
    </>
  )
}
