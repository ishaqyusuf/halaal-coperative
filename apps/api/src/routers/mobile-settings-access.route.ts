import { getMobileMemberMore } from "@halaalvest/db"
import { TRPCError } from "@trpc/server"

import { tenantProcedure } from "../lib.trpc"

export const mobileSettingsAccessProcedures = {
  more: tenantProcedure.query(({ ctx }) => {
    if (ctx.auth.activeMembership.role !== "member") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Switch to the member workspace to view member data.",
      })
    }

    return getMobileMemberMore({
      tenantId: ctx.tenant.current.id,
      userId: ctx.auth.session.user.id,
    })
  }),
}
