import {
  createMobileMemberFinancingRequest,
  createMobileMemberFoodPurchaseApplication,
  createMobileMemberProcurementRequest,
  createMobileMemberProjectFinancingRequest,
  createMobileMemberShareApplication,
  createMobileMemberReceipt,
  createMobileMemberSupportCase,
  getMobileAdminAccess,
  getMobileAdminFinance,
  getMobileAdminMemberDetail,
  getMobileAdminMembers,
  getMobileAdminOverview,
  getMobileAdminReports,
  getMobileMemberFinancing,
  getMobileMemberFoodPurchase,
  getMobileMemberGuarantorApprovals,
  getMobileMemberHome,
  getMobileMemberMore,
  getMobileMemberProcurement,
  getMobileMemberProjectFinancing,
  getMobileMemberReceipts,
  getMobileMemberShares,
  getMobileMemberStatement,
  getMobileMemberSupport,
  getMobileMemberSection,
  getMobileNotifications,
  mobileMemberSectionKeys,
  mobileReceiptAllocationCategoryKeys,
  mobileReceiptChannelKeys,
  mobileReceiptPeriodIntentKeys,
  mobileAdminMemberKycStatusKeys,
  mobileAdminMemberStatusKeys,
  mobileProjectFinancingStructureKeys,
  mobileSupportCategoryKeys,
  respondMobileMemberGuarantorApproval,
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

const mobileAdminMembersListInput = z
  .object({
    kycStatus: z.enum(mobileAdminMemberKycStatusKeys).optional(),
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(50).optional(),
    search: z.string().trim().max(120).optional(),
    status: z.enum(mobileAdminMemberStatusKeys).optional(),
  })
  .optional()

const mobileAdminMemberDetailInput = z.object({
  memberId: z.string().trim().min(1),
})

const mobileSupportCreateInput = z.object({
  category: z.enum(mobileSupportCategoryKeys),
  description: z.string().trim().min(5).max(2000),
  moneyImpactRequested: z.boolean().optional(),
  subject: z.string().trim().min(3).max(120),
})

const mobileReceiptCreateInput = z.object({
  allocations: z
    .array(
      z.object({
        amount: z.number().positive(),
        category: z.enum(mobileReceiptAllocationCategoryKeys),
        notes: z.string().trim().max(240).optional(),
        periodIntent: z.enum(mobileReceiptPeriodIntentKeys).optional(),
        targetPeriodStart: z
          .string()
          .datetime()
          .transform((value) => new Date(value))
          .optional(),
      })
    )
    .min(1)
    .max(8),
  channel: z.enum(mobileReceiptChannelKeys).optional(),
  memberNotes: z.string().trim().max(1000).optional(),
  paidAt: z
    .string()
    .datetime()
    .transform((value) => new Date(value)),
  paymentReference: z.string().trim().max(120).optional(),
  proofDocumentName: z.string().trim().max(160).optional(),
  proofDocumentUrl: z.string().trim().url().max(1000).optional(),
  totalAmount: z.number().positive(),
})

const mobileShareApplicationCreateInput = z.object({
  notes: z.string().trim().max(1000).optional(),
  requestedUnits: z.number().int().positive(),
})

const mobileGuarantorApprovalRespondInput = z.object({
  guarantorApprovalId: z.string().trim().min(1),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(["approved", "rejected"]),
})

const mobileFinancingRequestCreateInput = z.object({
  extraMonthlySavingsAmount: z.number().min(0).optional(),
  loanProductId: z.string().trim().min(1),
  purpose: z.string().trim().max(1000).optional(),
  requestedAmount: z.number().positive(),
  requestedTermMonths: z.number().int().positive(),
})

const mobileProcurementRequestCreateInput = z.object({
  itemDescription: z.string().trim().max(1000).optional(),
  itemName: z.string().trim().min(2).max(160),
  requestedCost: z.number().positive(),
  requestedRepaymentMonths: z.number().int().positive(),
  vendorName: z.string().trim().max(160).optional(),
})

const mobileProjectFinancingRequestCreateInput = z.object({
  businessDescription: z.string().trim().max(2000).optional(),
  businessName: z.string().trim().min(2).max(160),
  projectPurpose: z.string().trim().max(1000).optional(),
  proposedStructure: z.enum(mobileProjectFinancingStructureKeys).optional(),
  requestedAmount: z.number().positive(),
  requestedPaybackMonths: z.number().int().positive().optional(),
})

const mobileFoodPurchaseApplicationCreateInput = z.object({
  cycleId: z.string().trim().min(1),
  itemDescription: z.string().trim().max(1000).optional(),
  requestedAmount: z.number().positive(),
  requestedPaybackMonths: z.number().int().positive(),
  requestNotes: z.string().trim().max(1000).optional(),
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
    access: createTRPCRouter({
      overview: minRoleProcedure("tenant_admin").query(({ ctx }) => {
        return getMobileAdminAccess(ctx.tenant.current.id)
      }),
    }),
    finance: createTRPCRouter({
      overview: minRoleProcedure("operations_officer").query(({ ctx }) => {
        return getMobileAdminFinance(ctx.tenant.current.id)
      }),
    }),
    members: createTRPCRouter({
      detail: minRoleProcedure("operations_officer")
        .input(mobileAdminMemberDetailInput)
        .query(({ ctx, input }) => {
          return getMobileAdminMemberDetail({
            memberId: input.memberId,
            tenantId: ctx.tenant.current.id,
          })
        }),
      list: minRoleProcedure("operations_officer")
        .input(mobileAdminMembersListInput)
        .query(({ ctx, input }) => {
          return getMobileAdminMembers({
            kycStatus: input?.kycStatus,
            page: input?.page,
            pageSize: input?.pageSize,
            search: input?.search,
            status: input?.status,
            tenantId: ctx.tenant.current.id,
          })
        }),
    }),
    overview: minRoleProcedure("operations_officer").query(({ ctx }) => {
      return getMobileAdminOverview(ctx.tenant.current.id)
    }),
    reports: createTRPCRouter({
      overview: minRoleProcedure("operations_officer").query(({ ctx }) => {
        return getMobileAdminReports(ctx.tenant.current.id)
      }),
    }),
  }),
  notifications: createTRPCRouter({
    overview: tenantProcedure.query(({ ctx }) => {
      return getMobileNotifications({
        role: ctx.auth.activeMembership.role,
        tenantId: ctx.tenant.current.id,
        userEmail: ctx.auth.session.user.email,
      })
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
    statement: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)

      return getMobileMemberStatement({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    receipts: createTRPCRouter({
      create: tenantProcedure
        .input(mobileReceiptCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberReceipt({
            allocations: input.allocations,
            channel: input.channel,
            memberNotes: input.memberNotes,
            paidAt: input.paidAt,
            paymentReference: input.paymentReference,
            proofDocumentName: input.proofDocumentName,
            proofDocumentUrl: input.proofDocumentUrl,
            tenantId: ctx.tenant.current.id,
            totalAmount: input.totalAmount,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberReceipts({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
    guarantorApprovals: createTRPCRouter({
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberGuarantorApprovals({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
      respond: tenantProcedure
        .input(mobileGuarantorApprovalRespondInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return respondMobileMemberGuarantorApproval({
            guarantorApprovalId: input.guarantorApprovalId,
            notes: input.notes,
            status: input.status,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
    }),
    financing: createTRPCRouter({
      createRequest: tenantProcedure
        .input(mobileFinancingRequestCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberFinancingRequest({
            extraMonthlySavingsAmount: input.extraMonthlySavingsAmount,
            loanProductId: input.loanProductId,
            purpose: input.purpose,
            requestedAmount: input.requestedAmount,
            requestedTermMonths: input.requestedTermMonths,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberFinancing({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
    procurement: createTRPCRouter({
      createRequest: tenantProcedure
        .input(mobileProcurementRequestCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberProcurementRequest({
            itemDescription: input.itemDescription,
            itemName: input.itemName,
            requestedCost: input.requestedCost,
            requestedRepaymentMonths: input.requestedRepaymentMonths,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
            vendorName: input.vendorName,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberProcurement({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
    projectFinancing: createTRPCRouter({
      createRequest: tenantProcedure
        .input(mobileProjectFinancingRequestCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberProjectFinancingRequest({
            businessDescription: input.businessDescription,
            businessName: input.businessName,
            projectPurpose: input.projectPurpose,
            proposedStructure: input.proposedStructure,
            requestedAmount: input.requestedAmount,
            requestedPaybackMonths: input.requestedPaybackMonths,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberProjectFinancing({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
    foodPurchase: createTRPCRouter({
      createApplication: tenantProcedure
        .input(mobileFoodPurchaseApplicationCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberFoodPurchaseApplication({
            cycleId: input.cycleId,
            itemDescription: input.itemDescription,
            requestedAmount: input.requestedAmount,
            requestedPaybackMonths: input.requestedPaybackMonths,
            requestNotes: input.requestNotes,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberFoodPurchase({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    }),
    shares: createTRPCRouter({
      createApplication: tenantProcedure
        .input(mobileShareApplicationCreateInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return createMobileMemberShareApplication({
            notes: input.notes,
            requestedUnits: input.requestedUnits,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
      list: tenantProcedure.query(({ ctx }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)

        return getMobileMemberShares({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
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
