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
import { businessRouter } from "./business.route"
import { foodPurchaseRouter } from "./food-purchase.route"
import { importsRouter } from "./imports.route"
import { loansRouter } from "./loans.route"
import { monthlyRecordsRouter } from "./monthly-records.route"
import { paymentReceiptsRouter } from "./payment-receipts.route"
import { procurementRouter } from "./procurement.route"
import { projectFinancingRouter } from "./project-financing.route"
import { shareApplicationsRouter } from "./share-applications.route"
import { supportRouter } from "./support.route"
import { mobileAuthRouter } from "./mobile-auth.route"
import { mobileRouter } from "./mobile.route"

export const appRouter = createTRPCRouter({
  analytics: analyticsRouter,
  business: businessRouter,
  foodPurchase: foodPurchaseRouter,
  imports: importsRouter,
  auth: createTRPCRouter({
    mobile: mobileAuthRouter,
  }),
  health: healthRouter,
  loans: loansRouter,
  monthlyRecords: monthlyRecordsRouter,
  paymentReceipts: paymentReceiptsRouter,
  procurement: procurementRouter,
  projectFinancing: projectFinancingRouter,
  shareApplications: shareApplicationsRouter,
  support: supportRouter,
  overview: overviewRouter,
  notifications: notificationsRouter,
  workspace: workspaceRouter,
  members: membersRouter,
  contributions: contributionsRouter,
  charges: chargesRouter,
  onboarding: onboardingRouter,
  filters: filtersRouter,
  mobile: mobileRouter,
  reports: reportsRouter,
  dashboardActions: dashboardActionsRouter,
})

export type AppRouter = typeof appRouter
export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>
