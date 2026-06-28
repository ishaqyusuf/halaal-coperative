import { createTRPCRouter } from "../lib.trpc"
import { healthRouter } from "./health.route"
import { notificationsRouter } from "./notifications.route"
import { workspaceRouter } from "./workspace.route"
import { membersRouter } from "./members.route"
import { contributionsRouter } from "./contributions.route"
import { chargesRouter } from "./charges.route"
import { onboardingRouter } from "./onboarding.route"
import { filtersRouter } from "./filters.route"

export const appRouterRecord = {
  health: healthRouter,
  notifications: notificationsRouter,
  workspace: workspaceRouter,
  members: membersRouter,
  contributions: contributionsRouter,
  charges: chargesRouter,
  onboarding: onboardingRouter,
  filters: filtersRouter,
}

export const appRouter = createTRPCRouter(appRouterRecord)

export type AppRouter = typeof appRouter
