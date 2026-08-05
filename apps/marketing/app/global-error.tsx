"use client"

import { getErrorPresentation } from "@halaalvest/errors"

export default function MarketingGlobalError({ error }: { error: Error }) {
  const presentation = getErrorPresentation(error)

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
