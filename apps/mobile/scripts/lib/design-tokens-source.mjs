// Reads the static palette from src/lib/design-tokens.ts without bundling.
// Shared by sync-theme-css.mjs (generator) and check-nativewind-theme-vars.mjs.
import { readFileSync } from "node:fs"
import { join } from "node:path"

export const DESIGN_TOKENS_FILE = "src/lib/design-tokens.ts"

function extractObjectBody(source, propertyName, fromIndex = 0) {
  const propertyPattern = new RegExp(`\\b${propertyName}\\s*:\\s*\\{`, "g")
  propertyPattern.lastIndex = fromIndex
  const match = propertyPattern.exec(source)
  if (!match) throw new Error(`Could not find ${propertyName} palette object.`)

  const openingBrace = source.indexOf("{", match.index)
  let depth = 0
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1
    if (source[index] === "}") depth -= 1
    if (depth === 0) return source.slice(openingBrace + 1, index)
  }
  throw new Error(`Palette object ${propertyName} is not closed.`)
}

function parsePaletteObject(source, propertyName, fromIndex) {
  const values = new Map()
  for (const match of extractObjectBody(source, propertyName, fromIndex).matchAll(
    /^\s*([a-zA-Z][a-zA-Z0-9]*):\s*"([^"]+)",?$/gm
  )) {
    values.set(match[1], match[2])
  }
  return values
}

export function readPalette(root) {
  const source = readFileSync(join(root, DESIGN_TOKENS_FILE), "utf8")
  const start = source.indexOf("export const palette")
  if (start < 0) throw new Error(`${DESIGN_TOKENS_FILE} must export palette.`)
  return {
    light: parsePaletteObject(source, "light", start),
    dark: parsePaletteObject(source, "dark", start),
  }
}

export function paletteKeyToCssVariable(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d+)/g, "$1-$2")
    .toLowerCase()
}

export function renderRootBlock(values, indent) {
  return [...values]
    .map(([key, value]) => `${indent}--${paletteKeyToCssVariable(key)}: ${value};`)
    .join("\n")
}
