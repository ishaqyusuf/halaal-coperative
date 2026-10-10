export function storeManagementLinkOptions(
  platform: string,
  androidPackage: string | undefined
) {
  if (platform !== "android") return {}
  if (!androidPackage?.trim())
    throw new Error("Android package is unavailable for store management")
  return { packageNameAndroid: androidPackage }
}
