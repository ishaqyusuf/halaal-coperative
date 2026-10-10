/** Names shared by HalaalVest services; database already has its canonical prefix. */
export const HALAALVEST_SHARED_ENV_NAMES = Object.freeze([
  "APP_ENV",
  "AUTH_SECRET",
  "SIGNUP_TOKEN_SECRET",
  "EARLY_ACCESS_TOKEN_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM_ADDRESS",
  "EMAIL_REPLY_TO",
  "EMAIL_DELIVERY_MODE",
  "EMAIL_QA_DOMAIN_ROUTES",
  "DASHBOARD_APP_URL",
  "MARKETING_APP_URL",
  "TENANT_SITE_APP_URL",
  "PLATFORM_ROOT_DOMAIN",
  "TENANT_ROOT_DOMAIN",
  "DASHBOARD_ROOT_DOMAIN",
  "PLATFORM_APP_HOSTNAME",
  "TRIGGER_SECRET_KEY",
  "TRIGGER_PROJECT_ID",
])

/** Fill absent app variables from linked team variables; return names, never values. */
export function applyHalaalvestSharedEnv(env = process.env) {
  const filled = []
  for (const name of HALAALVEST_SHARED_ENV_NAMES) {
    if (env[name]?.trim()) continue
    const shared = env[`HALAALVEST_${name}`]?.trim()
    if (!shared) continue
    env[name] = shared
    filled.push(name)
  }
  return filled
}
