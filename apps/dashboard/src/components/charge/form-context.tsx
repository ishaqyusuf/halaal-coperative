"use client"

import { createContext, useContext } from "react"
import type { Charge } from "@/components/tables/charges/columns"

type ChargeSheetFormContextValue = {
  financeStartDate?: string | null
  isLocked: boolean
  quickFillEnabled: boolean
  rows: Charge[]
}

const ChargeSheetFormContext =
  createContext<ChargeSheetFormContextValue | null>(null)

export function ChargeSheetFormProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: ChargeSheetFormContextValue
}) {
  return (
    <ChargeSheetFormContext.Provider value={value}>
      {children}
    </ChargeSheetFormContext.Provider>
  )
}

export function useChargeSheetFormContext() {
  const value = useContext(ChargeSheetFormContext)

  if (!value) {
    throw new Error(
      "useChargeSheetFormContext must be used inside ChargeSheetFormProvider"
    )
  }

  return value
}
