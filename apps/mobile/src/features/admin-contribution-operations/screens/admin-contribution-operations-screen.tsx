import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { getContributionSummary } from "../api/admin-contribution-operations-api"
import { AdminContributionWorkspace } from "../components/admin-contribution-workspace"
import { ContributionBatchSheet } from "../components/contribution-batch-sheet"
import { ContributionEvidenceSheet } from "../components/contribution-evidence-sheet"
import {
  ContributionResultSheet,
  ContributionReviewSheet,
  useContributionReview,
} from "../components/contribution-review-sheet"
import type {
  CollectionBatchSummary,
  ContributionLane,
  ContributionLedgerRow,
} from "../model/admin-contribution-operations-types"
import {
  contributionKeys,
  useRefreshContributions,
} from "../model/contribution-queries"

/**
 * T18 Admin › Contributions lanes. Reads: the summary once per visit plus
 * one cursor page of the visible lane. Member and batch pages are pushed
 * instances of this route (`?memberId=` / `?batchId=`).
 */
export function AdminContributionOperationsScreen() {
  const router = useRouter()
  const { profile } = useAuthContext()
  const online = useIsOnline()
  const refresh = useRefreshContributions()
  const enabled = canUseMobileFeatureData(profile, "admin")
  const [lane, setLane] = useState<ContributionLane>("commitments")
  const [evidence, setEvidence] = useState<ContributionLedgerRow | null>(null)
  const [staging, setStaging] = useState(false)
  const [batches, setBatches] = useState<CollectionBatchSummary[]>([])
  const [findMemberToken, setFindMemberToken] = useState(0)

  const summary = useAppQuery({
    enabled,
    networkMode: "always",
    queryFn: getContributionSummary,
    queryKey: contributionKeys().summary,
  })
  const data = summary.data
  const stale = isMobileReadCacheStale(data?.cache)
  const offline = !online
  const blocked = offline || stale
  const canStage = Boolean(data?.capabilities.manageBatches)
  const canRecord = Boolean(data?.capabilities.manageMemberContributions)

  const flow = useContributionReview({
    onSucceeded: () => {
      setStaging(false)
      void refresh({ lanes: ["collections"] })
    },
  })

  const openMember = useCallback(
    (memberId: string) => {
      setEvidence(null)
      router.push({ pathname: "/(admin)/contributions", params: { memberId } })
    },
    [router]
  )
  const openBatch = useCallback(
    (batch: CollectionBatchSummary) =>
      router.push({
        pathname: "/(admin)/contributions",
        params: { batchId: batch.id },
      }),
    [router]
  )
  const startBatch = useCallback(() => {
    setLane("collections")
    setStaging(true)
  }, [])
  const refetchSummary = summary.refetch
  const refreshSummary = useCallback(() => refetchSummary(), [refetchSummary])

  return (
    <>
      <AdminContributionWorkspace
        enabled={enabled}
        findMemberToken={findMemberToken}
        lane={lane}
        offline={offline}
        onBack={() =>
          router.canGoBack()
            ? router.back()
            : router.replace("/(admin)/(tabs)/finance")
        }
        onCollectionsLoaded={setBatches}
        onFindMember={
          canRecord && !blocked
            ? () => {
                setLane("commitments")
                setFindMemberToken((token) => token + 1)
              }
            : undefined
        }
        onLaneChange={setLane}
        onOpenBatch={openBatch}
        onOpenLedger={setEvidence}
        onOpenMember={openMember}
        onRefreshSummary={refreshSummary}
        onStageBatch={canStage && !blocked ? startBatch : undefined}
        stale={stale}
        summary={data}
        summaryFailed={summary.isError && !data}
      />
      <ContributionEvidenceSheet
        currencyCode={data?.currencyCode ?? "NGN"}
        entry={evidence}
        onClose={() => setEvidence(null)}
        onOpenMember={openMember}
      />
      {staging && data ? (
        <ContributionBatchSheet
          batches={batches}
          blocked={blocked}
          onClose={() => setStaging(false)}
          onReview={flow.open}
          reviewActive={flow.active}
          sources={data.sources}
          visible
        />
      ) : null}
      <ContributionReviewSheet flow={flow} />
      <ContributionResultSheet
        onDone={flow.dismissResult}
        result={flow.result}
      />
    </>
  )
}
