import { approvedIosReleaseIdentity } from "@halaalvest/domain/ios-release-identity"

/**
 * iOS universal links and Android App Links for shared assistant links
 * (ADR-20261116-assistant-app-links). Only these website paths may open the app; the rest of the
 * site always stays in the browser. They match `assistantHrefs` in
 * `@halaalvest/assistant/contracts` and the mobile `app.config.ts`.
 */
export const appLinkPathPrefixes = [
  "/assistant/m/",
  "/assistant/review/",
] as const

const appleAppId = /^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/
const androidPackageName = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/
const sha256Fingerprint = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/

// Accepts `process.env` (an index-signature type) as well as test objects.
type AppLinksEnv = Readonly<Record<string, string | undefined>> & {
  APP_LINKS_IOS_APP_IDS?: string
  APP_LINKS_ANDROID_PACKAGE?: string
  APP_LINKS_ANDROID_SHA256_CERT_FINGERPRINTS?: string
}

function list(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function accepted(name: string, values: string[], pattern: RegExp) {
  const valid = values.filter((value) => pattern.test(value))
  if (valid.length !== values.length) {
    // Prerendered at build time, so this lands in the build log. A bad value
    // only turns app links off; it must not fail the deployment.
    console.warn(`[app-links] ignored invalid ${name} entries`)
  }
  return valid
}

/**
 * Apple app ids (`<TeamID>.<bundle id>`). Defaults to the approved store
 * identity (`ZXC78SPCV4.com.halaalvest.mobile`); a preview deployment sets
 * `APP_LINKS_IOS_APP_IDS` to the preview build's id.
 */
export function resolveAppleAppIds(env: AppLinksEnv) {
  const configured = list(env.APP_LINKS_IOS_APP_IDS)
  if (configured.length === 0) {
    const { teamId, bundleIdentifier } = approvedIosReleaseIdentity()
    return [`${teamId}.${bundleIdentifier}`]
  }
  return accepted("APP_LINKS_IOS_APP_IDS", configured, appleAppId)
}

export function buildAppleAppSiteAssociation(env: AppLinksEnv) {
  const appIDs = resolveAppleAppIds(env)
  return {
    applinks: {
      details:
        appIDs.length === 0
          ? []
          : [
              {
                appIDs,
                components: appLinkPathPrefixes.map((prefix) => ({
                  "/": `${prefix}*`,
                  comment: "Shared assistant answer or draft",
                })),
              },
            ],
    },
  }
}

/**
 * Digital Asset Links. Without signing-certificate fingerprints the list is
 * empty: Android then never verifies the app and links open the website. Real
 * fingerprints come from the owner (Play App Signing and the EAS upload key);
 * none are guessed here.
 */
export function buildAndroidAssetLinks(env: AppLinksEnv) {
  const packageName =
    env.APP_LINKS_ANDROID_PACKAGE?.trim() || "com.halaalvest.mobile"
  const fingerprints = accepted(
    "APP_LINKS_ANDROID_SHA256_CERT_FINGERPRINTS",
    list(env.APP_LINKS_ANDROID_SHA256_CERT_FINGERPRINTS).map((value) =>
      value.toUpperCase()
    ),
    sha256Fingerprint
  )
  if (!androidPackageName.test(packageName) || fingerprints.length === 0) {
    return []
  }
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]
}

/** Both files are JSON served as-is: no redirect, no auth, no tenant rewrite. */
export function appLinksJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  })
}
