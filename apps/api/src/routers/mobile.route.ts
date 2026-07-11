import { getMobileAdminOverview, getMobileMemberHome } from "@halaalvest/db"
import { TRPCError } from "@trpc/server"

import {
  createTRPCRouter,
  minRoleProcedure,
  tenantProcedure,
} from "../lib.trpc"

export const mobileRouter = createTRPCRouter({
  admin: createTRPCRouter({
    overview: minRoleProcedure("operations_officer").query(({ ctx }) => {
      return getMobileAdminOverview(ctx.tenant.current.id)
    }),
  }),
  member: createTRPCRouter({
    home: tenantProcedure.query(({ ctx }) => {
      if (ctx.auth.activeMembership.role !== "member") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Switch to the member workspace to view member home.",
        })
      }

      return getMobileMemberHome({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
  }),
})
