import { useAuthContext } from "@/hooks/use-auth"
import type { MobileMemberShareApplicationCreateInput } from "../model/member-shares-types"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { SharesScreen } from "../screens/member-shares-screen"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  createMemberShareApplication,
  getMemberShareApplicationsPage,
  getMemberShares,
} from "../api/member-shares-api"
import { useMemberActivity } from "@/features/member-core/public/use-member-activity"

export function MemberSharesRouteController() {
  const { profile } = useAuthContext()
  const queryClient = useQueryClient()
  const { runOnlineOperation } = useMobileRuntime()
  const canUseServerShares = canUseMobileFeatureData(profile, "member")
  const queryKey = useMemo(
    () => [
      "mobile",
      "shares-profit",
      "member-shares",
      profile?.tenant.id,
      profile?.user.id,
      profile?.activeMembershipId,
    ],
    [profile?.activeMembershipId, profile?.tenant.id, profile?.user.id]
  )
  const sharesQuery = useQuery({
    enabled: canUseServerShares,
    networkMode: "always",
    queryFn: getMemberShares,
    queryKey,
    retry: false,
  })
  const [additionalApplications, setAdditionalApplications] = useState<
    NonNullable<typeof sharesQuery.data>["applications"]
  >([])
  const [applicationCursor, setApplicationCursor] = useState<string | null>(
    null
  )
  useEffect(() => {
    setAdditionalApplications([])
    setApplicationCursor(sharesQuery.data?.applicationNextCursor ?? null)
  }, [sharesQuery.data])
  const applicationPage = useMutation({
    mutationFn: (cursor: string) => getMemberShareApplicationsPage({ cursor }),
    onSuccess: (page) => {
      setAdditionalApplications((current) => {
        const seen = new Set(current.map((application) => application.id))
        return [
          ...current,
          ...page.data.filter((application) => !seen.has(application.id)),
        ]
      })
      setApplicationCursor(page.nextCursor)
    },
  })
  const activity = useMemberActivity({
    enabled: canUseServerShares,
    kind: "shares",
    membershipId: profile?.activeMembershipId,
    tenantId: profile?.tenant.id,
    userId: profile?.user.id,
  })
  const createApplication = useMutation({
    mutationFn: (input: MobileMemberShareApplicationCreateInput) =>
      runOnlineOperation("financial-command", () =>
        createMemberShareApplication(input)
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
    },
  })
  const { mutateAsync: submitApplication } = createApplication
  const handleSubmit = useCallback(
    (input: MobileMemberShareApplicationCreateInput) =>
      submitApplication(input),
    [submitApplication]
  )
  const handleLoadMoreApplications = useCallback(async () => {
    if (!applicationCursor) return
    await applicationPage.mutateAsync(applicationCursor)
  }, [applicationCursor, applicationPage])
  const shares = useMemo(() => {
    if (!sharesQuery.data) return null
    const seen = new Set(sharesQuery.data.applications.map((item) => item.id))

    return {
      ...sharesQuery.data,
      applications: [
        ...sharesQuery.data.applications,
        ...additionalApplications.filter((item) => !seen.has(item.id)),
      ],
    }
  }, [additionalApplications, sharesQuery.data])

  if (!profile) return null

  return (
    <SharesScreen
      activity={activity}
      applicationHistoryError={
        applicationPage.isError ? "Request history could not load more." : null
      }
      canUseServerShares={canUseServerShares}
      error={sharesQuery.isError ? "Share self-service is unavailable." : null}
      isLoading={canUseServerShares && sharesQuery.isPending}
      isSubmitting={createApplication.isPending}
      hasMoreApplications={Boolean(applicationCursor)}
      isLoadingMoreApplications={applicationPage.isPending}
      onLoadMoreApplications={handleLoadMoreApplications}
      onSubmit={handleSubmit}
      profile={profile}
      shares={shares}
    />
  )
}
