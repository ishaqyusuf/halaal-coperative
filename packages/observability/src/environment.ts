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
    resolveObservabilityEnvironment(input) === "production" &&
    Boolean(input.dsn)
  )
}
