import type { ExpoConfig } from "expo/config"

export const UPDATE_VERSION = "2026.07.02"
const PROJECT_ID =
  process.env.HALAALVEST_EXPO_PROJECT_ID ??
  process.env.EXPO_PROJECT_ID ??
  process.env.EAS_PROJECT_ID ??
  ""
const EXPO_OWNER =
  process.env.HALAALVEST_EXPO_OWNER ?? process.env.EXPO_OWNER ?? undefined
const updateUrl = PROJECT_ID ? `https://u.expo.dev/${PROJECT_ID}` : undefined

const appVariant =
  process.env.APP_VARIANT ??
  process.env.EXPO_PUBLIC_APP_VARIANT ??
  (process.env.EAS_BUILD_PROFILE === "development" ? "development" : undefined)

const normalizedAppVariant = (appVariant ?? "production").toLowerCase()
const isDevelopmentBuild =
  normalizedAppVariant === "development" || normalizedAppVariant === "dev"
const autoUpdateOnForeground =
  process.env.EXPO_PUBLIC_AUTO_UPDATE_ON_FOREGROUND !== "false"
const autoUpdateForegroundCooldownMs = Number(
  process.env.EXPO_PUBLIC_AUTO_UPDATE_FOREGROUND_COOLDOWN_MS ?? 5 * 60 * 1000
)

const variantConfig = isDevelopmentBuild
  ? {
      name: "Halaalvest Dev",
      scheme: "halaalvest-dev",
      iosBundleIdentifier: "com.halaalvest.mobile.dev",
      androidPackage: "com.halaalvest.mobile.dev",
      iconBackgroundColor: "#FFF2C7",
      splashBackgroundColor: "#FFF2C7",
      splashDarkBackgroundColor: "#2A240E",
      icons: {
        app: "./assets/icons/dev-app-icon.png",
        adaptive: "./assets/icons/dev-adaptive-icon.png",
        iosDark: "./assets/icons/dev-ios-dark.png",
        iosLight: "./assets/icons/dev-ios-light.png",
        splashLight: "./assets/icons/dev-splash-logo.png",
        splashDark: "./assets/icons/dev-splash-logo.png",
      },
    }
  : {
      name: "Halaalvest",
      scheme: "halaalvest",
      iosBundleIdentifier: "com.halaalvest.mobile",
      androidPackage: "com.halaalvest.mobile",
      iconBackgroundColor: "#F7FAF7",
      splashBackgroundColor: "#F7FAF7",
      splashDarkBackgroundColor: "#071B2C",
      icons: {
        app: "./assets/icons/app-icon.png",
        adaptive: "./assets/icons/adaptive-icon.png",
        iosDark: "./assets/icons/ios-dark.png",
        iosLight: "./assets/icons/ios-light.png",
        splashLight: "./assets/icons/splash-logo.png",
        splashDark: "./assets/icons/splash-logo.png",
      },
    }

const config: ExpoConfig = {
  name: variantConfig.name,
  slug: "halaalvest",
  ...(EXPO_OWNER ? { owner: EXPO_OWNER } : {}),
  version: "0.1.0",
  orientation: "portrait",
  icon: variantConfig.icons.app,
  scheme: variantConfig.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: variantConfig.iosBundleIdentifier,
    icon: {
      dark: variantConfig.icons.iosDark,
      light: variantConfig.icons.iosLight,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: variantConfig.iconBackgroundColor,
      foregroundImage: variantConfig.icons.adaptive,
    },
    package: variantConfig.androidPackage,
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/icons/favicon.png",
    output: "single",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-navigation-bar",
      {
        enforceContrast: false,
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: variantConfig.splashBackgroundColor,
        dark: {
          backgroundColor: variantConfig.splashDarkBackgroundColor,
          image: variantConfig.icons.splashDark,
        },
        image: variantConfig.icons.splashLight,
        imageWidth: 200,
        resizeMode: "contain",
      },
    ],
  ],
  experiments: {
    reactCompiler: true,
    typedRoutes: true,
  },
  extra: {
    appVariant: normalizedAppVariant,
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
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    ...(updateUrl ? { url: updateUrl } : {}),
    checkAutomatically: "NEVER",
  },
}

export default config
