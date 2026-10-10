import {
  normalizeQaAcceleratorEnvironment,
  resolveQaAcceleratorCapability,
  type QaAcceleratorClientKind,
} from "@halaalvest/domain"

function getEnvironment() {
  return normalizeQaAcceleratorEnvironment(
    process.env.HALAALVEST_ENV ??
      process.env.DEPLOYMENT_ENVIRONMENT ??
      (process.env.NODE_ENV === "production" ? "production" : "local")
  )
}

function getPermittedClientKinds() {
  const configured = (process.env.QA_ACCELERATOR_CLIENT_KINDS ?? "mobile,web")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(
      (value): value is QaAcceleratorClientKind =>
        value === "mobile" || value === "web"
    )
  return [...new Set(configured)]
}

export function getQaAcceleratorCapability(input: {
  clientKind: QaAcceleratorClientKind
  contractVersion: number
}) {
  const environment = getEnvironment()
  return resolveQaAcceleratorCapability({
    clientKind: input.clientKind,
    contractVersion: input.contractVersion,
    enabled:
      process.env.QA_ACCELERATOR_ENABLED !== "false" &&
      environment !== "production",
    environment,
    hasCredentialSecret: Boolean(process.env.QA_ACCELERATOR_SECRET?.trim()),
    permittedClientKinds: getPermittedClientKinds(),
  })
}

export function getConfiguredLocalQaCredential() {
  return process.env.QA_ACCELERATOR_TESTER_CREDENTIAL?.trim() || null
}

export function assertQaAcceleratorStartupSafety() {
  if (
    getEnvironment() === "production" &&
    process.env.QA_ACCELERATOR_ENABLED === "true"
  ) {
    throw new Error(
      "QA_ACCELERATOR_ENABLED cannot be true in the production API environment."
    )
  }
}
