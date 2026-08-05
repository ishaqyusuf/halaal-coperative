import { captureMarketingError } from "./sentry"
import { getMarketingErrorResponse } from "./error-response"
import { getMarketingErrorReport } from "./sentry-policy"

export function getMarketingServerErrorResponse(
  error: unknown,
  options: { method: string; status?: number }
) {
  const report = getMarketingErrorReport(error, "marketing.route", {
    method: options.method,
  })
  captureMarketingError(report.classified, "marketing.route", {
    method: options.method,
  })
  return getMarketingErrorResponse(report.classified, {
    status: options.status,
  })
}
