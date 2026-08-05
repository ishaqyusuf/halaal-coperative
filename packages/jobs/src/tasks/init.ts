import * as Sentry from "@sentry/node"
import { tasks } from "@trigger.dev/sdk/v3"

import {
  getJobsErrorReport,
  isJobsSentryEnabled,
  sanitizeJobsSentryEvent,
  shouldCaptureTerminalTaskFailure,
} from "../observability/sentry-policy"

const dsn = process.env.SENTRY_DSN_JOBS
const environment = process.env.SENTRY_ENVIRONMENT_JOBS
const enabled = isJobsSentryEnabled({
  deploymentEnvironment: environment,
  dsn,
  nodeEnvironment: process.env.NODE_ENV,
})

if (enabled) {
  Sentry.init({
    beforeBreadcrumb: () => null,
    beforeSend: (event) =>
      sanitizeJobsSentryEvent(event) as unknown as typeof event,
    beforeSendTransaction: () => null,
    dsn,
    enableLogs: false,
    enabled,
    environment,
    integrations: (defaults) =>
      defaults.filter(
        (integration) =>
          ![
            "Console",
            "ContextLines",
            "Http",
            "LocalVariables",
            "RequestData",
          ].includes(integration.name)
      ),
    maxBreadcrumbs: 0,
    release: process.env.SENTRY_RELEASE_JOBS,
    sendClientReports: false,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
}

tasks.onFailure(async ({ ctx, error, task }) => {
  if (!enabled) return

  const report = getJobsErrorReport(error, {
    attempt: ctx.attempt.number,
    deploymentVersion: ctx.deployment?.version,
    environment: ctx.environment.slug,
    environmentType: ctx.environment.type,
    runId: ctx.run.id,
    task,
  })
  if (
    !shouldCaptureTerminalTaskFailure({
      environmentType: ctx.environment.type,
      reportable: report.classified.reportable,
    })
  ) {
    return
  }

  Sentry.captureException(report.reportableError, report.captureContext)
  await Sentry.flush(2_000)
})
