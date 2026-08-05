"use client"

import { getErrorPresentation } from "@halaalvest/errors"
import { useMemo } from "react"

export default function MarketingGlobalError({ error }: { error: Error }) {
  const presentation = useMemo(() => getErrorPresentation(error), [error])

  return (
    <html lang="en">
      <body>
        <main
          style={{
            fontFamily: "sans-serif",
            margin: "15vh auto",
            maxWidth: 520,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1>{presentation.title}</h1>
          <p>{presentation.description}</p>
          <p style={{ fontSize: 12 }}>{presentation.reference}</p>
        </main>
      </body>
    </html>
  )
}
