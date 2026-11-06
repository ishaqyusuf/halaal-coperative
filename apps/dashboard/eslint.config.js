import { nextJsConfig } from "@halaalvest/eslint-config/next-js"

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/hooks/use-data-table.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tanstack/react-table",
              importNames: ["useReactTable"],
              message:
                "Use useDataTable from @/hooks/use-data-table. Its defaults stop TanStack's auto-reset render loop.",
            },
          ],
        },
      ],
    },
  },
]
