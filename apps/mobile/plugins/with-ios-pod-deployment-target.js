const { withPodfile } = require("expo/config-plugins")

const MARKER = "# HalaalVest: keep pod targets at or above the app's iOS minimum."

module.exports = function withIosPodDeploymentTarget(config) {
  return withPodfile(config, (modConfig) => {
    const contents = modConfig.modResults.contents
    if (contents.includes(MARKER)) return modConfig

    const postInstallEnd = contents.lastIndexOf("\n  end\nend")
    if (
      postInstallEnd < 0 ||
      !contents.slice(0, postInstallEnd).includes("post_install do |installer|")
    ) {
      throw new Error("Could not locate the iOS Podfile post_install block.")
    }

    const adjustment = `
    ${MARKER}
    minimum_ios_target = Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '15.1')
    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |build_configuration|
        existing_target = build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        next if existing_target && existing_target.match?(/\\A\\d+(?:\\.\\d+)*\\z/) && Gem::Version.new(existing_target) >= minimum_ios_target

        build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = minimum_ios_target.to_s
      end
    end`

    modConfig.modResults.contents =
      contents.slice(0, postInstallEnd) + adjustment + contents.slice(postInstallEnd)
    return modConfig
  })
}
