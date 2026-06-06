'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Flame } from 'lucide-react'

const navLinks = [
  { label: 'Home',        href: '/' },
  { label: 'For Riders',  href: '/riders' },
  { label: 'For Stations',href: '/stations' },
  { label: 'About',       href: '/about' },
  { label: 'Contact',     href: '/contact' },
]

export default function Navbar() {
  const [open,      setOpen]      = useState(false)
  const [scrolled,  setScrolled]  = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl text-brand-dark">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-orange text-white">
            <Flame size={18} />
          </span>
          <span className="text-brand-orange">Get</span>Gas
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          {navLinks.map(l => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-brand-orange transition-colors">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden md:block">
          <a
            href="https://getgas.com.gh/user"
            className="inline-flex items-center gap-1.5 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-orange-600 transition-colors"
          >
            Order Now →
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-brand-dark"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-6 pt-2">
          <ul className="flex flex-col gap-1">
            {navLinks.map(l => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-sm font-medium text-gray-700 hover:text-brand-orange transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <a
            href="https://getgas.com.gh/user"
            className="mt-4 block text-center bg-brand-orange text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-orange-600 transition-colors"
          >
            Order Now →
          </a>
        </div>
      )}
    </header>
  )
}
