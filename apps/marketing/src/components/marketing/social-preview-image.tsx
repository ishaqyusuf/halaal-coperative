/**
 * 1200×630 link preview, rendered by `next/og` (Satori) at build time.
 * Mirrors the One Place homepage: headline on the left, the sample member
 * statement card on a mint panel to the right. Keep the headline and the
 * domain inside the left 60% so square crops (WhatsApp, Slack) still read.
 * Fonts are registered as "Inter" 500/700 in `app/opengraph-image.tsx`.
 */

const ink = "#0B1F36"
const muted = "#4B5867"
const green = "#1F7A3D"
const go = "#4ED07F"
const mint = "#E3F5E9"
const line = "#DFE6E2"

function BrandMark({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 96 96"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16 18h18v58h-8.5A9.5 9.5 0 0 1 16 66.5V18Z" fill={ink} />
      <path d="M34 49.5 57 39 50.5 52 34 60V49.5Z" fill={ink} />
      <path d="m45 58 12-7v25H45V58Z" fill={green} />
      <path d="m61 49 12-8v35H61V49Z" fill={green} />
      <path d="M77 36h13v40H77V36Z" fill={green} />
      <path
        d="M65 39c-7.4-2.8-10.4-9.7-7.8-17.9 8.1 2.2 11.9 9.2 7.8 17.9Z"
        fill="#2F9A56"
      />
      <path
        d="M73.8 30.8c.6-10.1 6.9-16.5 17.1-17.4.2 10.2-6.4 17.4-17.1 17.4Z"
        fill="#2F9A56"
      />
    </svg>
  )
}

function Row({
  label,
  value,
  valueColor = ink,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        fontSize: 17,
        justifyContent: "space-between",
      }}
    >
      <span style={{ color: muted }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: 700 }}>{value}</span>
    </div>
  )
}

function StatementCard() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `1px solid ${line}`,
        borderRadius: 28,
        boxShadow: "0 30px 70px rgba(11, 31, 54, 0.14)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "28px 28px 32px",
        width: 400,
      }}
    >
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: ink, fontSize: 22, fontWeight: 700 }}>
            Amina Suleiman
          </span>
          <span style={{ color: muted, fontSize: 15 }}>
            Unity Staff Cooperative
          </span>
        </div>
        <span
          style={{
            background: "#F4F7F5",
            borderRadius: 999,
            color: muted,
            display: "flex",
            fontSize: 13,
            fontWeight: 700,
            padding: "6px 12px",
          }}
        >
          Sample
        </span>
      </div>

      <div
        style={{
          background: "#F4F7F5",
          borderRadius: 999,
          display: "flex",
          fontSize: 15,
          padding: 4,
        }}
      >
        {["Aug 2026", "Sep 2026", "Oct 2026"].map((month, index) => (
          <span
            key={month}
            style={{
              background: index === 2 ? ink : "transparent",
              borderRadius: 999,
              color: index === 2 ? "#FFFFFF" : muted,
              display: "flex",
              flex: 1,
              fontWeight: index === 2 ? 700 : 500,
              justifyContent: "center",
              padding: "8px 0",
            }}
          >
            {month}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ color: muted, fontSize: 16 }}>Savings balance</span>
        <span
          style={{
            color: ink,
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: -1.6,
            lineHeight: 1,
          }}
        >
          ₦437,000.00
        </span>
        <Row label="Contribution" value="+₦25,000" valueColor={green} />
      </div>

      <div style={{ background: line, display: "flex", height: 1 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Row label="Financing left to repay" value="₦450,000" />
        <div
          style={{
            background: mint,
            borderRadius: 999,
            display: "flex",
            height: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: go,
              borderRadius: 999,
              display: "flex",
              width: `${(3 / 18) * 100}%`,
            }}
          />
        </div>
        <span style={{ color: muted, fontSize: 15 }}>Repayment 3 of 18</span>
      </div>
    </div>
  )
}

export function SocialPreviewImage() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        color: ink,
        display: "flex",
        fontFamily: "Inter",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Mint panel bleeding off the right edge, like the homepage hero. */}
      <div
        style={{
          alignItems: "center",
          background: `linear-gradient(160deg, ${mint} 0%, #CDEFD8 100%)`,
          borderRadius: 48,
          bottom: 40,
          display: "flex",
          paddingLeft: 46,
          position: "absolute",
          right: -60,
          top: 40,
          width: 560,
        }}
      >
        <StatementCard />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 0 64px 72px",
          position: "relative",
          width: 680,
        }}
      >
        <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
          <BrandMark size={44} />
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: -0.8,
            }}
          >
            Halaalvest
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 78,
              fontWeight: 700,
              letterSpacing: -3.4,
              lineHeight: 0.98,
            }}
          >
            <span>Run your</span>
            <span>cooperative</span>
            <span>in one place</span>
          </div>
          <span
            style={{
              color: muted,
              fontSize: 25,
              lineHeight: 1.35,
              maxWidth: 580,
            }}
          >
            Contributions, interest-free financing and member statements in one
            workspace.
          </span>
        </div>

        <div style={{ alignItems: "center", display: "flex", gap: 18 }}>
          <span
            style={{
              background: go,
              borderRadius: 999,
              color: ink,
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              padding: "12px 26px",
            }}
          >
            halaalvest.com
          </span>
          <span style={{ color: muted, fontSize: 18 }}>
            Charges always shown separately
          </span>
        </div>
      </div>
    </div>
  )
}
