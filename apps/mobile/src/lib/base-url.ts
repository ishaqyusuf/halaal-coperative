import Constants from "expo-constants";

const DEFAULT_DASHBOARD_PORT = "3000";
const DEFAULT_API_PORT = "1442";

const stripTrailingSlash = (value: string) => value.replace(/\/$/, "");

const getDebuggerHostname = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  return debuggerHost?.split(":")[0] ?? null;
};

const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const resolveReachableLocalUrl = (value: string) => {
  const trimmed = stripTrailingSlash(value);
  const debuggerHostname = getDebuggerHostname();
  if (!debuggerHostname) return trimmed;

  try {
    const url = new URL(trimmed);
    if (!localHostnames.has(url.hostname)) return trimmed;

    url.hostname = debuggerHostname;
    return stripTrailingSlash(url.toString());
  } catch {
    return trimmed;
  }
};

export const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return resolveReachableLocalUrl(process.env.EXPO_PUBLIC_API_URL);
  }

  const localhost = getDebuggerHostname();

  if (!localhost) {
    // return "https://turbo.t3.gg";
    throw new Error(
      "Failed to get localhost. Please point to your production server.",
    );
  }

  return `http://${localhost}:${DEFAULT_API_PORT}`;
};
export const getWebUrl = () => {
  if (process.env.EXPO_PUBLIC_DASHBOARD_URL) {
    return resolveReachableLocalUrl(process.env.EXPO_PUBLIC_DASHBOARD_URL);
  }

  if (
    process.env.EXPO_PUBLIC_APP_VARIANT === "preview" &&
    process.env.EXPO_PUBLIC_API_URL
  ) {
    return stripTrailingSlash(process.env.EXPO_PUBLIC_API_URL);
  }

  const localhost = getDebuggerHostname();

  if (!localhost) {
    // return "https://turbo.t3.gg";
    throw new Error(
      "Failed to get localhost. Please point to your production server.",
    );
  }

  return `http://${localhost}:${DEFAULT_DASHBOARD_PORT}`;
};
