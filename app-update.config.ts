import {
  APP_UPDATE_SCOPE,
  MAX_APK_BYTES,
  assertArtifactUrl,
  parseMobileBuild,
} from "./packages/utils/src/app-update"

export default {
  profile: "halaalvest",
  scope: APP_UPDATE_SCOPE,
  maxBytes: MAX_APK_BYTES,
  assertArtifactUrl,
  parseBuild: parseMobileBuild,
}
