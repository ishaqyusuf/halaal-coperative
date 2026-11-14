"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { chargeTypesInput } from "@/lib/charges/charge-list-input"
import { useTRPC } from "@/trpc/client"

/** Every charge type with its dated amounts (one cached read per page). */
export function useChargeTypesQuery() {
  const trpc = useTRPC()
  const { data } = useSuspenseQuery(
    trpc.charges.chargeLibrary.queryOptions(chargeTypesInput)
  )

  return data.data
}

export type ChargeTypeRow = ReturnType<typeof useChargeTypesQuery>[number]
