import { createTRPCRouter } from "../lib.trpc.js"
import { healthRouter } from "./health.route.js"
import { notificationsRouter } from "./notifications.route.js"
import { workspaceRouter } from "./workspace.route.js"
import { membersRouter } from "./members.route.js"
import { contributionsRouter } from "./contributions.route.js"
import { chargesRouter } from "./charges.route.js"
import { onboardingRouter } from "./onboarding.route.js"

export const appRouter = createTRPCRouter({
  health: healthRouter,
  notifications: notificationsRouter,
  workspace: workspaceRouter,
  members: membersRouter,
  contributions: contributionsRouter,
  charges: chargesRouter,
  onboarding: onboardingRouter,
})

export type AppRouter = typeof appRouter
