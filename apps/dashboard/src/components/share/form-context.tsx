"use client"

import { createContext, useContext } from "react"
import type { TenantSharePolicySettings } from "@halaalvest/db"
import type { Share } from "@/components/tables/shares/columns"

type ShareSheetFormContextValue = {
  financeStartDate?: string | null
  isLocked: boolean
  rows: Share[]
  sharePolicy: TenantSharePolicySettings
}

const ShareSheetFormContext =
  createContext<ShareSheetFormContextValue | null>(null)

export function ShareSheetFormProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: ShareSheetFormContextValue
}) {
  return (
    <ShareSheetFormContext.Provider value={value}>
      {children}
    </ShareSheetFormContext.Provider>
  )
}

export function useShareSheetFormContext() {
  const value = useContext(ShareSheetFormContext)

  if (!value) {
    throw new Error(
      "useShareSheetFormContext must be used inside ShareSheetFormProvider"
    )
  }

  return value
}
