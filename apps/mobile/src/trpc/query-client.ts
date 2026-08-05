import { getErrorPresentation } from "@halaalvest/errors"
import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query"
import Toast from "react-native-toast-message"
import { deserialize, serialize } from "superjson"

export function makeQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError) return
        const presentation = getErrorPresentation(error)
        Toast.show({
          text1: presentation.title,
          text2: `${presentation.description} ${presentation.reference}`,
          type: "error",
        })
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.state.data !== undefined) return
        const presentation = getErrorPresentation(error)
        Toast.show({
          text1: presentation.title,
          text2: `${presentation.description} ${presentation.reference}`,
          type: "error",
        })
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
      dehydrate: {
        serializeData: serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: deserialize,
      },
    },
  })
}
