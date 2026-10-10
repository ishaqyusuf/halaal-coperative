import {
  createAuditLogEntry,
  createMobileAdminReportExport,
  getMobileAdminAccessOverview,
  getMobileAdminReportsOverview,
  getTenantSubscriptionSnapshot,
  disableMobilePushEndpoint,
  listActivityReportEvents,
  getMobileNotificationCenter,
  inviteMobileAdminAccessUserForSession,
  markMobileNotificationsRead,
  registerMobilePushEndpoint,
  updateMobileUserNotificationPreference,
} from "@halaalvest/db"
import { MOBILE_NOTIFICATION_CATEGORY_KEYS } from "@halaalvest/domain/mobile-notifications"
import {
  getMobileReportCatalog,
  MOBILE_REPORT_KEYS,
} from "@halaalvest/domain/mobile-reports"
import { createNotificationEmailDraft } from "@halaalvest/notifications"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  createTRPCRouter,
  permissionProcedure,
  tenantProcedure,
} from "../lib.trpc"
import { sendEmailDraftWithAudit } from "../lib/server-notifications"

function buildMobileRecoveryUrl(input: {
  cooperativeNumber: string
  email: string
}) {
  const configuredScheme = process.env.HALAALVEST_MOBILE_URL_SCHEME?.trim()
  const scheme = configuredScheme || "halaalvest"
  const query = new URLSearchParams({
    cooperativeNumber: input.cooperativeNumber,
    email: input.email,
  })
  return `${scheme}://recovery?${query.toString()}`
}

function roleLabel(role: string) {
  return role
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

const accessInviteInput = z.object({
  email: z.string().trim().email(),
  fullName: z.string().trim().min(2).max(160),
  makeDefault: z.boolean().optional(),
  role: z.enum([
    "tenant_admin",
    "finance_officer",
    "operations_officer",
    "member",
  ]),
})

const markReadInput = z.object({
  deliveryIds: z.array(z.string().uuid()).min(1).max(25),
})

const registerPushInput = z.object({
  permissionStatus: z.literal("granted"),
  platform: z.string().trim().min(1).max(40),
  projectId: z.string().trim().min(1).max(120).nullable().optional(),
  providerToken: z.string().trim().min(12).max(600),
})

const disablePushInput = z.object({
  permissionStatus: z.enum(["denied", "undetermined", "unavailable"]),
})

const updatePreferenceInput = z.object({
  enabled: z.boolean(),
  notificationType: z.enum(MOBILE_NOTIFICATION_CATEGORY_KEYS),
})

function requireMobileDeviceSessionId(
  mobileDeviceSessionId: string | undefined
) {
  if (!mobileDeviceSessionId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "A durable mobile device session is required.",
    })
  }
  return mobileDeviceSessionId
}

const reportActivityInput = z.object({
  action: z.string().trim().max(120).optional(),
  cursor: z.string().trim().min(1).optional(),
  entityType: z.string().trim().max(120).optional(),
  fromDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(50).default(25),
  search: z.string().trim().max(160).optional(),
  toDate: z.string().datetime().optional(),
})

const generateReportInput = z.object({
  fromDate: z.string().datetime().optional(),
  key: z.enum(MOBILE_REPORT_KEYS),
  requestId: z.string().uuid(),
  toDate: z.string().datetime().optional(),
})

