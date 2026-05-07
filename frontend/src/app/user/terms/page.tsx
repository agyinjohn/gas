'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By downloading, accessing, or using the GasGo mobile application or website ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use the Platform.\n\nGasGo is operated by GasGo Technologies Ltd, a company registered in Ghana. These Terms constitute a legally binding agreement between you and GasGo.`,
  },
  {
    title: '2. Eligibility',
    body: `You must be at least 18 years of age to use GasGo. By using the Platform, you represent and warrant that you are 18 years or older and have the legal capacity to enter into a binding agreement.\n\nGasGo reserves the right to refuse service to anyone at any time for any reason.`,
  },
  {
    title: '3. Services Provided',
    body: `GasGo is a technology platform that connects customers with licensed LPG (Liquefied Petroleum Gas) stations and delivery riders in Ghana. GasGo does not itself supply, store, or transport LPG cylinders.\n\nWe facilitate:\n• Ordering of LPG cylinders from registered stations\n• Real-time delivery tracking\n• Secure payment processing\n• Customer support`,
  },
  {
    title: '4. Orders and Delivery',
    body: `When you place an order through GasGo, you are entering into a transaction with the station fulfilling your order. GasGo acts as an intermediary and is not a party to the sale of LPG.\n\nDelivery times are estimates only. GasGo does not guarantee delivery within any specific timeframe. Factors such as traffic, weather, and station availability may affect delivery times.\n\nYou are responsible for ensuring someone is available at the delivery address to receive the order and provide the OTP confirmation.`,
  },
  {
    title: '5. Pricing and Payments',
    body: `Prices displayed on the Platform are set by individual stations and may vary. GasGo may apply a delivery fee which will be clearly shown before you confirm your order.\n\nAll payments are processed securely through Paystack. GasGo does not store your card or mobile money details.\n\nA 1% transaction charge applies to mobile money payments, as imposed by the payment processor. This charge is displayed before you confirm payment.`,
  },
  {
    title: '6. Cancellations and Refunds',
    body: `You may request a cancellation before the rider has picked up your order. Once the rider is en route, cancellations are subject to review.\n\nRefunds for eligible cancellations will be processed within 3–5 business days to your original payment method. Cash on delivery orders are not eligible for refunds after delivery.\n\nGasGo reserves the right to cancel any order at its discretion, including in cases of suspected fraud or unavailability of stock.`,
  },
  {
    title: '7. User Conduct',
    body: `You agree not to:\n• Provide false or misleading information\n• Use the Platform for any unlawful purpose\n• Attempt to gain unauthorised access to any part of the Platform\n• Harass, abuse, or threaten riders, station staff, or GasGo employees\n• Submit fraudulent orders or payment information\n\nViolation of these rules may result in immediate suspension or termination of your account.`,
  },
  {
    title: '8. Loyalty Programme',
    body: `GasGo may offer a loyalty points programme. Points are earned on eligible orders and can be redeemed for discounts on future orders. Points have no cash value and cannot be transferred.\n\nGasGo reserves the right to modify, suspend, or terminate the loyalty programme at any time without prior notice.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the maximum extent permitted by Ghanaian law, GasGo shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform or any order placed through it.\n\nGasGo's total liability to you for any claim arising from these Terms shall not exceed the amount you paid for the specific order giving rise to the claim.`,
  },
  {
    title: '10. Governing Law',
    body: `These Terms are governed by and construed in accordance with the laws of the Republic of Ghana. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Ghana.\n\nFor consumer disputes, you may also contact the Ghana Standards Authority or the National Communications Authority as applicable.`,
  },
  {
    title: '11. Changes to Terms',
    body: `GasGo reserves the right to update these Terms at any time. We will notify you of significant changes via the app or email. Your continued use of the Platform after changes are posted constitutes your acceptance of the revised Terms.\n\nLast updated: January 2025`,
  },
  {
    title: '12. Contact',
    body: `If you have questions about these Terms, please contact us:\n\nGasGo Technologies Ltd\nEmail: legal@gasgo.com.gh\nPhone: +233 24 123 4567\nAddress: Accra, Ghana`,
  },
];

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-full bg-[var(--bg)] pb-24">
      <div className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 pt-12 pb-4 lg:pt-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--bg-card2)] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Terms of Service</h1>
            <p className="text-xs text-[var(--text-muted)]">Last updated January 2025</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-4">

        {/* Intro banner */}
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4 flex items-start gap-3">
          <FileText className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Please read these Terms carefully before using GasGo. By using our platform, you agree to be bound by these Terms.
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
