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
  payload: SignupEmailVerificationPayload
) {
  return [
    `Hello ${payload.recipientName},`,
    "",
    `Your HalaalVest setup for ${payload.tenantName} is almost ready.`,
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
    subject: `Verify your HalaalVest setup for ${payload.tenantName}`,
  }),
  buildLink: (payload) => payload.verificationUrl,
  channels: channelHelpers.email(),
  schema: signupEmailVerificationSchema,
  title: () => "Setup email verification",
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

const marketingEarlyAccessRequestSchema = directEmailSchema.extend({
  approvalUrl: z.string().min(1),
  contactEmail: z.email(),
  contactName: z.string().min(1),
  currentSizeLabel: z.string().min(1),
  launchTimelineLabel: z.string().min(1),
  message: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  recordSystemLabel: z.string().min(1),
  requestedAt: z.string().min(1),
  setupNeedLabels: z.array(z.string().min(1)).min(1),
})

type MarketingEarlyAccessRequestPayload = z.infer<
  typeof marketingEarlyAccessRequestSchema
>

function buildMarketingEarlyAccessRequestBody(
  payload: MarketingEarlyAccessRequestPayload
) {
  return [
    `New early access request for ${payload.tenantName}.`,
    "",
    `Contact: ${payload.contactName}`,
    `Email: ${payload.contactEmail}`,
    payload.phone ? `Phone: ${payload.phone}` : null,
    `Cooperative size: ${payload.currentSizeLabel}`,
    `Current records: ${payload.recordSystemLabel}`,
    `Target setup: ${payload.launchTimelineLabel}`,
    `Setup should cover: ${payload.setupNeedLabels.join(", ")}`,
    payload.message ? `Additional note: ${payload.message}` : null,
    `Requested: ${payload.requestedAt}`,
    "",
    "Open the approval link to send the cooperative a secure setup link.",
  ]
    .filter(Boolean)
    .join("\n")
}

export const marketingEarlyAccessRequest = defineHalaalNotification({
  buildBody: buildMarketingEarlyAccessRequestBody,
  buildEmailDraft: (payload) => ({
    actionLabel: "Approve early access",
    actionUrl: payload.approvalUrl,
    bodyText: buildMarketingEarlyAccessRequestBody(payload),
    previewText: `${payload.contactName} requested Halaalvest early access for ${payload.tenantName}.`,
    recipient: createDirectRecipient(payload),
    subject: `Approve Halaalvest early access for ${payload.tenantName}`,
  }),
  buildLink: (payload) => payload.approvalUrl,
  channels: channelHelpers.email(),
  schema: marketingEarlyAccessRequestSchema,
  title: () => "Marketing early access request",
  variant: "info",
})

const marketingEarlyAccessApprovedSchema = directEmailSchema.extend({
  expiresAt: z.string().min(1),
  signupUrl: z.string().min(1),
})

type MarketingEarlyAccessApprovedPayload = z.infer<
  typeof marketingEarlyAccessApprovedSchema
>

function buildMarketingEarlyAccessApprovedBody(
  payload: MarketingEarlyAccessApprovedPayload
) {
  return [
    `Hello ${payload.recipientName},`,
    "",
    `Your Halaalvest early access request for ${payload.tenantName} has been approved.`,
    "Use the secure setup link below to start the cooperative setup flow.",
    "",
    `This approval link expires on ${payload.expiresAt}.`,
  ].join("\n")
}

export const marketingEarlyAccessApproved = defineHalaalNotification({
  buildBody: buildMarketingEarlyAccessApprovedBody,
  buildEmailDraft: (payload) => ({
    actionLabel: "Start cooperative setup",
    actionUrl: payload.signupUrl,
    bodyText: buildMarketingEarlyAccessApprovedBody(payload),
    previewText: `Start the approved Halaalvest setup for ${payload.tenantName}.`,
    recipient: createDirectRecipient(payload),
    subject: `Your Halaalvest early access is approved`,
  }),
  buildLink: (payload) => payload.signupUrl,
  channels: channelHelpers.email(),
  schema: marketingEarlyAccessApprovedSchema,
  title: () => "Marketing early access approved",
  variant: "success",
})
