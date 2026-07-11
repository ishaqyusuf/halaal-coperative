import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server"
import { createTRPCRouter } from "../lib.trpc"
import { healthRouter } from "./health.route"
import { notificationsRouter } from "./notifications.route"
import { workspaceRouter } from "./workspace.route"
import { membersRouter } from "./members.route"
import { contributionsRouter } from "./contributions.route"
import { chargesRouter } from "./charges.route"
import { onboardingRouter } from "./onboarding.route"
import { filtersRouter } from "./filters.route"
import { dashboardActionsRouter } from "./dashboard-actions.route"
import { overviewRouter } from "./overview.route"
import { analyticsRouter } from "./analytics.route"
import { reportsRouter } from "./reports.route"
import { mobileAuthRouter } from "./mobile-auth.route"

export const appRouter = createTRPCRouter({
  analytics: analyticsRouter,
  auth: createTRPCRouter({
    mobile: mobileAuthRouter,
  }),
  health: healthRouter,
  overview: overviewRouter,
  notifications: notificationsRouter,
  workspace: workspaceRouter,
  members: membersRouter,
  contributions: contributionsRouter,
  charges: chargesRouter,
  onboarding: onboardingRouter,
  filters: filtersRouter,
  reports: reportsRouter,
  dashboardActions: dashboardActionsRouter,
})

export type AppRouter = typeof appRouter
export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>
