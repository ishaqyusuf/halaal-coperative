#!/usr/bin/env node
/**
 * Owner rule (ADR-20261116-mobile-no-subscription-copy): the mobile app is a free
 * companion. User-facing text never mentions subscriptions, plans, billing,
 * renewal, upgrades or where access is bought or turned on.
 *
 * Only user-facing text is inspected (JSX text, text-like props and object keys,
 * error/alert/toast messages), so identifiers such as event-listener
 * `subscription` handles are not flagged. Tests and dev-only fixtures are skipped.
 */
import { readdir, readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"

const require = createRequire(import.meta.url)
const ts = require("typescript")

const rootDir = path.resolve(import.meta.dirname, "..")
const srcDir = path.join(rootDir, "src")

export const FORBIDDEN_COPY =
  // Plain "price" is allowed: share unit prices and purchase prices are cooperative finance, not app billing.
  /subscri|billing|\bbilled\b|\brenew|pricing|upgrade|\btrial\b|paywall|premium|checkout|web dashboard|plan restricted|higher [a-z ]*plan|reporting plan|current plan|view plan|access fee|\bper (?:year|month|annum)\b|₦\s?1,000\s*\/|\/\s*12 months/i

const TEXT_KEYS = new Set([
  "accessibilityHint", "accessibilityLabel", "actionLabel", "body", "cancelLabel", "caption",
  "confirmLabel", "description", "detail", "emptyDescription", "emptyTitle", "error", "helper",
  "helperText", "hint", "label", "message", "placeholder", "subtitle", "supportMessage", "text", "title",
])
const MESSAGE_CALLS = /^(?:set\w*(?:Error|Message|Notice)|alert|toast|showToast|announce\w*)$/

async function collect(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "dev" || entry.name === "node_modules") continue
      out.push(...(await collect(full)))
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.(test|spec)\.|\.d\.ts$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" ")
  return null
}

function propName(name) {
  if (!name) return null
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text
  return null
}

function calleeName(expr) {
  if (ts.isIdentifier(expr)) return expr.text
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text
  return null
}

/** Every user-facing string in a source file, with its line number. */
export function userFacingStrings(fileName, source) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found = []
  const add = (node, text) => {
    if (text && text.trim()) found.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: text.trim() })
  }
  const visitValue = (node) => {
    const direct = literalText(node)
    if (direct !== null) return add(node, direct)
    // `cond ? "a" : "b"` and `a ?? "b"` inside a text prop
    if (ts.isConditionalExpression(node)) { visitValue(node.whenTrue); visitValue(node.whenFalse); return }
    if (ts.isBinaryExpression(node)) { visitValue(node.left); visitValue(node.right); return }
    if (ts.isParenthesizedExpression(node)) visitValue(node.expression)
  }
  const visit = (node) => {
    if (ts.isJsxText(node)) add(node, node.text)
    else if (ts.isJsxExpression(node) && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) && node.expression) visitValue(node.expression)
    else if (ts.isJsxAttribute(node) && TEXT_KEYS.has(propName(node.name)) && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) add(node, node.initializer.text)
      else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) visitValue(node.initializer.expression)
    } else if (ts.isPropertyAssignment(node) && TEXT_KEYS.has(propName(node.name))) visitValue(node.initializer)
    else if (ts.isCallExpression(node) && MESSAGE_CALLS.test(calleeName(node.expression) ?? "")) node.arguments.forEach(visitValue)
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

async function main() {
  const violations = []
  for (const file of await collect(srcDir)) {
    const source = await readFile(file, "utf8")
    for (const { line, text } of userFacingStrings(file, source)) {
      if (FORBIDDEN_COPY.test(text)) violations.push(`${path.relative(rootDir, file)}:${line}  "${text.slice(0, 120)}"`)
    }
  }
  if (violations.length) {
    console.error("Mobile billing-copy check failed. The app must not mention subscriptions, plans, billing, renewal,")
    console.error("upgrades or where access is bought (ADR-20261116-mobile-no-subscription-copy):")
    for (const v of violations) console.error(`  ${v}`)
    process.exit(1)
  }
  console.log("Mobile billing-copy check passed (no subscription, plan or billing wording in user-facing text).")
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
