import { z } from "zod"
import { channelHelpers } from "../channels"
import {
  createDirectRecipient,
  defineHalaalNotification,
  directEmailSchema,
} from "./shared"

export const signupEmailVerification = defineHalaalNotification({
  buildBody: (payload) =>
    [
      `Assalamu alaikum ${payload.recipientName},`,
      "",
      `Your HalaalVest signup for ${payload.tenantName} is almost ready.`,
      "Confirm this email address to continue setting up the cooperative workspace.",
      "",
      `This verification link expires on ${payload.expiresAt}.`,
    ].join("\n"),
  buildEmailDraft: (payload) => ({
    actionLabel: "Verify email and continue",
    actionUrl: payload.verificationUrl,
    bodyText: signupEmailVerification.buildBody(payload),
    previewText: `Verify ${payload.recipientEmail} to continue setup for ${payload.tenantName}.`,
    recipient: createDirectRecipient(payload),
    subject: `Verify your HalaalVest signup for ${payload.tenantName}`,
  }),
  buildLink: (payload) => payload.verificationUrl,
  channels: channelHelpers.email(),
  schema: directEmailSchema.extend({
    expiresAt: z.string().min(1),
    verificationUrl: z.string().min(1),
  }),
  title: () => "Signup email verification",
  variant: "info",
})

export const workspaceReady = defineHalaalNotification({
  buildBody: (payload) =>
    [
      `Assalamu alaikum ${payload.recipientName},`,
      "",
      `${payload.tenantName} is ready in HalaalVest.`,
      `Dashboard: ${payload.dashboardUrl}`,
      `Public site: ${payload.siteUrl}`,
      "",
      "You can now continue tenant setup from the dashboard workspace.",
    ].join("\n"),
  buildEmailDraft: (payload) => ({
    actionLabel: "Open workspace",
    actionUrl: payload.dashboardUrl,
    bodyText: workspaceReady.buildBody(payload),
    previewText: `${payload.tenantName} is provisioned and ready to open.`,
    recipient: createDirectRecipient(payload),
    subject: `${payload.tenantName} is ready in HalaalVest`,
  }),
  buildLink: (payload) => payload.dashboardUrl,
  channels: channelHelpers.email(),
  schema: directEmailSchema.extend({
    dashboardUrl: z.string().min(1),
    siteUrl: z.string().min(1),
  }),
  title: () => "Workspace ready",
  variant: "success",
})

export const workspaceInvitation = defineHalaalNotification({
  buildBody: (payload) =>
    `Assalamu alaikum ${payload.recipientName},\n\nYou have been invited to join ${payload.tenantName}${payload.roleLabel ? ` as ${payload.roleLabel}` : ""}.`,
  buildEmailDraft: (payload) => ({
    actionLabel: "Accept invitation",
    actionUrl: payload.invitationUrl,
    bodyText: workspaceInvitation.buildBody(payload),
    previewText: `Join ${payload.tenantName} on HalaalVest.`,
    recipient: createDirectRecipient(payload),
    subject: `${payload.tenantName}: workspace invitation`,
  }),
  buildLink: (payload) => payload.invitationUrl,
  channels: channelHelpers.email(),
  schema: directEmailSchema.extend({
    invitationUrl: z.string().min(1),
    roleLabel: z.string().optional(),
  }),
  title: (payload) => `Invitation ready for ${payload.recipientName}`,
  variant: "success",
})
