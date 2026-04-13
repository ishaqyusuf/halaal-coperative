import { listSeedTenants } from "@halaal-vest/db"
import { z } from "zod"

import { createTRPCRouter, publicProcedure } from "../lib.trpc.js"

export const healthRouter = createTRPCRouter({
  summary: publicProcedure.query(() => {
    return {
      api: "ok" as const,
      tenantCount: listSeedTenants().length,
      timestamp: new Date().toISOString(),
    }
  }),
  tenant: publicProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
      }),
    )
    .query(({ input }) => {
      const tenant =
        listSeedTenants().find((entry) => entry.id === input.tenantId) ?? listSeedTenants()[0]

      return {
        tenant,
      }
    }),
})
