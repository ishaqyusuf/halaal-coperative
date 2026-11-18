"use client"

import { type KeyboardEvent, type ReactNode, useRef, useState } from "react"

export type HomepageTab = {
  id: string
  /** Shown inside the tab button. */
  label: ReactNode
  panel: ReactNode
}

/**
 * Accessible tabs with roving focus, used for the officer jobs (vertical list,
 * panels beside) and the setup-steps audience switch (horizontal, panels below).
 */
export function HomepageTabs({
  ariaLabel,
  className,
  listClassName,
  orientation,
  panelClassName,
  panelsClassName,
  tabClassName,
  tabs,
}: {
  ariaLabel: string
  className?: string
  listClassName: string
  orientation: "horizontal" | "vertical"
  panelClassName?: string
  panelsClassName?: string
  tabClassName?: string
  tabs: readonly HomepageTab[]
}) {
  const [active, setActive] = useState(0)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1
    let next: number | null = null
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      next = index === last ? 0 : index + 1
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      next = index === 0 ? last : index - 1
    } else if (event.key === "Home") next = 0
    else if (event.key === "End") next = last
    if (next === null) return
    event.preventDefault()
    setActive(next)
    buttons.current[next]?.focus()
  }

  return (
    <div className={className}>
      <div aria-label={ariaLabel} aria-orientation={orientation} className={listClassName} role="tablist">
        {tabs.map((tab, index) => (
          <button
            aria-controls={`${tab.id}-panel`}
            aria-selected={index === active}
            className={tabClassName}
            id={`${tab.id}-tab`}
            key={tab.id}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            ref={(element) => {
              buttons.current[index] = element
            }}
            role="tab"
            tabIndex={index === active ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={panelsClassName}>
        {tabs.map((tab, index) => (
          <div
            aria-labelledby={`${tab.id}-tab`}
            className={panelClassName}
            // Not `hidden`: the shared base styles force [hidden] to display:none
            // !important, and the officer jobs show every panel on phones.
            data-inactive={index !== active ? "" : undefined}
            id={`${tab.id}-panel`}
            key={tab.id}
            role="tabpanel"
          >
            {tab.panel}
          </div>
        ))}
      </div>
    </div>
  )
}
