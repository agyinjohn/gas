import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/shared/Providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['400','600','700','800'] });

export const metadata: Metadata = {
  title: 'GetGas — On-Demand Gas Delivery',
  description: 'Get LPG cylinders delivered to your door within minutes',
  manifest: '/manifest.json',
  themeColor: '#F97316',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('theme');
              var preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              if ((t || preferred) === 'dark') document.documentElement.classList.add('dark');
            } catch(e){}
          })()
        ` }} />
      </head>
      <body className={`${inter.variable} ${sora.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { borderRadius: '12px', fontFamily: 'var(--font-sans)' },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

