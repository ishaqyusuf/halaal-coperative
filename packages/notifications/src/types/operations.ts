import { z } from "zod"
import { createHrefNotificationAction } from "../actions"
import { channelHelpers } from "../channels"
import {
  defaultActionLabel,
  defaultActionUrl,
  defineHalaalNotification,
  sentenceCase,
  tenantEventSchema,
} from "./shared"

function operationAction(payload: z.infer<typeof tenantEventSchema>, href: string, label: string) {
  return createHrefNotificationAction({
    href: defaultActionUrl(payload, href),
    label: defaultActionLabel(payload, label),
  })
}

function noEmailDraft() {
  return null
}

export const domainVerificationChanged = defineHalaalNotification({
  buildAction: (payload) => operationAction(payload, "/domains", "Open domains"),
  buildBody: (payload) =>
    `A custom domain verification status was updated to ${sentenceCase(payload.status)}.`,
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/domains"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "operations_officer"],
  schema: tenantEventSchema.extend({
    domainId: z.string().min(1),
    status: z.string().min(1),
  }),
  title: () => "Domain verification updated",
  variant: "info",
})

export const domainVerificationChecked = defineHalaalNotification({
  buildAction: (payload) => operationAction(payload, "/domains", "Open domains"),
  buildBody: (payload) =>
    `A domain verification check completed with status ${sentenceCase(payload.status)}.`,
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/domains"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "operations_officer"],
  schema: tenantEventSchema.extend({
    domainId: z.string().min(1),
    hostname: z.string().optional(),
    status: z.string().min(1),
  }),
  title: () => "Domain verification checked",
  variant: "info",
})

export const importCompleted = defineHalaalNotification({
  buildAction: (payload) => operationAction(payload, "/settings/imports", "Open imports"),
  buildBody: (payload) => `${sentenceCase(payload.importType)} import completed.`,
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/settings/imports"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "operations_officer"],
  schema: tenantEventSchema.extend({
    importBatchId: z.string().min(1),
    importType: z.string().min(1),
  }),
  title: () => "Import completed",
  variant: "success",
})

export const importFailed = defineHalaalNotification({
  buildAction: (payload) => operationAction(payload, "/settings/imports", "Open imports"),
  buildBody: (payload) =>
    `${sentenceCase(payload.importType)} import failed${payload.errorMessage ? `: ${payload.errorMessage}` : "."}`,
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/settings/imports"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "operations_officer"],
  schema: tenantEventSchema.extend({
    errorMessage: z.string().optional(),
    importBatchId: z.string().min(1),
    importType: z.string().min(1),
  }),
  title: () => "Import failed",
  variant: "error",
})

export const migrationBackfillInitialized = defineHalaalNotification({
  buildAction: (payload) =>
    operationAction(payload, "/settings/finance/migration", "Open migration tools"),
  buildBody: (payload) =>
    `Historical member ledger backfill was initialized${payload.rangeLabel ? ` for ${payload.rangeLabel}` : ""}.`,
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/settings/finance/migration"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: tenantEventSchema.extend({
    batchId: z.string().optional(),
    rangeLabel: z.string().optional(),
  }),
  title: () => "Backfill initialized",
  variant: "info",
})

export const migrationBackfillApplied = defineHalaalNotification({
  buildAction: (payload) =>
    operationAction(payload, "/settings/finance/migration", "Open migration tools"),
  buildBody: (payload) =>
    `Historical member ledger backfill was applied${payload.rangeLabel ? ` for ${payload.rangeLabel}` : ""}.`,
  buildEmailDraft: noEmailDraft,
  buildLink: (payload) => defaultActionUrl(payload, "/settings/finance/migration"),
  channels: channelHelpers.inAppAndEmail(),
  roles: ["tenant_admin", "finance_officer"],
  schema: tenantEventSchema.extend({
    batchId: z.string().optional(),
    rangeLabel: z.string().optional(),
  }),
  title: () => "Backfill applied",
  variant: "success",
})
