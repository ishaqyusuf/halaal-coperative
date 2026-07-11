import {
  createMobileMemberFinancingRequest,
  createMobileMemberFoodPurchaseApplication,
  createMobileMemberProcurementRequest,
  createMobileMemberProjectFinancingRequest,
  createMobileMemberShareApplication,
  createMobileMemberReceipt,
  createMobileMemberSupportCase,
  createMobileAdminMember,
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
  addMobileAdminSupportReply,
  recordMobileAdminCollectionFollowUp,
  reviewMobileAdminFinancingRequest,
  reviewMobileAdminFoodPurchaseApplication,
  reviewMobileAdminProcurementRequest,
  reviewMobileAdminProjectFinancingRequest,
  reviewMobileAdminReceipt,
  reviewMobileAdminShareApplication,
  reviewMobileAdminMemberOnboarding,
  respondMobileMemberGuarantorApproval,
  replyMobileMemberSupportCase,
  updateMobileAdminMemberKyc,
  updateMobileAdminMemberStatus,
  updateMobileAdminSupportStatus,
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

const mobileSupportCreateInput = z
  .object({
    category: z.enum(mobileSupportCategoryKeys),
    description: z.string().trim().min(5).max(2000),
    linkedRecordId: z.string().trim().min(1).optional(),
    linkedRecordType: z.literal("receipt").optional(),
    moneyImpactRequested: z.boolean().optional(),
    subject: z.string().trim().min(3).max(120),
  })
  .refine(
    (input) =>
      Boolean(input.linkedRecordId) === Boolean(input.linkedRecordType),
    "Linked record id and type are required together."
  )

const mobileSupportReplyInput = z.object({
  attachmentUrl: z.string().trim().url().max(1000).optional(),
  message: z.string().trim().min(2).max(2000),
  supportCaseId: z.string().trim().min(1),
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

const mobileReviewStatusInput = z.enum(["approved", "rejected", "under_review"])

const mobileAdminReceiptReviewInput = z.object({
  adjustmentReason: z.string().trim().max(1000).optional(),
  decision: z.enum([
    "under_review",
    "correction_requested",
    "approved",
    "rejected",
  ]),
  receiptId: z.string().trim().min(1),
  reviewNotes: z.string().trim().max(1000).optional(),
})

const mobileAdminFinancingReviewInput = z.object({
  loanRequestId: z.string().trim().min(1),
  notes: z.string().trim().max(1000).optional(),
  status: mobileReviewStatusInput,
})

const mobileAdminProcurementReviewInput = z.object({
  approvedCost: z.number().positive().optional(),
  approvedRepaymentMonths: z.number().int().positive().optional(),
  notes: z.string().trim().max(1000).optional(),
  procurementRequestId: z.string().trim().min(1),
  status: mobileReviewStatusInput,
})

const mobileAdminFoodPurchaseReviewInput = z.object({
  applicationId: z.string().trim().min(1),
  approvedAmount: z.number().positive().optional(),
  approvedPaybackMonths: z.number().int().positive().optional(),
  notes: z.string().trim().max(1000).optional(),
  status: mobileReviewStatusInput,
})

const mobileAdminProjectFinancingReviewInput = z.object({
  approvedAmount: z.number().positive().optional(),
  approvedPaybackMonths: z.number().int().positive().optional(),
  approvedStructure: z.enum(mobileProjectFinancingStructureKeys).optional(),
  notes: z.string().trim().max(1000).optional(),
  projectFinancingRequestId: z.string().trim().min(1),
  status: mobileReviewStatusInput,
})

const mobileAdminShareReviewInput = z.object({
  applicationId: z.string().trim().min(1),
  approvedUnits: z.number().int().positive().optional(),
  decision: z.enum(["approved", "rejected"]),
  effectiveDate: z
    .string()
    .datetime()
    .transform((value) => new Date(value))
    .optional(),
  reviewNotes: z.string().trim().max(1000).optional(),
})

const mobileAdminMemberStatusUpdateInput = z.object({
  memberId: z.string().trim().min(1),
  reviewNotes: z.string().trim().max(1000).optional(),
  status: z.enum(mobileAdminMemberStatusKeys),
})

const mobileAdminMemberKycUpdateInput = z.object({
  governmentIdNumber: z.string().trim().max(120).optional(),
  kycDocumentType: z.string().trim().max(120).optional(),
  kycDocumentUrl: z.string().trim().url().max(1000).optional(),
  kycReviewNotes: z.string().trim().max(1000).optional(),
  kycStatus: z.enum(mobileAdminMemberKycStatusKeys),
  memberId: z.string().trim().min(1),
})

const mobileAdminMemberOnboardingReviewInput = z.object({
  decision: z.enum(["approved", "rejected"]),
  requestId: z.string().trim().min(1),
  reviewNotes: z.string().trim().min(2).max(1000),
})

const mobileAdminMemberCreateInput = z.object({
  address: z.string().trim().max(500).optional(),
  email: z.string().trim().email().optional(),
  fullName: z.string().trim().min(2).max(160),
  joinedAt: z
    .string()
    .datetime()
    .transform((value) => new Date(value)),
  memberNumber: z.string().trim().min(1).max(80),
  memberType: z.enum(["civil_servant", "individual", "business"]),
  monthlyCommitment: z.number().positive().optional(),
  occupation: z.string().trim().max(160).optional(),
  phoneNumber: z.string().trim().max(80).optional(),
})

const mobileAdminSupportReplyInput = z.object({
  attachmentUrl: z.string().trim().url().max(1000).optional(),
  message: z.string().trim().min(2).max(2000),
  supportCaseId: z.string().trim().min(1),
})

const mobileAdminSupportStatusUpdateInput = z.object({
  assignedToUserId: z.string().trim().min(1).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  requiresFinancialAdjustment: z.boolean().optional(),
  resolutionSummary: z.string().trim().max(1000).optional(),
  status: z.enum([
    "open",
    "in_progress",
    "waiting_on_member",
    "resolved",
    "closed",
  ]),
  supportCaseId: z.string().trim().min(1),
})

const mobileAdminCollectionFollowUpInput = z.object({
  assignedToUserId: z.string().trim().min(1).optional(),
  caseStage: z.string().trim().max(80).optional(),
  nextActionAt: z.string().date().optional(),
  note: z.string().trim().min(2).max(1000),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  promiseToPayAt: z.string().date().optional(),
  repaymentScheduleItemId: z.string().trim().min(1),
  resolutionStatus: z.string().trim().max(80).optional(),
  status: z.enum(["promise_to_pay", "reminded", "settled", "unreachable"]),
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
      reviewShareApplication: minRoleProcedure("finance_officer")
        .input(mobileAdminShareReviewInput)
        .mutation(({ ctx, input }) => {
          return reviewMobileAdminShareApplication({
            actorUserId: ctx.auth.session.user.id,
            applicationId: input.applicationId,
            approvedUnits: input.approvedUnits,
            decision: input.decision,
            effectiveDate: input.effectiveDate,
            reviewNotes: input.reviewNotes,
            tenantId: ctx.tenant.current.id,
          })
        }),
    }),
    finance: createTRPCRouter({
      recordCollectionFollowUp: minRoleProcedure("finance_officer")
        .input(mobileAdminCollectionFollowUpInput)
        .mutation(({ ctx, input }) => {
          return recordMobileAdminCollectionFollowUp({
            actorUserId: ctx.auth.session.user.id,
            assignedToUserId: input.assignedToUserId,
            caseStage: input.caseStage,
            nextActionAt: input.nextActionAt,
            note: input.note,
            priority: input.priority,
            promiseToPayAt: input.promiseToPayAt,
            repaymentScheduleItemId: input.repaymentScheduleItemId,
            resolutionStatus: input.resolutionStatus,
            status: input.status,
            tenantId: ctx.tenant.current.id,
          })
        }),
      overview: minRoleProcedure("operations_officer").query(({ ctx }) => {
        return getMobileAdminFinance(ctx.tenant.current.id)
      }),
      reviewFinancingRequest: minRoleProcedure("finance_officer")
        .input(mobileAdminFinancingReviewInput)
        .mutation(({ ctx, input }) => {
          return reviewMobileAdminFinancingRequest({
            actorUserId: ctx.auth.session.user.id,
            loanRequestId: input.loanRequestId,
            notes: input.notes,
            status: input.status,
            tenantId: ctx.tenant.current.id,
          })
        }),
      reviewFoodPurchaseApplication: minRoleProcedure("finance_officer")
        .input(mobileAdminFoodPurchaseReviewInput)
        .mutation(({ ctx, input }) => {
          return reviewMobileAdminFoodPurchaseApplication({
            actorUserId: ctx.auth.session.user.id,
            applicationId: input.applicationId,
            approvedAmount: input.approvedAmount,
            approvedPaybackMonths: input.approvedPaybackMonths,
            notes: input.notes,
            status: input.status,
            tenantId: ctx.tenant.current.id,
          })
        }),
      reviewProcurementRequest: minRoleProcedure("finance_officer")
        .input(mobileAdminProcurementReviewInput)
        .mutation(({ ctx, input }) => {
          return reviewMobileAdminProcurementRequest({
            actorUserId: ctx.auth.session.user.id,
            approvedCost: input.approvedCost,
            approvedRepaymentMonths: input.approvedRepaymentMonths,
            notes: input.notes,
            procurementRequestId: input.procurementRequestId,
            status: input.status,
            tenantId: ctx.tenant.current.id,
          })
        }),
      reviewProjectFinancingRequest: minRoleProcedure("finance_officer")
        .input(mobileAdminProjectFinancingReviewInput)
        .mutation(({ ctx, input }) => {
          return reviewMobileAdminProjectFinancingRequest({
            actorUserId: ctx.auth.session.user.id,
            approvedAmount: input.approvedAmount,
            approvedPaybackMonths: input.approvedPaybackMonths,
            approvedStructure: input.approvedStructure,
            notes: input.notes,
            projectFinancingRequestId: input.projectFinancingRequestId,
            status: input.status,
            tenantId: ctx.tenant.current.id,
          })
        }),
      reviewReceipt: minRoleProcedure("finance_officer")
        .input(mobileAdminReceiptReviewInput)
        .mutation(({ ctx, input }) => {
          return reviewMobileAdminReceipt({
            actorUserId: ctx.auth.session.user.id,
            adjustmentReason: input.adjustmentReason,
            decision: input.decision,
            receiptId: input.receiptId,
            reviewNotes: input.reviewNotes,
            tenantId: ctx.tenant.current.id,
          })
        }),
    }),
    members: createTRPCRouter({
      create: minRoleProcedure("operations_officer")
        .input(mobileAdminMemberCreateInput)
        .mutation(({ ctx, input }) => {
          return createMobileAdminMember({
            actorUserId: ctx.auth.session.user.id,
            address: input.address,
            email: input.email,
            fullName: input.fullName,
            joinedAt: input.joinedAt,
            memberNumber: input.memberNumber,
            memberType: input.memberType,
            monthlyCommitment: input.monthlyCommitment,
            occupation: input.occupation,
            phoneNumber: input.phoneNumber,
            tenantId: ctx.tenant.current.id,
          })
        }),
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
      updateKyc: minRoleProcedure("operations_officer")
        .input(mobileAdminMemberKycUpdateInput)
        .mutation(({ ctx, input }) => {
          return updateMobileAdminMemberKyc({
            actorUserId: ctx.auth.session.user.id,
            governmentIdNumber: input.governmentIdNumber,
            kycDocumentType: input.kycDocumentType,
            kycDocumentUrl: input.kycDocumentUrl,
            kycReviewNotes: input.kycReviewNotes,
            kycStatus: input.kycStatus,
            memberId: input.memberId,
            tenantId: ctx.tenant.current.id,
          })
        }),
      reviewOnboarding: minRoleProcedure("operations_officer")
        .input(mobileAdminMemberOnboardingReviewInput)
        .mutation(({ ctx, input }) => {
          return reviewMobileAdminMemberOnboarding({
            actorUserId: ctx.auth.session.user.id,
            decision: input.decision,
            requestId: input.requestId,
            reviewNotes: input.reviewNotes,
            tenantId: ctx.tenant.current.id,
          })
        }),
      updateStatus: minRoleProcedure("operations_officer")
        .input(mobileAdminMemberStatusUpdateInput)
        .mutation(({ ctx, input }) => {
          return updateMobileAdminMemberStatus({
            actorUserId: ctx.auth.session.user.id,
            memberId: input.memberId,
            reviewNotes: input.reviewNotes,
            status: input.status,
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
    support: createTRPCRouter({
      reply: minRoleProcedure("operations_officer")
        .input(mobileAdminSupportReplyInput)
        .mutation(({ ctx, input }) => {
          return addMobileAdminSupportReply({
            actorUserId: ctx.auth.session.user.id,
            attachmentUrl: input.attachmentUrl,
            message: input.message,
            supportCaseId: input.supportCaseId,
            tenantId: ctx.tenant.current.id,
          })
        }),
      updateStatus: minRoleProcedure("operations_officer")
        .input(mobileAdminSupportStatusUpdateInput)
        .mutation(({ ctx, input }) => {
          return updateMobileAdminSupportStatus({
            actorUserId: ctx.auth.session.user.id,
            assignedToUserId: input.assignedToUserId,
            priority: input.priority,
            requiresFinancialAdjustment: input.requiresFinancialAdjustment,
            resolutionSummary: input.resolutionSummary,
            status: input.status,
            supportCaseId: input.supportCaseId,
            tenantId: ctx.tenant.current.id,
          })
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
            linkedRecordId: input.linkedRecordId,
            linkedRecordType: input.linkedRecordType,
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
      reply: tenantProcedure
        .input(mobileSupportReplyInput)
        .mutation(({ ctx, input }) => {
          assertMemberWorkspace(ctx.auth.activeMembership.role)

          return replyMobileMemberSupportCase({
            attachmentUrl: input.attachmentUrl,
            message: input.message,
            supportCaseId: input.supportCaseId,
            tenantId: ctx.tenant.current.id,
            userId: ctx.auth.session.user.id,
          })
        }),
    }),
  }),
})
