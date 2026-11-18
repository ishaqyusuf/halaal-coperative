import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { rowPosition } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { useAppInfiniteQuery } from "@/hooks/use-app-query"
import { useIsOnline } from "@/lib/online-status"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import { getMemberFinancingRequestPage } from "../api/member-financing-api"
import { useFinancingScope } from "../api/use-member-financing-queries"
import {
  FinanceHeading,
  FinanceNotice,
  FinanceRequestDetail,
  FinanceRequestRow,
  FinancingRestricted,
  financeStatus,
  formatFinanceMoney,
  isOpenRequest,
} from "../components/financing-records"
import type {
  MobileFinancingRequest,
  MobileFinancingRequestPage,
  MobileMemberFinancing,
} from "../model/member-financing-types"

type RequestListItem = {
  id: string
  heading?: string
  count: number
  position: ReturnType<typeof rowPosition>
  request: MobileFinancingRequest
}

function groupRequests(requests: MobileFinancingRequest[]): RequestListItem[] {
  const groups = new Map<string, MobileFinancingRequest[]>()
  groups.set("In progress", [])
  for (const request of requests) {
    const key = isOpenRequest(request)
      ? "In progress"
      : request.requestedAt.slice(0, 4)
    const group = groups.get(key)
    if (group) group.push(request)
    else groups.set(key, [request])
  }
  return Array.from(groups).flatMap(([title, rows]) =>
    rows.map((request, index) => ({
      id: request.id,
      count: rows.length,
      heading: index === 0 ? title : undefined,
      position: rowPosition(index, rows.length),
      request,
    }))
  )
}

export function MemberFinancingRequestsScreen() {
  const router = useRouter()
  const online = useIsOnline()
  const queryClient = useQueryClient()
  const { currency, enabled, requestsKey, snapshotKey } = useFinancingScope()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const snapshot = queryClient.getQueryData<MobileMemberFinancing>(snapshotKey)
  const page = useAppInfiniteQuery({
    enabled,
    queryKey: requestsKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      getMemberFinancingRequestPage({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData:
      snapshot && snapshot.state !== "database_unavailable"
        ? {
            pages: [
              {
                data: snapshot.requests,
                nextCursor: snapshot.requestNextCursor,
                state: snapshot.state,
              } satisfies MobileFinancingRequestPage,
            ],
            pageParams: [null],
          }
        : undefined,
    initialDataUpdatedAt:
      snapshot?.cache?.status === "stale"
        ? 0
        : queryClient.getQueryState(snapshotKey)?.dataUpdatedAt,
    placeholderData: undefined,
    selectItems: (result) => result.data,
  })
  const searchText = search.trim().toLocaleLowerCase()
  const requests = Array.from(
    new Map(page.items.map((item) => [item.id, item])).values()
  )
  const rows = groupRequests(
    requests.filter(
      (request) =>
        !searchText ||
        `${request.loanProductName} ${financeStatus(request.status)} ${request.requestedAmount} ${formatFinanceMoney(request.requestedAmount, currency)}`
          .toLocaleLowerCase()
          .includes(searchText)
    )
  )
  const restricted =
    !enabled || page.data?.pages[0]?.state === "member_profile_missing"
  const refresh = () => void page.refetch()
  return (
    <>
      <AppList
        back={() =>
          router.canGoBack() ? router.back() : router.replace("/financing")
        }
        data={rows}
        empty={
          restricted ? (
            <FinancingRestricted onHelp={() => router.push("/support")} />
          ) : !online ? undefined : (
            <EmptyState
              action={
                searchText
                  ? undefined
                  : {
                      label: "Back to Finance",
                      onPress: () => router.navigate("/financing"),
                    }
              }
              description={
                searchText
                  ? "Search by product, status or amount."
                  : "Requests you send appear here with their status."
              }
              icon="HandCoins"
              title={searchText ? "No matching requests" : "No requests yet"}
            />
          )
        }
        error={
          page.isError && online ? "Couldn’t load your requests." : undefined
        }
        header={
          <View className="gap-2">
            <View className="flex-row flex-wrap items-end justify-between gap-2">
              <Text accessibilityRole="header" variant="screenTitle">
                Requests
              </Text>
              {requests.length ? (
                <Text className="pb-1 text-muted-foreground" variant="label">
                  {requests.length} {page.hasNextPage ? "loaded" : "total"}
                </Text>
              ) : null}
            </View>
            {!online ? (
              <FinanceNotice
                title="You’re offline"
                detail={
                  requests.length
                    ? "Showing your saved requests."
                    : "Connect to load your financing requests."
                }
                warning
              />
            ) : null}
          </View>
        }
        isFetchingNextPage={page.isFetchingNextPage}
        isLoading={page.isPending && enabled && online}
        keyExtractor={(item) => item.id}
        onEndReached={online ? page.onEndReached : undefined}
        onRefresh={enabled && online ? refresh : undefined}
        onRetry={refresh}
        refreshing={page.isRefetching}
        renderItem={({ item }) => (
          <View className={item.heading ? "gap-2 pt-3" : undefined}>
            {item.heading ? (
              <View className="mx-[18px]">
                <FinanceHeading
                  title={item.heading}
                  trailing={
                    <Text className="text-muted-foreground" variant="label">
                      {item.count}
                    </Text>
                  }
                />
              </View>
            ) : null}
            <FinanceRequestRow
              currency={currency}
              onOpen={(record) => setSelectedId(record.id)}
              position={item.position}
              request={item.request}
            />
          </View>
        )}
        search={{
          value: search,
          onChangeText: setSearch,
          placeholder: "Search requests",
          totalCount: requests.length,
          localSearch: true,
        }}
        testID="member-financing-requests"
      />
      <FinanceRequestDetail
        currency={currency}
        onClose={() => setSelectedId(null)}
        request={requests.find((item) => item.id === selectedId) ?? null}
      />
    </>
  )
}
