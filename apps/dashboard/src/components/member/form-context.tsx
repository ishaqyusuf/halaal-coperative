"use client"

import { createContext, useContext } from "react"
import type { TenantMigrationSetupMode } from "@halaalvest/db"
import type { MemberCreateForm } from "@/components/forms/member-forms"
import type { MemberCollectionSourceOption } from "@/lib/members/load-members-page"

type MemberSheetFormContextValue = {
  canManageCollectionSources: boolean
  collectionSourceOptions: MemberCollectionSourceOption[]
  cooperativeStartDate?: string | null
  devMode: boolean
  initialValues?: Parameters<typeof MemberCreateForm>[0]["initialValues"]
  memberNumberPrefix?: string | null
  migrationSetupMode: TenantMigrationSetupMode
}

const MemberSheetFormContext =
  createContext<MemberSheetFormContextValue | null>(null)

export function MemberSheetFormProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: MemberSheetFormContextValue
}) {
  return (
    <MemberSheetFormContext.Provider value={value}>
      {children}
    </MemberSheetFormContext.Provider>
  )
}

export function useMemberSheetFormContext() {
  const value = useContext(MemberSheetFormContext)

  if (!value) {
    throw new Error(
      "useMemberSheetFormContext must be used inside MemberSheetFormProvider"
    )
  }

  return value
}
