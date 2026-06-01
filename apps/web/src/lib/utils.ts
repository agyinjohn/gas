import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  CYLINDER_SIZES,
  CYLINDER_LABELS,
  formatCylinders,
  totalCylinderCount,
  calcDeliveryFee,
  DELIVERY_BASE_FEE,
  DELIVERY_RATE_PER_KM,
  getOrderProgress,
  LOYALTY_REDEEM_RATE,
  LOYALTY_MIN_REDEEM,
  pointsToGHS,
  ghsToPoints,
  isPlaceholderPhone,
} from '@getgas/domain';

/** Tailwind class merge — web only */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Web-only status badge colors (Tailwind classes)
import type { OrderStatus } from '@getgas/types';

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  scheduled: 'bg-indigo-100 text-indigo-700',
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  at_station: 'bg-purple-100 text-purple-700',
  en_route: 'bg-brand-100 text-brand-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const CYLINDER_CATEGORY: Record<number, string> = {
  3: 'Small', 5: 'Small', 6: 'Small', 7: 'Small', 8: 'Small', 10: 'Small',
  13: 'Medium', 14: 'Medium', 16: 'Medium', 19: 'Medium', 25: 'Medium',
  30: 'Large', 35: 'Large', 49: 'Large', 50: 'Large', 55: 'Large', 60: 'Large', 72: 'Large',
};
