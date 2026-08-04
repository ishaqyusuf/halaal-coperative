const workspaceRows = [
  {
    accent: "#1F7A3D",
    detail: "Collections remain visible before posting",
    label: "Contributions",
    value: "Reconciled",
  },
  {
    accent: "#D6A63A",
    detail: "Eligibility stays separate from liquidity",
    label: "Financing controls",
    value: "Review ready",
  },
  {
    accent: "#2F9A56",
    detail: "Clear balances and auditable activity",
    label: "Member statements",
    value: "Member visible",
  },
] as const

export function SocialPreviewImage() {
  return (
    <div
      style={{
        alignItems: "center",
        background: "#F7FAF7",
        color: "#0B1F36",
        display: "flex",
        fontFamily: "Arial, Helvetica, sans-serif",
        height: "100%",
        justifyContent: "center",
        padding: 60,
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          backgroundImage:
            "linear-gradient(rgba(11, 31, 54, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(11, 31, 54, 0.055) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          display: "flex",
          inset: 0,
          position: "absolute",
        }}
      />
      <div
        style={{
          background:
            "linear-gradient(145deg, rgba(31, 122, 61, 0.2), rgba(113, 217, 139, 0.04))",
          borderRadius: 999,
          display: "flex",
          height: 430,
          position: "absolute",
          right: -100,
          top: -120,
          width: 430,
        }}
      />

      <div
        style={{
          alignItems: "stretch",
          display: "flex",
          gap: 48,
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: "1 1 0",
            flexDirection: "column",
            justifyContent: "space-between",
            minWidth: 0,
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 15,
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#FFFFFF",
                border: "2px solid rgba(11, 31, 54, 0.1)",
                borderRadius: 18,
                display: "flex",
                height: 68,
                justifyContent: "center",
                width: 68,
              }}
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="54"
                viewBox="0 0 96 96"
                width="54"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 18h18v58h-8.5A9.5 9.5 0 0 1 16 66.5V18Z"
                  fill="#0B1F36"
                />
                <path d="M34 49.5 57 39 50.5 52 34 60V49.5Z" fill="#0B1F36" />
                <path d="m45 58 12-7v25H45V58Z" fill="#1F7A3D" />
                <path d="m61 49 12-8v35H61V49Z" fill="#1F7A3D" />
                <path d="M77 36h13v40H77V36Z" fill="#1F7A3D" />
                <path
                  d="M65 39c-7.4-2.8-10.4-9.7-7.8-17.9 8.1 2.2 11.9 9.2 7.8 17.9Z"
                  fill="#2F9A56"
                />
                <path
                  d="M73.8 30.8c.6-10.1 6.9-16.5 17.1-17.4.2 10.2-6.4 17.4-17.1 17.4Z"
                  fill="#2F9A56"
                />
              </svg>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 36,
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                <span>Halaal</span>
                <span style={{ color: "#1F7A3D" }}>vest</span>
              </div>
              <div
                style={{
                  color: "#526071",
                  display: "flex",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Cooperative operations platform
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              maxWidth: 650,
            }}
          >
            <div
              style={{
                color: "#1F7A3D",
                display: "flex",
                fontSize: 24,
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              Interest-free cooperative operations
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 68,
                fontWeight: 900,
                letterSpacing: -2.8,
                lineHeight: 0.98,
              }}
            >
              Records every member can trust.
            </div>
            <div
              style={{
                color: "#526071",
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1.28,
              }}
            >
              Contributions, approvals, repayments, and member statements in one
              auditable workspace.
            </div>
          </div>

          <div
            style={{
              alignItems: "center",
              display: "flex",
              fontSize: 23,
              fontWeight: 800,
              gap: 12,
            }}
          >
            <div
              style={{
                background: "#1F7A3D",
                borderRadius: 999,
                display: "flex",
                height: 12,
                width: 12,
              }}
            />
            halaalvest.com
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid rgba(11, 31, 54, 0.1)",
            borderRadius: 28,
            boxShadow: "0 28px 80px rgba(11, 31, 54, 0.16)",
            display: "flex",
            flex: "0 0 390px",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#0B1F36",
              color: "#FFFFFF",
              display: "flex",
              height: 68,
              justifyContent: "space-between",
              padding: "0 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 17,
                fontWeight: 800,
              }}
            >
              Cooperative overview
            </div>
            <div
              style={{
                background: "rgba(113, 217, 139, 0.16)",
                border: "1px solid rgba(113, 217, 139, 0.36)",
                borderRadius: 999,
                color: "#A3E5B5",
                display: "flex",
                fontSize: 12,
                fontWeight: 800,
                padding: "7px 10px",
              }}
            >
              Audit ready
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              padding: 22,
            }}
          >
            {workspaceRows.map((row) => (
              <div
                key={row.label}
                style={{
                  background: "#F7FAF7",
                  border: "2px solid rgba(11, 31, 54, 0.075)",
                  borderRadius: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      fontSize: 15,
                      fontWeight: 900,
                      gap: 9,
                    }}
                  >
                    <div
                      style={{
                        background: row.accent,
                        borderRadius: 999,
                        display: "flex",
                        height: 10,
                        width: 10,
                      }}
                    />
                    {row.label}
                  </div>
                  <div
                    style={{
                      color: row.accent,
                      display: "flex",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {row.value}
                  </div>
                </div>
                <div
                  style={{
                    color: "#667181",
                    display: "flex",
                    fontSize: 14,
                    fontWeight: 700,
                    lineHeight: 1.25,
                  }}
                >
                  {row.detail}
                </div>
              </div>
            ))}

            <div
              style={{
                alignItems: "center",
                borderTop: "2px solid rgba(11, 31, 54, 0.08)",
                color: "#526071",
                display: "flex",
                fontSize: 14,
                fontWeight: 800,
                gap: 9,
                padding: "16px 4px 0",
              }}
            >
              <div
                style={{
                  background: "#1F7A3D",
                  borderRadius: 999,
                  display: "flex",
                  height: 8,
                  width: 8,
                }}
              />
              Tenant-scoped and member-visible
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
