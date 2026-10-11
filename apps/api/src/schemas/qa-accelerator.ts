import { z } from "zod"

export const qaClientKindSchema = z.enum(["mobile", "web"])

export const qaCapabilityInput = z.object({
  clientKind: qaClientKindSchema,
  contractVersion: z.number().int().positive(),
})

export const qaAuthorizeInput = qaCapabilityInput.extend({
  clientId: z.string().trim().min(8).max(160),
  credential: z.string().trim().min(16).max(256).optional(),
  qaDomain: z.string().trim().min(3).max(253),
})

export const qaAuthorizationInput = qaCapabilityInput.extend({
  authorizationToken: z.string().trim().min(24).max(512),
  clientId: z.string().trim().min(8).max(160),
})

export const qaEnterProfileInput = qaAuthorizationInput.extend({
  selectionRef: z.string().trim().min(32).max(128),
})

export const qaIssueCredentialInput = z.object({
  expiresInHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(24 * 7),
  qaDomain: z.string().trim().min(3).max(253),
  testerLabel: z.string().trim().min(2).max(160),
})

export const qaRevokeCredentialInput = z.object({
  credentialId: z.string().uuid(),
})
