"use client"

import { type ReactNode, useState } from "react"
import { AssistantApiProvider } from "./assistant-api"
import { createTrpcAssistantApi } from "./assistant-trpc-api"

/**
 * Supplies the `assistant` router client to the page. Role, cooperative and
 * suggestions come from `assistant.bootstrap`, which reads the signed
 * session; nothing here decides authority.
 */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const [api] = useState(createTrpcAssistantApi)
  return <AssistantApiProvider value={api}>{children}</AssistantApiProvider>
}
