import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CylinderLineItem, OrderStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `GH₵${amount.toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(date);
}

// ─── Order status ─────────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  scheduled:  'Scheduled',
  pending:    'Order Placed',
  accepted:   'Rider En Route to Station',
  at_station: 'Preparing Your Order',
  en_route:   'On the Way',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  scheduled:  'bg-indigo-100 text-indigo-700',
  pending:    'bg-yellow-100 text-yellow-700',
  accepted:   'bg-blue-100 text-blue-700',
  at_station: 'bg-purple-100 text-purple-700',
  en_route:   'bg-brand-100 text-brand-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'New Delivery',
  exchange: 'Cylinder Exchange',
  fill:     'Refill',
};

// ─── Cylinder helpers ─────────────────────────────────────────────────────────

export const CYLINDER_SIZES = [3, 5, 6, 7, 8, 10, 13, 14, 16, 19, 25, 30, 35, 49, 50, 55, 60, 72];

export const CYLINDER_LABELS: Record<number, string> = {
  3:  '3kg — Portable / Camping',
  5:  '5kg — Small Home',
  6:  '6kg — Standard Home',
  7:  '7kg — Standard Home',
  8:  '8kg — Standard Home',
  10: '10kg — Medium Home',
  13: '13kg — Domestic Cooking',
  14: '14kg — Domestic / Semi-commercial',
  16: '16kg — Semi-commercial',
  19: '19kg — Commercial',
  25: '25kg — Large Commercial',
  30: '30kg — Large Commercial',
  35: '35kg — Large Commercial',
  49: '49kg — Industrial',
  50: '50kg — Industrial',
  55: '55kg — Industrial',
  60: '60kg — Industrial',
  72: '72kg — Industrial',
};

export const CYLINDER_CATEGORY: Record<number, string> = {
  3: 'Small', 5: 'Small', 6: 'Small', 7: 'Small', 8: 'Small', 10: 'Small',
  13: 'Medium', 14: 'Medium', 16: 'Medium', 19: 'Medium', 25: 'Medium',
  30: 'Large', 35: 'Large', 49: 'Large', 50: 'Large', 55: 'Large', 60: 'Large', 72: 'Large',
};

/** Format cylinder line items as a readable string e.g. "1×3kg, 2×6kg" */
export function formatCylinders(cylinders: CylinderLineItem[]): string {
  return cylinders.map((c) => `${c.quantity}×${c.size}kg`).join(', ');
}

/** Total cylinder count across all line items */
export function totalCylinderCount(cylinders: CylinderLineItem[]): number {
  return cylinders.reduce((sum, c) => sum + c.quantity, 0);
}

// ─── Delivery fee ─────────────────────────────────────────────────────────────

export const DELIVERY_BASE_FEE        = 15;    // GHS — floor, never charge less
export const DELIVERY_RATE_PER_KM     = 5 // GHS per km (adjustable)
export const DELIVERY_DISTANCE_FACTOR = 1.5;   // effective trip multiplier (round-trip discount)

/**
 * Calculate delivery fee based on straight-line distance from customer to station.
 * Effective distance = 1.5 × distanceKm (round-trip with discount).
 * Fee = max(DELIVERY_BASE_FEE, round(effectiveDistance × DELIVERY_RATE_PER_KM))
 */
export function calcDeliveryFee(distanceKm: number): number {
  const effective = DELIVERY_DISTANCE_FACTOR * distanceKm;
  return Math.max(DELIVERY_BASE_FEE, Math.round(effective * DELIVERY_RATE_PER_KM));
}

// ─── Order progress ───────────────────────────────────────────────────────────

export function getOrderProgress(status: OrderStatus): number {
  const steps: OrderStatus[] = ['pending', 'accepted', 'at_station', 'en_route', 'delivered'];
  const idx = steps.indexOf(status);
  return idx === -1 ? 0 : Math.round((idx / (steps.length - 1)) * 100);
}

// ─── Loyalty ──────────────────────────────────────────────────────────────────

export const LOYALTY_REDEEM_RATE = 100; // 100 points = GH₵1
export const LOYALTY_MIN_REDEEM  = 100;

export function pointsToGHS(points: number): number {
  return +(points / LOYALTY_REDEEM_RATE).toFixed(2);
}

export function ghsToPoints(ghs: number): number {
  return Math.floor(ghs * LOYALTY_REDEEM_RATE);
}
