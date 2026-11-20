import {
  getMonthlyRecordActionRows,
  getMonthlyRecordRowsPage,
  receiveWorkplaceMonthlyPayments,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"
import { sendTenantRoleNotificationEmails } from "../lib/server-notifications"
import {
  listMonthlyRecordRowsSchema,
  monthlyRecordActionRowsSchema,
  receiveWorkplaceSchema,
} from "../schemas/monthly-records"

export const monthlyRecordsRouter = createTRPCRouter({
  rows: permissionProcedure("view_contribution_operations")
    .input(listMonthlyRecordRowsSchema)
    .query(async ({ ctx, input }) => {
      if (!input?.monthlyRecordId) {
        return {
          data: [],
          meta: {
            cursor: undefined,
            total: 0,
          },
        }
      }

      return getMonthlyRecordRowsPage(
        ctx.tenant.current.id,
        input.monthlyRecordId,
        input,
      )
    }),

  actionRows: permissionProcedure("view_contribution_operations")
    .input(monthlyRecordActionRowsSchema)
    .query(({ ctx, input }) =>
      getMonthlyRecordActionRows(
        ctx.tenant.current.id,
        input.monthlyRecordId,
        input.scope,
      )
    ),

  // Marks the chosen members of one workplace as paid for the month in one
  // request. Finance roles only, like posting a workplace batch.
  receiveWorkplace: permissionProcedure("manage_collection_source_batches")
    .input(receiveWorkplaceSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await receiveWorkplaceMonthlyPayments({
        actorUserId: ctx.auth.session.user.id,
        monthlyRecordId: input.monthlyRecordId,
        rowIds: input.rowIds,
        tenantId: ctx.tenant.current.id,
        workplaceId: input.workplaceId,
      })

      if (result.receivedCount > 0) {
        await sendTenantRoleNotificationEmails({
          actionLabel: "Open monthly records",
          actionUrl: `/monthly-records?recordId=${input.monthlyRecordId}`,
          bodyText: `${result.receivedCount} payments (${formatCurrency(result.receivedAmount)}) from ${result.workplaceName} were received for ${result.periodLabel}.`,
          metadata: {
            amount: result.receivedAmount,
            collectionSourceBatchId: result.batchId,
            monthlyRecordId: input.monthlyRecordId,
            receivedAmount: result.receivedAmount,
            receivedCount: result.receivedCount,
            workplaceId: input.workplaceId,
          },
          notificationType: "monthly_record.workplace_received",
          roles: ["tenant_admin", "finance_officer"],
          source: "dashboard.monthly_records",
          subject: `${ctx.tenant.current.name}: workplace payments received`,
          tenantId: ctx.tenant.current.id,
          tenantName: ctx.tenant.current.name,
          tenantSlug: ctx.tenant.current.slug,
        }).catch(() => undefined)
      }

      return result
    }),
})
