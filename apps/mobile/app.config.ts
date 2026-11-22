import type { ExpoConfig } from "expo/config"
import { assertMobileReleaseEnvironment } from "./mobile-release-env"
import {
  approvedIosReleaseIdentity,
  iosReleaseIdentity,
} from "@halaalvest/domain/ios-release-identity"
import {
  MOBILE_INTERNAL_APP_VERSION,
  MOBILE_STORE_APP_VERSION,
} from "./release-version.js"

export const UPDATE_VERSION = "2026.07.02"
const PROJECT_ID =
  process.env.HALAALVEST_EXPO_PROJECT_ID ??
  process.env.EXPO_PROJECT_ID ??
  process.env.EAS_PROJECT_ID ??
  "3fb3e5e2-bd84-4308-8739-e9f4436d0da9"
const EXPO_OWNER =
  process.env.HALAALVEST_EXPO_OWNER ??
  process.env.EXPO_OWNER ??
  "cipron-startups"
const updateUrl = PROJECT_ID ? `https://u.expo.dev/${PROJECT_ID}` : undefined
const NOTIFICATION_ACCENT_COLOR = "#087665"
// App-owned API flows retain these user-linked categories. Linked SDKs must
// declare their own collection and required-reason API use in their manifests.
const appOwnedCollectedDataTypes = [
  "NSPrivacyCollectedDataTypeName",
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypePhoneNumber",
  "NSPrivacyCollectedDataTypePhysicalAddress",
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypeDeviceID",
  "NSPrivacyCollectedDataTypeOtherFinancialInfo",
  "NSPrivacyCollectedDataTypePurchaseHistory",
  "NSPrivacyCollectedDataTypeCustomerSupport",
  "NSPrivacyCollectedDataTypeOtherUserContent",
] as const

const appVariant =
  process.env.APP_VARIANT ??
  process.env.EXPO_PUBLIC_APP_VARIANT ??
  process.env.EAS_BUILD_PROFILE

const normalizedAppVariant = (appVariant ?? "production").toLowerCase()
assertMobileReleaseEnvironment({
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  // Provider metadata queries evaluate config before attaching an environment.
  // Validate explicitly selected releases; build profiles still enforce identity.
  appVariant: appVariant?.toLowerCase(),
  dashboardUrl: process.env.EXPO_PUBLIC_DASHBOARD_URL,
  easBuildProfile: process.env.EAS_BUILD_PROFILE,
  legalOrigin: process.env.EXPO_PUBLIC_LEGAL_ORIGIN,
})
const isDevelopmentBuild =
  normalizedAppVariant === "development" ||
  normalizedAppVariant === "dev" ||
  normalizedAppVariant === "local"
const isPreviewBuild = normalizedAppVariant === "preview"
const appVersion =
  isDevelopmentBuild || isPreviewBuild
    ? MOBILE_INTERNAL_APP_VERSION
    : MOBILE_STORE_APP_VERSION
const autoUpdateOnForeground =
  process.env.EXPO_PUBLIC_AUTO_UPDATE_ON_FOREGROUND !== "false"
const autoUpdateForegroundCooldownMs = Number(
  process.env.EXPO_PUBLIC_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS ?? 5 * 60 * 1000
)
const sentrySourceMapsEnabled =
  !isDevelopmentBuild &&
  !isPreviewBuild &&
  process.env.NODE_ENV === "production" &&
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT_MOBILE === "production" &&
  Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()) &&
  Boolean(process.env.SENTRY_ORG?.trim()) &&
  Boolean(process.env.SENTRY_PROJECT_MOBILE?.trim()) &&
  Boolean(process.env.EXPO_PUBLIC_SENTRY_RELEASE_MOBILE?.trim())
const sentryPlugins: ExpoConfig["plugins"] = sentrySourceMapsEnabled
  ? [
      [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT_MOBILE,
        },
      ],
    ]
  : []

