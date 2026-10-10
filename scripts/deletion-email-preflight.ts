import { getServerEmailDeliveryConfig } from "../packages/notifications/src/server"
import { trustedExternalDeletionOrigin } from "../apps/marketing/src/lib/external-deletion-link"
import { renderNotificationEmail } from "../packages/email/src/emails/notification"

const target = process.argv[2]
const expectedOrigin = process.argv[3]

function fail(code: string): never {
  console.error(`Deletion email preflight failed: ${code}`)
  process.exit(1)
}

if (target !== "preview" && target !== "production")
  fail("target-must-be-preview-or-production")
if (!expectedOrigin) fail("expected-marketing-origin-required")
if (process.env.APP_ENV !== target) fail("target-environment-mismatch")
if (process.env.NODE_ENV !== "production")
  fail("node-runtime-must-be-production")
if (!process.env.HALAALVEST_DATABASE_URL?.trim()) fail("database-url-missing")
if ((process.env.PRIVACY_REQUEST_CHALLENGE_SECRET?.trim().length ?? 0) < 32)
  fail("challenge-secret-missing-or-short")

let emailConfig: ReturnType<typeof getServerEmailDeliveryConfig>
try {
  emailConfig = getServerEmailDeliveryConfig()
} catch {
  fail("email-routing-invalid-or-conflicting-test-settings")
}
if (!emailConfig.configured) fail("email-provider-unconfigured")
if (target === "production" && emailConfig.deliveryMode !== "live")
  fail("production-email-must-be-live")
if (target === "preview" && emailConfig.deliveryMode !== "console")
  fail("preview-email-must-use-qa-routing")
if (target === "preview" && emailConfig.qaDomainRoutes.size === 0)
  fail("preview-qa-domain-route-missing")

let configuredOrigin: string
let reviewedOrigin: string
try {
  configuredOrigin = trustedExternalDeletionOrigin({
    marketingAppUrl: process.env.MARKETING_APP_URL,
    publicMarketingAppUrl: process.env.NEXT_PUBLIC_MARKETING_APP_URL,
    platformRootDomain: process.env.PLATFORM_ROOT_DOMAIN,
  })
  reviewedOrigin = trustedExternalDeletionOrigin({
    marketingAppUrl: expectedOrigin,
  })
} catch {
  fail("marketing-origin-invalid")
}
if (configuredOrigin !== reviewedOrigin)
  fail("marketing-origin-does-not-match-reviewed-target")

try {
  const html = await renderNotificationEmail({
    actionLabel: "Review request",
    actionUrl: `${reviewedOrigin}/delete-account/verify`,
    bodyText: "Synthetic account deletion email rendering check.",
    eventLabel: "Deletion email preflight",
    previewText: "Synthetic rendering check.",
    subject: "Deletion email preflight",
  })
  if (!html.includes("Deletion email preflight"))
    fail("email-template-incomplete")
} catch {
  fail("email-template-render-failed")
}

console.log(
  JSON.stringify({
    target,
    configurationReady: true,
    providerCredentialsPresent: true,
    routingMode: emailConfig.deliveryMode,
    qaRouteConfigured: emailConfig.qaDomainRoutes.size > 0,
    reviewedOriginMatches: true,
    templateRendered: true,
  })
)
