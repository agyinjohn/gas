import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, TrendingUp, BarChart2, ShieldCheck, Zap, Users, CreditCard } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Partner with GetGas — Grow Your LPG Sales',
  description:
    'Register your LPG filling station on the GetGas platform. Access new customers, real-time dashboards, and earn commission on every delivery.',
}

const benefits = [
  {
    icon: TrendingUp,
    title: 'Grow your revenue',
    body: 'Tap into GetGas\'s growing customer base and receive orders digitally — no cold calling, no standing around waiting.',
  },
  {
    icon: BarChart2,
    title: 'Real-time dashboard',
    body: 'Monitor daily orders, cylinder inventory, earnings, and customer ratings from a clean web dashboard.',
  },
  {
    icon: Zap,
    title: 'Instant order alerts',
    body: 'Every new order hits your station app immediately with full details — cylinder size, customer location, assigned rider.',
  },
  {
    icon: CreditCard,
    title: 'Fast, transparent payouts',
    body: 'Earnings are calculated automatically and settled to your bank or Mobile Money account on a clear weekly schedule.',
  },
  {
    icon: Users,
    title: 'Wider customer reach',
    body: 'Serve customers beyond your immediate neighbourhood. GetGas routes orders to the nearest available station.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance made easy',
    body: 'Digital records of every transaction keep you audit-ready. Our weight verification flow protects you from disputes.',
  },
]

const commissionSteps = [
  { label: 'Customer places order', detail: 'Full payment collected via the app (MoMo, card).' },
  { label: 'Station fills & dispatches', detail: 'You fill the cylinder, weigh it, and hand to the rider.' },
  { label: 'Successful delivery confirmed', detail: 'OTP confirmed by customer; order marked complete.' },
  { label: 'Earnings credited', detail: 'Your commission is added to your station wallet instantly.' },
  { label: 'Weekly settlement', detail: 'Total earnings transferred to your account every Monday.' },
]

export default function StationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-20 bg-brand-dark text-white relative overflow-hidden">
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-brand-orange/10 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange mb-4 block">Station Partner Programme</span>
            <h1 className="font-display text-5xl font-extrabold leading-tight mb-5">
              More orders.<br />
              <span className="text-brand-orange">Less effort.</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-lg">
              Connect your LPG filling station to GetGas and receive a steady stream of verified digital orders — with analytics, fast payouts, and zero upfront cost.
            </p>
            <Link
              href="/station/register"
              className="inline-flex items-center gap-2 bg-brand-orange text-white font-semibold px-8 py-4 rounded-full hover:bg-orange-600 transition-colors shadow-lg shadow-orange-900/30 text-base"
            >
              Register Your Station <ArrowRight size={16} />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '50+', label: 'Active partner stations' },
              { value: '10,000+', label: 'Orders completed' },
              { value: 'Free', label: 'No joining fee' },
              { value: '7 days', label: 'Typical onboarding' },
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
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Why partner with us</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">Everything your station needs</h2>
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

      {/* Commission model */}
      <section className="py-24 bg-brand-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Transparent earnings</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">How the commission model works</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">
              GetGas charges a small platform fee on each completed delivery. You keep the majority of the sale price and receive a detailed breakdown every week.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            {commissionSteps.map((s, i) => (
              <div key={i} className={`flex items-start gap-5 p-6 ${i < commissionSteps.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-orange text-white font-bold text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-brand-dark">{s.label}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-400 text-sm mt-6">
            Exact commission rates are shared during onboarding.{' '}
            <Link href="/contact" className="text-brand-orange hover:underline">Contact us</Link> if you have questions.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-orange">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-4xl font-extrabold text-white mb-4">Ready to grow your station?</h2>
          <p className="text-orange-100 text-lg mb-8">
            Registration is free and takes less than 10 minutes. Our team will follow up within one business day.
          </p>
          <Link
            href="/station/register"
            className="inline-flex items-center gap-2 bg-white text-brand-orange font-bold px-10 py-4 rounded-full hover:bg-orange-50 transition-colors shadow-xl text-lg"
          >
            Register Your Station <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  )
}
