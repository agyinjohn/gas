'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Mail, MessageCircle, ChevronDown, HelpCircle, Package, CreditCard, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    category: 'Orders',
    icon: Package,
    items: [
      { q: 'How do I place an order?', a: 'Select a nearby station from the home screen, choose your cylinder size, set your delivery location, and proceed to payment. You can track your order in real-time once placed.' },
      { q: 'How long does delivery take?', a: "Most deliveries are completed within 30–60 minutes. You'll receive real-time updates and can track your rider on the map." },
      { q: 'Can I schedule a delivery for later?', a: 'Yes! During checkout, select "Schedule" instead of "ASAP" and pick your preferred date and time (minimum 30 minutes from now).' },
      { q: 'Can I cancel my order?', a: 'You can report an issue from the Order Details page. Our support team will process the cancellation and refund if the order has not yet been delivered.' },
    ],
  },
  {
    category: 'Payment',
    icon: CreditCard,
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept MTN Mobile Money, Vodafone Cash, AirtelTigo Money, Visa/Mastercard, and Cash on Delivery.' },
      { q: 'Is my payment secure?', a: 'Yes. All card and mobile money payments are processed through Paystack, a PCI-DSS compliant payment gateway. We never store your card details.' },
      { q: 'When will I be charged?', a: 'For mobile money and card payments, you are charged immediately at checkout. For cash on delivery, you pay the rider upon arrival.' },
      { q: 'How do refunds work?', a: 'If your order is cancelled before delivery, refunds are processed within 3–5 business days to your original payment method.' },
    ],
  },
  {
    category: 'Delivery & Tracking',
    icon: MapPin,
    items: [
      { q: 'How do I track my delivery?', a: 'Once a rider accepts your order, tap "Live Tracking" from your order details. You will see the rider\'s real-time location on the map.' },
      { q: 'What is the delivery OTP?', a: 'When your rider arrives, they will give you a 4-digit OTP. Enter it in the app to confirm delivery. This protects both you and the rider.' },
      { q: 'What if the rider cannot find my location?', a: 'Call the rider directly from the tracking screen using the call button. Ensure your phone is reachable and your pin is accurate on the map.' },
    ],
  },
];

const CONTACT = [
  { icon: Phone,         label: 'Call Us',   value: '+233 24 123 4567',     href: 'tel:+233241234567'              },
  { icon: MessageCircle, label: 'WhatsApp',  value: '+233 24 123 4567',     href: 'https://wa.me/233241234567'     },
  { icon: Mail,          label: 'Email',     value: 'support@gasgo.com.gh', href: 'mailto:support@gasgo.com.gh'   },
];

export default function HelpPage() {
  const router = useRouter();
  const [openIdx, setOpenIdx] = useState<string | null>(null);

  return (
    <div className="min-h-full bg-[var(--bg)] pb-24">
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 pt-12 pb-4 lg:pt-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Help & Support</h1>
            <p className="text-xs text-[var(--text-muted)]">We're here to help</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">

        {/* Contact cards */}
        <div className="grid grid-cols-3 gap-3">
          {CONTACT.map(({ icon: Icon, label, value, href }) => (
            <a key={label} href={href}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-brand-500/50 transition-all active:scale-[0.98]">
              <div className="w-10 h-10 bg-brand-500/15 rounded-full flex items-center justify-center">
                <Icon className="w-4 h-4 text-brand-500" />
              </div>
              <p className="text-xs font-bold text-[var(--text-primary)]">{label}</p>
              <p className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{value}</p>
            </a>
          ))}
        </div>

        {/* FAQs */}
        {FAQS.map(({ category, icon: Icon, items }) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-brand-500/15 rounded-xl flex items-center justify-center">
                <Icon className="w-4 h-4 text-brand-500" />
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{category}</h2>
            </div>
            <div className="space-y-2">
              {items.map((faq, i) => {
                const key = `${category}-${i}`;
                const open = openIdx === key;
                return (
                  <div key={key} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                    <button onClick={() => setOpenIdx(open ? null : key)}
                      className="w-full flex items-center justify-between p-4 text-left gap-3">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{faq.q}</span>
                      <ChevronDown className={cn('w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform', open && 'rotate-180')} />
                    </button>
                    {open && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-5 text-center">
          <HelpCircle className="w-10 h-10 text-brand-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">Still need help?</p>
          <p className="text-xs text-[var(--text-muted)] mb-4">Our support team is available Mon–Sat, 8AM–6PM.</p>
          <a href="tel:+233241234567"
            className="inline-flex items-center gap-2 bg-brand-500 text-white text-sm font-bold px-5 py-3 rounded-xl">
            <Phone className="w-4 h-4" /> Call Support
          </a>
        </div>
      </div>
    </div>
  );
}
