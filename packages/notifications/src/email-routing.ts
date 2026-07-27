import { z } from "zod"
import type { EmailRoutingMetadata } from "./core-types"

export const emailDeliveryModes = ["console", "live"] as const
const acceptedEmailDeliveryModes = [...emailDeliveryModes, "qa_routed"] as const

export type EmailDeliveryMode = (typeof emailDeliveryModes)[number]

export type EmailRoutingConfiguration = {
  deliveryMode: EmailDeliveryMode
  qaDomainRoutes: ReadonlyMap<string, string>
  testRecipient?: string
}

type EmailEnvironment = Record<string, string | undefined>

const emailSchema = z.string().trim().email()
const domainLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

function normalizeEnvironmentValue(value: string | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function isTruthyEnvironmentFlag(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(normalizeEnvironmentValue(value))
}

function isProductionRuntime(environment: EmailEnvironment) {
  const appEnvironment = normalizeEnvironmentValue(environment.APP_ENV)
  const vercelEnvironment = normalizeEnvironmentValue(environment.VERCEL_ENV)

  if (appEnvironment === "production" || vercelEnvironment === "production") {
    return true
  }

  return (
    !appEnvironment &&
    !vercelEnvironment &&
    normalizeEnvironmentValue(environment.NODE_ENV) === "production"
  )
}

function parseDeliveryMode(
  value: string | undefined,
  environment: EmailEnvironment
) {
  const normalizedValue = normalizeEnvironmentValue(value)

  if (!normalizedValue) {
    return isProductionRuntime(environment) ? "live" : "console"
  }

  const parsedMode = z.enum(acceptedEmailDeliveryModes).safeParse(normalizedValue)

  if (!parsedMode.success) {
    throw new Error(
      `EMAIL_DELIVERY_MODE must be one of: ${acceptedEmailDeliveryModes.join(", ")}.`
    )
  }

  if (parsedMode.data === "qa_routed") {
    return isProductionRuntime(environment) ? "live" : "console"
  }

  return parsedMode.data
}

function normalizeQaDomain(value: string) {
  const domain = value.trim().toLowerCase().replace(/\.$/, "")
  const labels = domain.split(".")

  if (
    !domain.endsWith(".test") ||
    labels.length < 2 ||
    labels.some((label) => !domainLabelPattern.test(label))
  ) {
    throw new Error(
      `EMAIL_QA_DOMAIN_ROUTES key "${value}" must be a valid reserved .test domain.`
    )
  }

  return domain
}

function parseQaDestination(value: unknown, domain: string) {
  if (typeof value !== "string") {
    throw new Error(
      `EMAIL_QA_DOMAIN_ROUTES destination for "${domain}" must be one email address.`
    )
  }

  const parsedEmail = emailSchema.safeParse(value)

  if (!parsedEmail.success) {
    throw new Error(
      `EMAIL_QA_DOMAIN_ROUTES destination for "${domain}" must be a valid email address.`
    )
  }

  const destinationDomain = getEmailDomain(parsedEmail.data)

  if (
    destinationDomain.endsWith(".test") ||
    destinationDomain.endsWith(".invalid") ||
    destinationDomain === "localhost" ||
    destinationDomain.endsWith(".localhost")
  ) {
    throw new Error(
      `EMAIL_QA_DOMAIN_ROUTES destination for "${domain}" must be a deliverable tester inbox.`
    )
  }

  return parsedEmail.data
}

export function parseQaDomainRoutes(value: string | undefined) {
  const routes = new Map<string, string>()
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    return routes
  }

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(trimmedValue)
  } catch {
    throw new Error("EMAIL_QA_DOMAIN_ROUTES must be a valid JSON object.")
  }

  if (
    !parsedValue ||
    typeof parsedValue !== "object" ||
    Array.isArray(parsedValue)
  ) {
    throw new Error("EMAIL_QA_DOMAIN_ROUTES must be a JSON object.")
  }

  for (const [rawDomain, rawDestination] of Object.entries(parsedValue)) {
    const domain = normalizeQaDomain(rawDomain)

    if (routes.has(domain)) {
      throw new Error(
        `EMAIL_QA_DOMAIN_ROUTES contains duplicate domain "${domain}".`
      )
    }

    routes.set(domain, parseQaDestination(rawDestination, domain))
  }

  return routes
}

function getEmailDomain(email: string) {
  return email.trim().toLowerCase().split("@").pop() ?? ""
}

export function getEmailRoutingConfiguration(
  environment: EmailEnvironment = process.env
): EmailRoutingConfiguration {
  const deliveryMode = parseDeliveryMode(
    environment.EMAIL_DELIVERY_MODE,
    environment
  )
  const rawQaDomainRoutes = environment.EMAIL_QA_DOMAIN_ROUTES?.trim()
  const productionRuntime = isProductionRuntime(environment)

  if (deliveryMode === "console" && productionRuntime) {
    throw new Error(
      "EMAIL_DELIVERY_MODE=console is not allowed in the production runtime."
    )
  }

  if (deliveryMode === "live" && !productionRuntime) {
    throw new Error(
      "EMAIL_DELIVERY_MODE=live is only allowed in the production runtime."
    )
  }

  if (
    rawQaDomainRoutes &&
    (isTruthyEnvironmentFlag(environment.EMAIL_TEST_MODE) ||
      environment.EMAIL_TEST_RECIPIENT?.trim() ||
      environment.TEST_EMAIL?.trim())
  ) {
    throw new Error(
      "QA domain routing cannot be combined with EMAIL_TEST_MODE, EMAIL_TEST_RECIPIENT, or TEST_EMAIL."
    )
  }

  const qaDomainRoutes = parseQaDomainRoutes(rawQaDomainRoutes)

  return {
    deliveryMode,
    qaDomainRoutes,
    testRecipient: environment.EMAIL_TEST_RECIPIENT?.trim() || undefined,
  }
}

export function resolveEmailRouting(
  originalRecipientValue: string,
  configuration: EmailRoutingConfiguration
): EmailRoutingMetadata {
  const parsedOriginalRecipient = emailSchema.safeParse(originalRecipientValue)

  if (!parsedOriginalRecipient.success) {
    throw new Error("Email delivery requires a valid recipient.")
  }

  const originalRecipient = parsedOriginalRecipient.data

  const domain = getEmailDomain(originalRecipient)
  const deliveredRecipient = configuration.qaDomainRoutes.get(domain)

  if (deliveredRecipient) {
    return {
      deliveredRecipients: [deliveredRecipient],
      mode: "qa_domain",
      originalRecipient,
    }
  }

  if (configuration.qaDomainRoutes.size > 0 && domain.endsWith(".test")) {
    throw new Error(
      `QA email delivery blocked unmatched recipient domain "${domain}".`
    )
  }

  const testRecipient = configuration.testRecipient?.trim()

  if (testRecipient) {
    const parsedTestRecipient = emailSchema.safeParse(testRecipient)

    if (!parsedTestRecipient.success) {
      throw new Error("EMAIL_TEST_RECIPIENT must be a valid email address.")
    }

    return {
      deliveredRecipients: [parsedTestRecipient.data],
      mode: "global_test_override",
      originalRecipient,
    }
  }

  return {
    deliveredRecipients: [originalRecipient],
    mode: configuration.deliveryMode === "console" ? "console" : "live",
    originalRecipient,
  }
}
