import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Wallet, Clock, Smartphone, ShieldCheck, MapPin, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Earn as a GetGas Rider',
  description: 'Join the GetGas delivery team. Earn flexible income with weekly Mobile Money payouts. Bring LPG safely to homes across Ghana.',
}

const benefits = [
  {
    icon: Wallet,
    title: 'Weekly Mobile Money payouts',
    body: 'Your earnings land directly in your MoMo wallet every week — no bank account needed, no delays.',
  },
  {
    icon: Clock,
    title: 'Flexible hours',
    body: "Ride when it suits you. Morning, evening, weekends — you set your own schedule and take orders when you're ready.",
  },
  {
    icon: MapPin,
    title: 'In-app navigation',
    body: 'Turn-by-turn directions to every customer. No guessing — the app guides you from station to doorstep.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety training provided',
    body: "Before your first delivery, you'll complete our short LPG safety and handling course — fully free.",
  },
  {
    icon: Smartphone,
    title: 'Dedicated rider app',
    body: 'A clean, simple app shows your incoming orders, earnings, and route — optimised for data-light usage.',
  },
  {
    icon: Users,
    title: 'A growing community',
    body: 'Join hundreds of GetGas riders across Ghana. Access support, tips, and community bonuses.',
  },
]

const requirements = [
  { item: 'Valid Ghana Card (National ID)' },
  { item: 'Motorcycle or tricycle in roadworthy condition' },
  { item: 'Android smartphone (at least Android 8.0)' },
  { item: 'Ability to safely carry LPG cylinders (up to 14.5 kg)' },
  { item: 'Good knowledge of your local area' },
  { item: 'Willingness to complete GetGas safety orientation' },
]

const steps = [
  { number: '01', title: 'Apply online', body: 'Fill in the short registration form with your basic details and upload your Ghana Card.' },
  { number: '02', title: 'Verification', body: 'Our team reviews your application and verifies your ID and vehicle within 2 business days.' },
  { number: '03', title: 'Safety orientation', body: 'Complete a brief online LPG safety module and a short in-person briefing at your nearest hub.' },
  { number: '04', title: 'Start earning', body: 'Download the GetGas Rider app, go online, and start accepting deliveries immediately.' },
]

export default function RidersPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 bg-brand-dark text-white overflow-hidden relative">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-orange/10 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange mb-4 block">Rider Programme</span>
            <h1 className="font-display text-5xl font-extrabold leading-tight mb-5">
              Earn on your terms.<br />
              <span className="text-brand-orange">Deliver with GetGas.</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-lg">
              Turn your motorcycle or tricycle into a steady income stream. Deliver LPG to families across Ghana and get paid every week, straight to your Mobile Money.
            </p>
            <Link
              href="/rider/register"
              className="inline-flex items-center gap-2 bg-brand-orange text-white font-semibold px-8 py-4 rounded-full hover:bg-orange-600 transition-colors shadow-lg shadow-orange-900/30 text-base"
            >
              Apply Now — It's Free <ArrowRight size={16} />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 'GHS 800+', label: 'Average weekly earnings' },
              { value: '< 48hrs', label: 'Approval turnaround' },
              { value: '100%', label: 'MoMo weekly payout' },
              { value: '5 cities', label: 'Active zones (growing)' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <p className="font-display text-3xl font-extrabold text-brand-orange mb-1">{s.value}</p>
                <p className="text-gray-400 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Why GetGas</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">Everything a rider needs</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="group p-7 rounded-3xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all">
                <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 text-brand-orange mb-5 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                  <b.icon size={22} />
                </span>
                <h3 className="font-display font-bold text-lg text-brand-dark mb-2">{b.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-24 bg-brand-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">What you need</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">Rider requirements</h2>
            <p className="text-gray-500 mt-3">Simple criteria to keep our platform safe and reliable for everyone.</p>
          </div>
          <div className="bg-white rounded-3xl shadow-sm p-8 grid sm:grid-cols-2 gap-4">
            {requirements.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-brand-orange text-white flex items-center justify-center text-xs font-bold">✓</span>
                <span className="text-gray-700 text-sm">{r.item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to join */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Getting started</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">Ready in 4 steps</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative bg-brand-gray rounded-3xl p-7">
                <span className="font-display text-4xl font-extrabold text-orange-100 block mb-4">{s.number}</span>
                <h3 className="font-display font-bold text-lg text-brand-dark mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-orange">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-4xl font-extrabold text-white mb-4">Start delivering today</h2>
          <p className="text-orange-100 text-lg mb-8">
            Applications take under 5 minutes. Approvals within 48 hours.
          </p>
          <Link
            href="/rider/register"
            className="inline-flex items-center gap-2 bg-white text-brand-orange font-bold px-10 py-4 rounded-full hover:bg-orange-50 transition-colors shadow-xl text-lg"
          >
            Apply as a Rider <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  )
}
