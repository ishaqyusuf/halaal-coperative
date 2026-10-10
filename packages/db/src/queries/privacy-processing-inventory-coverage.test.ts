import { expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"

const modelsDirectory = join(import.meta.dir, "../../prisma/models")

function directUserIdFields() {
  const fields = new Set<string>()
  for (const file of readdirSync(modelsDirectory).filter((name) =>
    name.endsWith(".prisma")
  )) {
    const source = readFileSync(join(modelsDirectory, file), "utf8")
    for (const model of source.matchAll(/^model\s+(\w+)\s*\{([^}]+)\}/gm)) {
      const delegate = model[1]![0]!.toLowerCase() + model[1]!.slice(1)
      for (const field of model[2]!.matchAll(
        /^\s*(\w+UserId|userId)\s+String\??\s/gm
      )) {
        fields.add(`${delegate}.${field[1]}`)
      }
    }
  }
  return fields
}

function countedDirectUserIdFields() {
  const source = readFileSync(
    join(import.meta.dir, "account-privacy.ts"),
    "utf8"
  )
  const file = ts.createSourceFile(
    "account-privacy.ts",
    source,
    ts.ScriptTarget.Latest,
    true
  )
  const inventory = file.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "getPrivacyProcessingInventory"
  )
  if (!inventory) throw new Error("Privacy processing inventory is missing")
  const fields = new Set<string>()
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "count" &&
      ts.isPropertyAccessExpression(node.expression.expression) &&
      node.expression.expression.expression.getText(file) === "db" &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const delegate = node.expression.expression.name.text
      const where = node.arguments[0].properties.find(
        (property): property is ts.PropertyAssignment =>
          ts.isPropertyAssignment(property) &&
          property.name.getText(file) === "where"
      )
      if (where && ts.isObjectLiteralExpression(where.initializer)) {
        for (const property of where.initializer.properties) {
          const name = property.name?.getText(file)
          if (name && (name === "userId" || name.endsWith("UserId")))
            fields.add(`${delegate}.${name}`)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(inventory)
  return fields
}

test("privacy processing inventory covers every direct Prisma user-ID field", () => {
  const schemaFields = [...directUserIdFields()].sort()
  const countedFields = [...countedDirectUserIdFields()].sort()
  // A schema addition requires the operator data map and inventory to be reviewed.
  expect(schemaFields).toHaveLength(75)
  expect(countedFields).toEqual(schemaFields)
})
