import {
  createMobileMemberShareApplicationForSession,
  createAuditLogEntry,
  createMobileMemberStatementExport,
  getMobileMemberActivityPage,
  getMobileMemberCommitments,
  getMobileMemberCoreHome,
  getMobileMemberFinancingSnapshot,
  getMobileMemberSharesSnapshot,
  getMobileMemberShareApplicationsPage,
  getMobileMemberStatementSnapshot,
  getTenantSubscriptionSnapshot,
  mobileMemberSectionKeys,
  mobileMemberActivityKindKeys,
  type MobileMemberCommitments,
  type MobileMemberShareSection,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  createTRPCRouter,
  memberOperationalProcedure,
  tenantProcedure,
} from "../lib.trpc"

const mobileMemberSectionInput = z.object({
  section: z.enum(mobileMemberSectionKeys),
})

const mobileMemberActivityInput = z.object({
  cursor: z.string().trim().min(1).max(200).nullish(),
  kind: z.enum(mobileMemberActivityKindKeys),
  limit: z.number().int().min(1).max(50).optional(),
})

const mobileShareApplicationCreateInput = z.object({
  notes: z.string().trim().max(1000).optional(),
  requestedUnits: z.number().int().positive(),
})

const mobileShareApplicationPageInput = z.object({
  cursor: z.string().trim().min(1).max(200).nullish(),
  pageSize: z.number().int().min(1).max(50).optional(),
})

const mobileStatementExportInput = z.object({
  requestId: z.string().uuid(),
})

function assertMemberWorkspace(role: string) {
  if (role !== "member") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Switch to the member workspace to view member data.",
    })
  }
}

export const mobileMemberCoreProcedures = {
  activity: tenantProcedure
    .input(mobileMemberActivityInput)
    .query(({ ctx, input }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)

      return getMobileMemberActivityPage({
        cursor: input.cursor,
        kind: input.kind,
        limit: input.limit,
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
  commitments: tenantProcedure.query(({ ctx }) => {
    assertMemberWorkspace(ctx.auth.activeMembership.role)

    return getMobileMemberCommitments({
      tenantId: ctx.tenant.current.id,
      userId: ctx.auth.session.user.id,
    })
  }),
  home: tenantProcedure.query(({ ctx }) => {
    assertMemberWorkspace(ctx.auth.activeMembership.role)

    return getMobileMemberCoreHome({
      tenantId: ctx.tenant.current.id,
      userId: ctx.auth.session.user.id,
    })
  }),
  section: tenantProcedure
    .input(mobileMemberSectionInput)
    .query(
      async ({
        ctx,
        input,
      }): Promise<
        | MobileMemberCommitments
        | MobileMemberShareSection
        | Awaited<
            ReturnType<typeof getMobileMemberFinancingSnapshot>
          >["section"]
      > => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        const identity = {
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        }
        if (input.section === "commitments") {
          return await getMobileMemberCommitments(identity)
        }
        if (input.section === "shares") {
          return (await getMobileMemberSharesSnapshot(identity)).section
        }
        return (await getMobileMemberFinancingSnapshot(identity)).section
      }
    ),
  shares: createTRPCRouter({
    applications: tenantProcedure
      .input(mobileShareApplicationPageInput)
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberShareApplicationsPage({
          cursor: input.cursor,
          pageSize: input.pageSize,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    createApplication: memberOperationalProcedure
      .input(mobileShareApplicationCreateInput)
      .mutation(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return createMobileMemberShareApplicationForSession({
          notes: input.notes,
          requestedUnits: input.requestedUnits,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    list: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)

      return getMobileMemberSharesSnapshot({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
  }),
  statement: tenantProcedure.query(({ ctx }) => {
    assertMemberWorkspace(ctx.auth.activeMembership.role)

    return getMobileMemberStatementSnapshot({
      tenantId: ctx.tenant.current.id,
      userId: ctx.auth.session.user.id,
    })
  }),
  statementExport: tenantProcedure
    .input(mobileStatementExportInput)
    .mutation(async ({ ctx, input }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      const subscription = await getTenantSubscriptionSnapshot({
        tenantId: ctx.tenant.current.id,
      })
      if (
        subscription.entitlements.memberStatements !== "member_and_admin"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Member statement downloads are not included in the active subscription.",
        })
      }

      const generated = await createMobileMemberStatementExport({
        tenantId: ctx.tenant.current.id,
        tenantSlug: ctx.tenant.current.slug,
        userId: ctx.auth.session.user.id,
      })
      const generatedAt = new Date()
      const expiresAt = new Date(generatedAt.getTime() + 15 * 60 * 1_000)

      await createAuditLogEntry({
        action: "mobile.member_statement.generated",
        actorType: "user",
        actorUserId: ctx.auth.session.user.id,
        entityId: input.requestId,
        entityType: "MemberStatementExport",
        metadata: { rowCount: generated.rowCount },
        tenantId: ctx.tenant.current.id,
      })

      return {
        ...generated,
        expiresAt: expiresAt.toISOString(),
        generatedAt: generatedAt.toISOString(),
        id: input.requestId,
      }
    }),
}
