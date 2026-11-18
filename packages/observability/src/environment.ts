export type ObservabilityEnvironmentInput = {
  deploymentEnvironment?: string
  dsn?: string
  nodeEnvironment?: string
}

export function resolveObservabilityEnvironment({
  deploymentEnvironment,
  nodeEnvironment,
}: Omit<ObservabilityEnvironmentInput, "dsn">) {
  return deploymentEnvironment ?? nodeEnvironment ?? "development"
}

/**
 * Deployment environments that may send diagnostics. Preview is included so
 * QA builds (store-qa against the Preview API) surface failures before a
 * release; each event carries its environment so Sentry can filter it.
 */
export const REPORTING_DEPLOYMENT_ENVIRONMENTS = ["production", "preview"]

export function isObservabilityEnabled(input: ObservabilityEnvironmentInput) {
  return (
    REPORTING_DEPLOYMENT_ENVIRONMENTS.includes(
      input.deploymentEnvironment ?? ""
    ) &&
    input.nodeEnvironment === "production" &&
    Boolean(input.dsn?.trim())
  )
}
