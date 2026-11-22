const { createHash } = require("node:crypto")
const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const { withAppDelegate } = require("expo/config-plugins")

// iOS keeps a snapshot of the launch screen (Library/SplashBoard) and shows it
// on every cold start. It does not redraw it when an install over the top
// changes SplashScreen.storyboard but keeps CFBundleVersion (every dev-client
// rebuild, and any build that reuses a build number). After T03 moved the
// launch screen to the app canvas with a 64pt tile, such phones still opened
// on the old cream screen with a large logo before the real splash (owner
// report, 22 Nov 2026). This plugin stamps a revision of the splash config
// into AppDelegate; when it changes, the app drops the stale snapshot once so
// iOS redraws it from the current storyboard on the next launch.
const tag = "with-launch-screen-refresh"
const defaultsKey = "HalaalVestLaunchScreenRevision"

function splashPluginProps(config) {
  const entry = (config.plugins ?? []).find(
    (plugin) =>
      plugin === "expo-splash-screen" ||
      (Array.isArray(plugin) && plugin[0] === "expo-splash-screen")
  )
  return Array.isArray(entry) ? (entry[1] ?? {}) : {}
}

/** Hash of the splash settings and image bytes; changes when the launch screen does. */
function launchScreenRevision(config, projectRoot) {
  const props = splashPluginProps(config)
  const hash = createHash("sha256").update(JSON.stringify(props))
  for (const image of [props.image, props.dark?.image]) {
    if (typeof image !== "string") continue
    const path = resolve(projectRoot, image)
    if (existsSync(path)) hash.update(readFileSync(path))
  }
  return hash.digest("hex").slice(0, 16)
}

function addLaunchScreenRefresh(source, revision) {
  const begin = `// @generated begin ${tag}`
  if (source.includes(begin)) {
    // Prebuild re-runs mods on an existing ios/ tree: refresh the revision.
    return source.replace(
      /refreshLaunchScreenSnapshot\(revision: "[^"]*"\)/,
      `refreshLaunchScreenSnapshot(revision: "${revision}")`
    )
  }

  const didFinish = source.match(
    /^(\s*)let delegate = ReactNativeDelegate\(\)\s*$/m
  )
  if (!didFinish) {
    throw new Error(
      `${tag}: AppDelegate.swift has an unexpected shape; update the plugin.`
    )
  }
  const indent = didFinish[1]
  const call = `${indent}refreshLaunchScreenSnapshot(revision: "${revision}") // @generated ${tag}\n`
  const helper = `
${begin}
/// Drops the cached launch-screen snapshot once per launch-screen revision, so
/// an install over the top never keeps showing an old launch screen.
private func refreshLaunchScreenSnapshot(revision: String) {
  let defaults = UserDefaults.standard
  let key = "${defaultsKey}"
  guard defaults.string(forKey: key) != revision else { return }
  if let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first {
    try? FileManager.default.removeItem(at: library.appendingPathComponent("SplashBoard", isDirectory: true))
  }
  defaults.set(revision, forKey: key)
}
// @generated end ${tag}
`
  return `${source.replace(didFinish[0], `${call}${didFinish[0]}`).trimEnd()}\n${helper}`
}

module.exports = (config) =>
  withAppDelegate(config, (result) => {
    if (result.modResults.language !== "swift") {
      throw new Error(`${tag}: only a Swift AppDelegate is supported.`)
    }
    result.modResults.contents = addLaunchScreenRefresh(
      result.modResults.contents,
      launchScreenRevision(result, result.modRequest.projectRoot)
    )
    return result
  })

module.exports.addLaunchScreenRefresh = addLaunchScreenRefresh
module.exports.launchScreenRevision = launchScreenRevision
