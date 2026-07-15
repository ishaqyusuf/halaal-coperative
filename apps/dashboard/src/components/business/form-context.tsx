"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createContext, useContext, type ReactNode } from "react"
import { useBusinessParams } from "@/hooks/use-business-params"
import { useTRPC } from "@/trpc/client"

type BusinessSetup = RouterOutputs["business"]["setup"]
type Business = RouterOutputs["business"]["list"]["data"][number]

type BusinessFormContextValue = {
  business?: Business
  isBusinessLoading: boolean
  setup: BusinessSetup
}

const BusinessFormContext = createContext<BusinessFormContextValue | null>(null)
const disabledBusinessId = "00000000-0000-4000-8000-000000000000"

export function BusinessFormProvider({ children }: { children: ReactNode }) {
  const trpc = useTRPC()
  const { businessId } = useBusinessParams()
  const { data: setup } = useSuspenseQuery(trpc.business.setup.queryOptions())
  const { data: business, isLoading: isBusinessLoading } = useQuery(
    trpc.business.get.queryOptions(
      { businessId: businessId ?? disabledBusinessId },
      { enabled: Boolean(businessId) }
    )
  )

  return (
    <BusinessFormContext.Provider
      value={{
        business: business as Business | undefined,
        isBusinessLoading,
        setup,
      }}
    >
      {children}
    </BusinessFormContext.Provider>
  )
}

export function useBusinessFormContext() {
  const context = useContext(BusinessFormContext)

  if (!context) {
    throw new Error(
      "useBusinessFormContext must be used within BusinessFormProvider"
    )
  }

  return context
}
