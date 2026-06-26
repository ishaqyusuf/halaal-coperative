import "server-only"

import { buildRequestContext } from "@halaalvest/api/context"
import { appRouter, type AppRouter } from "@halaalvest/api/router"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query"
import { headers } from "next/headers"
import { cache } from "react"
import { makeQueryClient } from "./query-client"

export const getQueryClient = cache(makeQueryClient)

const createServerTRPCContext = cache(async () => {
  return buildRequestContext(new Headers(await headers()))
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
  ctx: createServerTRPCContext,
  queryClient: getQueryClient,
  router: appRouter,
})

export async function getServerCaller() {
  return appRouter.createCaller(await createServerTRPCContext())
}

export function HydrateClient({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {children}
    </HydrationBoundary>
  )
}

export function prefetch<T extends { queryKey: unknown }>(queryOptions: T) {
  const queryClient = getQueryClient()
  const queryKey = Array.isArray(queryOptions.queryKey)
    ? queryOptions.queryKey
    : []
  const queryMeta = queryKey[1] as { type?: string } | undefined

  if (queryMeta?.type === "infinite") {
    return queryClient
      .prefetchInfiniteQuery(
        queryOptions as unknown as Parameters<
          typeof queryClient.prefetchInfiniteQuery
        >[0],
      )
      .catch(() => {})
  }

  return queryClient
    .prefetchQuery(
      queryOptions as unknown as Parameters<typeof queryClient.prefetchQuery>[0],
    )
    .catch(() => {})
}

export function batchPrefetch<T extends { queryKey: unknown }>(
  queryOptionsArray: T[],
) {
  for (const queryOptions of queryOptionsArray) {
    void prefetch(queryOptions)
  }
}
