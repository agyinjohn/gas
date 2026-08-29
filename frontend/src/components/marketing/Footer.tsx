import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-gray-400 mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-3">
            <Image src="/logo.png" alt="GetGas" width={28} height={28} className="rounded-md" />
            <span className="font-display font-bold text-lg text-white"><span className="text-brand-orange">Get</span>Gas</span>
          </Link>
          <p className="text-sm leading-relaxed">
            Fast, safe, and reliable LPG delivery across Ghana. Powered by technology, built for everyday families.
          </p>
        </div>

        <div>
          <p className="text-white text-sm font-semibold mb-4">Company</p>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Home',         href: '/' },
              { label: 'For Riders',   href: '/riders' },
              { label: 'For Stations', href: '/stations' },
              { label: 'About',        href: '/about' },
              { label: 'Contact',      href: '/contact' },
            ].map(l => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-white text-sm font-semibold mb-4">Legal</p>
          <ul className="space-y-2 text-sm mb-6">
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms"   className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
          <p className="text-white text-sm font-semibold mb-3">Get in touch</p>
          <div className="flex gap-3">
            <a href="https://wa.me/233XXXXXXXXX" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-white transition-colors">
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a href="mailto:hello@getgas.com.gh" className="flex items-center gap-2 text-sm hover:text-white transition-colors">
              <Mail size={16} /> Email
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
        <p>© 2025 GetGas Technologies Ltd. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
          <Link href="/terms"   className="hover:text-gray-300 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  )
}
