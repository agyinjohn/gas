import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Target, Heart, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About GetGas',
  description:
    'Learn how GetGas is solving the LPG distribution problem in Ghana through technology, a network of partner stations, and a community of verified riders.',
}

const values = [
  {
    icon: Target,
    title: 'Our mission',
    body: 'To make clean cooking energy accessible to every Ghanaian home — quickly, safely, and affordably — by connecting consumers, filling stations, and riders through a seamless digital platform.',
  },
  {
    icon: Zap,
    title: 'How we work',
    body: 'GetGas is a three-sided marketplace. Customers order through our app or website. Certified partner stations fulfil and dispatch. Verified riders handle last-mile delivery with live GPS tracking and OTP verification.',
  },
  {
    icon: Heart,
    title: 'Our values',
    body: 'Safety is non-negotiable. Every cylinder is weighed and inspected. Every rider is screened and trained. Every delivery is OTP-verified. We believe technology should make people\'s daily lives meaningfully better.',
  },
]

const timeline = [
  { year: '2023', event: 'GetGas founded in Accra with a pilot of 5 partner stations.' },
  { year: '2024', event: 'Expanded to Kumasi and Tema. Launched real-time tracking and Mobile Money integration.' },
  { year: '2025', event: 'Passed 10,000 orders. Launched loyalty rewards and the station partner dashboard.' },
  { year: '2026', event: 'Expanding to Tamale, Takoradi, and Kasoa. Android app launch on Google Play.' },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 bg-brand-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange mb-4 block">Our story</span>
          <h1 className="font-display text-5xl font-extrabold text-brand-dark leading-tight mb-6">
            We're making gas delivery<br />
            <span className="text-gradient">as simple as texting.</span>
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-2xl mx-auto">
            GetGas was born from a simple frustration — running out of cooking gas at the worst possible time, and having no reliable way to get a refill quickly. We built the solution we wished existed.
          </p>
        </div>
      </section>

      {/* Mission / Values */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <div key={i} className="p-8 rounded-3xl border border-gray-100">
                <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 text-brand-orange mb-5">
                  <v.icon size={22} />
                </span>
                <h3 className="font-display font-bold text-xl text-brand-dark mb-3">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-brand-gray">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Milestones</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">Our journey so far</h2>
          </div>
          <div className="relative">
            <div className="absolute left-[72px] top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-8">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-6">
                  <span className="flex-shrink-0 w-[72px] text-right font-display font-bold text-brand-orange text-sm pr-4">
                    {t.year}
                  </span>
                  <div className="relative flex-shrink-0 mt-1">
                    <div className="w-3 h-3 rounded-full bg-brand-orange ring-4 ring-orange-100" />
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed pt-0.5">{t.event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-4xl font-bold text-brand-dark mb-4">Want to work with us?</h2>
          <p className="text-gray-500 text-lg mb-8">
            Whether you're a rider, a station owner, or just want to say hello — we'd love to hear from you.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center gap-2 bg-brand-orange text-white font-semibold px-8 py-3.5 rounded-full hover:bg-orange-600 transition-colors">
              Contact Us <ArrowRight size={16} />
            </Link>
            <Link href="/riders" className="inline-flex items-center gap-2 border border-gray-200 text-brand-dark font-semibold px-8 py-3.5 rounded-full hover:border-brand-orange hover:text-brand-orange transition-colors">
              Become a Rider
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
