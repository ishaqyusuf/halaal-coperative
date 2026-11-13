import { processCooperativeMobileBilling } from "@halaalvest/db"
import { logger, schedules } from "@trigger.dev/sdk/v3"

// Daily, not hourly: month close needs one run at 00:15 on the 1st, recorded
// remittances post their accounting inline, and this run retries the rest. An
// hourly run would wake the database 24 times a day with nothing due.
export const COOPERATIVE_MOBILE_BILLING_CRON = "15 0 * * *"

export const cooperativeMobileBillingTask = schedules.task({
  id: "cooperative-mobile-billing",
  cron: {
    pattern: COOPERATIVE_MOBILE_BILLING_CRON,
    timezone: "Africa/Lagos",
    environments: ["PRODUCTION", "PREVIEW"],
  },
  maxDuration: 300,
  queue: { concurrencyLimit: 1 },
  run: async () => {
    const { failures, ...result } = await processCooperativeMobileBilling()
    logger.info("Processed cooperative mobile billing", result)
    if (failures.length) {
      logger.error("Cooperative mobile billing work needs review", { failures })
      throw new Error(
        "Some cooperative mobile billing work could not be processed."
      )
    }
    return result
  },
})
