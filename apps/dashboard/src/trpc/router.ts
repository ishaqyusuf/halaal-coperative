import "server-only"

import { appRouterRecord } from "@halaalvest/api/router"
import { createTRPCRouter } from "@halaalvest/api/trpc"
import { dashboardActionsRouter } from "@/trpc/dashboard-actions.route"

export const appRouter = createTRPCRouter({
  ...appRouterRecord,
  dashboardActions: dashboardActionsRouter,
})

export type AppRouter = typeof appRouter
