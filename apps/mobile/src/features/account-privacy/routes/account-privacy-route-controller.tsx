import { useCallback, useEffect, useRef, useState } from "react"
import { randomUUID } from "expo-crypto"
import { useRouter, type Href } from "expo-router"
import { useAuthContext } from "@/hooks/use-auth"
import { getToken } from "@/lib/session-store"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import {
  cancelPrivacyRequest,
  getPrivacyNotice,
  listPrivacyRequests,
  submitPrivacyRequest,
  type PrivacyNotice,
  type PrivacyRequest,
} from "../api/account-privacy-api"
import {
  AccountPrivacyScreen,
  type PrivacyConfirmation,
} from "../screens/account-privacy-screen"

export function AccountPrivacyRouteController() {
  const { profile } = useAuthContext()
  return <PrivacyController key={`${profile?.user.id}:${profile?.tenant.id}`} />
}
function PrivacyController() {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const router = useRouter()
  const offline = runtime.state.connectivity === "offline"
  const allowed = Boolean(
    profile && canUseMobileFeatureData(profile, profile.role)
  )
  const [notice, setNotice] = useState<PrivacyNotice | null>(null)
  const [requests, setRequests] = useState<PrivacyRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<PrivacyConfirmation>(null)
  const idempotencyKey = useRef(randomUUID())
  const mounted = useRef(true)
  const requestNumber = useRef(0)
  const busyRef = useRef(false)
  const token = getToken()
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      requestNumber.current++
    }
  }, [])
  const load = useCallback(async () => {
    const number = ++requestNumber.current
    if (!allowed || offline) return
    setLoading(true)
    setError(null)
    const current = () =>
      mounted.current &&
      token === getToken() &&
      number === requestNumber.current
    try {
      const [nextNotice, nextRequests] = await Promise.all([
        getPrivacyNotice(),
        listPrivacyRequests(),
      ])
      if (current()) {
        setNotice(nextNotice)
        setRequests(nextRequests)
      }
    } catch {
      if (current())
        setError("Privacy requests could not be loaded. Refresh to retry.")
    } finally {
      if (current()) setLoading(false)
    }
  }, [allowed, offline, token])
  useEffect(() => {
    void load()
    return () => {
      requestNumber.current++
    }
  }, [load])
  async function confirm() {
    if (
      !allowed ||
      offline ||
      !confirmation ||
      busyRef.current ||
      token !== getToken()
    )
      return
    if (confirmation.kind === "request" && !notice) return
    busyRef.current = true
    setBusy(true)
    setError(null)
    setMessage(null)
    const current = () => mounted.current && token === getToken()
    const action = confirmation
    try {
      const receipt = await runtime.runOnlineOperation("command", async () => {
        if (!current()) throw new Error("Account changed")
        if (action.kind === "cancel") {
          await cancelPrivacyRequest(action.requestId)
          return null
        }
        return submitPrivacyRequest({
          idempotencyKey: idempotencyKey.current,
          noticeVersion: notice!.version,
          confirmed: true,
        })
      })
      if (!current()) return
      if (receipt) {
        setRequests((previous) => [
          receipt,
          ...previous.filter((request) => request.id !== receipt.id),
        ])
        setMessage(
          `Your deletion request was received. Reference: ${receipt.id}. Keep it to follow up.`
        )
      } else {
        setMessage("Your deletion request was cancelled.")
      }
      idempotencyKey.current = randomUUID()
      setConfirmation(null)
      await load()
    } catch {
      if (current())
        setError(
          "The request could not be confirmed. Refresh its status before retrying."
        )
    } finally {
      if (current()) {
        busyRef.current = false
        setBusy(false)
      }
    }
  }
  return (
    <AccountPrivacyScreen
      notice={notice}
      requests={requests}
      loading={loading}
      busy={busy}
      offline={offline}
      error={
        !allowed
          ? "Sign in with a live or QA account to manage privacy requests."
          : error
      }
      message={message}
      confirmation={confirmation}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      onRefresh={() => void load()}
      onManageStore={() => router.push("/mobile-access" as Href)}
      onReview={setConfirmation}
      onConfirm={() => void confirm()}
    />
  )
}
