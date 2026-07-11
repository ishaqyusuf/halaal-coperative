#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const rootDir = path.resolve(import.meta.dirname, "..")
const sourceRoots = [
  path.join(rootDir, "src"),
  path.join(rootDir, "app.config.ts"),
]
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"])

const forbiddenImports = [
  {
    pattern: /^next(?:\/|$)/,
    reason: "Next.js modules are web-only.",
  },
  {
    pattern: /^react-dom(?:\/|$)/,
    reason: "react-dom is browser-only.",
  },
  {
    pattern: /^@halaalvest\/db(?:\/|$)/,
    reason: "mobile must call API/tRPC instead of database modules.",
  },
  {
    pattern: /^@halaalvest\/auth(?:\/|$)/,
    reason: "mobile must receive auth state from the API session contract.",
  },
  {
    pattern: /^@\/components\/dashboard(?:\/|$)/,
    reason: "dashboard components are web-only.",
  },
  {
    pattern: /^@\/lib\/server-context(?:\/|$)/,
    reason: "server context helpers are not native-safe.",
  },
  {
    pattern: /^@\/lib\/dashboard-actions(?:\/|$)/,
    reason: "dashboard form actions are not native-safe.",
  },
  {
    pattern: /^@\/trpc\/server(?:\/|$)/,
    reason: "server tRPC helpers are not native-safe.",
  },
  {
    pattern: /(?:^|\/)apps\/dashboard(?:\/|$)/,
    reason: "mobile cannot import dashboard source.",
  },
]

const importPatterns = [
  /\bimport\s+(?:type\s+)?(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?:type\s+)?(?:[^'"()]*?\s+from\s+)["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
]

async function collectFiles(targetPath) {
  const entries = []

  async function visit(currentPath) {
    const stats = await readdir(currentPath, { withFileTypes: true }).catch(
      () => null
    )

    if (!stats) {
      if (sourceExtensions.has(path.extname(currentPath))) {
        entries.push(currentPath)
      }
      return
    }

    for (const entry of stats) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue
      }

      const childPath = path.join(currentPath, entry.name)
      if (entry.isDirectory()) {
        await visit(childPath)
        continue
      }

      if (sourceExtensions.has(path.extname(entry.name))) {
        entries.push(childPath)
      }
    }
  }

  await visit(targetPath)
  return entries
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split("\n").length
}

function findImports(source) {
  const matches = []

  for (const pattern of importPatterns) {
    pattern.lastIndex = 0
    let match = pattern.exec(source)

    while (match) {
      matches.push({
        index: match.index,
        specifier: match[1],
      })
      match = pattern.exec(source)
    }
  }

  return matches
}

function checkImport(specifier) {
  return forbiddenImports.find((rule) => rule.pattern.test(specifier)) ?? null
}

const files = (
  await Promise.all(sourceRoots.map((sourceRoot) => collectFiles(sourceRoot)))
)
  .flat()
  .sort()
const violations = []

for (const file of files) {
  const source = await readFile(file, "utf8")
  const imports = findImports(source)

  for (const item of imports) {
    const violation = checkImport(item.specifier)

    if (!violation) {
      continue
    }

    violations.push({
      file: path.relative(rootDir, file),
      line: lineNumberForIndex(source, item.index),
      reason: violation.reason,
      specifier: item.specifier,
    })
  }
}

if (violations.length > 0) {
  console.error("Mobile native import safety failed:")
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} imports "${violation.specifier}" (${violation.reason})`
    )
  }
  process.exit(1)
}

console.log(`Mobile native import safety passed (${files.length} files).`)
