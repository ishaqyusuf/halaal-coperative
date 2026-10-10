import { readFileSync, readdirSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const MOBILE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE_DIR = join(MOBILE_DIR, "src")
const failures = []

checkMarkers("src/app/_layout.tsx", ["KeyboardProvider", "<KeyboardProvider>"])
checkMarkers("src/components/app/keyboard-aware-scroll-view.tsx", [
  "KeyboardAwareScrollView",
  "bottomOffset = 160",
  'keyboardDismissMode = "interactive"',
  'keyboardShouldPersistTaps = "handled"',
  "disableScrollOnKeyboardHide = true",
])
checkMarkers("src/components/floating-bottom-sheet.tsx", [
  'keyboardBehavior={keyboardExpandable ? "extend" : "interactive"}',
  'keyboardBlurBehavior="restore"',
  'android_keyboardInputMode="adjustResize"',
  "keyboardExpandedSnapPoint",
  "reservedFooterHeight",
  'scrollEnabled={scrollable === "auto" || shouldEnableScroll}',
  "contentContainerStyle={contentContainerStyle}",
  "footer && (!keyboardExpandable || !isKeyboardVisible)",
  "header?: ReactNode",
  "measuredHeaderHeight",
])
checkMarkers("src/components/ui/input.tsx", [
  "BottomSheetTextInput",
  "useBottomSheetInput",
  "NativeBottomSheetTextInput",
])
checkForbiddenMarkers("src/components/floating-bottom-sheet.tsx", [
  "scrollToEnd(",
])
checkMarkers("src/components/app/compact-form-sheet.tsx", [
  "keyboardExpandable",
  "header={",
  "accessibilityLabel={`Close ${title}`}",
])
checkMarkers("src/components/app/full-screen-form-sheet.tsx", [
  "AppKeyboardAwareScrollView",
  "KeyboardStickyView",
  "<KeyboardStickyView",
  "footerHeight + 144",
  "setFooterHeight(event.nativeEvent.layout.height)",
  'position: "absolute"',
])
checkForbiddenMarkers("src/components/app/full-screen-form-sheet.tsx", [
  "KEYBOARD_ACCESSORY_CLEARANCE",
  "keyboardBottomInset",
  "Keyboard.metrics()?.height",
  'Keyboard.addListener("keyboardDidShow"',
  "keyboardTop",
])
checkMarkers("src/features/auth/screens/sign-in-screen.tsx", [
  "AppKeyboardAwareScrollView",
  "<QaAccessPanel />",
  "bottomOffset={224}",
  "<SignInForm",
])
checkMarkers("src/features/auth/components/sign-in-form.tsx", [
  'accessibilityLabel="Cooperative number"',
  'autoCapitalize="characters"',
  'submitBehavior="submit"',
  'onSubmitEditing={() => KeyboardController.setFocusTo("next")}',
  'returnKeyType="next"',
  'returnKeyType="go"',
  'submitBehavior="blurAndSubmit"',
])
checkMarkers("src/features/auth/components/qa-access-panel.tsx", [
  "CompactFormSheet",
  "visible={sheetVisible}",
  'accessibilityHint="Opens optional tester access in a floating bottom sheet"',
  'className="absolute z-20 h-11 w-11"',
  "bottom: Math.max(insets.bottom, 16) + 12",
  "left: 24",
  'position: "absolute"',
  'className="h-11 w-11 rounded-full border border-border bg-card p-0"',
  'accessibilityLabel="QA Domain"',
  'accessibilityLabel="Tester credential"',
  'onSubmitEditing={() => KeyboardController.setFocusTo("next")}',
  'returnKeyType="next"',
  'returnKeyType="go"',
  'submitBehavior="submit"',
])
checkMarkers("src/features/auth/components/auth-screen-shell.tsx", [
  "AppKeyboardAwareScrollView",
  "bottomOffset={224}",
])
checkMarkers("src/features/auth/screens/recovery-screen.tsx", [
  "AuthScreenShell",
  "<RecoveryRequestStep",
  "<RecoveryCodeStep",
  "<RecoveryPasswordStep",
])
checkMarkers("src/features/auth/components/recovery-step-content.tsx", [
  'submitBehavior="submit"',
  'onSubmitEditing={() => KeyboardController.setFocusTo("next")}',
  'returnKeyType="go"',
  'submitBehavior="blurAndSubmit"',
])
checkMarkers("src/features/auth/components/password-field.tsx", [
  "forwardRef",
  "secureTextEntry={!visible}",
  "const fieldHeight",
  'largeTextLayout\n    ? "h-16"',
  'cn("relative", fieldHeight)',
  '"absolute inset-0 pr-14 text-base"',
])
checkMarkers(
  "src/features/food-purchase/screens/member-food-purchase-screen.tsx",
  [
    "<FullScreenFormSheet",
    "<MemberFoodPurchaseApplicationForm",
    "</FullScreenFormSheet>",
  ]
)
checkMarkers(
  "src/features/guarantors/screens/member-guarantor-approvals-screen.tsx",
  ["<CompactFormSheet", "<MemberGuarantorResponseForm", "</CompactFormSheet>"]
)

const signInScreenSource = readFileSync(
  join(SOURCE_DIR, "features/auth/screens/sign-in-screen.tsx"),
  "utf8"
)

for (const filePath of findTsxFiles(join(SOURCE_DIR, "features"))) {
  const source = readFileSync(filePath, "utf8")
  if (!/<(?:Input|Textarea)\b/.test(source)) continue

  const isGuardedLeafInput =
    (toMobilePath(filePath) === "src/features/auth/components/auth-field.tsx" &&
      source.includes("export const AuthField = forwardRef")) ||
    (toMobilePath(filePath) === "src/features/auth/components/otp-field.tsx" &&
      source.includes("export function OtpField")) ||
    (toMobilePath(filePath) ===
      "src/features/auth/components/password-field.tsx" &&
      source.includes("export const PasswordField = forwardRef")) ||
    (toMobilePath(filePath) ===
      "src/features/auth/components/sign-in-form.tsx" &&
      source.includes("export function SignInForm") &&
      signInScreenSource.includes("AppKeyboardAwareScrollView") &&
      signInScreenSource.includes("<SignInForm")) ||
    (toMobilePath(filePath) ===
      "src/features/auth/components/qa-access-panel.tsx" &&
      source.includes("export function QaAccessPanel") &&
      source.includes("CompactFormSheet")) ||
    (toMobilePath(filePath) ===
      "src/features/food-purchase/components/member-food-purchase-application-form.tsx" &&
      source.includes("export function MemberFoodPurchaseApplicationForm")) ||
    (toMobilePath(filePath) ===
      "src/features/guarantors/components/member-guarantor-response-form.tsx" &&
      source.includes("export function MemberGuarantorResponseForm")) ||
    (toMobilePath(filePath) ===
      "src/features/admin-finance-support/components/admin-finance-action-form.tsx" &&
      source.includes("export function AdminFinanceActionForm") &&
      readFileSync(
        join(
          MOBILE_DIR,
          "src/features/admin-finance-support/components/admin-finance-action-stack.tsx"
        ),
        "utf8"
      ).includes("CompactFormSheet") &&
      readFileSync(
        join(
          MOBILE_DIR,
          "src/features/admin-finance-support/components/admin-finance-action-stack.tsx"
        ),
        "utf8"
      ).includes("FullScreenFormSheet")) ||
    (toMobilePath(filePath) ===
      "src/features/admin-finance-support/components/admin-finance-work-queue.tsx" &&
      source.includes("<LegendList") &&
      source.includes('accessibilityLabel="Search finance queue"') &&
      source.includes('keyboardDismissMode="on-drag"')) ||
    (toMobilePath(filePath) ===
      "src/features/admin-contribution-operations/components/admin-contribution-workspace.tsx" &&
      source.includes("<VirtualizedCardList") &&
      source.includes("accessibilityLabel={`Search ${lane}`}") &&
      readFileSync(
        join(MOBILE_DIR, "src/components/app/virtualized-card-list.tsx"),
        "utf8"
      ).includes('keyboardDismissMode="on-drag"') &&
      readFileSync(
        join(MOBILE_DIR, "src/components/app/virtualized-card-list.tsx"),
        "utf8"
      ).includes('keyboardShouldPersistTaps="handled"'))
  if (isGuardedLeafInput) continue

  const hasKeyboardAwareSurface = [
    "AppKeyboardAwareScrollView",
    "CompactFormSheet",
    "FullScreenFormSheet",
    "FloatingBottomSheet",
    "SubmissionReviewSheet",
  ].some((marker) => source.includes(marker))

  if (!hasKeyboardAwareSurface) {
    failures.push(
      `${toMobilePath(filePath)} contains inputs without a shared keyboard-aware scroll or sheet surface`
    )
  }
}

if (failures.length > 0) {
  console.error("Mobile keyboard coverage failed:\n")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log("Mobile keyboard coverage passed.")

function checkMarkers(file, markers) {
  const source = readFileSync(join(MOBILE_DIR, file), "utf8")
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${file} is missing ${marker}`)
  }
}

function checkForbiddenMarkers(file, markers) {
  const source = readFileSync(join(MOBILE_DIR, file), "utf8")
  for (const marker of markers) {
    if (source.includes(marker))
      failures.push(`${file} still contains ${marker}`)
  }
}

function findTsxFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...findTsxFiles(entryPath))
    else if (entry.name.endsWith(".tsx")) files.push(entryPath)
  }
  return files
}

function toMobilePath(filePath) {
  return relative(MOBILE_DIR, filePath).split(sep).join("/")
}