export const mobileAdminReportsAccessNotificationProcedures = {
  access: createTRPCRouter({
    invite: permissionProcedure("manage_roles")
      .input(accessInviteInput)
      .mutation(async ({ ctx, input }) => {
        const invitation = await inviteMobileAdminAccessUserForSession({
          ...input,
          actorUserId: ctx.auth.session.user.id,
          tenantId: ctx.tenant.current.id,
        })
        const setupUrl = buildMobileRecoveryUrl({
          cooperativeNumber: invitation.cooperativeNumber,
          email: invitation.email,
        })
        const draft = createNotificationEmailDraft({
          actionLabel: "Set up mobile access",
          actionUrl: setupUrl,
          bodyText: [
            `Hello ${invitation.fullName},`,
            "",
            `${ctx.tenant.current.name} invited you as ${roleLabel(invitation.role)}.`,
            `Your cooperative number is ${invitation.cooperativeNumber}.`,
            "Open the setup link, request a recovery code with this email address, and choose your password.",
            "",
            "If you did not expect this invitation, contact the cooperative office.",
          ].join("\n"),
          eventLabel: "workspace.access_invited",
          notificationType: "workspace.access_invited",
          previewText: `Set up your ${ctx.tenant.current.name} mobile access.`,
          recipient: {
            displayName: invitation.fullName,
            email: invitation.email,
            kind: "email",
            value: invitation.email,
          },
          sender: {
            displayName: ctx.tenant.current.name,
            localPart: ctx.tenant.current.slug,
          },
          subject: `${ctx.tenant.current.name}: set up your mobile access`,
        })
        let deliveryStatus: "failed" | "queued" | "sent" | "unknown" = "unknown"

        try {
          const delivery = await sendEmailDraftWithAudit({
            draft,
            source: "mobile.workspace_access",
            tenantId: ctx.tenant.current.id,
          })
          deliveryStatus = delivery.status
        } catch {
          // Provisioning has already succeeded. Return the cooperative number
          // for a manual handoff instead of reporting a false command failure.
        }

        return {
          ...invitation,
          deliveryStatus,
          setupUrl,
        }
      }),
    overview: permissionProcedure("manage_roles").query(({ ctx }) =>
      getMobileAdminAccessOverview(ctx.tenant.current.id)
    ),
  }),
  reports: createTRPCRouter({
    activity: permissionProcedure("view_reports")
      .input(reportActivityInput)
      .query(async ({ ctx, input }) => {
        const events = await listActivityReportEvents(ctx.tenant.current.id, {
          action: input.action,
          cursor: input.cursor,
          entityType: input.entityType,
          fromDate: input.fromDate ? new Date(input.fromDate) : undefined,
          limit: input.limit + 1,
          search: input.search,
          toDate: input.toDate ? new Date(input.toDate) : undefined,
        })
        const hasNextPage = events.length > input.limit
        const items = hasNextPage ? events.slice(0, input.limit) : events

        return {
          items: items.map((event) => ({
            ...event,
            metadataSummary: event.metadataSummary.slice(0, 3),
            occurredAt: event.occurredAt.toISOString(),
          })),
          nextCursor: hasNextPage ? items.at(-1)?.id ?? null : null,
        }
      }),
    generate: permissionProcedure("view_reports")
      .input(generateReportInput)
      .mutation(async ({ ctx, input }) => {
        const subscription = await getTenantSubscriptionSnapshot({
          tenantId: ctx.tenant.current.id,
        })
        const report = getMobileReportCatalog(subscription.entitlements).find(
          (item) => item.key === input.key,
        )
        if (!report?.available) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "This report requires a higher report or audit depth on the active subscription.",
          })
        }

        const generated = await createMobileAdminReportExport({
          filters: {
            fromDate: input.fromDate ? new Date(input.fromDate) : undefined,
            toDate: input.toDate ? new Date(input.toDate) : undefined,
          },
          key: input.key,
          rowLimit: report.rowLimit,
          tenantId: ctx.tenant.current.id,
          tenantSlug: ctx.tenant.current.slug,
        })
        const generatedAt = new Date()
        const expiresAt = new Date(generatedAt.getTime() + 15 * 60 * 1_000)

        await createAuditLogEntry({
          action: "mobile.report.generated",
          actorType: "user",
          actorUserId: ctx.auth.session.user.id,
          entityId: input.requestId,
          entityType: "ReportExport",
          metadata: {
            fromDate: input.fromDate ?? null,
            reportKey: input.key,
            rowCount: generated.rowCount,
            toDate: input.toDate ?? null,
          },
          tenantId: ctx.tenant.current.id,
        })

        return {
          ...generated,
          expiresAt: expiresAt.toISOString(),
          generatedAt: generatedAt.toISOString(),
          id: input.requestId,
          key: input.key,
        }
      }),
    overview: permissionProcedure("view_reports").query(async ({ ctx }) => {
      const subscription = await getTenantSubscriptionSnapshot({
        tenantId: ctx.tenant.current.id,
      })
      return getMobileAdminReportsOverview(
        ctx.tenant.current.id,
        subscription.entitlements,
      )
    }),
  }),
}

export const mobileNotificationProcedures = {
  disablePush: tenantProcedure
    .input(disablePushInput)
    .mutation(({ ctx, input }) =>
      disableMobilePushEndpoint({
        actorUserId: ctx.auth.session.user.id,
        mobileDeviceSessionId: requireMobileDeviceSessionId(
          ctx.auth.session.mobileDeviceSessionId
        ),
        permissionStatus: input.permissionStatus,
        tenantId: ctx.tenant.current.id,
      })
    ),
  markRead: tenantProcedure.input(markReadInput).mutation(({ ctx, input }) =>
    markMobileNotificationsRead({
      actorUserId: ctx.auth.session.user.id,
      deliveryIds: input.deliveryIds,
      tenantId: ctx.tenant.current.id,
      userEmail: ctx.auth.session.user.email,
    })
  ),
  overview: tenantProcedure.query(async ({ ctx }) => {
    const subscription = await getTenantSubscriptionSnapshot({
      tenantId: ctx.tenant.current.id,
    })
    return getMobileNotificationCenter({
      memberLoginEnabled: subscription.enforcement.memberLoginEnabled,
      mobileDeviceSessionId: ctx.auth.session.mobileDeviceSessionId,
      role: ctx.auth.activeMembership.role,
      tenantId: ctx.tenant.current.id,
      userEmail: ctx.auth.session.user.email,
      userId: ctx.auth.session.user.id,
    })
  }),
  registerPush: tenantProcedure
    .input(registerPushInput)
    .mutation(({ ctx, input }) =>
      registerMobilePushEndpoint({
        actorUserId: ctx.auth.session.user.id,
        mobileDeviceSessionId: requireMobileDeviceSessionId(
          ctx.auth.session.mobileDeviceSessionId
        ),
        permissionStatus: input.permissionStatus,
        platform: input.platform,
        projectId: input.projectId,
        providerToken: input.providerToken,
        tenantId: ctx.tenant.current.id,
      })
    ),
  updatePreference: tenantProcedure
    .input(updatePreferenceInput)
    .mutation(({ ctx, input }) =>
      updateMobileUserNotificationPreference({
        actorUserId: ctx.auth.session.user.id,
        enabled: input.enabled,
        notificationType: input.notificationType,
        tenantId: ctx.tenant.current.id,
      })
    ),
}
