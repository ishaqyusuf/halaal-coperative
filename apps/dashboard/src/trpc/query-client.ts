import {
  getErrorPresentation,
  hasPublicErrorEnvelope,
} from "@halaalvest/errors"
import {
  defaultShouldDehydrateQuery,
  isServer,
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query"
import { toast } from "@halaalvest/ui/components/use-toast"
import superjson from "superjson"
import { captureDashboardError } from "@/lib/sentry"
import { getDashboardErrorReport } from "@/lib/sentry-policy"

function isUnauthorizedError(error: Error) {
  return (
    "data" in error &&
    typeof (error as { data?: { code?: unknown } }).data?.code === "string" &&
    (error as { data: { code: string } }).data.code === "UNAUTHORIZED"
  )
}

export function makeQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (isServer || mutation.options.onError) return
        const report = hasPublicErrorEnvelope(error)
          ? null
          : getDashboardErrorReport(error, "dashboard.mutation_cache")
        if (report) {
          captureDashboardError(report.classified, "dashboard.mutation_cache")
        }
        const presentation = getErrorPresentation(report?.classified ?? error)
        toast({
          description: `${presentation.description} ${presentation.reference}`,
          title: presentation.title,
          variant: "error",
        })
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isServer || query.state.data !== undefined) return
        const report = hasPublicErrorEnvelope(error)
          ? null
          : getDashboardErrorReport(error, "dashboard.query_cache")
        if (report) {
          captureDashboardError(report.classified, "dashboard.query_cache")
        }
        const presentation = getErrorPresentation(report?.classified ?? error)
        toast({
          description: `${presentation.description} ${presentation.reference}`,
          title: presentation.title,
          variant: "error",
        })
      },
    }),
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