const variantConfig = isDevelopmentBuild
  ? {
      name: "HalaalVest Dev",
      scheme: "halaalvest-dev",
      iosBundleIdentifier: "com.halaalvest.mobile.dev",
      androidPackage: "com.halaalvest.mobile.dev",
      iconBackgroundColor: "#FFF1CC",
      splashBackgroundColor: "#F3F6F5",
      splashDarkBackgroundColor: "#0E0F0F",
      icons: {
        app: "./assets/icons/dev-app-icon.png",
        adaptive: "./assets/icons/dev-adaptive-icon.png",
        iosDark: "./assets/icons/dev-ios-dark.png",
        iosLight: "./assets/icons/dev-ios-light.png",
        splashLight: "./assets/icons/dev-splash-logo.png",
        splashDark: "./assets/icons/dev-splash-logo.png",
      },
    }
  : isPreviewBuild
    ? {
        name: "HalaalVest Preview",
        scheme: "halaalvest-preview",
        iosBundleIdentifier: "com.halaalvest.mobile.preview",
        androidPackage: "com.halaalvest.mobile.preview",
        iconBackgroundColor: "#EAF2FF",
        splashBackgroundColor: "#F3F6F5",
        splashDarkBackgroundColor: "#0E0F0F",
        icons: {
          app: "./assets/icons/preview-app-icon.png",
          adaptive: "./assets/icons/preview-adaptive-icon.png",
          iosDark: "./assets/icons/preview-ios-dark.png",
          iosLight: "./assets/icons/preview-ios-light.png",
          splashLight: "./assets/icons/splash-logo.png",
          splashDark: "./assets/icons/splash-logo.png",
        },
      }
    : {
        name: "HalaalVest",
        scheme: "halaalvest",
        iosBundleIdentifier:
          iosReleaseIdentity.status === "approved"
            ? approvedIosReleaseIdentity().bundleIdentifier
            : undefined,
        androidPackage: "com.halaalvest.mobile",
        iconBackgroundColor: "#F7FAF7",
        splashBackgroundColor: "#F3F6F5",
        splashDarkBackgroundColor: "#0E0F0F",
        icons: {
          app: "./assets/icons/app-icon.png",
          adaptive: "./assets/icons/adaptive-icon.png",
          iosDark: "./assets/icons/ios-dark.png",
          iosLight: "./assets/icons/ios-light.png",
          splashLight: "./assets/icons/splash-logo.png",
          splashDark: "./assets/icons/splash-logo.png",
        },
      }

// Shared assistant links (`assistantHrefs`) open the app when it is
// installed (ADR-20261116-assistant-app-links). Only these paths are claimed;
// the dashboard's apple-app-site-association and assetlinks.json list the same
// prefixes. Production always claims app.halaalvest.com. A preview build claims
// its own https dashboard host (the origin its Share link uses). Development
// claims none: local hosts can't be verified by Apple or Google, the dev
// client uses the halaalvest-dev:// scheme, and a new entitlement would mean
// re-prebuilding apps/mobile/ios.
const APP_LINK_PATH_PREFIXES = ["/assistant/m/", "/assistant/review/"] as const
const PRODUCTION_APP_LINK_HOST = "app.halaalvest.com"

function previewAppLinkHost(dashboardUrl: string | undefined) {
  try {
    const url = new URL(dashboardUrl?.trim() ?? "")
    const host = url.hostname.toLowerCase().replace(/\.$/, "")
    if (url.protocol !== "https:" || url.port) return null
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      !host.includes(".")
    )
      return null
    return host === PRODUCTION_APP_LINK_HOST ? null : host
  } catch {
    return null
  }
}

const appLinkHost = isDevelopmentBuild
  ? null
  : isPreviewBuild
    ? previewAppLinkHost(process.env.EXPO_PUBLIC_DASHBOARD_URL)
    : PRODUCTION_APP_LINK_HOST

const appLinkIntentFilters: NonNullable<
  ExpoConfig["android"]
>["intentFilters"] = appLinkHost
  ? [
      {
        action: "VIEW",
        autoVerify: true,
        category: ["BROWSABLE", "DEFAULT"],
        data: APP_LINK_PATH_PREFIXES.map((pathPrefix) => ({
          scheme: "https",
          host: appLinkHost,
          pathPrefix,
        })),
      },
    ]
  : undefined

