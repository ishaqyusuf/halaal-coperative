import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "expo-router"
import { useAuthContext } from "@/hooks/use-auth"
import { getToken } from "@/lib/session-store"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import {
  acceptLegalDocuments,
  getLegalBundle,
  getLegalRecords,
  type LegalBundle,
  type LegalRecord,
} from "../api/legal-api"
import { LegalAgreementsScreen } from "../screens/legal-agreements-screen"
export function LegalAgreementsRouteController() {
  const { profile } = useAuthContext()
  return (
    <LegalContent
      key={`${profile?.user.id}:${profile?.tenant.id}:${profile?.activeMembershipId}`}
    />
  )
}
function LegalContent() {
  const runtime = useMobileRuntime()
  const router = useRouter()
  const offline = runtime.state.connectivity === "offline"
  const [bundle, setBundle] = useState<LegalBundle | null>(null)
  const [records, setRecords] = useState<LegalRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const alive = useRef(true)
  const requestNumber = useRef(0)
  const busyRef = useRef(false)
  const token = useRef(getToken())
  const current = () => alive.current && token.current === getToken()
  const refresh = useCallback(async () => {
    const id = ++requestNumber.current
    setReviewed(false)
    setConfirming(false)
    setBundle(null)
    setRecords([])
    setLoading(true)
    setError(null)
    if (offline) {
      setLoading(false)
      return
    }
    try {
      const [nextBundle, nextRecords] = await Promise.all([
        getLegalBundle(),
        getLegalRecords(),
      ])
      if (current() && id === requestNumber.current) {
        setBundle(nextBundle)
        setRecords(nextRecords)
      }
    } catch {
      if (current() && id === requestNumber.current)
        setError(
          "Platform documents could not be loaded. Refresh to try again."
        )
    } finally {
      if (current() && id === requestNumber.current) setLoading(false)
    }
  }, [offline])
  useEffect(() => {
    alive.current = true
    void refresh()
    return () => {
      alive.current = false
      requestNumber.current++
    }
  }, [refresh])
  async function accept() {
    if (
      !current() ||
      offline ||
      busyRef.current ||
      !reviewed ||
      !confirming ||
      !bundle?.available
    )
      return
    busyRef.current = true
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await runtime.runOnlineOperation("command", async () => {
        if (!current()) throw new Error("Account changed")
        await acceptLegalDocuments(bundle.documents)
      })
      if (current()) {
        setMessage("Your platform document acknowledgement was recorded.")
        await refresh()
      }
    } catch {
      if (current()) {
        setError(
          "Documents may have changed or could not be recorded. Refresh and review the latest versions."
        )
        setConfirming(false)
        setReviewed(false)
      }
    } finally {
      if (current()) {
        busyRef.current = false
        setBusy(false)
      }
    }
  }
  return (
    <LegalAgreementsScreen
      bundle={bundle}
      records={records}
      loading={loading}
      busy={busy}
      offline={offline}
      reviewed={reviewed}
      confirming={confirming}
      error={error}
      message={message}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      onRefresh={() => void refresh()}
      onReview={setReviewed}
      onConfirming={setConfirming}
      onAccept={() => void accept()}
    />
  )
}
