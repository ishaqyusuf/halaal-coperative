import { readFileSync, readdirSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const MOBILE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE_DIR = join(MOBILE_DIR, "src")
const EXCEPTIONS_FILE = join(
  MOBILE_DIR,
  "qa/mobile-native-style-exceptions.json"
)
const exceptions = JSON.parse(readFileSync(EXCEPTIONS_FILE, "utf8")).exceptions
const exceptionMap = new Map(exceptions.map((entry) => [entry.file, entry]))
const failures = []

const scanFiles = ["app", "components", "features"]
  .flatMap((target) => findFiles(join(SOURCE_DIR, target), [".ts", ".tsx"]))
  .filter((filePath) => !toMobilePath(filePath).endsWith("src/app/+html.tsx"))

validateExceptions()
checkSemanticTheme()
checkSharedPrimitives()
checkStaticIconRegistry()
checkScreenHeaders()
checkSeparatedDataEntrySurfaces()
checkPopupPrimitives()
checkAccessibilityIsolation()

for (const filePath of scanFiles) scanFile(filePath)

if (failures.length > 0) {
  console.error("Mobile NativeWind/UI contract failed:\n")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `Mobile NativeWind/UI contract passed (${exceptions.length} documented native exceptions).`
)

function validateExceptions() {
  for (const exception of exceptions) {
    if (
      !exception.file ||
      !exception.reason?.trim() ||
      !exception.allow?.length
    ) {
      failures.push(
        "every native style exception needs file, allow, and reason"
      )
      continue
    }
    if (!readable(join(MOBILE_DIR, exception.file))) {
      failures.push(
        `native style exception references missing file: ${exception.file}`
      )
    }
  }
}

function checkSemanticTheme() {
  const theme = readFileSync(join(SOURCE_DIR, "lib/theme.ts"), "utf8")
  const css = readFileSync(join(SOURCE_DIR, "styles/global.css"), "utf8")
  const tokens = [
    "background",
    "foreground",
    "card",
    "primary",
    "brand",
    "success",
    "warn",
    "muted",
    "overlay",
    "accent",
    "destructive",
    "border",
    "ring",
  ]

  for (const token of tokens) {
    if (!theme.includes(`${token}:`))
      failures.push(`theme.ts is missing ${token}`)
    if (!css.includes(`--${token}:`))
      failures.push(`global.css is missing --${token}`)
  }
  if (!css.includes("prefers-color-scheme: dark")) {
    failures.push("global.css is missing the dark-mode semantic token layer")
  }
}

function checkSharedPrimitives() {
  const required = [
    "src/components/app/empty-state.tsx",
    "src/components/app/bottom-sheet-backdrop.tsx",
    "src/components/app/form-state-banner.tsx",
    "src/components/app/compact-form-sheet.tsx",
    "src/components/app/confirmation-sheet.tsx",
    "src/components/app/full-screen-form-sheet.tsx",
    "src/components/app/keyboard-aware-scroll-view.tsx",
    "src/components/app/screen-header.tsx",
    "src/components/app/section-card.tsx",
    "src/components/app/status-badge.tsx",
    "src/components/app/submission-review-sheet.tsx",
    "src/components/app/virtualized-card-list.tsx",
    "src/components/ui/button.tsx",
    "src/components/ui/input.tsx",
    "src/components/ui/text.tsx",
  ]
  for (const file of required) {
    if (!readable(join(MOBILE_DIR, file)))
      failures.push(`shared UI primitive is missing: ${file}`)
  }

  const inputSource = readFileSync(join(MOBILE_DIR, "src/components/ui/input.tsx"), "utf8")
  if (!inputSource.includes('props.textAlignVertical ?? (props.multiline ? "top" : "center")') ||
    !inputSource.includes("paddingVertical: props.multiline ? 12 : 0")) {
    failures.push("Shared Input must respect explicit vertical alignment and give multiline text a padded top-aligned default.")
  }
}

function checkStaticIconRegistry() {
  const iconFile = "src/components/ui/icon.tsx"
  const iconSource = readFileSync(join(MOBILE_DIR, iconFile), "utf8")
  const registryStart = iconSource.indexOf("const iconRegistry")
  const registryEnd = iconSource.indexOf(
    "\n}\n\nconst iconSizes",
    registryStart
  )

  if (registryStart === -1 || registryEnd === -1) {
    failures.push(`${iconFile} must expose a statically auditable iconRegistry`)
    return
  }

  const registrySource = iconSource.slice(registryStart, registryEnd)
  const registeredNames = new Set(
    [...registrySource.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*):/gm)].map(
      (match) => match[1]
    )
  )

  for (const filePath of scanFiles) {
    const file = toMobilePath(filePath)
    const source = readFileSync(filePath, "utf8")

    for (let index = source.indexOf("<Icon"); index !== -1; ) {
      const tagEnd = readTagNameEnd(source, index + 1)
      const tag = source.slice(index + 1, tagEnd)
      const openingEnd = readOpeningTagEnd(source, tagEnd)
      if (openingEnd === -1) break

      if (tag === "Icon") {
        const opening = source.slice(tagEnd, openingEnd)
        const staticName = opening.match(
          /\bname\s*=\s*["']([A-Za-z][A-Za-z0-9]*)["']/
        )?.[1]
        if (staticName && !registeredNames.has(staticName)) {
          const line = source.slice(0, index).split("\n").length
          failures.push(
            `${file}:${line} uses unregistered Icon name "${staticName}"`
          )
        }
      }

      index = source.indexOf("<Icon", openingEnd + 1)
    }
  }
}

