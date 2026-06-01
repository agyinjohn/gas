'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Package, DollarSign, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/rider',           icon: TrendingUp, label: 'Home'     },
  { href: '/rider/orders',    icon: Package,    label: 'Orders'   },
  { href: '/rider/earnings',  icon: DollarSign, label: 'Earnings' },
  { href: '/rider/profile',   icon: User,       label: 'Profile'  },
] as const;

export default function RiderNav() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex z-30">
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = href === '/rider' ? pathname === '/rider' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 py-3 flex flex-col items-center gap-1 transition-colors',
              active ? 'text-brand-500' : 'text-gray-400'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className={cn('text-xs', active && 'font-medium')}>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
