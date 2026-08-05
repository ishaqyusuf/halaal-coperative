import {
  buildErrorReport,
  isObservabilityEnabled,
  sanitizeSentryEvent,
} from "@halaalvest/observability"

type TriggerEnvironmentType =
  | "DEVELOPMENT"
  | "PREVIEW"
  | "PRODUCTION"
  | "STAGING"

export function isJobsSentryEnabled(input: {
  deploymentEnvironment?: string
  dsn?: string
  nodeEnvironment?: string
}) {
  return isObservabilityEnabled(input)
}

export function shouldCaptureTerminalTaskFailure(input: {
  environmentType: TriggerEnvironmentType
  reportable: boolean
}) {
  return input.environmentType === "PRODUCTION" && input.reportable
}

export function sanitizeJobsSentryEvent(event: unknown) {
  return sanitizeSentryEvent(event, {
    allowedExtraKeys: ["attempt", "deployment_version", "run_id"],
    allowedTagKeys: ["task", "trigger_environment", "trigger_environment_type"],
  })
}

export function getJobsErrorReport(
  error: unknown,
  input: {
    attempt: number
    deploymentVersion?: string
    environment: string
    environmentType: TriggerEnvironmentType
    runId: string
    task: string
  }
) {
  return buildErrorReport(error, {
    extra: {
      attempt: input.attempt,
      deployment_version: input.deploymentVersion,
      run_id: input.runId,
    },
    operation: input.task,
    runtime: "jobs",
    source: "trigger.on_failure",
    tags: {
      task: input.task,
      trigger_environment: input.environment,
      trigger_environment_type: input.environmentType,
    },
  })
}
