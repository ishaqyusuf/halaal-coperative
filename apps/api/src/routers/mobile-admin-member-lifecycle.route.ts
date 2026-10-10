import {
  changeMobileAdminMemberStatus,
  createMobileAdminMemberProfile,
  decideMobileAdminMemberOnboarding,
  getMobileAdminLifecycleOverview,
  getMobileAdminMemberDirectory,
  getMobileAdminMemberLifecycleDetail,
  mobileAdminMemberLifecycleKycStatusKeys,
  mobileAdminMemberLifecycleStatusKeys,
  reviewMobileAdminMemberKyc,
} from "@halaalvest/db"
import { z } from "zod"

import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const membersListInput = z
  .object({
    kycStatus: z.enum(mobileAdminMemberLifecycleKycStatusKeys).optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().min(1).max(50).optional(),
    search: z.string().trim().max(120).optional(),
    status: z.enum(mobileAdminMemberLifecycleStatusKeys).optional(),
  })
  .optional()

const memberDetailInput = z.object({
  memberId: z.string().trim().min(1),
})

const memberCreateInput = z.object({
  address: z.string().trim().max(500).optional(),
  email: z.string().trim().email().optional(),
  fullName: z.string().trim().min(2).max(160),
  joinedAt: z.string().datetime().transform((value) => new Date(value)),
  memberNumber: z.string().trim().min(1).max(80),
  memberType: z.enum(["civil_servant", "individual", "business"]),
  monthlyCommitment: z.number().positive().optional(),
  occupation: z.string().trim().max(160).optional(),
  phoneNumber: z.string().trim().max(80).optional(),
})

const memberStatusUpdateInput = z.object({
  memberId: z.string().trim().min(1),
  reviewNotes: z.string().trim().min(2).max(1000),
  status: z.enum(mobileAdminMemberLifecycleStatusKeys),
})

const memberKycUpdateInput = z.object({
  governmentIdNumber: z.string().trim().max(120).optional(),
  kycDocumentType: z.string().trim().max(120).optional(),
  kycDocumentUrl: z.string().trim().url().max(1000).optional(),
  kycReviewNotes: z.string().trim().min(2).max(1000),
  kycStatus: z.enum(mobileAdminMemberLifecycleKycStatusKeys),
  memberId: z.string().trim().min(1),
})

const onboardingReviewInput = z.object({
  decision: z.enum(["approved", "rejected"]),
  requestId: z.string().trim().min(1),
  reviewNotes: z.string().trim().min(2).max(1000),
})

const manageMembersProcedure = permissionProcedure("manage_members")

export const mobileAdminMemberLifecycleProcedures = {
  members: createTRPCRouter({
    create: manageMembersProcedure
      .input(memberCreateInput)
      .mutation(({ ctx, input }) =>
        createMobileAdminMemberProfile({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    detail: manageMembersProcedure
      .input(memberDetailInput)
      .query(({ ctx, input }) =>
        getMobileAdminMemberLifecycleDetail({
          memberId: input.memberId,
          tenantId: ctx.tenant.current.id,
        })
      ),
    list: manageMembersProcedure.input(membersListInput).query(({ ctx, input }) =>
      getMobileAdminMemberDirectory({
        ...input,
        tenantId: ctx.tenant.current.id,
      })
    ),
    reviewOnboarding: manageMembersProcedure
      .input(onboardingReviewInput)
      .mutation(({ ctx, input }) =>
        decideMobileAdminMemberOnboarding({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    updateKyc: manageMembersProcedure
      .input(memberKycUpdateInput)
      .mutation(({ ctx, input }) =>
        reviewMobileAdminMemberKyc({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
    updateStatus: manageMembersProcedure
      .input(memberStatusUpdateInput)
      .mutation(({ ctx, input }) =>
        changeMobileAdminMemberStatus({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
      ),
  }),
  overview: manageMembersProcedure.query(({ ctx }) =>
    getMobileAdminLifecycleOverview(ctx.tenant.current.id)
  ),
}
