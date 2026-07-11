import {
  createMobileMemberSupportCase,
  getMobileAdminOverview,
  getMobileMemberHome,
  getMobileMemberMore,
  getMobileMemberSupport,
  getMobileMemberSection,
  mobileMemberSectionKeys,
  mobileSupportCategoryKeys,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  createTRPCRouter,
  minRoleProcedure,
  tenantProcedure,
} from "../lib.trpc"

const mobileMemberSectionInput = z.object({
  section: z.enum(mobileMemberSectionKeys),
})

const mobileSupportCreateInput = z.object({
  category: z.enum(mobileSupportCategoryKeys),
  description: z.string().trim().min(5).max(2000),
  moneyImpactRequested: z.boolean().optional(),
  subject: z.string().trim().min(3).max(120),
})

function assertMemberWorkspace(role: string) {
  if (role !== "member") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Switch to the member workspace to view member data.",
    })
  }
}

export const mobileRouter = createTRPCRouter({
  admin: createTRPCRouter({
    overview: minRoleProcedure("operations_officer").query(({ ctx }) => {
      return getMobileAdminOverview(ctx.tenant.current.id)
    }),
  }),
  member: createTRPCRouter({
    home: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)

      return getMobileMemberHome({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    more: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)

      return getMobileMemberMore({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    section: tenantProcedure
      .input(mobileMemberSectionInput)
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberSection({
          section: input.section,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    support: createTRPCRouter({
      create: tenantProcedure
        .input(mobileSupportCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberSupportCase({
            category: input.category,
            description: input.description,
            moneyImpactRequested: input.moneyImpactRequested,
            subject: input.subject,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberSupport({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
  }),
})
