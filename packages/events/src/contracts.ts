import {
  analyticsBatchSchema,
  analyticsEventSchema,
} from "@ishaqyusuf/logly-core"
import { z } from "zod"

// Logly's deployed native contract (core 0.3.0) is not yet published on npm.
// Extend the published 0.2.0 validation locally until that release is available.
export const nativeEventSchema = analyticsEventSchema.extend({
  source: z.literal("mobile"),
  platform: z.literal("android"),
  appVersion: z.string().min(1).max(64).optional(),
  appBuild: z.string().min(1).max(64).optional(),
})
export const nativeBatchSchema = analyticsBatchSchema.extend({
  events: z.array(nativeEventSchema).min(1).max(25),
})
export type NativeEvent = z.infer<typeof nativeEventSchema>
export type NativeBatch = z.infer<typeof nativeBatchSchema>
