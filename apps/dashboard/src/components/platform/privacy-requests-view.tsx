"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { DashboardPageShell } from "@/components/dashboard"
import { usePlatformParams } from "@/hooks/use-platform-params"
import { getPrivacyRequestWord, plural } from "@/lib/platform/platform-words"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"
import { PlatformBadge } from "./platform-badge"
import { PlatformQueue } from "./platform-queue"
import { PlatformTabs } from "./platform-tabs"
import { PrivacyRequestSheet } from "./privacy-request-sheet"

/** People who asked to delete their account, oldest first. */
export function PrivacyRequestsView() {
  const trpc = useTRPC()
  const { setParams } = usePlatformParams()
  const queue = useInfiniteQuery(
    trpc.accountPrivacy.operatorQueue.infiniteQueryOptions(
      {},
      { getNextPageParam: ({ meta }) => meta.cursor ?? undefined }
    )
  )
  const requests = queue.data?.pages.flatMap((page) => page.data) ?? []

  return (
    <DashboardPageShell>
      <PlatformTabs />
      <p className="text-lg text-muted-foreground">
        {queue.data
          ? requests.length
            ? `${plural(requests.length, "open request")}${queue.hasNextPage ? " or more" : ""}, oldest first.`
            : "No one is waiting."
          : "People who asked us to delete their account."}
      </p>
      <PlatformQueue
        columns={["Person", "Status", "Cooperative", "Asked on"]}
        empty={{
          body: "New requests to delete an account will show here.",
          title: "No open privacy requests",
        }}
        error={
          queue.isError
            ? "Privacy requests could not be loaded."
            : queue.isFetchNextPageError
              ? "More requests could not be loaded. Try again."
              : null
        }
        hasMore={Boolean(queue.hasNextPage)}
        loading={queue.isPending}
        loadingMore={queue.isFetchingNextPage}
        onLoadMore={() => void queue.fetchNextPage()}
        onOpen={(privacyRequestId) => void setParams({ privacyRequestId })}
        onRetry={() => void queue.refetch()}
        rows={requests.map((request) => ({
          badge: <PlatformBadge word={getPrivacyRequestWord(request)} />,
          cells: [
            {
              label: "Cooperative",
              value: request.tenant?.name ?? "Not known",
            },
            {
              label: "Asked on",
              value: formatDayMonthYear(request.requestedAt) ?? "Not known",
            },
          ],
          id: request.id,
          subtitle: request.user?.email ?? null,
          title: request.user?.fullName ?? "Account holder",
        }))}
      />
      <PrivacyRequestSheet />
    </DashboardPageShell>
  )
}
