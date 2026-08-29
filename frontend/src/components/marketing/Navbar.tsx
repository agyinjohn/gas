'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Home',         href: '/' },
  { label: 'For Riders',   href: '/riders' },
  { label: 'For Stations', href: '/stations' },
  { label: 'About',        href: '/about' },
  { label: 'Contact',      href: '/contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'}`}>
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="GetGas" width={32} height={32} className="rounded-lg" />
          <span className="font-display font-bold text-xl text-brand-dark"><span className="text-brand-orange">Get</span>Gas</span>
        </Link>

        <ul className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          {navLinks.map(l => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-brand-orange transition-colors">{l.label}</Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/register" className="text-sm font-semibold text-gray-600 hover:text-brand-orange transition-colors">
            Sign Up
          </Link>
          <Link href="/login" className="inline-flex items-center gap-1.5 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-orange-600 transition-colors">
            Order Now →
          </Link>
        </div>

        <button className="md:hidden text-brand-dark" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-6 pt-2">
          <ul className="flex flex-col gap-1">
            {navLinks.map(l => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-sm font-medium text-gray-700 hover:text-brand-orange transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 mt-4">
            <Link href="/register" className="block text-center border border-brand-orange text-brand-orange text-sm font-semibold px-5 py-3 rounded-full hover:bg-orange-50 transition-colors">
              Sign Up
            </Link>
            <Link href="/login" className="block text-center bg-brand-orange text-white text-sm font-semibold px-5 py-3 rounded-full hover:bg-orange-600 transition-colors">
              Order Now →
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
