const { getSentryExpoConfig } = require("@sentry/react-native/metro")
const { withNativewind } = require("nativewind/metro")
const { join, sep } = require("node:path")

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname)
// config.resolver.unstable_enablePackageExports = true;

const nativewindConfig = withNativewind(config, {
  input: "./src/styles/global.css",
})
const nativewindResolveRequest = nativewindConfig.resolver.resolveRequest
const nativewindGetTransformOptions =
  nativewindConfig.transformer.getTransformOptions
const reactQueryPackagePath = require.resolve(
  "@tanstack/react-query/package.json",
  { paths: [__dirname] }
)
const singletonPackages = [
  "@expo/vector-icons",
  "@tanstack/query-core",
  "@tanstack/react-query",
  "expo",
  "expo-constants",
  "expo-font",
  "expo-linking",
  "react",
  "react-dom",
  "react-native",
  "react-native-safe-area-context",
  "react-native-worklets",
  "react-native-css",
  "react-native-css-interop",
]
const singletonResolveRoots = {
  // Bun may keep this transitive dependency inside React Query's virtual store
  // instead of linking it at the mobile workspace root. Resolve it from the
  // app's React Query installation so QueryClient and QueryClientProvider
  // cannot load different query-core instances.
  "@tanstack/query-core": [reactQueryPackagePath],
}

function normalizePath(filePath) {
  return filePath.split(sep).join("/")
}

function isNodeModulesOrigin(originModulePath) {
  if (!originModulePath) return false

  return normalizePath(originModulePath).includes("/node_modules/")
}

function isReactNativeOrigin(originModulePath) {
  if (!originModulePath) return false

  return normalizePath(originModulePath).includes("/node_modules/react-native/")
}

function getSingletonPackage(moduleName) {
  return singletonPackages.find(
    (packageName) =>
      moduleName === packageName || moduleName.startsWith(`${packageName}/`)
  )
}

function resolveAppSingleton(moduleName, singletonPackage) {
  return require.resolve(moduleName, {
    paths: singletonResolveRoots[singletonPackage] ?? [__dirname],
  })
}

function resolveAppSingletonWithMetro(context, moduleName, platform) {
  return context.resolveRequest(
    {
      ...context,
      originModulePath: join(__dirname, "package.json"),
    },
    moduleName,
    platform
  )
}

nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  const originModulePath = context.originModulePath
  const singletonPackage = getSingletonPackage(moduleName)
  const shouldUseAppSingleton =
    singletonPackage && isNodeModulesOrigin(originModulePath)

  if (shouldUseAppSingleton) {
    if (!singletonResolveRoots[singletonPackage]) {
      return resolveAppSingletonWithMetro(context, moduleName, platform)
    }

    return {
      type: "sourceFile",
      filePath: resolveAppSingleton(moduleName, singletonPackage),
    }
  }

  if (isReactNativeOrigin(originModulePath)) {
    return context.resolveRequest(context, moduleName, platform)
  }

  return nativewindResolveRequest(context, moduleName, platform)
}

nativewindConfig.transformer.getTransformOptions = async (...args) => {
  const options = nativewindGetTransformOptions
    ? await nativewindGetTransformOptions(...args)
    : { transform: {} }

  return {
    ...options,
    transform: {
      ...options.transform,
      inlineRequires: true,
    },
  }
}

module.exports = nativewindConfig
