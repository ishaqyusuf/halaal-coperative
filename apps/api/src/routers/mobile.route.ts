import { createTRPCRouter } from "../lib.trpc"
import { mobileMemberCoreProcedures } from "./mobile-member-core.route"
import { mobileAdminMemberLifecycleProcedures } from "./mobile-admin-member-lifecycle.route"
import { mobileAdminFinanceSupportProcedures } from "./mobile-admin-finance-support.route"
import {
  mobileAdminReportsAccessNotificationProcedures,
  mobileNotificationProcedures,
} from "./mobile-admin-reports-access-notifications.route"
import { mobileMemberCooperativeServiceProcedures } from "./mobile-member-cooperative-services.route"
import { mobileMemberFinancingProcedures } from "./mobile-member-financing.route"
import { mobileMemberReceiptsSupportProcedures } from "./mobile-member-receipts-support.route"
import { mobileDeviceSessionProcedures } from "./mobile-device-session.route"
import { mobileSettingsAccessProcedures } from "./mobile-settings-access.route"
import { mobileOperationProfileProcedures } from "./mobile-operation-profile.route"
import { mobileAdminContributionProcedures } from "./mobile-admin-contribution-operations.route"
import { mobileAdminChargeProcedures } from "./mobile-admin-charge-operations.route"
import { mobileAdminFinancingOperationsProcedures } from "./mobile-admin-financing-operations.route"
import { mobileAdminRepaymentOperationsProcedures } from "./mobile-admin-repayment-operations.route"
import { mobileAdminProcurementOperationsProcedures } from "./mobile-admin-procurement-operations.route"
import { mobileAdminFoodPurchaseOperationsProcedures } from "./mobile-admin-food-purchase-operations.route"
import { mobileAdminProjectFinancingOperationsProcedures } from "./mobile-admin-project-financing-operations.route"
import { mobileAdminShareProfitGovernanceProcedures } from "./mobile-admin-share-profit-governance.route"

export const mobileRouter = createTRPCRouter({
  admin: createTRPCRouter({
    ...mobileAdminMemberLifecycleProcedures,
    ...mobileAdminFinanceSupportProcedures,
    ...mobileAdminContributionProcedures,
    ...mobileAdminChargeProcedures,
    ...mobileAdminFinancingOperationsProcedures,
    ...mobileAdminRepaymentOperationsProcedures,
    ...mobileAdminProcurementOperationsProcedures,
    ...mobileAdminFoodPurchaseOperationsProcedures,
    ...mobileAdminProjectFinancingOperationsProcedures,
    ...mobileAdminShareProfitGovernanceProcedures,
    ...mobileAdminReportsAccessNotificationProcedures,
    ...mobileOperationProfileProcedures,
  }),
  notifications: createTRPCRouter({
    ...mobileNotificationProcedures,
  }),
  sessions: createTRPCRouter(mobileDeviceSessionProcedures),
  member: createTRPCRouter({
    ...mobileMemberCoreProcedures,
    ...mobileMemberCooperativeServiceProcedures,
    ...mobileMemberFinancingProcedures,
    ...mobileMemberReceiptsSupportProcedures,
    ...mobileSettingsAccessProcedures,
  }),
})
