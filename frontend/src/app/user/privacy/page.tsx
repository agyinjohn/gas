'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: `GetGas Technologies Ltd ("GetGas", "we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share your data when you use the GetGas platform.\n\nThis policy complies with the Data Protection Act, 2012 (Act 843) of Ghana and applicable data protection regulations.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect the following categories of personal information:\n\n• Identity data: Your name and phone number provided at registration\n• Location data: Your GPS coordinates and delivery addresses\n• Transaction data: Order history, payment method type, and amounts paid\n• Device data: Device type, operating system, and app version\n• Usage data: How you interact with the app, pages visited, and features used\n• Communications: Messages you send to our support team\n\nWe do not collect or store your full card numbers or mobile money PINs. Payment processing is handled by Paystack.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use your personal information to:\n\n• Create and manage your account\n• Process and fulfil your orders\n• Calculate delivery routes and assign riders\n• Send order status notifications via SMS and push notifications\n• Process payments and issue refunds\n• Provide customer support\n• Improve our services through analytics\n• Comply with legal obligations\n• Detect and prevent fraud`,
  },
  {
    title: '4. Legal Basis for Processing',
    body: `We process your personal data on the following legal bases:\n\n• Contract performance: Processing necessary to fulfil your orders\n• Legitimate interests: Improving our services, fraud prevention, and security\n• Legal obligation: Compliance with Ghanaian law and regulatory requirements\n• Consent: Where you have explicitly agreed, such as for marketing communications`,
  },
  {
    title: '5. Location Data',
    body: `GetGas requires access to your device's location to:\n\n• Find nearby LPG stations\n• Set your delivery address accurately\n• Enable real-time rider tracking\n\nLocation access is requested only when you use the app. You can disable location permissions in your device settings, but this will limit the functionality of the app.\n\nRider location data is shared with you only during an active delivery and is not retained after the order is completed.`,
  },
  {
    title: '6. Sharing Your Information',
    body: `We share your information only as necessary:\n\n• With LPG stations: Your name, phone number, and delivery address to fulfil your order\n• With riders: Your name, phone number, and delivery location during active deliveries\n• With Paystack: Payment information for transaction processing\n• With Firebase: For push notification delivery\n• With mNotify: For SMS delivery in Ghana\n• With authorities: Where required by Ghanaian law or court order\n\nWe do not sell your personal data to third parties.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your personal data for as long as your account is active or as needed to provide services. Specifically:\n\n• Account data: Retained while your account is active and for 2 years after deletion\n• Order records: Retained for 5 years for regulatory and tax compliance\n• Location data: Deleted after order completion\n• Support communications: Retained for 2 years\n\nYou may request deletion of your account and associated data at any time.`,
  },
  {
    title: '8. Your Rights',
    body: `Under the Data Protection Act 2012 (Act 843), you have the right to:\n\n• Access the personal data we hold about you\n• Correct inaccurate or incomplete data\n• Request deletion of your data (subject to legal retention requirements)\n• Object to processing of your data for marketing purposes\n• Withdraw consent where processing is based on consent\n\nTo exercise any of these rights, contact us at privacy@GetGas.com.gh. We will respond within 30 days.`,
  },
  {
    title: '9. Security',
    body: `We implement appropriate technical and organisational measures to protect your personal data, including:\n\n• Encrypted data transmission (HTTPS/TLS)\n• JWT-based authentication with secure token storage\n• Access controls limiting staff access to personal data\n• Regular security reviews\n\nHowever, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.`,
  },
  {
    title: '10. Cookies and Analytics',
    body: `Our web platform may use cookies and similar technologies to improve your experience and analyse usage. You can control cookie settings through your browser.\n\nWe use anonymised analytics data to understand how users interact with our platform. This data cannot be used to identify you personally.`,
  },
  {
    title: '11. Children\'s Privacy',
    body: `GetGas is not intended for use by persons under the age of 18. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us immediately and we will delete it.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes via the app or by SMS. Your continued use of GetGas after changes are posted constitutes acceptance of the updated policy.\n\nLast updated: January 2025`,
  },
  {
    title: '13. Contact & Complaints',
    body: `For privacy-related queries or to exercise your rights:\n\nData Protection Officer\nGetGas Technologies Ltd\nEmail: privacy@GetGas.com.gh\nPhone: +233 24 123 4567\nAccra, Ghana\n\nYou also have the right to lodge a complaint with the Data Protection Commission of Ghana.`,
  },
];

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-full bg-[var(--bg)] pb-24">
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 pt-12 pb-4 lg:pt-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Privacy Policy</h1>
            <p className="text-xs text-[var(--text-muted)]">Last updated January 2025</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-4">

        {/* Intro banner */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Your privacy matters to us. This policy explains exactly what data we collect, why we collect it, and how we protect it — in plain language.
          </p>
        </div>

        {/* Sections */}
        {SECTIONS.map(({ title, body }) => (
          <div key={title} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5">
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">{title}</h2>
            {body.split('\n').map((line, i) => (
              line.trim() === ''
                ? <div key={i} className="h-2" />
                : <p key={i} className="text-sm text-[var(--text-muted)] leading-relaxed">{line}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