function checkPopupPrimitives() {
  for (const filePath of scanFiles) {
    const file = toMobilePath(filePath)
    const source = readFileSync(filePath, "utf8")

    if (/\bAlert\.alert\s*\(/.test(source)) {
      failures.push(
        `${file} uses a native alert; use ConfirmationSheet or FloatingBottomSheet`
      )
    }

    const importsNativeModal =
      /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*["']react-native["']/.test(
        source
      )
    if (importsNativeModal && /<Modal\b/.test(source)) {
      failures.push(
        `${file} uses a native modal; popup content must use FloatingBottomSheet`
      )
    }
  }

  checkSourceMarkers("src/components/floating-bottom-sheet.tsx", [
    "AppBottomSheetBackdrop",
    "footer?: ReactNode",
    "header?: ReactNode",
    "measuredFooterHeight",
    "measuredHeaderHeight",
    "measuredSheetContentHeight",
    "onDismissedRef.current = onDismissed",
    "sheetClipHeight",
    "style={[styles.sheet, sheetClipStyle]}",
    'justifyContent: "flex-end"',
    "style={[styles.scrollViewport, { flex: 1 }]}",
    "measuredSheetContentHeight + handleHeight >",
    "scrollBodyMaxHeight",
    "maxHeight: footer",
    "? scrollBodyMaxHeight",
    "BottomSheetFooter",
    "footerComponent={",
    "footer && (!keyboardExpandable || !isKeyboardVisible)",
    "reservedFooterHeight",
    'scrollEnabled={scrollable === "auto" || shouldEnableScroll}',
    "contentContainerStyle={contentContainerStyle}",
    'keyboardBehavior={keyboardExpandable ? "extend" : "interactive"}',
    'android_keyboardInputMode="adjustResize"',
    "BackHandler.addEventListener",
    '"hardwareBackPress"',
    "APP_BOTTOM_SHEET_ELEVATION",
  ])
  checkSourceMarkers("src/components/app/bottom-sheet-backdrop.tsx", [
    "colors.overlay",
    "appearsOnIndex={0}",
    "disappearsOnIndex={-1}",
    "opacity={1}",
    "APP_BOTTOM_SHEET_BACKDROP_ELEVATION",
    'pressBehavior={dismissible ? "close" : "none"}',
  ])
  checkSourceMarkers("src/components/ui/modal.tsx", ["AppBottomSheetBackdrop"])
  checkForbiddenSourceMarkers("src/components/floating-bottom-sheet.tsx", [
    "scrollToEnd(",
  ])
  checkSourceMarkers("src/components/app/compact-form-sheet.tsx", [
    "header={",
    "keyboardExpandable",
    "accessibilityLabel={`Close ${title}`}",
  ])
  checkSourceMarkers("src/components/app/full-screen-form-sheet.tsx", [
    "FULL_SCREEN_FORM_PORTAL_HOST",
    "<Portal",
    "footer?: ReactNode",
    "registerVisibleForm",
    "KeyboardStickyView",
    "<KeyboardStickyView",
    "footerHeight + 144",
    "setFooterHeight(event.nativeEvent.layout.height)",
    '<View className="gap-5 px-5 pb-8 pt-5">',
    'position: "absolute"',
  ])
  checkSourceMarkers("src/components/app/dev-quick-fill.tsx", [
    'position: "absolute"',
    'placement === "footer"',
  ])
  checkForbiddenSourceMarkers("src/components/app/full-screen-form-sheet.tsx", [
    "KEYBOARD_ACCESSORY_CLEARANCE",
    "keyboardBottomInset",
    "paddingHorizontal: 16",
    "Keyboard.metrics()?.height",
    'Keyboard.addListener("keyboardDidShow"',
  ])
  checkSourceMarkers("src/components/app/full-screen-form-visibility.tsx", [
    "visibleFormCount > 0",
    "registerVisibleForm",
  ])
  for (const tabsLayout of [
    "src/app/(admin)/(tabs)/_layout.tsx",
    "src/app/(member)/(tabs)/_layout.tsx",
  ]) {
    checkSourceMarkers(tabsLayout, [
      "useFullScreenFormVisibility",
      'display: hideTabBar ? "none" : "flex"',
    ])
  }
  checkSourceMarkers("src/components/app/confirmation-sheet.tsx", [
    'scrollable="auto"',
    "{actions}",
    'largeTextLayout ? "items-stretch" : "flex-row"',
  ])
  for (const popup of [
    "src/components/app/submission-review-sheet.tsx",
    "src/components/app/submission-success-sheet.tsx",
  ]) {
    checkSourceMarkers(popup, ["footer={"])
  }
}

function checkAccessibilityIsolation() {
  checkSourceMarkers("src/components/ui/button.tsx", [
    "resolvedAccessibilityState",
    'role={role ?? "button"}',
    "accessibilityState={resolvedAccessibilityState}",
  ])
  checkSourceMarkers("src/components/ui/pressable.tsx", [
    "resolvedAccessibilityRole",
    "resolvedAccessibilityState",
    "accessibilityRole={resolvedAccessibilityRole}",
    "accessibilityState={resolvedAccessibilityState}",
  ])
  checkSourceMarkers("src/components/app/modal-accessibility-isolation.tsx", [
    "floatingSheetCount > 0",
    "registerFloatingSheet",
    "aria-hidden={hidden}",
    "accessibilityElementsHidden={hidden}",
    "collapsable={false}",
    'importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}',
    'testID={hidden ? "app-background-hidden" : "app-background-visible"}',
  ])
  checkSourceMarkers("src/components/floating-bottom-sheet.tsx", [
    "registerFloatingSheet",
    "releaseAccessibilityIsolation",
    "accessibilityFallbackTimerRef",
  ])
  checkSourceMarkers("src/components/app/full-screen-form-sheet-layer.tsx", [
    "floatingSheetVisible",
    "aria-hidden={floatingSheetVisible}",
    "accessibilityElementsHidden={floatingSheetVisible}",
    "collapsable={false}",
    'floatingSheetVisible ? "no-hide-descendants" : "auto"',
  ])
  checkSourceMarkers("src/app/_layout.tsx", [
    "ModalAccessibilityProvider",
    "AppAccessibilityBackground",
    "<FullScreenFormSheetLayer />",
  ])
}

function checkSeparatedDataEntrySurfaces() {
  checkSourceMarkers("src/features/procurement/screens/member-procurement-screen.tsx", [
    "overlayActive={isReviewingSubmit}",
    '"bg-muted opacity-100 active:bg-muted"',
  ])
  const screens = [
    "src/features/financing/screens/member-financing-screen.tsx",
    "src/features/food-purchase/screens/member-food-purchase-screen.tsx",
    "src/features/guarantors/screens/member-guarantor-approvals-screen.tsx",
    "src/features/procurement/screens/member-procurement-screen.tsx",
    "src/features/project-financing/screens/member-project-financing-screen.tsx",
    "src/features/receipts/screens/member-receipts-screen.tsx",
    "src/features/shares-profit/screens/member-shares-screen.tsx",
    "src/features/support/screens/member-support-screen.tsx",
    "src/features/admin-member-lifecycle/screens/admin-members-screen.tsx",
    "src/features/admin-member-lifecycle/screens/admin-member-detail-screen.tsx",
  ]

  for (const screen of screens) {
    const source = readFileSync(join(MOBILE_DIR, screen), "utf8")
    if (source.includes("<AppKeyboardAwareScrollView")) {
      failures.push(
        `${screen} must keep its browsable content on a normal ScrollView and keyboard handling inside form sheets`
      )
    }
    if (
      !source.includes("<FullScreenFormSheet") &&
      !source.includes("<CompactFormSheet")
    ) {
      failures.push(
        `${screen} must move data entry into an approved form sheet`
      )
    }

    const contentSurface = readFirstJsxBlock(source, "ScrollView")
    if (!contentSurface) {
      failures.push(`${screen} is missing its read-focused ScrollView`)
      continue
    }
    let readOnlySurface = ["FullScreenFormSheet", "CompactFormSheet"].reduce(
      (current, tag) => removeJsxBlocks(current, tag),
      contentSurface
    )
    if (
      screen ===
      "src/features/admin-member-lifecycle/screens/admin-members-screen.tsx"
    ) {
      readOnlySurface = readOnlySurface.replace(
        /<Input\b[\s\S]*?accessibilityLabel="Search members"[\s\S]*?\/>/g,
        ""
      )
    }
    if (/<(?:Input|Textarea)\b/.test(readOnlySurface)) {
      failures.push(
        `${screen} renders data-entry controls inline with browsable content`
      )
    }
  }
}

function readFirstJsxBlock(source, tag) {
  const openingStart = source.indexOf(`<${tag}`)
  if (openingStart === -1) return null
  const openingEnd = readOpeningTagEnd(source, openingStart + tag.length + 1)
  if (openingEnd === -1) return null
  const closing = `</${tag}>`
  const closingStart = source.indexOf(closing, openingEnd)
  if (closingStart === -1) return null
  return source.slice(openingEnd + 1, closingStart)
}

function removeJsxBlocks(source, tag) {
  let result = source
  let openingStart = result.indexOf(`<${tag}`)

  while (openingStart !== -1) {
    const openingEnd = readOpeningTagEnd(result, openingStart + tag.length + 1)
    if (openingEnd === -1) break
    const closing = `</${tag}>`
    const closingStart = result.indexOf(closing, openingEnd)
    if (closingStart === -1) break
    result = `${result.slice(0, openingStart)}${result.slice(
      closingStart + closing.length
    )}`
    openingStart = result.indexOf(`<${tag}`)
  }

  return result
}

function checkScreenHeaders() {
  const screens = [
    "src/features/admin-reports-access/screens/admin-reports-screen.tsx",
    "src/features/financing/screens/member-financing-screen.tsx",
    "src/features/food-purchase/screens/member-food-purchase-screen.tsx",
    "src/features/guarantors/screens/member-guarantor-approvals-screen.tsx",
    "src/features/settings-access/screens/more-screen.tsx",
    "src/features/notifications/screens/notifications-screen.tsx",
    "src/features/procurement/screens/member-procurement-screen.tsx",
    "src/features/project-financing/screens/member-project-financing-screen.tsx",
    "src/features/receipts/screens/member-receipts-screen.tsx",
    "src/features/subscription/routes/store-subscription-route-controller.tsx",
    "src/features/support/screens/member-support-screen.tsx",
    "src/features/updates/screens/updates-screen.tsx",
    "src/features/member-core/screens/member-commitments-screen.tsx",
    "src/features/member-core/screens/member-home-screen.tsx",
    "src/features/member-core/screens/member-statement-screen.tsx",
    "src/features/shares-profit/screens/member-shares-screen.tsx",
    "src/features/admin-member-lifecycle/screens/admin-overview-screen.tsx",
    "src/features/admin-member-lifecycle/screens/admin-members-screen.tsx",
    "src/features/admin-member-lifecycle/screens/admin-member-detail-screen.tsx",
  ]

  checkSourceMarkers(
    "src/features/admin-finance-support/components/admin-finance-work-queue.tsx",
    ["<ScreenHeader"]
  )

  for (const screen of screens) {
    const source = readFileSync(join(MOBILE_DIR, screen), "utf8")
    if (
      !source.includes("<ScreenHeader") &&
      !source.includes("<ProfileHeader")
    ) {
      failures.push(`${screen} must compose ScreenHeader or ProfileHeader`)
    }
  }
}

function scanFile(filePath) {
  const file = toMobilePath(filePath)
  const source = readFileSync(filePath, "utf8")
  const exception = exceptionMap.get(file)

  if (
    source.includes("StyleSheet.create(") &&
    !allows(exception, "native-style-sheet")
  ) {
    failures.push(
      `${file} uses StyleSheet.create; use NativeWind className or document a native API exception`
    )
  }

  const lines = source.split("\n")
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("//")) return

    if (/#[0-9A-Fa-f]{3,8}/.test(line)) {
      failures.push(
        `${file}:${index + 1} uses a raw hex color; use a semantic theme token`
      )
    }
    if (/\b(?:bg|border|text)-(?:black|white)(?:\b|\/)/.test(line)) {
      failures.push(
        `${file}:${index + 1} uses a fixed black/white class; use a semantic token`
      )
    }
    if (
      /\b(?:bg|border|shadow|text)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+/.test(
        line
      )
    ) {
      failures.push(
        `${file}:${index + 1} uses a palette-specific class; use a semantic token`
      )
    }
    if (
      /\b(?:backgroundColor|borderColor|color|shadowColor)\s*:\s*["'`]/.test(
        line
      ) &&
      trimmed !== 'color: "default",' &&
      !allows(exception, "native-color-style")
    ) {
      failures.push(`${file}:${index + 1} uses a fixed inline color string`)
    }
    if (/\b(?:color|placeholderTextColor)\s*=\s*["'`]/.test(line)) {
      failures.push(`${file}:${index + 1} uses a fixed JSX color prop`)
    }
  })

  scanOpeningTags(source, file, exception)
}

