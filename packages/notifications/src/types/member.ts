import { z } from "zod"
import { createHrefNotificationAction } from "../actions"
import { channelHelpers } from "../channels"
import {
  createDirectRecipient,
  defaultActionLabel,
  defaultActionUrl,
  defineHalaalNotification,
  directEmailSchema,
  sentenceCase,
  tenantEventSchema,
} from "./shared"

export const memberOnboardingVerificationRequested = defineHalaalNotification({
  buildBody: (payload) =>
    [
      `Assalamu alaikum ${payload.recipientName},`,
      "",
      `Your membership signup for ${payload.tenantName} is almost complete.`,
      "Confirm your email address to move into the cooperative approval queue.",
      "",
      `This verification link expires on ${payload.expiresAt}.`,
    ].join("\n"),
  buildEmailDraft: (payload) => ({
    actionLabel: "Verify email and continue",
    actionUrl: payload.verificationUrl,
    bodyText: memberOnboardingVerificationRequested.buildBody(payload),
    previewText: `Verify your membership signup for ${payload.tenantName}.`,
    recipient: createDirectRecipient(payload),
    subject: `Verify your membership signup for ${payload.tenantName}`,
  }),
  buildLink: (payload) => payload.verificationUrl,
  channels: channelHelpers.email(),
  schema: directEmailSchema.extend({
    expiresAt: z.string().min(1),
    requestId: z.string().min(1),
    verificationUrl: z.string().min(1),
  }),
  title: () => "Member signup verification",
  variant: "info",
})

export const memberOnboardingApproved = defineHalaalNotification({
  buildBody: (payload) =>
    `Assalamu alaikum ${payload.recipientName},\n\nYour membership for ${payload.tenantName} has been approved.\nYou can now sign in to your dashboard and continue with your cooperative account.`,
  buildEmailDraft: (payload) => ({
    actionLabel: "Open dashboard",
    actionUrl: payload.actionUrl ?? "/",
    bodyText: memberOnboardingApproved.buildBody(payload),
    previewText: `Your ${payload.tenantName} membership has been approved.`,
    recipient: createDirectRecipient(payload),
    subject: `${payload.tenantName}: your membership has been approved`,
  }),
  buildLink: (payload) => payload.actionUrl ?? "/",
  channels: channelHelpers.email(),
  schema: directEmailSchema.extend({
    actionUrl: z.string().optional(),
    memberId: z.string().min(1),
    requestId: z.string().min(1),
  }),
  title: (payload) => `${payload.recipientName} approved`,
  variant: "success",
})

export const memberOnboardingRejected = defineHalaalNotification({
  buildBody: (payload) =>
    [
      `Assalamu alaikum ${payload.recipientName},`,
      "",
      `Your membership signup for ${payload.tenantName} was not approved yet.`,
      payload.reason ?? "Please contact the cooperative team for the next steps.",
    ].join("\n"),
  buildEmailDraft: (payload) => ({
    actionLabel: "Contact support",
    actionUrl: payload.actionUrl ?? "/login",
    bodyText: memberOnboardingRejected.buildBody(payload),
    previewText: `${payload.tenantName} membership signup update.`,
    recipient: createDirectRecipient(payload),
    subject: `${payload.tenantName}: membership signup update`,
  }),
  buildLink: (payload) => payload.actionUrl ?? "/login",
  channels: channelHelpers.email(),
  schema: directEmailSchema.extend({
    actionUrl: z.string().optional(),
    reason: z.string().optional().nullable(),
    requestId: z.string().min(1),
  }),
  title: (payload) => `${payload.recipientName} needs follow-up`,
  variant: "warning",
})

export const memberStatusChanged = defineHalaalNotification({
  buildAction: (payload) =>
    createHrefNotificationAction({
      href: defaultActionUrl(payload, "/members"),
      label: defaultActionLabel(payload, "Open members"),
    }),
  buildBody: (payload) =>
    `${payload.memberName} is now marked as ${sentenceCase(payload.status)}.`,
  buildEmailDraft: () => null,
  buildLink: (payload) => defaultActionUrl(payload, "/members"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "operations_officer"],
  schema: tenantEventSchema.extend({
    memberId: z.string().min(1),
    memberName: z.string().min(1),
    memberNumber: z.string().optional().nullable(),
    status: z.string().min(1),
  }),
  title: (payload) => `${payload.memberName} status changed`,
  variant: "info",
})

export const memberKycUpdated = defineHalaalNotification({
  buildAction: (payload) =>
    createHrefNotificationAction({
      href: defaultActionUrl(payload, `/members/${payload.memberId}`),
      label: defaultActionLabel(payload, "Open member profile"),
    }),
  buildBody: (payload) =>
    `${payload.memberName ?? "A member"} KYC is now ${sentenceCase(payload.kycStatus)}.`,
  buildEmailDraft: () => null,
  buildLink: (payload) => defaultActionUrl(payload, `/members/${payload.memberId}`),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "operations_officer"],
  schema: tenantEventSchema.extend({
    kycStatus: z.string().min(1),
    memberId: z.string().min(1),
    memberName: z.string().optional(),
  }),
  title: (payload) => `${payload.memberName ?? "Member"} KYC updated`,
  variant: "info",
})
