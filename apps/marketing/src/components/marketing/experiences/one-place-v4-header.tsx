"use client"

import { HalaalvestLogoMark } from "@halaalvest/ui/components/brand-logo"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

export type OnePlaceNavLink = readonly [href: string, label: string]

export function OnePlaceBrand() {
  return (
    <Link aria-label="Halaalvest home" className="brand" href="/">
      <HalaalvestLogoMark aria-hidden="true" />
      <span>
        Halaal<i>vest</i>
      </span>
    </Link>
  )
}

export function OnePlaceHeader({
  ctaLabel,
  navLinks,
  signupHref,
}: {
  ctaLabel: string
  navLinks: readonly OnePlaceNavLink[]
  signupHref: string
}) {
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const menu = menuRef.current

    if (!menu) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.open) {
        menu.open = false
        menu.querySelector("summary")?.focus()
      }
    }
    const onClick = (event: MouseEvent) => {
      if (menu.open && !menu.contains(event.target as Node)) {
        menu.open = false
      }
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("click", onClick)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("click", onClick)
    }
  }, [])

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false
  }

  return (
    <header className={scrolled ? "site-header scrolled" : "site-header"}>
      <div className="wrap">
        <OnePlaceBrand />
        <nav aria-label="Main" className="nav">
          {navLinks.map(([href, label]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <a className="btn btn-go btn-sm" href={signupHref}>
            {ctaLabel}
          </a>
          <details className="menu" ref={menuRef}>
            <summary aria-label="Open menu">
              <svg
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <div className="menu-panel">
              {navLinks.map(([href, label]) => (
                <a href={href} key={href} onClick={closeMenu}>
                  {label}
                </a>
              ))}
              <a className="btn btn-go" href={signupHref} onClick={closeMenu}>
                {ctaLabel}
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
