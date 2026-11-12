import { processCooperativeMobileBilling } from "@halaalvest/db"
import { logger, schedules } from "@trigger.dev/sdk/v3"

export const cooperativeMobileBillingTask = schedules.task({
  id: "cooperative-mobile-billing",
  cron: {
    pattern: "15 * * * *",
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
