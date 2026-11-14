"use client"

import { createContext, useContext } from "react"

type DashboardRouteTitleValue = {
  isSectionRoot: boolean
  pageTitle: string
}

const DashboardRouteTitleContext =
  createContext<DashboardRouteTitleValue | null>(null)

export function DashboardRouteTitleProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: DashboardRouteTitleValue
}) {
  return (
    <DashboardRouteTitleContext.Provider value={value}>
      {children}
    </DashboardRouteTitleContext.Provider>
  )
}

/** The top bar's title for this route, or null outside the dashboard shell. */
export function useDashboardRouteTitle() {
  return useContext(DashboardRouteTitleContext)
}
