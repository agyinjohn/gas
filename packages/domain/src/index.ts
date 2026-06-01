import type { CylinderLineItem, OrderStatus } from '@getgas/types';

export function formatCurrency(amount: number): string {
  return `GH₵${amount.toFixed(2)}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  scheduled: 'Scheduled',
  pending: 'Order Placed',
  accepted: 'Rider En Route to Station',
  at_station: 'Preparing Your Order',
  en_route: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: 'New Delivery',
  exchange: 'Cylinder Exchange',
  fill: 'Refill',
};

export const CYLINDER_SIZES = [3, 5, 6, 7, 8, 10, 13, 14, 16, 19, 25, 30, 35, 49, 50, 55, 60, 72];

export const CYLINDER_LABELS: Record<number, string> = {
  3: '3kg — Portable / Camping',
  5: '5kg — Small Home',
  6: '6kg — Standard Home',
  7: '7kg — Standard Home',
  8: '8kg — Standard Home',
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

export function formatCylinders(cylinders: CylinderLineItem[]): string {
  return cylinders.map((c) => `${c.quantity}×${c.size}kg`).join(', ');
}

export function totalCylinderCount(cylinders: CylinderLineItem[]): number {
  return cylinders.reduce((sum, c) => sum + c.quantity, 0);
}

export const DELIVERY_BASE_FEE = 15;
export const DELIVERY_RATE_PER_KM = 5;
export const DELIVERY_DISTANCE_FACTOR = 1.5;

/** Effective distance = factor × straight-line km; fee floored at base. */
export function calcDeliveryFee(distanceKm: number): number {
  const effective = DELIVERY_DISTANCE_FACTOR * distanceKm;
  return Math.max(DELIVERY_BASE_FEE, Math.round(effective * DELIVERY_RATE_PER_KM));
}

export function getOrderProgress(status: OrderStatus): number {
  const steps: OrderStatus[] = ['pending', 'accepted', 'at_station', 'en_route', 'delivered'];
  const idx = steps.indexOf(status);
  return idx === -1 ? 0 : Math.round((idx / (steps.length - 1)) * 100);
}

export const LOYALTY_REDEEM_RATE = 100;
export const LOYALTY_MIN_REDEEM = 100;

export function pointsToGHS(points: number): number {
  return +(points / LOYALTY_REDEEM_RATE).toFixed(2);
}

export function ghsToPoints(ghs: number): number {
  return Math.floor(ghs * LOYALTY_REDEEM_RATE);
}

/** True when Google OAuth user still needs a real phone number */
export function isPlaceholderPhone(phone: string): boolean {
  return phone.startsWith('google_') || !phone.trim();
}

/** Normalize local Ghana input (0241234567) to E.164 (+233241234567) */
export function normalizeGhanaPhone(local: string): string {
  const digits = local.replace(/\D/g, '');
  const stripped = digits.startsWith('233') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits;
  return '+233' + stripped;
}

/** Validate 9-digit local Ghana number (without leading 0) */
export function validateGhanaPhoneLocal(local: string): boolean {
  const digits = local.replace(/\D/g, '');
  const stripped = digits.startsWith('0') ? digits.slice(1) : digits.startsWith('233') ? digits.slice(3) : digits;
  return stripped.length === 9;
}

/** Format +233XXXXXXXXX for display as 0XX XXX XXXX */
export function formatGhanaPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  const local = digits.startsWith('233') ? '0' + digits.slice(3) : digits;
  if (local.length !== 10) return e164;
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
