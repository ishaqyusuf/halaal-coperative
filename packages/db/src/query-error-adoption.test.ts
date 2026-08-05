import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"

const queriesDirectory = join(import.meta.dir, "queries")

const isReviewedTechnicalFailure = (
  argument: ts.Expression,
  source: ts.SourceFile
) => {
  if (ts.isStringLiteralLike(argument)) {
    const message = argument.text

    return (
      message === "Database not configured" ||
      message === "Backfill draft could not be prepared" ||
      message === "Ledger accounts not initialized for this cooperative" ||
      message.startsWith("Ledger bootstrap failed for account codes:") ||
      message.startsWith("Unbalanced ledger transaction:") ||
      message.includes("HALAALVEST_DATABASE_URL") ||
      message.includes("unavailable without database configuration") ||
      /requires? the latest Prisma migration and generated client\.$/.test(
        message
      )
    )
  }

  const expression = argument.getText(source)

  return (
    expression ===
      "`${feature} is unavailable without database configuration.`" ||
    /^`Ledger account \$\{code\} is not configured\.`$/.test(expression) ||
    /^`Ledger bootstrap failed for account codes: /.test(expression) ||
    /^`Unbalanced ledger transaction: /.test(expression)
  )
}

describe("database query error adoption", () => {
  it("preserves permission and workflow transport semantics", () => {
    const contributions = readFileSync(
      join(queriesDirectory, "contributions.ts"),
      "utf8"
    )
    const loans = readFileSync(join(queriesDirectory, "loans.ts"), "utf8")

    expect(contributions).toMatch(
      /ExpectedQueryError\.permission\(\s*"Refund processor does not belong to this cooperative\."/
    )
    expect(loans).toMatch(
      /ExpectedQueryError\.conflict\(\s*"Approved loan requests cannot change guarantor evidence\."/
    )
    expect(loans).toMatch(
      /ExpectedQueryError\.conflict\(\s*"Only pending guarantor approvals can be answered by the guarantor\."/
    )
  })

  it("requires explicit expected-error semantics at every query source", () => {
    const allowedFactories = new Set([
      "conflict",
      "notFound",
      "permission",
      "precondition",
      "validation",
    ])
    const unclassified: string[] = []
    let classifiedCount = 0

    for (const fileName of readdirSync(queriesDirectory)) {
      if (!fileName.endsWith(".ts") || fileName.endsWith(".test.ts")) continue

      const filePath = join(queriesDirectory, fileName)
      const source = ts.createSourceFile(
        filePath,
        readFileSync(filePath, "utf8"),
        ts.ScriptTarget.Latest,
        true
      )

      const visit = (node: ts.Node) => {
        const line =
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1

        if (
          ts.isNewExpression(node) &&
          node.expression.getText(source) === "ExpectedQueryError"
        ) {
          unclassified.push(`${fileName}:${line}: direct constructor`)
        }

        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.expression.getText(source) === "ExpectedQueryError"
        ) {
          const factory = node.expression.name.text
          if (allowedFactories.has(factory)) classifiedCount += 1
          else unclassified.push(`${fileName}:${line}: ${factory}`)
        }

        ts.forEachChild(node, visit)
      }

      visit(source)
    }

    expect(classifiedCount).toBeGreaterThan(0)
    expect(unclassified).toEqual([])
  })

  it("allows native Error only for reviewed technical failures", () => {
    const unreviewed: string[] = []
    let reviewedCount = 0

    for (const fileName of readdirSync(queriesDirectory)) {
      if (!fileName.endsWith(".ts") || fileName.endsWith(".test.ts")) continue

      const filePath = join(queriesDirectory, fileName)
      const source = ts.createSourceFile(
        filePath,
        readFileSync(filePath, "utf8"),
        ts.ScriptTarget.Latest,
        true
      )

      const visit = (node: ts.Node) => {
        if (
          ts.isThrowStatement(node) &&
          node.expression &&
          ts.isNewExpression(node.expression) &&
          node.expression.expression.getText(source) === "Error"
        ) {
          const argument = node.expression.arguments?.[0]
          const line =
            source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1

          if (argument && isReviewedTechnicalFailure(argument, source)) {
            reviewedCount += 1
          } else {
            unreviewed.push(
              `${fileName}:${line}: ${node.expression
                .getText(source)
                .replace(/\s+/g, " ")}`
            )
          }
        }

        ts.forEachChild(node, visit)
      }

      visit(source)
    }

    expect(reviewedCount).toBeGreaterThan(0)
    expect(unreviewed).toEqual([])
  })
})
