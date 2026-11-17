import { useRef, useState } from "react"
import { randomUUID } from "expo-crypto"
import { useRouter } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthContext } from "@/hooks/use-auth"
import { appQueryKey, useAppQuery, useInvalidateAppQueries } from "@/hooks/use-app-query"
import { getToken } from "@/lib/session-store"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import {
  cancelPrivacyRequest,
  getPrivacyNotice,
  listPrivacyRequests,
  submitPrivacyRequest,
  type PrivacyRequest,
} from "../api/account-privacy-api"
import { livePrivacyRequest } from "../model/privacy-presentation"
import {
  AccountPrivacyScreen,
  type PrivacySheet,
} from "../screens/account-privacy-screen"

/** The notice is static per deploy: read it once per app session. */
const NOTICE_STALE_MS = 6 * 60 * 60 * 1000

export function AccountPrivacyRouteController() {
  const { profile } = useAuthContext()
  return <PrivacyController key={`${profile?.user.id}:${profile?.tenant.id}`} />
}

function PrivacyController() {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const router = useRouter()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateAppQueries()
  const offline = runtime.state.connectivity === "offline"
  const allowed = Boolean(profile && canUseMobileFeatureData(profile, profile.role))
  const enabled = allowed && !offline
  const requestsKey = appQueryKey("account-privacy", "requests", {
    tenantId: profile?.tenant.id,
    userId: profile?.user.id,
  })

  // T26: cached reads with focus/reconnect refresh instead of a hand-rolled
  // loader; writes update and invalidate the requests key only.
  const noticeQuery = useAppQuery({
    enabled,
    queryFn: getPrivacyNotice,
    queryKey: appQueryKey("account-privacy", "notice"),
    staleTime: NOTICE_STALE_MS,
  })
  const requestsQuery = useAppQuery<PrivacyRequest[]>({
    enabled,
    placeholderData: undefined,
    queryFn: listPrivacyRequests,
    queryKey: requestsKey,
  })

  const [sheet, setSheet] = useState<PrivacySheet>(null)
  const [receipt, setReceipt] = useState<PrivacyRequest | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const idempotencyKey = useRef(randomUUID())
  const token = getToken()
  const current = () => token === getToken()

  const notice = noticeQuery.data ?? null
  const requests = requestsQuery.data ?? []
  const loading =
    enabled && (noticeQuery.isFetching || requestsQuery.isFetching) && !(notice && requestsQuery.data)
  const readError = !allowed
    ? "Sign in with a live or QA account to manage privacy requests."
    : noticeQuery.isError || requestsQuery.isError
      ? "Privacy requests could not be loaded. Try again."
      : null

  async function run(action: "request" | "cancel") {
    if (!enabled || busyRef.current || !current()) return
    const live = livePrivacyRequest(requests)
    if (action === "request" && !notice) return
    if (action === "cancel" && !live) return
    busyRef.current = true
    setBusy(true)
    setWriteError(null)
    setMessage(null)
    try {
      const result = await runtime.runOnlineOperation("command", async () => {
        if (!current()) throw new Error("Account changed")
        if (action === "cancel") {
          await cancelPrivacyRequest(live!.id)
          return null
        }
        return submitPrivacyRequest({
          confirmed: true,
          idempotencyKey: idempotencyKey.current,
          noticeVersion: notice!.version,
        })
      })
      if (!current()) return
      idempotencyKey.current = randomUUID()
      if (result) {
        queryClient.setQueryData<PrivacyRequest[]>(requestsKey, (previous = []) => [
          result,
          ...previous.filter((item) => item.id !== result.id),
        ])
        setReceipt(result)
        setSheet("success")
      } else {
        setMessage("Your deletion request was cancelled.")
        setSheet(null)
      }
      void invalidate(requestsKey)
    } catch {
      if (current())
        setWriteError(
          action === "request"
            ? "The request couldn’t be submitted. Check your connection and try again."
            : "The request couldn’t be cancelled. Refresh its status before retrying."
        )
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <AccountPrivacyScreen
      accountLabel={profile?.user.name ?? "Your account"}
      busy={busy}
      loading={loading}
      message={message}
      notice={notice}
      offline={offline}
      readError={readError}
      receipt={receipt}
      refreshing={requestsQuery.isRefetching}
      requestsLoaded={requestsQuery.data !== undefined}
      requests={requests}
      sheet={sheet}
      writeError={writeError}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      onCloseSheet={() => {
        if (busyRef.current) return
        setSheet(null)
        setWriteError(null)
      }}
      onConfirmCancel={() => void run("cancel")}
      onDone={() => {
        setSheet(null)
        setReceipt(null)
      }}
      onOpen={(next) => {
        setMessage(null)
        setWriteError(null)
        setSheet(next)
      }}
      onRefresh={() => {
        setMessage(null)
        void requestsQuery.refetch()
        if (noticeQuery.isError) void noticeQuery.refetch()
      }}
      onSubmit={() => void run("request")}
    />
  )
}
