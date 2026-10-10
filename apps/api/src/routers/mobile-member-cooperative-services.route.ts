import {
  createMobileMemberFoodPurchaseServiceApplication,
  createMobileMemberProcurementServiceRequest,
  createMobileMemberProjectFinancingServiceRequest,
  getMobileMemberFoodPurchaseService,
  getMobileMemberFoodPurchaseApplicationDetail,
  getMobileMemberFoodPurchaseApplicationPage,
  getMobileMemberProcurementRequestDetail,
  getMobileMemberProcurementRequestPage,
  getMobileMemberProcurementService,
  getMobileMemberProjectFinancingRequestDetail,
  getMobileMemberProjectFinancingRequestPage,
  getMobileMemberProjectFinancingService,
  quoteMobileMemberProjectFinancingCharges,
  mobileProjectFinancingStructureKeys,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  createTRPCRouter,
  memberOperationalProcedure,
  tenantProcedure,
} from "../lib.trpc"

const procurementRequestCreateInput = z.object({
  itemDescription: z.string().trim().max(1000).optional(),
  itemName: z.string().trim().min(2).max(160),
  requestedCost: z.number().positive(),
  requestedRepaymentMonths: z.number().int().positive(),
  submissionKey: z.string().uuid(),
  vendorName: z.string().trim().max(160).optional(),
})

const projectFinancingRequestCreateInput = z
  .object({
    businessDescription: z.string().trim().max(2000).optional(),
    businessName: z.string().trim().min(2).max(160),
    chargeQuoteHash: z.string().regex(/^[a-f0-9]{64}$/),
    projectPurpose: z.string().trim().max(1000).optional(),
    proposedStructure: z.enum(mobileProjectFinancingStructureKeys).optional(),
    requestedAmount: z.number().positive(),
    requestedPaybackMonths: z.number().int().positive().optional(),
    submissionKey: z.string().uuid(),
  })
  .superRefine((input, context) => {
    const structure = input.proposedStructure ?? "undecided"
    if (
      structure === "repayable_facility" &&
      input.requestedPaybackMonths === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Repayable facilities require requested payback months.",
        path: ["requestedPaybackMonths"],
      })
    }
    if (
      structure !== "repayable_facility" &&
      input.requestedPaybackMonths !== undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Payback months apply only to repayable project facilities.",
        path: ["requestedPaybackMonths"],
      })
    }
  })

const foodPurchaseApplicationCreateInput = z.object({
  cycleId: z.string().trim().min(1),
  itemDescription: z.string().trim().max(1000).optional(),
  requestedAmount: z.number().positive(),
  requestedPaybackMonths: z.number().int().positive(),
  submissionKey: z.string().uuid(),
  requestNotes: z.string().trim().max(1000).optional(),
})

const boundedPageInput = z.object({
  cursor: z.string().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
})

function assertMemberWorkspace(role: string) {
  if (role !== "member") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Switch to the member workspace to view member data.",
    })
  }
}

export const mobileMemberCooperativeServiceProcedures = {
  foodPurchase: createTRPCRouter({
    application: tenantProcedure
      .input(z.object({ foodPurchaseApplicationId: z.string().uuid() }))
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return getMobileMemberFoodPurchaseApplicationDetail({
          foodPurchaseApplicationId: input.foodPurchaseApplicationId,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    applications: tenantProcedure.input(boundedPageInput).query(({ ctx, input }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberFoodPurchaseApplicationPage({
        ...input,
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    createApplication: memberOperationalProcedure
      .input(foodPurchaseApplicationCreateInput)
      .mutation(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return createMobileMemberFoodPurchaseServiceApplication({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    list: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberFoodPurchaseService({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
  }),
  procurement: createTRPCRouter({
    createRequest: memberOperationalProcedure
      .input(procurementRequestCreateInput)
      .mutation(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return createMobileMemberProcurementServiceRequest({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    list: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberProcurementService({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    request: tenantProcedure
      .input(z.object({ procurementRequestId: z.string().uuid() }))
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return getMobileMemberProcurementRequestDetail({
          procurementRequestId: input.procurementRequestId,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    requests: tenantProcedure.input(boundedPageInput).query(({ ctx, input }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberProcurementRequestPage({
        ...input,
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
  }),
  projectFinancing: createTRPCRouter({
    quote: tenantProcedure
      .input(z.object({ requestedAmount: z.number().positive().finite() }))
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return quoteMobileMemberProjectFinancingCharges({
          requestedAmount: input.requestedAmount,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    createRequest: memberOperationalProcedure
      .input(projectFinancingRequestCreateInput)
      .mutation(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return createMobileMemberProjectFinancingServiceRequest({
          ...input,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    list: tenantProcedure.query(({ ctx }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberProjectFinancingService({
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
    request: tenantProcedure
      .input(z.object({ projectFinancingRequestId: z.string().uuid() }))
      .query(({ ctx, input }) => {
        assertMemberWorkspace(ctx.auth.activeMembership.role)
        return getMobileMemberProjectFinancingRequestDetail({
          projectFinancingRequestId: input.projectFinancingRequestId,
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      }),
    requests: tenantProcedure.input(boundedPageInput).query(({ ctx, input }) => {
      assertMemberWorkspace(ctx.auth.activeMembership.role)
      return getMobileMemberProjectFinancingRequestPage({
        ...input,
        tenantId: ctx.tenant.current.id,
        userId: ctx.auth.session.user.id,
      })
    }),
  }),
}
