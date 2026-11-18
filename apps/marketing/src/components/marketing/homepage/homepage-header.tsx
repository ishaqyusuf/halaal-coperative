"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import type { HomepageNavLink } from "./homepage-data"
import { HomepageMark } from "./homepage-mark"

export function HomepageHeader({
  navLinks,
  signupHref,
}: {
  navLinks: readonly HomepageNavLink[]
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
    const onKey = (event: KeyboardEvent) => {
      const menu = menuRef.current
      if (event.key !== "Escape" || !menu?.open) return
      menu.open = false
      menu.querySelector("summary")?.focus()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false
  }

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="wrap">
        <Link aria-label="Halaalvest home" className="brand" href="/">
          <HomepageMark />
          <span>
            Halaal<i>vest</i>
          </span>
        </Link>
        <nav aria-label="Main" className="nav">
          {navLinks.map(([href, label]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="head-actions">
          <Link className="signin" href="/login">
            Sign in
          </Link>
          <a className="btn btn-green" href={signupHref}>
            Sign up
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
                <path d="M4 8h16M4 16h16" />
              </svg>
            </summary>
            <div className="menu-panel">
              {navLinks.map(([href, label]) => (
                <a href={href} key={href} onClick={closeMenu}>
                  {label}
                </a>
              ))}
              <Link href="/login" onClick={closeMenu}>
                Sign in
              </Link>
              <a className="btn btn-green" href={signupHref} onClick={closeMenu}>
                Sign up
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}
