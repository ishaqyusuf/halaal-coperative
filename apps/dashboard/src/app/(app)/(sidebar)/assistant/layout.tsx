import { normalizeRole } from "@halaalvest/auth/roles"
import type { ReactNode } from "react"
import { AssistantProvider } from "@/components/general-assistant/assistant-provider"
import { AssistantWorkbench } from "@/components/general-assistant/assistant-workbench"
import { getDashboardServerContext } from "@/lib/server-context"

/**
 * The chat lives in the layout so moving between /assistant and
 * /assistant/c/[id] keeps it mounted: drafts and replies in flight survive.
 * The pages only give each URL its own route. The sidebar layout has already
 * required a signed-in membership; the role here only shapes suggestions,
 * and the assistant router re-checks authority on every call.
 */
export default async function AssistantLayout({
  children,
}: {
  children: ReactNode
}) {
  const context = await getDashboardServerContext()
  const role = normalizeRole(context.auth.membership?.role ?? null)

  return (
    <AssistantProvider
      role={role === "member" ? "member" : "staff"}
      cooperativeName={context.tenant?.name ?? "Your cooperative"}
    >
      <AssistantWorkbench />
      {children}
    </AssistantProvider>
  )
}
