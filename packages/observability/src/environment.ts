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

export function isObservabilityEnabled(input: ObservabilityEnvironmentInput) {
  return (
    input.deploymentEnvironment === "production" &&
    input.nodeEnvironment === "production" &&
    Boolean(input.dsn?.trim())
  )
}
