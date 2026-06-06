import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Smartphone, MapPin, ShieldCheck, CreditCard, Star,
  ArrowRight, CheckCircle2, Clock, Zap, Gift,
  TrendingUp, Users, ChevronDown,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'GetGas — LPG Delivered to Your Door in Ghana',
  description:
    'Order LPG cooking gas online and get it delivered to your home in Accra, Kumasi, Tamale and more. Real-time tracking, OTP-verified, Mobile Money accepted.',
}

/* ─── Data ─────────────────────────────────────────────────────────────── */

const steps = [
  {
    number: '01',
    title: 'Place your order',
    body: 'Open the GetGas app or website, choose your cylinder size, and confirm your delivery address. Takes under two minutes.',
    icon: Smartphone,
  },
  {
    number: '02',
    title: 'Station fills & prepares',
    body: 'Your nearest certified station receives the order instantly, fills and weighs your cylinder, and hands it to a verified rider.',
    icon: Zap,
  },
  {
    number: '03',
    title: 'Rider delivers to you',
    body: 'Track your rider in real time on the map. Delivery is confirmed with a secure OTP — no OTP, no handover.',
    icon: MapPin,
  },
]

const features = [
  {
    icon: MapPin,
    title: 'Real-time tracking',
    body: 'Watch your rider move toward you on a live map from the moment your order is picked up.',
  },
  {
    icon: ShieldCheck,
    title: 'OTP-verified delivery',
    body: 'Every delivery is secured with a one-time PIN so your gas only changes hands when you say so.',
  },
  {
    icon: CreditCard,
    title: 'Mobile Money & Card',
    body: 'Pay with MTN MoMo, Telecel Cash, AirtelTigo Money, or any Visa/Mastercard — no cash needed.',
  },
  {
    icon: Gift,
    title: 'Loyalty rewards',
    body: 'Earn GetGas points on every order. Redeem them for discounts on future deliveries.',
  },
  {
    icon: Clock,
    title: 'Fast delivery',
    body: 'We partner with stations near you to get your gas to you as quickly as possible, day or night.',
  },
  {
    icon: CheckCircle2,
    title: 'Certified cylinders',
    body: 'Every cylinder is weighed and inspected before dispatch. Safety is never optional.',
  },
]

const faqs = [
  {
    q: 'What cylinder sizes do you deliver?',
    a: 'We deliver 3 kg, 6 kg, and 14.5 kg LPG cylinders. Available sizes depend on your nearest partner station. You can see all options when placing your order.',
  },
  {
    q: 'How do I pay?',
    a: 'We accept MTN Mobile Money, Telecel Cash, AirtelTigo Money, and Visa/Mastercard debit or credit cards. All payments are processed securely — we never store your card details.',
  },
  {
    q: 'What is the OTP and why do I need it?',
    a: 'When your rider arrives, you receive a 4-digit one-time PIN. The rider enters this PIN in their app to confirm delivery. This ensures your cylinder is only handed over to you — nobody else can claim your order.',
  },
  {
    q: 'What if I am not home when the rider arrives?',
    a: 'You can designate a trusted adult to receive the delivery on your behalf. Just make sure they have the OTP. If nobody is available, the rider will contact you and you can reschedule.',
  },
  {
    q: 'How long does delivery take?',
    a: 'Delivery times depend on your location and the nearest available station. You can track your rider live on the map once the order is accepted.',
  },
  {
    q: 'Is GetGas available in my city?',
    a: 'GetGas is currently live in Accra, Kumasi, Tema, and Madina. We are expanding to more cities soon. If your city is not listed, use the contact page to let us know — your request helps us prioritise.',
  },
]

const testimonials = [
  {
    name: 'Abena Mensah',
    location: 'East Legon, Accra',
    quote:
      'I used to drive to the filling station every time we ran out of gas. With GetGas I just tap a button and it arrives before dinner. Brilliant service.',
    stars: 5,
  },
  {
    name: 'Kwame Asante',
    location: 'Kumasi',
    quote:
      'The OTP delivery gave me peace of mind. I knew exactly when the rider arrived and my cylinder was the right weight. No more shortchanging.',
    stars: 5,
  },
  {
    name: 'Ama Boateng',
    location: 'Tema, Greater Accra',
    quote:
      'Paid with MoMo, tracked on the map, gas arrived in 35 minutes. The loyalty points are a nice bonus too. Highly recommend.',
    stars: 5,
  },
]

