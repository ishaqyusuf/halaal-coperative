import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import {
  cancelReportFile,
  completeReportFile,
  createPendingReportFile,
  expireGeneratedReportFile,
  failReportFile,
  type GeneratedReportFile,
} from "@/features/admin-reports-access/public/generated-report-file"
import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import {
  deletePrivateReportFile,
  savePrivateReportFile,
  sharePrivateReportFile,
} from "@/platform/private-report-file"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect } from "expo-router"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  generateMemberStatementExport,
  getMemberCoreStatement,
} from "../api/member-core-api"
import type { MobileStatementActivityCategory } from "../model/member-core-types"
import { useMemberActivity } from "../public/use-member-activity"
import { StatementScreen } from "../screens/member-statement-screen"

function useStatementFile(
  scope: string,
  allowed: boolean,
  canGenerate: boolean
) {
  const runtime = useMobileRuntime()
  const fileRef = useRef<GeneratedReportFile | null>(null)
  const sharingRef = useRef(false)
  const [file, setFile] = useState<GeneratedReportFile | null>(null)
  const [sharing, setSharing] = useState(false)
  const update = useCallback((next: GeneratedReportFile | null) => {
    fileRef.current = next
    setFile(next)
  }, [])

  const discard = useCallback(() => {
    const closing = fileRef.current
    update(null)
    deletePrivateReportFile(closing?.uri ?? null)
  }, [update])

  useLayoutEffect(() => discard, [allowed, scope, discard])
  useFocusEffect(useCallback(() => discard, [discard]))

  const expire = useCallback(
    (current: GeneratedReportFile) => {
      const next = expireGeneratedReportFile(current)
      if (next !== current) {
        deletePrivateReportFile(current.uri)
        update(next)
      }
      return next
    },
    [update]
  )

  useEffect(() => {
    if (file?.status !== "ready" || !file.expiresAt) return
    const timer = setTimeout(
      () => {
        if (fileRef.current?.id === file.id) expire(fileRef.current)
      },
      Math.max(0, Date.parse(file.expiresAt) - Date.now() + 1)
    )
    return () => clearTimeout(timer)
  }, [expire, file])

  async function generate() {
    if (
      !canGenerate ||
      fileRef.current?.status === "pending" ||
      sharingRef.current
    )
      return
    const id = createClientSubmissionKey()
    const pending = createPendingReportFile({
      id,
      reportKey: "memberStatements",
      reportTitle: "Member statement",
    })
    deletePrivateReportFile(fileRef.current?.uri ?? null)
    update(pending)
    try {
      const generated = await runtime.runOnlineOperation("command", () =>
        generateMemberStatementExport(id)
      )
      if (fileRef.current !== pending) return
      const { uri } = savePrivateReportFile(generated)
      update(completeReportFile(pending, { ...generated, uri }))
    } catch {
      if (fileRef.current === pending) {
        update(
          failReportFile(
            pending,
            "The statement could not be generated. Try again."
          )
        )
      }
    }
  }

  function cancel() {
    const current = fileRef.current
    if (current?.status === "pending") update(cancelReportFile(current))
  }

  async function share() {
    if (sharingRef.current || !fileRef.current) return
    const current = expire(fileRef.current)
    if (current.status !== "ready" || !current.uri || !current.filename) return
    sharingRef.current = true
    setSharing(true)
    let error: string | null = null
    try {
      await sharePrivateReportFile({
        filename: current.filename,
        mimeType: current.mimeType ?? "text/csv",
        uri: current.uri,
      })
    } catch {
      error = "The statement could not be shared. Try again."
    } finally {
      sharingRef.current = false
      setSharing(false)
      if (fileRef.current === current && expire(current) === current)
        update({ ...current, error })
    }
  }

  return {
    file: allowed ? file : null,
    onCancel: cancel,
    onGenerate: () => void generate(),
    onShare: () => void share(),
    sharing,
  }
}

export function MemberStatementRouteController() {
  const { profile } = useAuthContext()
  const { state } = useMobileRuntime()
  const [category, setCategory] = useState<MobileStatementActivityCategory>()
  const enabled = canUseMobileFeatureData(profile, "member")
  const statement = useAppQuery({
    enabled,
    networkMode: "always",
    placeholderData: undefined,
    queryFn: getMemberCoreStatement,
    queryKey: appQueryKey(
      "member-core",
      "statement",
      profile?.tenant.id,
      profile?.user.id,
      profile?.activeMembershipId
    ),
  })
  const activity = useMemberActivity({
    category,
    enabled,
    kind: "statement",
    membershipId: profile?.activeMembershipId,
    tenantId: profile?.tenant.id,
    userId: profile?.user.id,
  })
  const offline = state.connectivity === "offline"
  const blocked =
    state.connectivity !== "online"
      ? "offline"
      : statement.isError || statement.data?.cache.status !== "live"
        ? "stale"
        : null
  const scope = `${profile?.tenant.id}:${profile?.activeMembershipId}:${profile?.user.id}:${profile?.token}`
  const fileActions = useStatementFile(
    scope,
    enabled,
    enabled && Boolean(statement.data?.member) && !blocked
  )

  if (!profile) return null
  return (
    <StatementScreen
      activity={activity}
      category={category}
      currencyCode={profile.tenant.currencyCode}
      error={statement.isError}
      fileActions={{ ...fileActions, blocked }}
      isLoading={enabled && statement.isPending}
      key={`${profile.tenant.id}:${profile.activeMembershipId}:${profile.user.id}`}
      offline={offline}
      onCategoryChange={setCategory}
      onRefresh={() => {
        if (!enabled) return
        void statement.refetch()
        activity.onRefresh()
      }}
      refreshing={statement.isRefetching || activity.isRefreshing}
      statement={statement.data}
    />
  )
}
