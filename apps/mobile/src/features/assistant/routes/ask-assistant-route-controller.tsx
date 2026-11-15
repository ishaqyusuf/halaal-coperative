import { useAppLockGateState } from "@/features/app-lock/public/app-lock-state"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { assistantScope, getAssistantApi } from "../api/assistant-client"
import { assistantIdParam } from "../model/assistant-saved-link"
import { AskAssistantScreen } from "../screens/ask-assistant-screen"

function param(value: string | string[] | undefined, max = 160) {
  return typeof value === "string" ? value.slice(0, max) : undefined
}

/**
 * Validates the route params and the signed session, then composes the
 * screen. The screen keeps the membership it opened under; if the session,
 * workspace or role changes while it is open, everything pauses until it is
 * closed and reopened. Offline, locked or without app access, nothing is
 * sent or confirmed.
 */
export function AskAssistantRouteController() {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const access = useMobileAppAccess()
  const lock = useAppLockGateState()
  const params = useLocalSearchParams<{
    draft?: string
    focus?: string
    send?: string
    conversationId?: string
    messageId?: string
    proposalId?: string
  }>()
  const [origin] = useState(() => (profile ? assistantScope(profile) : null))
  const current = profile ? assistantScope(profile) : null
  const scopeChanged = !!origin && origin !== current

  return (
    <AskAssistantScreen
      api={profile && origin && !scopeChanged ? getAssistantApi(profile) : null}
      scope={origin ?? "signed-out"}
      name={profile?.user.name}
      cooperativeName={profile?.tenant.name}
      offline={runtime.state.connectivity === "offline"}
      locked={lock.isLocked || !lock.isHydrated}
      noAccess={
        !profile
          ? "Sign in to use the assistant."
          : scopeChanged
            ? "Your session or workspace changed. Close and reopen the assistant."
            : !access.accessAllowed && !access.checking
              ? "App access is needed to use the assistant."
              : null
      }
      starter={{
        draft: param(params.draft),
        focus: params.focus === "1",
        send: param(params.send),
      }}
      // Set only by a resolved saved-answer or draft link: open that chat at
      // that answer or live draft. Nothing is sent or confirmed for it.
      target={
        assistantIdParam(params.conversationId)
          ? {
              conversationId: assistantIdParam(params.conversationId)!,
              messageId: assistantIdParam(params.messageId),
              proposalId: assistantIdParam(params.proposalId),
            }
          : undefined
      }
    />
  )
}
