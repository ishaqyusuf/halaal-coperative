import { useRef, useState } from "react"
import { useRouter } from "expo-router"
import { useAuthContext } from "@/hooks/use-auth"
import { appQueryKey, useAppQuery, useInvalidateAppQueries } from "@/hooks/use-app-query"
import { getToken } from "@/lib/session-store"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import {
  acceptLegalDocuments,
  getLegalBundle,
  getLegalRecords,
  type LegalDocument,
  type LegalRecord,
} from "../api/legal-api"
import { legalReminderQueryKey } from "../public/use-legal-reminder"
import {
  LegalAgreementsScreen,
  type LegalSheet,
} from "../screens/legal-agreements-screen"

/** The bundle changes only when new versions are published. */
const BUNDLE_STALE_MS = 30 * 60 * 1000

export function LegalAgreementsRouteController() {
  const { profile } = useAuthContext()
  return (
    <LegalContent
      key={`${profile?.user.id}:${profile?.tenant.id}:${profile?.activeMembershipId}`}
    />
  )
}

function LegalContent() {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const router = useRouter()
  const invalidate = useInvalidateAppQueries()
  const offline = runtime.state.connectivity === "offline"
  const accountKey = profile
    ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
    : null
  const bundleKey = appQueryKey("legal", "bundle")
  const recordsKey = appQueryKey("legal", "records", accountKey)

  // T26: cached reads (no blank refresh); writes invalidate exact keys.
  const bundleQuery = useAppQuery({
    enabled: !offline,
    queryFn: getLegalBundle,
    queryKey: bundleKey,
    staleTime: BUNDLE_STALE_MS,
  })
  const recordsQuery = useAppQuery<LegalRecord[]>({
    enabled: !offline && Boolean(accountKey),
    placeholderData: undefined,
    queryFn: getLegalRecords,
    queryKey: recordsKey,
  })

  const [checked, setChecked] = useState(false)
  const [reading, setReading] = useState<LegalDocument | null>(null)
  const [sheet, setSheet] = useState<LegalSheet>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const busyRef = useRef(false)
  const token = getToken()
  const current = () => token === getToken()
  const bundle = bundleQuery.data ?? null

  async function accept() {
    if (offline || busyRef.current || !checked || !bundle?.available || !current()) return
    busyRef.current = true
    setBusy(true)
    setMessage(null)
    try {
      await runtime.runOnlineOperation("command", async () => {
        if (!current()) throw new Error("Account changed")
        await acceptLegalDocuments(bundle.documents)
      })
      if (!current()) return
      setSheet(null)
      setChecked(false)
      setMessage("Your platform document acknowledgement was recorded.")
      await invalidate(recordsKey, legalReminderQueryKey(accountKey))
    } catch {
      if (current()) {
        setWriteError(
          "Documents may have changed or could not be recorded. Refresh and review the latest versions."
        )
        setSheet("record-error")
        setChecked(false)
      }
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <LegalAgreementsScreen
      bundle={bundle}
      busy={busy}
      checked={checked}
      loading={bundleQuery.isFetching || recordsQuery.isFetching}
      message={message}
      offline={offline}
      readError={
        bundleQuery.isError || recordsQuery.isError
          ? "Platform documents could not be loaded. Refresh to try again."
          : null
      }
      reading={reading}
      records={recordsQuery.data ?? null}
      refreshing={
        (bundleQuery.isRefetching || recordsQuery.isRefetching) &&
        Boolean(bundle && recordsQuery.data)
      }
      sheet={sheet}
      writeError={writeError}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      onCheck={setChecked}
      onCloseReader={() => setReading(null)}
      onCloseSheet={() => {
        if (busyRef.current) return
        setSheet(null)
        setWriteError(null)
      }}
      onConfirm={() => void accept()}
      onOpenRecord={() => {
        setWriteError(null)
        setSheet("record")
      }}
      onRead={setReading}
      onRefresh={() => {
        setMessage(null)
        void invalidate(bundleKey, recordsKey)
      }}
      onRefreshDocuments={() => {
        setSheet(null)
        setWriteError(null)
        setMessage(null)
        void invalidate(bundleKey, recordsKey)
      }}
    />
  )
}
