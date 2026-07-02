import type { ExpoConfig } from "expo/config";

export const UPDATE_VERSION = "2026.07.02";

const appVariant =
  process.env.APP_VARIANT ??
  process.env.EXPO_PUBLIC_APP_VARIANT ??
  (process.env.EAS_BUILD_PROFILE === "development" ? "development" : undefined);

const normalizedAppVariant = (appVariant ?? "production").toLowerCase();
const isDevelopmentBuild =
  normalizedAppVariant === "development" || normalizedAppVariant === "dev";

const variantConfig = isDevelopmentBuild
  ? {
      name: "Halaalvest Dev",
      scheme: "halaalvest-dev",
      iosBundleIdentifier: "com.halaalvest.mobile.dev",
      androidPackage: "com.halaalvest.mobile.dev",
      iconBackgroundColor: "#E7F6F0",
      splashBackgroundColor: "#E7F6F0",
      splashDarkBackgroundColor: "#0B2B21",
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
      iconBackgroundColor: "#F7F1E6",
      splashBackgroundColor: "#F7F1E6",
      splashDarkBackgroundColor: "#111111",
      icons: {
        app: "./assets/icons/app-icon.png",
        adaptive: "./assets/icons/adaptive-icon.png",
        iosDark: "./assets/icons/ios-dark.png",
        iosLight: "./assets/icons/ios-light.png",
        splashLight: "./assets/icons/splash-logo.png",
        splashDark: "./assets/icons/splash-logo.png",
      },
    };

const config: ExpoConfig = {
  name: variantConfig.name,
  slug: "halaalvest-mobile",
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
    output: "static",
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
    updateVersion: UPDATE_VERSION,
    router: {},
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    checkAutomatically: "NEVER",
  },
};

export default config;
