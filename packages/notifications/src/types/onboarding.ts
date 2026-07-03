import { z } from "zod"
import { channelHelpers } from "../channels"
import {
  createDirectRecipient,
  defineHalaalNotification,
  directEmailSchema,
} from "./shared"

const signupEmailVerificationSchema = directEmailSchema.extend({
  expiresAt: z.string().min(1),
  verificationUrl: z.string().min(1),
})

type SignupEmailVerificationPayload = z.infer<
  typeof signupEmailVerificationSchema
>

function buildSignupEmailVerificationBody(
  payload: SignupEmailVerificationPayload,
) {
  return [
    `Hello ${payload.recipientName},`,
    "",
    `Your HalaalVest signup for ${payload.tenantName} is almost ready.`,
    "Confirm this email address to continue setting up the cooperative workspace.",
    "",
    `This verification link expires on ${payload.expiresAt}.`,
  ].join("\n")
}

export const signupEmailVerification = defineHalaalNotification({
  buildBody: buildSignupEmailVerificationBody,
  buildEmailDraft: (payload) => ({
    actionLabel: "Verify email and continue",
    actionUrl: payload.verificationUrl,
    bodyText: buildSignupEmailVerificationBody(payload),
    previewText: `Verify ${payload.recipientEmail} to continue setup for ${payload.tenantName}.`,
    recipient: createDirectRecipient(payload),
    subject: `Verify your HalaalVest signup for ${payload.tenantName}`,
  }),
  buildLink: (payload) => payload.verificationUrl,
  channels: channelHelpers.email(),
  schema: signupEmailVerificationSchema,
  title: () => "Signup email verification",
  variant: "info",
})

const workspaceReadySchema = directEmailSchema.extend({
  dashboardUrl: z.string().min(1),
  siteUrl: z.string().min(1),
})

type WorkspaceReadyPayload = z.infer<typeof workspaceReadySchema>

function buildWorkspaceReadyBody(payload: WorkspaceReadyPayload) {
  return [
    `Hello ${payload.recipientName},`,
    "",
    `${payload.tenantName} is ready in HalaalVest.`,
    `Dashboard: ${payload.dashboardUrl}`,
    `Public site: ${payload.siteUrl}`,
    "",
    "You can now continue tenant setup from the dashboard workspace.",
  ].join("\n")
}

export const workspaceReady = defineHalaalNotification({
  buildBody: buildWorkspaceReadyBody,
  buildEmailDraft: (payload) => ({
    actionLabel: "Open workspace",
    actionUrl: payload.dashboardUrl,
    bodyText: buildWorkspaceReadyBody(payload),
    previewText: `${payload.tenantName} is provisioned and ready to open.`,
    recipient: createDirectRecipient(payload),
    subject: `${payload.tenantName} is ready in HalaalVest`,
  }),
  buildLink: (payload) => payload.dashboardUrl,
  channels: channelHelpers.email(),
  schema: workspaceReadySchema,
  title: () => "Workspace ready",
  variant: "success",
})

const workspaceInvitationSchema = directEmailSchema.extend({
  invitationUrl: z.string().min(1),
  roleLabel: z.string().optional(),
})

type WorkspaceInvitationPayload = z.infer<typeof workspaceInvitationSchema>

function buildWorkspaceInvitationBody(payload: WorkspaceInvitationPayload) {
  return `Hello ${payload.recipientName},\n\nYou have been invited to join ${payload.tenantName}${payload.roleLabel ? ` as ${payload.roleLabel}` : ""}.`
}

export const workspaceInvitation = defineHalaalNotification({
  buildBody: buildWorkspaceInvitationBody,
  buildEmailDraft: (payload) => ({
    actionLabel: "Accept invitation",
    actionUrl: payload.invitationUrl,
    bodyText: buildWorkspaceInvitationBody(payload),
    previewText: `Join ${payload.tenantName} on HalaalVest.`,
    recipient: createDirectRecipient(payload),
    subject: `${payload.tenantName}: workspace invitation`,
  }),
  buildLink: (payload) => payload.invitationUrl,
  channels: channelHelpers.email(),
  schema: workspaceInvitationSchema,
  title: (payload) => `Invitation ready for ${payload.recipientName}`,
  variant: "success",
})
