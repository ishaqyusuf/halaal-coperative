import {
  createMember,
  getMemberById,
  listMembersTable,
  updateMember,
  updateMemberStatus,
} from "@halaalvest/db"
import { AppError } from "@halaalvest/errors"
import { z } from "zod"
import { listMembersSchema } from "../schemas/members"
import { createTRPCRouter, minRoleProcedure } from "../lib.trpc"
import { sendTenantRoleNotificationEmails } from "../lib/server-notifications"

export const membersRouter = createTRPCRouter({
  list: minRoleProcedure("operations_officer")
    .input(listMembersSchema)
    .query(async ({ ctx, input }) => {
      return listMembersTable(ctx.tenant.current.id, input ?? {})
    }),

  get: minRoleProcedure("operations_officer")
    .input(z.object({ memberId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const member = await getMemberById(ctx.tenant.current.id, input.memberId)
      if (!member) {
        throw new AppError({
          code: "NOT_FOUND",
          operation: "members.getById",
          publicMessage: "Member not found.",
        })
      }
      return member
    }),

  create: minRoleProcedure("operations_officer")
    .input(
      z.object({
        memberNumber: z.string().min(1),
        fullName: z.string().min(1),
        memberType: z.enum(["civil_servant", "individual", "business"]),
        joinedAt: z
          .string()
          .datetime()
          .transform((s) => new Date(s)),
        userId: z.string().uuid().optional(),
        deductionSourceId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createMember({
        tenantId: ctx.tenant.current.id,
        memberNumber: input.memberNumber,
        fullName: input.fullName,
        memberType: input.memberType,
        joinedAt: input.joinedAt,
        userId: input.userId,
        deductionSourceId: input.deductionSourceId,
        actorUserId: ctx.auth.session.user.id,
      })
    }),

  update: minRoleProcedure("operations_officer")
    .input(
      z.object({
        memberId: z.string().uuid(),
        address: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        fullName: z.string().min(1).optional(),
        memberType: z
          .enum(["civil_servant", "individual", "business"])
          .optional(),
        occupation: z.string().nullable().optional(),
        phoneNumber: z.string().nullable().optional(),
        deductionSourceId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updateMember(ctx.tenant.current.id, input.memberId, {
        address: input.address,
        fullName: input.fullName,
        email: input.email,
        memberType: input.memberType,
        occupation: input.occupation,
        phoneNumber: input.phoneNumber,
        deductionSourceId: input.deductionSourceId,
        actorUserId: ctx.auth.session.user.id,
      })
    }),

  updateStatus: minRoleProcedure("operations_officer")
    .input(
      z.object({
        memberId: z.string().uuid(),
        status: z.enum([
          "pending",
          "active",
          "inactive",
          "suspended",
          "exited",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await updateMemberStatus(
        ctx.tenant.current.id,
        input.memberId,
        input.status,
        ctx.auth.session.user.id
      )

      await sendTenantRoleNotificationEmails({
        actionLabel: "Open members",
        actionUrl: "/members",
        bodyText: `${member.fullName} is now marked as ${member.status.replace(/_/g, " ")}.`,
        metadata: {
          memberId: member.id,
          memberNumber: member.memberNumber,
          status: member.status,
        },
        notificationType: "member.status_changed",
        roles: ["tenant_admin", "operations_officer"],
        source: "dashboard.members",
        subject: `${ctx.tenant.current.name}: member status changed`,
        tenantId: ctx.tenant.current.id,
        tenantName: ctx.tenant.current.name,
        tenantSlug: ctx.tenant.current.slug,
      })

      return member
    }),
})
