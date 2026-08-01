import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
} from "@tanstack/react-query"
import superjson from "superjson"

function isUnauthorizedError(error: Error) {
  return (
    "data" in error &&
    typeof (error as { data?: { code?: unknown } }).data?.code === "string" &&
    (error as { data: { code: string } }).data.code === "UNAUTHORIZED"
  )
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
      queries: {
        refetchOnWindowFocus: false,
        gcTime: 10 * 60_000,
        retry: isServer
          ? false
          : (failureCount, error) =>
              !isUnauthorizedError(error) && failureCount < 2,
        staleTime: 2 * 60_000,
      },
    },
  })
}
