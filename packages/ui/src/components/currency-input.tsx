"use client"

import * as React from "react"
import { NumericFormat, type NumericFormatProps } from "react-number-format"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { cn } from "@halaalvest/ui/lib/utils"

type CurrencyPrefixInputProps = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "prefix"
> & {
  currencyPrefix?: React.ReactNode
  inputClassName?: string
}

export function CurrencyPrefixInput({
  className,
  currencyPrefix = "₦",
  inputClassName,
  ...props
}: CurrencyPrefixInputProps) {
  return (
    <InputGroup className={className}>
      <InputGroupAddon align="inline-start">{currencyPrefix}</InputGroupAddon>
      <InputGroupInput
        className={cn("text-right", inputClassName)}
        {...props}
      />
    </InputGroup>
  )
}

function CurrencyFormatInput({
  className,
  ...props
}: React.ComponentProps<typeof InputGroupInput>) {
  return <CurrencyPrefixInput inputClassName={className} {...props} />
}

export function CurrencyInput({
  thousandSeparator = true,
  ...props
}: NumericFormatProps) {
  return (
    <NumericFormat
      thousandSeparator={thousandSeparator}
      customInput={CurrencyFormatInput}
      {...props}
    />
  )
}
