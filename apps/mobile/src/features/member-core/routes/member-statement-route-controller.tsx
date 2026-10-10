import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import {
  cancelReportFile,
  completeReportFile,
  createPendingReportFile,
  expireGeneratedReportFile,
  failReportFile,
  type GeneratedReportFile,
} from "@/features/admin-reports-access/public/generated-report-file"
import { useAuthContext } from "@/hooks/use-auth"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import {
  deletePrivateReportFile,
  savePrivateReportFile,
  sharePrivateReportFile,
} from "@/platform/private-report-file"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  generateMemberStatementExport,
  getMemberCoreStatement,
} from "../api/member-core-api"
import { useMemberActivity } from "../public/use-member-activity"
import { StatementScreen } from "../screens/member-statement-screen"

function exportErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

export function MemberStatementRouteController() {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const cancelledIdsRef = useRef(new Set<string>())
  const fileRef = useRef<GeneratedReportFile | null>(null)
  const generationEpochRef = useRef(0)
  const [generatedFile, setGeneratedFile] =
    useState<GeneratedReportFile | null>(null)
  const canUseServerStatement = canUseMobileFeatureData(profile, "member")
  const statementQuery = useQuery({
    enabled: canUseServerStatement,
    networkMode: "always",
    queryFn: getMemberCoreStatement,
    queryKey: [
      "mobile",
      "member-core",
      "statement",
      profile?.tenant.id,
      profile?.user.id,
      profile?.activeMembershipId,
    ],
    retry: false,
  })
  const activity = useMemberActivity({
    enabled: canUseServerStatement,
    kind: "statement",
    membershipId: profile?.activeMembershipId,
    tenantId: profile?.tenant.id,
    userId: profile?.user.id,
  })
  const exportEnabled =
    canUseServerStatement &&
    statementQuery.data?.cache?.status !== "stale" &&
    runtime.state.connectivity === "online"

  useEffect(() => {
    fileRef.current = generatedFile
  }, [generatedFile])

  useEffect(() => {
    generationEpochRef.current += 1
    deletePrivateReportFile(fileRef.current?.uri ?? null)
    setGeneratedFile(null)
    return () => {
      generationEpochRef.current += 1
      deletePrivateReportFile(fileRef.current?.uri ?? null)
    }
  }, [profile?.token])

  useEffect(() => {
    if (canUseServerStatement) return
    generationEpochRef.current += 1
    cancelledIdsRef.current.clear()
    deletePrivateReportFile(fileRef.current?.uri ?? null)
    setGeneratedFile(null)
  }, [canUseServerStatement])

  useEffect(() => {
    const interval = setInterval(() => {
      setGeneratedFile((current) => {
        if (!current) return null
        const next = expireGeneratedReportFile(current)
        if (next !== current && current.uri)
          deletePrivateReportFile(current.uri)
        return next
      })
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  const generate = useCallback(async () => {
    if (!exportEnabled || generatedFile?.status === "pending") return
    const id = createClientSubmissionKey()
    const generationEpoch = generationEpochRef.current
    const pending = createPendingReportFile({
      id,
      reportKey: "memberStatements",
      reportTitle: "Member statement",
    })
    cancelledIdsRef.current.delete(id)
    deletePrivateReportFile(generatedFile?.uri ?? null)
    setGeneratedFile(pending)
    try {
      const generated = await runtime.runOnlineOperation("command", () =>
        generateMemberStatementExport(id)
      )
      if (
        generationEpoch !== generationEpochRef.current ||
        cancelledIdsRef.current.has(id)
      )
        return
      const saved = savePrivateReportFile({
        content: generated.content,
        filename: generated.filename,
      })
      if (
        generationEpoch !== generationEpochRef.current ||
        cancelledIdsRef.current.has(id)
      ) {
        deletePrivateReportFile(saved.uri)
        return
      }
      setGeneratedFile((current) =>
        current?.id === id
          ? completeReportFile(current, {
              expiresAt: generated.expiresAt,
              filename: generated.filename,
              generatedAt: generated.generatedAt,
              mimeType: generated.mimeType,
              rowCount: generated.rowCount,
              uri: saved.uri,
            })
          : current
      )
    } catch (generationError) {
      if (
        generationEpoch !== generationEpochRef.current ||
        cancelledIdsRef.current.has(id)
      )
        return
      setGeneratedFile((current) =>
        current?.id === id
          ? failReportFile(
              current,
              exportErrorMessage(
                generationError,
                "The statement could not be generated."
              )
            )
          : current
      )
    }
  }, [exportEnabled, generatedFile, runtime])

  const cancel = useCallback(() => {
    if (!generatedFile) return
    cancelledIdsRef.current.add(generatedFile.id)
    deletePrivateReportFile(generatedFile.uri)
    setGeneratedFile(cancelReportFile(generatedFile))
  }, [generatedFile])

  const share = useCallback(async () => {
    if (!generatedFile) return
    const current = expireGeneratedReportFile(generatedFile)
    if (current.status !== "ready" || !current.uri || !current.filename) {
      setGeneratedFile(current)
      return
    }
    try {
      await sharePrivateReportFile({
        filename: current.filename,
        mimeType: current.mimeType ?? "text/csv",
        uri: current.uri,
      })
      setGeneratedFile({ ...current, error: null })
    } catch (shareError) {
      setGeneratedFile({
        ...current,
        error: exportErrorMessage(
          shareError,
          "The statement could not be shared."
        ),
      })
    }
  }, [generatedFile])

  if (!profile) return null

  return (
    <StatementScreen
      activity={activity}
      canUseServerStatement={canUseServerStatement}
      error={statementQuery.isError ? "Statement is unavailable." : null}
      exportEnabled={exportEnabled}
      generatedFile={generatedFile}
      isLoading={canUseServerStatement && statementQuery.isPending}
      onCancelExport={cancel}
      onGenerateExport={() => void generate()}
      onRetryExport={() => void generate()}
      onShareExport={() => void share()}
      profile={profile}
      statement={statementQuery.data ?? null}
    />
  )
}
