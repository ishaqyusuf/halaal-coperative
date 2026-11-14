"use client"

import { type ReactNode, useState } from "react"
import { AssistantApiProvider } from "./assistant-api"
import { createFixtureAssistantApi } from "./assistant-fixture-api"

/**
 * Supplies the assistant API to the page. Until the coordinator's `assistant`
 * tRPC router is registered, this is the fixture rehearsal adapter; `role`
 * and `cooperativeName` come from the signed server session so suggestions
 * are role-shaped. The real router's `bootstrap` replaces both.
 */
export function AssistantProvider({
  role,
  cooperativeName,
  children,
}: {
  role: "member" | "staff"
  cooperativeName: string
  children: ReactNode
}) {
  const [api] = useState(() =>
    createFixtureAssistantApi({ role, cooperativeName })
  )
  return <AssistantApiProvider value={api}>{children}</AssistantApiProvider>
}
