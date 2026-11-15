const { withMainActivity } = require("expo/config-plugins")

// Android "fully drawn": report it once, when React Native first shows
// content (CONTENT_APPEARED). Cold-start timing reads this marker. It used to
// be a hand edit to the generated, git-ignored MainActivity.kt, so every
// prebuild lost it; this plugin draws it into every variant's MainActivity.
const tag = "with-fully-drawn-marker"
const imports = [
  "import com.facebook.react.bridge.ReactMarker",
  "import com.facebook.react.bridge.ReactMarkerConstants",
]
const members = `  // @generated begin ${tag}
  private val fullyDrawnMarker = ReactMarker.MarkerListener { name, _, _ ->
    if (name == ReactMarkerConstants.CONTENT_APPEARED) {
      unregisterFullyDrawnMarker()
      runOnUiThread { reportFullyDrawn() }
    }
  }

  private fun unregisterFullyDrawnMarker() {
    ReactMarker.removeListener(fullyDrawnMarker)
  }

  override fun onDestroy() {
    unregisterFullyDrawnMarker()
    super.onDestroy()
  }
  // @generated end ${tag}
`
const register = `    ReactMarker.addListener(fullyDrawnMarker) // @generated ${tag}`

function addFullyDrawnMarker(source) {
  if (source.includes(`@generated begin ${tag}`)) return source

  const packageLine = source.match(/^package [\w.]+\s*$/m)
  const classLine = source.match(
    /^class MainActivity\s*:\s*ReactActivity\(\)\s*\{\s*$/m
  )
  const superOnCreate = source.match(/^(\s*)super\.onCreate\([^)]*\)\s*$/m)
  if (!packageLine || !classLine || !superOnCreate) {
    throw new Error(
      `${tag}: MainActivity.kt has an unexpected shape; update the plugin.`
    )
  }
  if (/override fun onDestroy\(/.test(source)) {
    throw new Error(`${tag}: MainActivity.kt already overrides onDestroy.`)
  }

  let next = source
  const missingImports = imports.filter((line) => !next.includes(line))
  if (missingImports.length) {
    next = next.replace(
      packageLine[0],
      `${packageLine[0]}\n${missingImports.join("\n")}`
    )
  }
  next = next.replace(superOnCreate[0], `${superOnCreate[0]}\n${register}`)
  const classMatch = next.match(
    /^class MainActivity\s*:\s*ReactActivity\(\)\s*\{\s*$/m
  )
  return next.replace(classMatch[0], `${classMatch[0]}\n${members}`)
}

module.exports = (config) =>
  withMainActivity(config, (result) => {
    if (result.modResults.language !== "kt") {
      throw new Error(`${tag}: only a Kotlin MainActivity is supported.`)
    }
    result.modResults.contents = addFullyDrawnMarker(result.modResults.contents)
    return result
  })

module.exports.addFullyDrawnMarker = addFullyDrawnMarker
