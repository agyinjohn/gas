import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — GetGas',
  description: 'GetGas Technologies Ltd privacy policy. How we collect, use, and protect your personal information.',
}

const sections = [
  {
    title: '1. Introduction',
    body: `GetGas Technologies Ltd ("GetGas", "we", "us", or "our") operates the GetGas mobile application and website (collectively, the "Platform"). This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our Platform.

By accessing or using the Platform, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of the Platform.`,
  },
  {
    title: '2. Information we collect',
    body: `We collect the following categories of information:

**Account information:** Full name, phone number, email address, and profile photo when you register.

**Location data:** Real-time GPS coordinates during an active delivery session to enable live tracking.

**Order information:** Delivery addresses, cylinder size preferences, order history, and payment method (method only — not card numbers).

**Device information:** Device type, operating system, app version, and device identifiers for crash reporting and support.

**Communication data:** Messages sent through our in-app chat or support form.`,
  },
  {
    title: '3. How we use your information',
    body: `We use your personal information to:

- Process and fulfil your LPG delivery orders
- Enable real-time rider tracking on your behalf
- Send OTP verification codes for delivery confirmation
- Process payments via our secure payment partners
- Communicate order updates, receipts, and support responses
- Improve our services through anonymised analytics
- Comply with applicable Ghanaian laws and regulations
- Detect and prevent fraud or abuse of the Platform`,
  },
  {
    title: '4. Sharing of information',
    body: `We share your information only as necessary:

**With riders:** Your first name, delivery address, and phone number are shared with the assigned rider to complete your delivery. Sharing is limited to the duration of the active order.

**With partner stations:** Your order details (cylinder size, quantity) are shared with the fulfilling station. Personal contact details are not shared with stations.

**With payment processors:** Payment processing is handled by third-party PCI-compliant payment providers. We do not store card details.

**With service providers:** We use third-party providers for hosting, analytics, and communications who are contractually bound to protect your data.

**Legal requirements:** We may disclose information if required by Ghanaian law or in response to a valid legal request.

We do not sell your personal information to any third party.`,
  },
  {
    title: '5. Location data',
    body: `Location access is requested when you place an order and is used exclusively to:

- Set your delivery address accurately on the map
- Enable real-time rider tracking during active deliveries
- Route the nearest available station to your order

Location tracking stops immediately when your order is completed or cancelled. You may disable location permissions in your device settings, but this will limit core functionality of the Platform.`,
  },
  {
    title: '6. Data retention',
    body: `We retain your personal data for as long as your account is active or as necessary to provide our services. Specifically:

- Account data is retained until account deletion is requested
- Order history is retained for 3 years for tax and compliance purposes
- Support conversations are retained for 12 months
- Anonymised usage analytics are retained indefinitely

You may request deletion of your account and associated personal data at any time (see Section 10).`,
  },
  {
    title: '7. Data security',
    body: `We implement industry-standard security measures including:

- HTTPS/TLS encryption for all data in transit
- Encrypted storage of sensitive data at rest
- OTP-based verification to prevent unauthorised delivery
- Regular security reviews of our infrastructure

No method of electronic transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security. In the event of a data breach that affects your rights, we will notify you as required by applicable law.`,
  },
  {
    title: '8. Children\'s privacy',
    body: `The GetGas Platform is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact us at privacy@getgas.com.gh and we will delete such information promptly.`,
  },
  {
    title: '9. Third-party links',
    body: `The Platform may contain links to third-party websites or services (such as payment providers or app stores). This Privacy Policy does not apply to those services. We encourage you to review the privacy policies of any third-party services you access through our Platform.`,
  },
  {
    title: '10. Your rights',
    body: `You have the following rights regarding your personal data:

- **Access:** Request a copy of the personal data we hold about you
- **Correction:** Request correction of inaccurate or incomplete data
- **Deletion:** Request deletion of your account and personal data
- **Portability:** Request your data in a machine-readable format
- **Objection:** Object to processing of your data for direct marketing

To exercise any of these rights, email privacy@getgas.com.gh with "Data Request" in the subject line. We will respond within 30 days.`,
  },
  {
    title: '11. Cookies and tracking',
    body: `Our website uses cookies and similar tracking technologies to:

- Maintain your session and login state
- Analyse traffic and usage patterns (via anonymised analytics)
- Remember your preferences

You can control cookie behaviour through your browser settings. Disabling cookies may affect the functionality of the website.`,
  },
  {
    title: '12. Changes to this policy',
    body: `We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date below and, for material changes, notify you via email or an in-app notice. Continued use of the Platform after changes become effective constitutes acceptance of the updated policy.`,
  },
  {
    title: '13. Contact us',
    body: `If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact:

**GetGas Technologies Ltd**
Email: privacy@getgas.com.gh
WhatsApp: +233 XX XXX XXXX
Address: Accra, Ghana

Last updated: June 2025`,
  },
]

export default function PrivacyPage() {
  return (
    <>
      <section className="pt-32 pb-12 bg-brand-gray">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-brand-orange mb-4 block">Legal</span>
          <h1 className="font-display text-4xl font-extrabold text-brand-dark mb-3">Privacy Policy</h1>
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