const config: ExpoConfig = {
  name: variantConfig.name,
  slug: "halaalvest",
  ...(EXPO_OWNER ? { owner: EXPO_OWNER } : {}),
  version: appVersion,
  orientation: "portrait",
  icon: variantConfig.icons.app,
  scheme: variantConfig.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: variantConfig.iosBundleIdentifier,
    ...(appLinkHost ? { associatedDomains: [`applinks:${appLinkHost}`] } : {}),
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyCollectedDataTypes: appOwnedCollectedDataTypes.map(
        (dataType) => ({
          NSPrivacyCollectedDataType: dataType,
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            "NSPrivacyCollectedDataTypePurposeAppFunctionality",
          ],
        })
      ),
    },
    icon: {
      dark: variantConfig.icons.iosDark,
      light: variantConfig.icons.iosLight,
    },
  },
  android: {
    // Reports use the app-private cache and the OS share sheet; no flow reads
    // the device's shared media or legacy external storage.
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      // The development client can use React Native's debug overlay. The
      // distributed app never draws over other apps.
      ...(!isDevelopmentBuild
        ? ["android.permission.SYSTEM_ALERT_WINDOW"]
        : []),
    ],
    adaptiveIcon: {
      backgroundColor: variantConfig.iconBackgroundColor,
      foregroundImage: variantConfig.icons.adaptive,
    },
    package: variantConfig.androidPackage,
    ...(appLinkIntentFilters ? { intentFilters: appLinkIntentFilters } : {}),
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/icons/favicon.png",
    output: "single",
  },
  plugins: [
    "./plugins/with-app-update.cjs",
    "./plugins/with-fully-drawn-marker.cjs",
    "./plugins/with-launch-screen-refresh.cjs",
    ...sentryPlugins,
    "expo-router",
    "./plugins/with-ios-pod-deployment-target",
    "expo-font",
    "expo-web-browser",
    [
      "expo-notifications",
      {
        color: NOTIFICATION_ACCENT_COLOR,
        defaultChannel: "updates",
      },
    ],
    [
      "expo-local-authentication",
      {
        faceIDPermission:
          "Allow HalaalVest to use Face ID to unlock this phone.",
      },
    ],
    [
      "expo-navigation-bar",
      {
        enforceContrast: false,
      },
    ],
    [
      // T11 receipt proof upload (added in T03's single dev-client rebuild).
      "expo-image-picker",
      {
        cameraPermission:
          "HalaalVest uses the camera so you can photograph proof for a receipt.",
        microphonePermission: false,
        photosPermission:
          "HalaalVest uses your photos so you can attach proof to a receipt.",
      },
    ],
    "expo-document-picker",
    [
      "expo-splash-screen",
      {
        backgroundColor: variantConfig.splashBackgroundColor,
        dark: {
          backgroundColor: variantConfig.splashDarkBackgroundColor,
          image: variantConfig.icons.splashDark,
        },
        image: variantConfig.icons.splashLight,
        // The splash logo is already a rounded tile. At 64pt it matches the JS
        // splash tile (bootstrap-screen.tsx), so the hand-off has no logo jump
        // (T03). The background is the app canvas in every variant; the icons
        // still tell dev, preview and production apart.
        imageWidth: 64,
        resizeMode: "contain",
      },
    ],
  ],
  experiments: {
    autolinkingModuleResolution: true,
    reactCompiler: true,
    typedRoutes: true,
  },
  extra: {
    appVariant: normalizedAppVariant,
    qaAcceleratorClient: isDevelopmentBuild || isPreviewBuild,
    autoUpdateOnForeground,
    autoUpdateForegroundCooldownMs: Number.isFinite(
      autoUpdateForegroundCooldownMs
    )
      ? autoUpdateForegroundCooldownMs
      : 5 * 60 * 1000,
    updateVersion: UPDATE_VERSION,
    ...(EXPO_OWNER
      ? {
          owner: EXPO_OWNER,
        }
      : {}),
    ...(PROJECT_ID
      ? {
          eas: {
            projectId: PROJECT_ID,
          },
          updates: {
            url: updateUrl,
            checkAutomatically: "NEVER",
          },
        }
      : {}),
    router: {},
  },
  // Keep this explicit so the same update contract works in generated native
  // development clients as well as EAS managed builds.
  // Match GND/EwaTrade: OTA updates only reach compatible native builds.
  runtimeVersion: { policy: "fingerprint" },
  updates: {
    ...(updateUrl ? { url: updateUrl } : {}),
    checkAutomatically: "NEVER",
  },
}

export default config