const cities = [
  { name: 'Accra',     active: true },
  { name: 'Kumasi',    active: true },
  { name: 'Tema',      active: true },
  { name: 'Madina',    active: true },
  { name: 'Tamale',    active: false },
  { name: 'Takoradi',  active: false },
  { name: 'Kasoa',     active: false },
  { name: 'Ashaiman',  active: false },
]

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center bg-white overflow-hidden pt-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-orange-50 opacity-70" />
          <div className="absolute bottom-0 -left-24 w-[400px] h-[400px] rounded-full bg-orange-50/40" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div className="animate-fade-up text-center md:text-left">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-brand-orange mb-4">
              Fast & reliable LPG delivery in Ghana
            </span>
            <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-brand-dark leading-tight mb-6">
              LPG delivered<br />
              <span className="text-gradient">to your door.</span>
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md mx-auto md:mx-0">
              Order cooking gas from your phone. A verified rider brings it straight to you — tracked live, confirmed with your OTP, paid the Ghanaian way.
            </p>

            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <a
                href="https://getgas.com.gh/user"
                className="inline-flex items-center gap-2 bg-brand-orange text-white font-semibold px-7 py-3.5 rounded-full hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100"
              >
                Order Now <ArrowRight size={16} />
              </a>
              <a
                href="#download"
                className="inline-flex items-center gap-2 border border-gray-200 text-brand-dark font-semibold px-7 py-3.5 rounded-full hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                Download App
              </a>
            </div>

            {/* Trust bar */}
            <div className="mt-10 flex flex-wrap gap-4 text-sm text-gray-400 justify-center md:justify-start">
              {['10,000+ orders delivered', '50+ partner stations', 'OTP-verified every delivery'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-orange flex-shrink-0" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center animate-fade-up delay-200">
            <div className="relative">
              <div className="w-64 h-[520px] bg-brand-dark rounded-[3rem] shadow-2xl flex flex-col items-center justify-start border-4 border-gray-800 overflow-hidden">
                <div className="w-full h-8 bg-brand-dark flex items-center justify-center flex-shrink-0">
                  <div className="w-20 h-4 bg-gray-800 rounded-full" />
                </div>
                <div className="w-full px-4 mt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-[10px]">Good morning 👋</p>
                      <p className="text-white text-xs font-bold">Abena</p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center text-white text-xs font-bold">A</div>
                  </div>
                  <div className="bg-brand-orange rounded-2xl p-3 text-white">
                    <p className="text-[10px] opacity-80 mb-0.5">Rider on the way</p>
                    <p className="text-xl font-bold font-display">12 min away</p>
                    <p className="text-[10px] opacity-70 mt-0.5">14.5 kg cylinder · MoMo paid ✓</p>
                  </div>
                  <div className="bg-gray-800 rounded-2xl h-36 flex flex-col items-center justify-center gap-1 text-gray-500">
                    <MapPin size={20} className="text-brand-orange" />
                    <span className="text-[10px]">Live map tracking</span>
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-3 text-white text-[10px] space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-400">Cylinder</span><span>14.5 kg LPG</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Payment</span><span className="text-green-400">MoMo ✓</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">OTP</span><span className="text-brand-orange tracking-widest">••••</span></div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 top-20 bg-white rounded-2xl shadow-xl p-3 text-xs font-semibold text-brand-dark border border-gray-100 whitespace-nowrap">
                <span className="text-brand-orange">★★★★★</span><br />
                <span className="font-normal text-gray-500">Verified delivery</span>
              </div>
              <div className="absolute -left-10 bottom-20 bg-white rounded-2xl shadow-xl p-3 text-xs font-semibold text-brand-dark border border-gray-100 whitespace-nowrap">
                <span className="text-green-500">●</span> Rider nearby<br />
                <span className="text-gray-400 font-normal">0.8 km away</span>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ── How It Works ── */}
      <section className="py-24 bg-brand-gray" id="how-it-works">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Simple process</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">How GetGas works</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">From order to doorstep in three simple steps.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-6">
                  <span className="font-display text-5xl font-extrabold text-orange-100">{step.number}</span>
                  <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-orange-50 text-brand-orange">
                    <step.icon size={20} />
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-brand-dark mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-gray-300 z-10 bg-white rounded-full p-0.5">
                    <ArrowRight size={18} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-white" id="features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Why GetGas</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">Built for safety & convenience</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">Everything you need for a stress-free LPG delivery experience.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group p-7 rounded-3xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all">
                <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 text-brand-orange mb-5 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                  <f.icon size={22} />
                </span>
                <h3 className="font-display font-bold text-lg text-brand-dark mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Safety Banner ── */}
      <section className="py-20 bg-brand-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange mb-4 block">Your safety first</span>
              <h2 className="font-display text-4xl font-bold text-white mb-5">
                We take LPG safety seriously — so you don&apos;t have to worry.
              </h2>
              <p className="text-gray-400 leading-relaxed">
                LPG requires careful handling. That is why every part of the GetGas process is designed with safety at its core.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: ShieldCheck, title: 'NPA-certified stations', body: 'We only partner with stations licensed by the National Petroleum Authority of Ghana.' },
                { icon: CheckCircle2, title: 'Weighed before dispatch', body: 'Every cylinder is weighed and verified before it leaves the station — no underweight deliveries.' },
                { icon: Users, title: 'Screened & trained riders', body: 'All riders complete a GetGas safety orientation before their first delivery.' },
                { icon: TrendingUp, title: 'OTP handover', body: 'The 4-digit OTP ensures your cylinder is only handed to you or someone you trust.' },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <item.icon size={20} className="text-brand-orange mb-3" />
                  <p className="text-white text-sm font-semibold mb-1">{item.title}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── For Riders / For Stations ── */}
      <section className="py-24 bg-brand-gray">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Join the platform</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">Not a customer?</h2>
            <p className="text-gray-500 mt-3">GetGas works for riders and station owners too.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Riders card */}
            <div className="bg-brand-dark rounded-3xl p-8 flex flex-col">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-orange/20 text-brand-orange mb-6">
                <Smartphone size={22} />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">Become a rider</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-1">
                Turn your motorcycle or tricycle into a steady income. Deliver LPG to families across Ghana and get paid every week directly to your Mobile Money account.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-8">
                {['Weekly MoMo payouts', 'Flexible hours', 'In-app navigation', 'Free safety training'].map(b => (
                  <span key={b} className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-brand-orange" /> {b}
                  </span>
                ))}
              </div>
              <Link
                href="/riders"
                className="inline-flex items-center gap-2 bg-brand-orange text-white font-semibold px-6 py-3 rounded-full hover:bg-orange-600 transition-colors self-start"
              >
                Learn more <ArrowRight size={15} />
              </Link>
            </div>

            {/* Stations card */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 flex flex-col">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 text-brand-orange mb-6">
                <TrendingUp size={22} />
              </div>
              <h3 className="font-display text-2xl font-bold text-brand-dark mb-3">Partner your station</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">
                Connect your LPG filling station to GetGas and receive verified digital orders — with a real-time dashboard, transparent payouts, and zero joining fee.
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-8">
                {['Zero joining fee', 'Real-time dashboard', 'Weekly settlements', 'Wider customer reach'].map(b => (
                  <span key={b} className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-brand-orange" /> {b}
                  </span>
                ))}
              </div>
              <Link
                href="/stations"
                className="inline-flex items-center gap-2 border border-brand-orange text-brand-orange font-semibold px-6 py-3 rounded-full hover:bg-brand-orange hover:text-white transition-colors self-start"
              >
                Learn more <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Download ── */}
      <section className="py-24 bg-brand-dark" id="download">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Get the app</span>
            <h2 className="font-display text-4xl font-bold text-white mt-2 mb-4">
              Order gas from anywhere,<br />anytime.
            </h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              Available on Android. Track deliveries, manage your cylinders, view order history, and earn loyalty points — all in your pocket.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://play.google.com/store/apps/details?id=com.getgas.rider"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white text-brand-dark font-semibold px-6 py-3.5 rounded-2xl hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.32.17.69.19 1.04.05l11.69-6.74L13 14.18 3.18 23.76zm15.19-10.43L6.12 7.06 3.18.24C2.83.1 2.46.12 2.14.29 1.51.64 1.12 1.3 1.12 2v20c0 .7.39 1.36 1.02 1.71l9.86-9.88 6.37-3.5zM22.2 10.3l-2.91-1.68-3.25 1.96 3.25 3.25 2.9-1.67c.71-.41 1.15-1.16 1.15-1.93 0-.77-.44-1.52-1.14-1.93zM4.22.19L13 9.82l2.91-2.91L4.22.19z" />
                </svg>
                Google Play
              </a>
              <div className="flex items-center gap-3 bg-white/10 text-gray-400 font-semibold px-6 py-3.5 rounded-2xl cursor-not-allowed" title="Coming soon">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                App Store <span className="text-xs ml-1 text-gray-500">(coming soon)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="bg-white rounded-3xl p-8 text-center max-w-xs w-full">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                <Smartphone size={32} className="text-brand-orange" />
              </div>
              <p className="font-display font-bold text-brand-dark text-lg mb-2">No app? No problem.</p>
              <p className="text-sm text-gray-500 mb-5">
                Order directly from your browser — no download needed.
              </p>
              <a
                href="https://getgas.com.gh/user"
                className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-orange-600 transition-colors"
              >
                Order on Web <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Coverage ── */}
      <section className="py-24 bg-white" id="coverage">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Where we deliver</span>
          <h2 className="font-display text-4xl font-bold text-brand-dark mt-2 mb-4">Coverage across Ghana</h2>
          <p className="text-gray-500 max-w-lg mx-auto mb-12">
            GetGas is live and growing. Check if we deliver to your city below.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {cities.map(city => (
              <span
                key={city.name}
                className={`flex items-center gap-1.5 text-sm font-medium px-5 py-2.5 rounded-full border ${
                  city.active
                    ? 'bg-orange-50 text-brand-orange border-orange-100'
                    : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}
              >
                <MapPin size={13} />
                {city.name}
                {!city.active && <span className="text-[10px] ml-1 font-normal">(soon)</span>}
              </span>
            ))}
          </div>
          <p className="text-gray-400 text-sm mt-8">
            {"Don't see your city? "}
            <Link href="/contact" className="text-brand-orange hover:underline">Let us know →</Link>
          </p>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 bg-brand-gray" id="testimonials">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Customer stories</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">What our customers say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-3xl p-7 shadow-sm flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={16} className="text-brand-orange fill-brand-orange" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-brand-orange font-bold text-sm flex-shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-brand-dark text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 bg-white" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange">Got questions?</span>
            <h2 className="font-display text-4xl font-bold text-brand-dark mt-2">Frequently asked questions</h2>
            <p className="text-gray-500 mt-3">
              Can&apos;t find what you&apos;re looking for?{' '}
              <Link href="/contact" className="text-brand-orange hover:underline">Contact us →</Link>
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-brand-gray rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none font-semibold text-brand-dark text-sm select-none hover:text-brand-orange transition-colors">
                  {faq.q}
                  <ChevronDown size={16} className="flex-shrink-0 text-gray-400 group-open:rotate-180 transition-transform duration-200" />
                </summary>
                <div className="px-6 pb-5 text-gray-500 text-sm leading-relaxed border-t border-gray-200 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 bg-brand-orange">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Ready to order your gas?
          </h2>
          <p className="text-orange-100 text-lg mb-8">
            Join thousands of Ghanaians getting LPG delivered safely to their door.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://getgas.com.gh/user"
              className="inline-flex items-center gap-2 bg-white text-brand-orange font-bold px-10 py-4 rounded-full hover:bg-orange-50 transition-colors shadow-xl text-lg"
            >
              Order Now <ArrowRight size={18} />
            </a>
            <a
              href="#download"
              className="inline-flex items-center gap-2 border-2 border-white/50 text-white font-bold px-10 py-4 rounded-full hover:border-white transition-colors text-lg"
            >
              Get the App
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
