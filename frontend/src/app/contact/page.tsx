'use client'

import { useState } from 'react'
import { MessageCircle, Mail, MapPin, Send } from 'lucide-react'

export default function ContactPage() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: wire to backend / Formspree / EmailJS
    setSent(true)
  }

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-brand-gray">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange mb-4 block">Get in touch</span>
          <h1 className="font-display text-5xl font-extrabold text-brand-dark mb-4">We're here to help</h1>
          <p className="text-gray-500 text-lg">
            Questions about an order, partnership enquiries, or just want to say hi — reach out and we'll respond within one business day.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-16">
          {/* Contact info */}
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-brand-dark mb-6">Contact options</h2>
              <div className="space-y-5">
                {[
                  {
                    icon: MessageCircle,
                    label: 'WhatsApp',
                    value: '+233 XX XXX XXXX',
                    sub: 'Mon – Sat, 7am – 9pm',
                    href: 'https://wa.me/233XXXXXXXXX',
                  },
                  {
                    icon: Mail,
                    label: 'Email',
                    value: 'hello@getgas.com.gh',
                    sub: 'Reply within 24 hours',
                    href: 'mailto:hello@getgas.com.gh',
                  },
                  {
                    icon: MapPin,
                    label: 'Head office',
                    value: 'Accra, Ghana',
                    sub: 'East Legon (by appointment)',
                    href: null,
                  },
                ].map(c => (
                  <div key={c.label} className="flex items-start gap-4 p-5 rounded-2xl border border-gray-100 hover:border-orange-200 transition-colors">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex-shrink-0">
                      <c.icon size={18} />
                    </span>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{c.label}</p>
                      {c.href ? (
                        <a href={c.href} className="font-semibold text-brand-dark hover:text-brand-orange transition-colors">
                          {c.value}
                        </a>
                      ) : (
                        <p className="font-semibold text-brand-dark">{c.value}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
              <p className="font-semibold text-brand-dark mb-1">Need urgent delivery support?</p>
              <p className="text-sm text-gray-500 mb-3">
                For issues with an active order, WhatsApp is the fastest way to reach our support team.
              </p>
              <a
                href="https://wa.me/233XXXXXXXXX"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-orange-600 transition-colors"
              >
                <MessageCircle size={14} /> Open WhatsApp
              </a>
            </div>
          </div>

          {/* Form */}
          <div>
            <h2 className="font-display text-2xl font-bold text-brand-dark mb-6">Send us a message</h2>
            {sent ? (
              <div className="bg-green-50 border border-green-100 rounded-3xl p-10 text-center">
                <div className="text-4xl mb-4">✅</div>
                <p className="font-display font-bold text-xl text-brand-dark mb-2">Message received!</p>
                <p className="text-gray-500 text-sm">We'll get back to you at {form.email} within one business day.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {[
                  { id: 'name',    label: 'Full name',      type: 'text',  placeholder: 'Kwame Mensah' },
                  { id: 'email',   label: 'Email address',  type: 'email', placeholder: 'you@example.com' },
                  { id: 'subject', label: 'Subject',        type: 'text',  placeholder: 'How can we help?' },
                ].map(field => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1.5">
                      {field.label}
                    </label>
                    <input
                      id={field.id}
                      type={field.type}
                      required
                      placeholder={field.placeholder}
                      value={(form as Record<string, string>)[field.id]}
                      onChange={e => setForm({ ...form, [field.id]: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    placeholder="Tell us more..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-brand-orange text-white font-semibold py-3.5 rounded-full hover:bg-orange-600 transition-colors"
                >
                  Send Message <Send size={15} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
