const fs = require("node:fs/promises")
const path = require("node:path")
const plist = require("@expo/plist").default
const {
  IOSConfig,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins")

const targetName = "ReceiptShareExtension"
const appGroups = "com.apple.security.application-groups"
const supportedTypes = ["com.adobe.pdf", "public.jpeg", "public.png"]
const activationRule = [
  "SUBQUERY(extensionItems, $item,",
  "SUBQUERY($item.attachments, $attachment,",
  supportedTypes
    .map((type) => `ANY $attachment.registeredTypeIdentifiers UTI-CONFORMS-TO "${type}"`)
    .join(" OR "),
  ").@count == 1).@count == 1",
].join(" ")

function addShareTarget(project, bundleIdentifier) {
  const existingId =
    project.findTargetKey(`"${targetName}"`) ?? project.findTargetKey(targetName)
  const target = existingId
    ? {
        uuid: existingId,
        pbxNativeTarget: project.pbxNativeTargetSection()[existingId],
      }
    : project.addTarget(targetName, "app_extension", targetName, bundleIdentifier)
  const { uuid, pbxNativeTarget } = target
  if (!project.pbxGroupByName(targetName)) {
    const mainGroup = project.getFirstProject().firstProject.mainGroup
    const group = project.addPbxGroup([], targetName, targetName)
    project.addToPbxGroup(group.uuid, mainGroup)
  }
  if (!project.buildPhase("Sources", uuid)) {
    project.addBuildPhase([], "PBXSourcesBuildPhase", "Sources", uuid)
  }
  if (!project.buildPhase("Resources", uuid)) {
    project.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", uuid)
  }
  IOSConfig.XcodeUtils.addResourceFileToGroup({
    filepath: "PrivacyInfo.xcprivacy",
    groupName: targetName,
    isBuildFile: true,
    project,
    targetUuid: uuid,
  })
  for (const filepath of ["ReceiptShareViewController.swift", "ReceiptShareFile.swift"]) {
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath,
      groupName: targetName,
      project,
      targetUuid: uuid,
    })
  }

  const objects = project.hash.project.objects
  const configs = objects.XCConfigurationList[pbxNativeTarget.buildConfigurationList].buildConfigurations
  for (const { value } of configs) {
    Object.assign(objects.XCBuildConfiguration[value].buildSettings, {
      APPLICATION_EXTENSION_API_ONLY: "YES",
      CODE_SIGN_ENTITLEMENTS: `${targetName}/${targetName}.entitlements`,
      CODE_SIGN_STYLE: "Automatic",
      PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
      SDKROOT: "iphoneos",
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: '"1,2"',
    })
  }
}

module.exports = function withReceiptShare(config) {
  const appId = config.ios?.bundleIdentifier
  if (!appId) return config
  const bundleIdentifier = `${appId}.receipt-share`
  const group = `group.${appId}.receipts`
  const extra = (config.extra ??= {})
  const eas = (extra.eas ??= {})
  const build = (eas.build ??= {})
  const experimental = (build.experimental ??= {})
  const ios = (experimental.ios ??= {})
  const extensions = (ios.appExtensions ??= [])
  if (!extensions.some((extension) => extension.targetName === targetName)) {
    extensions.push({
      targetName,
      bundleIdentifier,
      entitlements: { [appGroups]: [group] },
    })
  }

  config = withEntitlementsPlist(config, (mod) => {
    const groups = mod.modResults[appGroups] ?? []
    mod.modResults[appGroups] = [...new Set([...groups, group])]
    return mod
  })
  config = withInfoPlist(config, (mod) => {
    mod.modResults.ReceiptShareGroup = group
    return mod
  })
  return withXcodeProject(config, async (mod) => {
    addShareTarget(mod.modResults, bundleIdentifier)
    const directory = path.join(mod.modRequest.platformProjectRoot, targetName)
    if (mod.modRequest.introspect) return mod
    await fs.mkdir(directory, { recursive: true })
    await Promise.all([
      fs.copyFile(
        path.join(__dirname, "receipt-share", "ReceiptShareViewController.swift"),
        path.join(directory, "ReceiptShareViewController.swift")
      ),
      fs.copyFile(
        path.join(__dirname, "../modules/receipt-share/ios/ReceiptShareFile.swift"),
        path.join(directory, "ReceiptShareFile.swift")
      ),
      fs.writeFile(
        path.join(directory, "PrivacyInfo.xcprivacy"),
        plist.build({
          NSPrivacyAccessedAPITypes: [
            {
              NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
              NSPrivacyAccessedAPITypeReasons: ["C617.1", "3B52.1"],
            },
          ],
        })
      ),
      fs.writeFile(
        path.join(directory, `${targetName}.entitlements`),
        plist.build({ [appGroups]: [group] })
      ),
      fs.writeFile(
        path.join(directory, `${targetName}-Info.plist`),
        plist.build({
          CFBundleDisplayName: mod.name,
          CFBundleExecutable: "$(EXECUTABLE_NAME)",
          CFBundleIdentifier: "$(PRODUCT_BUNDLE_IDENTIFIER)",
          CFBundleInfoDictionaryVersion: "6.0",
          CFBundleName: "$(PRODUCT_NAME)",
          CFBundlePackageType: "XPC!",
          CFBundleShortVersionString: mod.version,
          CFBundleVersion: IOSConfig.Version.getBuildNumber(mod),
          ReceiptShareGroup: group,
          NSExtension: {
            NSExtensionPointIdentifier: "com.apple.share-services",
            NSExtensionPrincipalClass: "$(PRODUCT_MODULE_NAME).ReceiptShareViewController",
            NSExtensionAttributes: { NSExtensionActivationRule: activationRule },
          },
        })
      ),
    ])
    return mod
  })
}
