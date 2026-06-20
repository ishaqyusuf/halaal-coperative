"use client"

import { NumericFormat, type NumericFormatProps } from "react-number-format"

import { Input } from "@halaalvest/ui/components/input"

export function CurrencyInput({
  thousandSeparator = true,
  ...props
}: NumericFormatProps) {
  return (
    <NumericFormat
      thousandSeparator={thousandSeparator}
      customInput={Input}
      {...props}
    />
  )
}
