import { useAppLockGateState } from "@/features/app-lock/public/app-lock-state"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import type { AssistantLinkTarget } from "@halaalvest/assistant/contracts"
import { type Href, useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { assistantScope, getAssistantApi } from "../api/assistant-client"
import { assistantLinkTarget } from "../model/assistant-saved-link"
import {
  AssistantSavedLinkScreen,
  type SavedLinkState,
} from "../screens/assistant-saved-link-screen"

/**
 * Neutral landing for `/assistant/m/<id>` and `/assistant/review/<id>`
 * (same paths as the website). It waits for sign-in, app lock and app
 * access, then asks the server who may see the link
 * (`assistant.links.resolve`, re-authorized for the active membership) and
 * opens the chat at that answer or draft. It never confirms, edits or sends.
 */
export function AssistantSavedLinkRouteController({
  kind,
  id,
}: {
  kind: AssistantLinkTarget["kind"]
  id: string | string[] | undefined
}) {
  const auth = useAuthContext()
  const lock = useAppLockGateState()
  const access = useMobileAppAccess()
  const runtime = useMobileRuntime()
  const router = useRouter()
  const [result, setResult] = useState<SavedLinkState | null>(null)
  const [attempt, setAttempt] = useState(0)
  const lifetime = useRef(0)
  const target = assistantLinkTarget(kind, id)
  const profile = auth.profile
  const scope = profile ? assistantScope(profile) : null
  const offline = runtime.state.connectivity === "offline"

  const gate: SavedLinkState | null = !target
    ? "invalid"
    : auth.initializing || !lock.isHydrated || lock.isLocked
      ? "waiting"
      : !profile
        ? "signed-out"
        : access.checking
          ? "waiting"
          : !access.accessAllowed
            ? "no-access"
            : offline
              ? "offline"
              : null

  // biome-ignore lint/correctness/useExhaustiveDependencies: the target is derived from kind and id.
  useEffect(() => {
    const observed = ++lifetime.current
    setResult(null)
    if (gate || !profile || !target) return
    setResult("opening")
    getAssistantApi(profile)
      .resolveLink(target)
      .then((found) => {
        // A sign-out, switch or newer attempt while loading wins.
        if (lifetime.current !== observed) return
        if (found.status !== "ok") {
          setResult("unavailable")
          return
        }
        router.replace({
          pathname: "/ask-assistant",
          params: {
            conversationId: found.conversationId,
            ...(found.messageId ? { messageId: found.messageId } : {}),
            ...(found.proposalId ? { proposalId: found.proposalId } : {}),
          },
        } as never)
      })
      .catch(() => {
        if (lifetime.current === observed) setResult("error")
      })
    return () => {
      lifetime.current++
    }
  }, [gate, scope, kind, id, attempt, router])

  return (
    <AssistantSavedLinkScreen
      kind={kind}
      state={gate ?? result ?? "opening"}
      onRetry={() => setAttempt((value) => value + 1)}
      onSignIn={() => router.replace("/(auth)/sign-in" as Href)}
      onOpenAssistant={() => router.replace("/ask-assistant" as Href)}
    />
  )
}
