import { parseQaDomainRoutes } from "@halaalvest/notifications"
import { getQaPolicy, qaPolicyTarget } from "@halaalvest/utils/qa-policy-server"
import {
  normalizeQaAcceleratorEnvironment,
  resolveQaAcceleratorCapability,
  type QaAcceleratorClientKind,
} from "@halaalvest/domain"

function getEnvironment() {
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.DEPLOYMENT_ENVIRONMENT === "production"
  )
    return "production"

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

type RuntimeEnv = Record<string, string | undefined>

export type QaPolicyGate =
  | { managed: false }
  | { managed: true; enabled: boolean; domains: ReadonlySet<string> }

/**
 * Oversight's central QA policy decides, as in EwaTrade, once `QA_POLICY_URL`
 * is configured: QA is on only for the environments the policy turns on and
 * only for its active `.test` domains. An unreachable or invalid policy fails
 * closed (ordinary sign-in still works). Without `QA_POLICY_URL` the local
 * `EMAIL_QA_DOMAIN_ROUTES` configuration applies. Production never has QA.
 */
export async function resolveQaPolicyGate(env: RuntimeEnv = process.env): Promise<QaPolicyGate> {
  if (!env.QA_POLICY_URL?.trim()) return { managed: false }
  const target = qaPolicyTarget(env)
  if (!target) return { managed: true, enabled: false, domains: new Set() }
  try {
    const policy = await getQaPolicy(env)
    const enabled = policy.environments[target] === true
    return {
      managed: true,
      enabled,
      domains: new Set(enabled ? policy.entries.filter((entry) => entry.active).map((entry) => entry.qa) : []),
    }
  } catch {
    return { managed: true, enabled: false, domains: new Set() }
  }
}

export async function getQaAcceleratorCapability(
  input: {
    clientKind: QaAcceleratorClientKind
    contractVersion: number
  },
  gate?: QaPolicyGate
) {
  const environment = getEnvironment()
  const policy = gate ?? (await resolveQaPolicyGate())
  return resolveQaAcceleratorCapability({
    clientKind: input.clientKind,
    contractVersion: input.contractVersion,
    enabled:
      process.env.QA_ACCELERATOR_ENABLED !== "false" &&
      environment !== "production" &&
      (!policy.managed || policy.enabled),
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

export async function isConfiguredQaEntryDomain(domain: string, gate?: QaPolicyGate) {
  if ((process.env.QA_ACCELERATOR_SECRET?.trim().length ?? 0) < 32) return false
  const policy = gate ?? (await resolveQaPolicyGate())
  if (policy.managed) return policy.enabled && policy.domains.has(domain)
  try {
    return parseQaDomainRoutes(process.env.EMAIL_QA_DOMAIN_ROUTES).has(domain)
  } catch {
    return false
  }
}
