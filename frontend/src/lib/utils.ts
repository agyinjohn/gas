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

export const CYLINDER_SIZES = [3, 4, 5, 6, 9, 11, 12, 14, 15, 18, 19, 20, 30, 47, 48];

export const CYLINDER_LABELS: Record<number, string> = {
  3:  '3kg — Portable / Camping',
  4:  '4kg — Portable / BBQ',
  5:  '5kg — Small Home',
  6:  '6kg — Standard Home',
  9:  '9kg — Medium Home',
  11: '11kg — Domestic Cooking',
  12: '12kg — Domestic Cooking',
  14: '14kg — Domestic / Semi-commercial',
  15: '15kg — Domestic / Semi-commercial',
  18: '18kg — Commercial',
  19: '19kg — Commercial',
  20: '20kg — Commercial',
  30: '30kg — Large Commercial',
  47: '47kg — Industrial',
  48: '48kg — Industrial',
};

export const CYLINDER_CATEGORY: Record<number, string> = {
  3: 'Small', 4: 'Small', 5: 'Small', 6: 'Small', 9: 'Small',
  11: 'Medium', 12: 'Medium', 14: 'Medium', 15: 'Medium',
  18: 'Large', 19: 'Large', 20: 'Large', 30: 'Large', 47: 'Large', 48: 'Large',
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
