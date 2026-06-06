import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — GetGas',
  description: 'GetGas Technologies Ltd terms of service. Understand your rights and obligations when using the GetGas platform.',
}

const sections = [
  {
    title: '1. Acceptance of terms',
    body: `By downloading, registering, or using the GetGas application or website (the "Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Platform.

These Terms form a binding legal agreement between you and GetGas Technologies Ltd ("GetGas", "we", "us"). We may update these Terms from time to time; your continued use of the Platform constitutes acceptance of the revised Terms.`,
  },
  {
    title: '2. Eligibility',
    body: `You must be at least 18 years old to use the GetGas Platform. By registering, you represent that you are at least 18 years of age and have the legal capacity to enter into this agreement.

Rider and station partner accounts are subject to additional eligibility requirements as described in the applicable partner terms.`,
  },
  {
    title: '3. Account registration',
    body: `To place orders, you must create an account using a valid phone number. You are responsible for:

- Keeping your account credentials confidential
- All activity that occurs under your account
- Notifying us immediately of any unauthorised use at hello@getgas.com.gh

We reserve the right to suspend or terminate accounts that violate these Terms.`,
  },
  {
    title: '4. Ordering and delivery',
    body: `When you place an order through the Platform:

- You are making a binding purchase of LPG and associated delivery services
- Pricing displayed is inclusive of all applicable fees unless stated otherwise
- Orders are subject to availability of partner stations in your delivery zone
- Estimated delivery times are approximate and may vary due to traffic, weather, or operational factors
- Delivery is completed upon OTP verification — the OTP is your confirmation that you have received the correct cylinder
- You must be present or designate a responsible adult to receive the delivery`,
  },
  {
    title: '5. Payments',
    body: `All payments are processed through our third-party payment partners. By placing an order, you authorise us to charge your selected payment method.

Accepted payment methods include Mobile Money (MTN MoMo, Telecel Cash, AirtelTigo Money) and Visa/Mastercard debit or credit cards.

All transactions are in Ghanaian Cedis (GHS). GetGas does not store your payment card details.`,
  },
  {
    title: '6. Cancellations and refunds',
    body: `You may cancel an order at no charge before it is accepted by a partner station.

Once an order is accepted and a rider has been assigned, a cancellation fee may apply to cover operational costs already incurred.

Refunds for failed or incorrect deliveries will be assessed on a case-by-case basis. Please contact support@getgas.com.gh within 24 hours of the incident with your order reference number.

Refunds, where approved, are processed to your original payment method within 3–5 business days.`,
  },
  {
    title: '7. Safety obligations',
    body: `LPG is a flammable gas. By using GetGas, you acknowledge that:

- You will handle cylinders in accordance with standard safety guidelines
- You will store cylinders in a well-ventilated area away from heat sources
- You will check cylinder valves and connections before use
- You will not tamper with the cylinder's safety seals

GetGas and its partner stations are not liable for injury or damage resulting from misuse or improper storage of LPG cylinders after delivery.`,
  },
  {
    title: '8. Prohibited uses',
    body: `You agree not to:

- Place fraudulent or fictitious orders
- Use the Platform for any unlawful purpose
- Attempt to reverse engineer, scrape, or exploit the Platform
- Harass, threaten, or abuse GetGas staff, riders, or station partners
- Resell deliveries for commercial gain without written authorisation from GetGas
- Circumvent our OTP delivery verification system`,
  },
  {
    title: '9. Intellectual property',
    body: `All content on the Platform — including the GetGas name, logo, design, software, and written content — is the property of GetGas Technologies Ltd or its licensors and is protected by applicable intellectual property laws.

You may not reproduce, distribute, or create derivative works from any Platform content without our prior written consent.`,
  },
  {
    title: '10. Limitation of liability',
    body: `To the maximum extent permitted by Ghanaian law, GetGas shall not be liable for:

- Indirect, incidental, special, or consequential damages
- Loss of data, revenue, or profits arising from use of the Platform
- Delays or failures in delivery caused by circumstances beyond our reasonable control (acts of God, traffic, civil unrest, fuel shortages)

Our total liability to you in connection with any order shall not exceed the value of that order.`,
  },
  {
    title: '11. Governing law',
    body: `These Terms are governed by and construed in accordance with the laws of the Republic of Ghana. Any disputes arising from or relating to these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana.

We encourage users to contact us directly to resolve any disputes before initiating formal proceedings.`,
  },
  {
    title: '12. Contact',
    body: `If you have questions about these Terms, please contact:

**GetGas Technologies Ltd**
Email: legal@getgas.com.gh
Address: Accra, Ghana

Last updated: June 2025`,
  },
]

export default function TermsPage() {
  return (
    <>
      <section className="pt-32 pb-12 bg-brand-gray">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange mb-4 block">Legal</span>
          <h1 className="font-display text-4xl font-extrabold text-brand-dark mb-3">Terms of Service</h1>
          <p className="text-gray-500">Last updated: June 2025</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="prose prose-gray max-w-none space-y-10">
            {sections.map((s, i) => (
              <div key={i}>
                <h2 className="font-display text-xl font-bold text-brand-dark mb-3">{s.title}</h2>
                <div className="text-gray-600 text-sm leading-relaxed space-y-3">
                  {s.body.split('\n\n').map((para, j) => (
                    <p key={j} dangerouslySetInnerHTML={{
                      __html: para
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br />')
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
