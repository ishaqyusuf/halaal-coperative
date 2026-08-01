type SetupContextItem = {
  body: string
  label: string
}

export function SetupContextStrip({
  items,
}: {
  items: readonly [SetupContextItem, SetupContextItem]
}) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-[#0B1F36]/10 bg-[#F7FAF7] sm:grid-cols-2">
      {items.map((item, index) => (
        <div
          className={
            index === 0
              ? "border-b border-[#0B1F36]/10 p-4 sm:border-r sm:border-b-0"
              : "p-4"
          }
          key={item.label}
        >
          <p className="text-[10px] font-semibold text-[#1F7A3D] uppercase">
            0{index + 1} · {item.label}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#0B1F36]/58">
            {item.body}
          </p>
        </div>
      ))}
    </div>
  )
}
