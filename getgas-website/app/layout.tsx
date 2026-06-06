import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: {
    default: 'GetGas — LPG Delivered to Your Door',
    template: '%s | GetGas',
  },
  description:
    'Order LPG cooking gas online and get it delivered to your door in Accra, Kumasi, and across Ghana. Real-time tracking, OTP-verified delivery, Mobile Money payments.',
  keywords: ['LPG delivery', 'gas delivery Ghana', 'cooking gas Accra', 'GetGas'],
  openGraph: {
    title: 'GetGas — LPG Delivered to Your Door',
    description: 'Fast, safe, and reliable LPG delivery across Ghana.',
    url: 'https://getgas.com.gh',
    siteName: 'GetGas',
    locale: 'en_GH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetGas — LPG Delivered to Your Door',
    description: 'Fast, safe, and reliable LPG delivery across Ghana.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
