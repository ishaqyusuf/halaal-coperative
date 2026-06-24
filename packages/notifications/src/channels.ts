import type { NotificationChannel } from "./core-types"

export const channelHelpers = {
  email(): NotificationChannel[] {
    return ["email"]
  },
  inApp(): NotificationChannel[] {
    return ["in_app"]
  },
  inAppAndEmail(): NotificationChannel[] {
    return ["in_app", "email"]
  },
}
