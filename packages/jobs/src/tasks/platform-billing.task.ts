import { processPlatformBilling } from "@halaalvest/db"
import { logger, schedules } from "@trigger.dev/sdk/v3"

// Daily, not hourly: month close needs one run at 00:15 on the 1st, recorded
// payments post their accounting inline, and this run retries the rest
// (member seat and mobile charges, ledger postings). An hourly run would wake
// the database 24 times a day with nothing due.
export const PLATFORM_BILLING_CRON = "15 0 * * *"

export const platformBillingTask = schedules.task({
  id: "platform-billing",
  cron: {
    pattern: PLATFORM_BILLING_CRON,
    timezone: "Africa/Lagos",
    environments: ["PRODUCTION", "PREVIEW"],
  },
  maxDuration: 300,
  queue: { concurrencyLimit: 1 },
  run: async () => {
    const { failures, ...result } = await processPlatformBilling()
    logger.info("Processed platform billing", result)
    if (failures.length) {
      logger.error("Platform billing work needs review", { failures })
      throw new Error("Some platform billing work could not be processed.")
    }
    return result
  },
})
