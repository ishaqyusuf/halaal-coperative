import Constants from "expo-constants"

const appVariant = String(
  Constants.expoConfig?.extra?.appVariant ?? ""
).toLowerCase()

/**
 * The native launch image for this build (app.config.ts `expo-splash-screen`),
 * reused by the JS splash so the hand-off shows the same tile at the same
 * size and place (T03). Dev builds use the cream dev tile; preview and
 * production use the brand tile.
 */
export const SPLASH_LOGO =
  appVariant === "development" || appVariant === "dev" || appVariant === "local"
    ? require("../../assets/icons/dev-splash-logo.png")
    : require("../../assets/icons/splash-logo.png")

/** Matches `imageWidth` in app.config.ts. */
export const SPLASH_LOGO_SIZE = 64
