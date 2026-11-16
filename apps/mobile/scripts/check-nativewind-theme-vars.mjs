#!/usr/bin/env node
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  DESIGN_TOKENS_FILE,
  readPalette,
} from "./lib/design-tokens-source.mjs"

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const requiredSemanticTokens = [
  "accent",
  "accent-foreground",
  "background",
  "border",
  "brand",
  "brand-contrast",
  "brand-foreground",
  "brand-surface",
  "brand-surface-foreground",
  "brand-vivid",
  "brand-warm",
  "card",
  "card-foreground",
  "destructive",
  "destructive-foreground",
  "foreground",
  "input",
  "muted",
  "muted-foreground",
  "overlay",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "ring",
  "secondary",
  "secondary-foreground",
  "success",
  "success-foreground",
  "warn",
  "warn-foreground",
]

const requiredPaletteTokens = [
  "color-red-500",
  "color-red-950",
  "color-orange-500",
  "color-amber-500",
  "color-yellow-500",
  "color-lime-500",
  "color-green-500",
  "color-emerald-500",
  "color-teal-500",
  "color-cyan-500",
  "color-sky-500",
  "color-blue-500",
  "color-indigo-500",
  "color-violet-500",
  "color-purple-500",
  "color-fuchsia-500",
  "color-pink-500",
  "color-rose-500",
  "color-slate-500",
  "color-gray-500",
  "color-zinc-500",
  "color-neutral-500",
  "color-stone-500",
]

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertFile(relativePath) {
  assert(existsSync(join(root, relativePath)), `Missing ${relativePath}`)
}

function themeKeyToCssVariable(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d+)/g, "$1-$2")
    .toLowerCase()
}

function parseCssThemeValues(source) {
  const parsed = postcss.parse(source)
  const values = { light: new Map(), dark: new Map() }

  parsed.walkRules(":root", (rule) => {
    let parent = rule.parent
    let isDark = false

    while (parent) {
      if (
        parent.type === "atrule" &&
        parent.name === "media" &&
        parent.params.includes("prefers-color-scheme: dark")
      ) {
        isDark = true
        break
      }
      parent = parent.parent
    }
    const scheme = isDark ? "dark" : "light"

    rule.walkDecls(/^--/, (declaration) => {
      values[scheme].set(declaration.prop.slice(2), declaration.value)
    })
  })

  return values
}

assertFile("src/lib/nativewind-theme-vars.ts")

const layout = read("src/app/_layout.tsx")
const metroConfig = read("metro.config.js")
const themeVars = read("src/lib/nativewind-theme-vars.ts")
const tailwindConfig = read("tailwind.config.ts")
const globalCss = read("src/styles/global.css")
const themeSource = read("src/lib/theme.ts")

assert(
  metroConfig.includes("withNativewind(config, {"),
  "Metro config must pass options to withNativewind."
)
assert(
  metroConfig.includes('input: "./src/styles/global.css"'),
  "Metro config must use src/styles/global.css as the NativeWind input."
)

assert(
  layout.includes('import { VariableContextProvider } from "nativewind"'),
  "Root layout must import VariableContextProvider from nativewind."
)
assert(
  layout.includes(
    'import { nativewindThemeVars } from "@/lib/nativewind-theme-vars"'
  ),
  "Root layout must import nativewindThemeVars."
)
assert(
  layout.includes("<VariableContextProvider value={themeVariables}>"),
  "Root layout must wrap the app with VariableContextProvider."
)
assert(
  layout.includes("nativewindThemeVars(colorScheme)"),
  "Root layout must derive NativeWind variables from the active color scheme."
)
assert(
  !layout.includes("vars("),
  "Root layout must not use vars() as a style object for app-wide theme variables."
)
assert(
  !themeVars.includes("vars("),
  "nativewindThemeVars must return a raw variable map, not a vars() style object."
)
assert(
  themeVars.includes("...TAILWIND_COLOR_VARIABLES"),
  "nativewindThemeVars must include Tailwind palette variables for bg-red-500/text-red-500 runtime resolution."
)

assert(
  themeVars.includes("...paletteToCssVariables(colorScheme)"),
  "nativewindThemeVars must derive semantic variables from the design-token palette."
)
assert(
  themeSource.includes('import { palette } from "@/lib/design-tokens"') &&
    themeSource.includes("export const THEME = palette"),
  "src/lib/theme.ts must derive THEME from src/lib/design-tokens.ts (single token source)."
)

for (const token of requiredSemanticTokens) {
  assert(globalCss.includes(`--${token}:`), `global.css is missing --${token}.`)
  assert(
    tailwindConfig.includes(`var(--${token})`),
    `tailwind.config.ts is missing var(--${token}).`
  )
}

for (const token of requiredPaletteTokens) {
  assert(
    themeVars.includes(`"--${token}"`),
    `nativewindThemeVars is missing --${token}.`
  )
}

const themeValues = readPalette(root)
for (const token of requiredSemanticTokens) {
  const key = token.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
  assert(
    themeValues.light.has(key) && themeValues.dark.has(key),
    `${DESIGN_TOKENS_FILE} is missing ${key} in light or dark.`
  )
}
const cssThemeValues = parseCssThemeValues(globalCss)

for (const scheme of ["light", "dark"]) {
  assert(
    themeValues[scheme].size > 0,
    `No ${scheme} palette tokens were parsed from ${DESIGN_TOKENS_FILE}.`
  )

  for (const [themeKey, expectedValue] of themeValues[scheme]) {
    const cssVariable = themeKeyToCssVariable(themeKey)
    const actualValue =
      cssThemeValues[scheme].get(cssVariable) ??
      (scheme === "dark" ? cssThemeValues.light.get(cssVariable) : undefined)

    assert(
      actualValue === expectedValue,
      `${scheme} theme drift for --${cssVariable}: design-tokens.ts is ${expectedValue}, global.css is ${actualValue ?? "missing"}. Run bun run sync:theme-css.`
    )
  }
}

for (const scheme of ["light", "dark"]) {
  const known = new Set(
    [...themeValues[scheme].keys()].map((key) => themeKeyToCssVariable(key))
  )
  for (const cssVariable of cssThemeValues[scheme].keys()) {
    assert(
      known.has(cssVariable),
      `global.css defines --${cssVariable} (${scheme}) but ${DESIGN_TOKENS_FILE} does not; edit the palette and run bun run sync:theme-css.`
    )
  }
}

const compiled = await postcss([tailwind()]).process(
  `${globalCss}\n@source inline("bg-red-500 bg-red-500/10 text-red-500 text-red-500/5 bg-primary bg-primary/10 text-primary-foreground text-primary-foreground/5");`,
  { from: join(root, "src/styles/global.css") }
)

for (const className of [
  ".bg-red-500",
  ".bg-red-500\\/10",
  ".text-red-500",
  ".text-red-500\\/5",
  ".bg-primary",
  ".bg-primary\\/10",
  ".text-primary-foreground",
  ".text-primary-foreground\\/5",
]) {
  assert(
    compiled.css.includes(className),
    `Tailwind output is missing ${className}.`
  )
}

console.log(
  `NativeWind theme variable guard passed (${requiredSemanticTokens.length} semantic tokens, ${themeValues.light.size + themeValues.dark.size} cross-runtime values, ${requiredPaletteTokens.length} palette samples).`
)
