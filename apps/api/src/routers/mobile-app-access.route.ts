import { z } from "zod"
import { AppError } from "@halaalvest/errors"
import {
  getMobileAppAccessSnapshot,
  issueMobileAppReviewGrant,
  isActiveQaStoreTenant,
  revokeMobileAppReviewGrant,
} from "@halaalvest/db"
import {
  createTRPCRouter,
  platformOwnerProcedure,
  tenantProcedure,
} from "../lib.trpc"
import {
  completeFirstReleaseMobileAppCatalog,
  mobileAppStoreSchema,
  parseMobileAppCatalog,
} from "../billing/mobile-app-access-policy"
import {
  configuredMobileAppCatalog,
  storeEnvironment,
} from "../billing/mobile-app-access-verification"
import { verifyAndApplyMobileAppAccess } from "../billing/mobile-app-access-application"
import {
  canOfferStoreProducts,
  canRestoreStorePurchases,
} from "../billing/store-catalog-availability"

export const mobileAppAccessRouter = createTRPCRouter({
  catalog: tenantProcedure
    .input(z.object({ store: mobileAppStoreSchema }))
    .query(async ({ ctx, input }) => {
      const environment = process.env.STORE_BILLING_ENVIRONMENT
      const sandboxTenantEligible =
        environment === "sandbox" &&
        (await isActiveQaStoreTenant(ctx.tenant.current.id))
      if (!canRestoreStorePurchases({ environment, sandboxTenantEligible }))
        return { products: [], restorableProductIds: [], userBinding: null }
      const catalog = parseMobileAppCatalog(
        process.env.MOBILE_APP_BILLING_CATALOG
      )
      const restorableProductIds = [
        ...new Set(
          catalog
            .filter((item) => item.store === input.store)
            .map((item) => item.productId)
        ),
      ]
      const products =
        canOfferStoreProducts({
          environment,
          productionSalesEnabled:
            process.env.MOBILE_APP_BILLING_SALES_ENABLED === "true",
          sandboxTenantEligible,
        }) &&
        (environment !== "production" ||
          completeFirstReleaseMobileAppCatalog(catalog))
          ? configuredMobileAppCatalog(input.store)
          : []
      return {
        products,
        restorableProductIds,
        userBinding: ctx.auth.session.user.id,
      }
    }),
  snapshot: tenantProcedure.query(({ ctx }) =>
    getMobileAppAccessSnapshot({
      userId: ctx.auth.session.user.id,
      tenantId: ctx.tenant.current.id,
      environment: storeEnvironment(),
    })
  ),
  issueReviewGrant: platformOwnerProcedure
    .input(
      z
        .object({
          userId: z.uuid(),
          expiresAt: z.coerce.date(),
          reason: z.string().trim().min(20).max(500),
        })
        .strict()
    )
    .mutation(({ ctx, input }) =>
      issueMobileAppReviewGrant({
        actorUserId: ctx.auth.session.user.id,
        userId: input.userId,
        environment: storeEnvironment(),
        expiresAt: input.expiresAt,
        reason: input.reason,
      })
    ),
  revokeReviewGrant: platformOwnerProcedure
    .input(z.object({ userId: z.uuid() }).strict())
    .mutation(({ ctx, input }) =>
      revokeMobileAppReviewGrant({
        actorUserId: ctx.auth.session.user.id,
        userId: input.userId,
      })
    ),
  verifyPurchase: tenantProcedure
    .input(
      z.discriminatedUnion("store", [
        z.object({
          store: z.literal("apple"),
          transactionId: z.string().regex(/^[0-9]{1,80}$/),
        }),
        z.object({
          store: z.literal("google"),
          purchaseToken: z.string().min(1).max(8192),
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await verifyAndApplyMobileAppAccess(input, {
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })
      } catch (error) {
        if (error instanceof AppError) throw error
        throw new AppError({
          code: "PROVIDER_UNAVAILABLE",
          publicMessage:
            "The store purchase could not be verified. Your purchase remains recoverable; try Restore purchases again.",
        })
      }
    }),
})
