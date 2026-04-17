export function ScrollableContent({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="transition-transform"
      style={{
        transform: "translateY(calc(var(--header-offset, 0px) * -1))",
        transitionDuration: "var(--header-transition, 200ms)",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  )
}
