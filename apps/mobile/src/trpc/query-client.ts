import {
  MutationCache,
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
    mutationCache: new MutationCache({
      onMutate: async (variables, mutation) => {
        if (!mutation?.meta?.toastTitle?.show) return;
        console.info(mutation?.meta?.toastTitle?.loading || "Processing...");
      },
      onSuccess: async (data, variables, _context, mutation) => {
        const title = mutation?.meta?.toastTitle?.success || "Success ...";
        if (!mutation?.meta?.toastTitle?.show) return;
        console.info(title);
      },
      onError: async (data, variables, _context, mutation) => {
        const title = mutation?.meta?.toastTitle?.loading || "Error ...";
        if (!mutation?.meta?.toastTitle?.show) return;
        console.warn(title, data);
      },
    }),
  });
}