function scanOpeningTags(source, file, exception) {
  const importsNativePressable =
    /import\s*\{[^}]*\bPressable\b[^}]*\}\s*from\s*["']react-native["']/.test(
      source
    )

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "<" || /[/>!]/.test(source[index + 1] ?? "")) continue

    const tagStart = index + 1
    const tagEnd = readTagNameEnd(source, tagStart)
    if (tagEnd === tagStart) continue
    const tag = source.slice(tagStart, tagEnd)
    const openingEnd = readOpeningTagEnd(source, tagEnd)
    if (openingEnd === -1) continue
    const opening = source.slice(tagEnd, openingEnd)
    const hasStyle = /(^|[\s{])style\s*=/.test(opening)
    const hasClassName = /(^|[\s{])className\s*=/.test(opening)

    if (
      importsNativePressable &&
      tag === "Pressable" &&
      /\bonPress\s*=/.test(opening) &&
      !/\b(?:accessibilityRole|role)\s*=/.test(opening) &&
      !/\baccessible\s*=\s*{false}/.test(opening)
    ) {
      const line = source.slice(0, index).split("\n").length
      failures.push(
        `${file}:${line} native Pressable with onPress needs an explicit accessibilityRole, or accessible={false} when another control owns semantics`
      )
    }

    if (hasStyle && !hasClassName && isNativeVisualTag(tag)) {
      const usesNamedStyle = /style\s*=\s*{(?:\[)?\s*styles\./.test(opening)
      const isRuntimeStyle =
        /style\s*=\s*{(?:\[)?\s*{[^}]*\b(?:colors\.|width\b|height\b|padding\b|margin\b|transform\b|opacity\b)/s.test(
          opening
        )
      if (
        !usesNamedStyle &&
        !isRuntimeStyle &&
        !allows(exception, "native-inline-style")
      ) {
        const line = source.slice(0, index).split("\n").length
        failures.push(
          `${file}:${line} <${tag}> uses style without className-first styling`
        )
      }
    }
    index = openingEnd
  }
}

function isNativeVisualTag(tag) {
  const normalized = tag.split(".").at(-1)
  return new Set([
    "AnimatedPressable",
    "AnimatedText",
    "AnimatedView",
    "Image",
    "Pressable",
    "SafeAreaView",
    "ScrollView",
    "Text",
    "TextInput",
    "View",
  ]).has(normalized)
}

function readTagNameEnd(source, start) {
  let index = start
  while (/[A-Za-z0-9_.$:-]/.test(source[index] ?? "")) index += 1
  return index
}

function readOpeningTagEnd(source, start) {
  let braceDepth = 0
  let quote = null
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (character === quote && source[index - 1] !== "\\") quote = null
      continue
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character
      continue
    }
    if (character === "{") braceDepth += 1
    else if (character === "}") braceDepth = Math.max(0, braceDepth - 1)
    else if (character === ">" && braceDepth === 0) return index
  }
  return -1
}

function allows(exception, category) {
  return exception?.allow.includes(category) ?? false
}

function checkSourceMarkers(file, markers) {
  const source = readFileSync(join(MOBILE_DIR, file), "utf8")
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${file} is missing ${marker}`)
  }
}

function checkForbiddenSourceMarkers(file, markers) {
  const source = readFileSync(join(MOBILE_DIR, file), "utf8")
  for (const marker of markers) {
    if (source.includes(marker))
      failures.push(`${file} still contains ${marker}`)
  }
}

function readable(filePath) {
  try {
    readFileSync(filePath)
    return true
  } catch {
    return false
  }
}

function findFiles(directory, extensions) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...findFiles(entryPath, extensions))
    else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(entryPath)
    }
  }
  return files
}

function toMobilePath(filePath) {
  return relative(MOBILE_DIR, filePath).split(sep).join("/")
}
