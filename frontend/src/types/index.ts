export type CylinderSize = 3 | 4 | 5 | 6 | 9 | 11 | 12 | 14 | 15 | 18 | 19 | 20 | 30 | 47 | 48;
export type OrderType = 'delivery' | 'exchange';
export type OrderStatus =
  | 'scheduled'
  | 'pending'
  | 'accepted'
  | 'at_station'
  | 'en_route'
  | 'delivered'
  | 'cancelled';
export type PaymentMethod = 'mobile_money' | 'card' | 'cash';
export type KycStatus = 'pending' | 'approved' | 'rejected';
export type StationStatus = 'pending' | 'active' | 'suspended' | 'banned';

// ─── Cylinder ─────────────────────────────────────────────────────────────────

export interface CylinderListing {
  size: CylinderSize;
  brand: string;
  fillType: string;
  fillPrice: number;
  exchangePrice: number;
  stockCount: number;
  needsRefillCount: number;
  lowStockThreshold: number;
  isPaused: boolean;
  isAvailable: boolean;
}

export interface CylinderLineItem {
  size: CylinderSize;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// ─── Station ──────────────────────────────────────────────────────────────────

export interface OperatingHours {
  open: string;
  close: string;
  isOpen: boolean;
}

export interface Station {
  _id: string;
  id?: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  ratingAvg: number;
  totalRatings: number;
  totalOrders: number;
  cylinderListings: CylinderListing[];
  status: StationStatus;
  commissionPct: number;
  operatingHours: Record<string, OperatingHours>;
  bankAccount?: { provider: string; accountNumber: string; accountName: string };
}

// ─── Rider ────────────────────────────────────────────────────────────────────

export interface Rider {
  _id: string;
  name: string;
  phone: string;
  vehicleType: 'motorbike' | 'tricycle' | 'van';
  vehiclePlate: string;
  profilePhoto?: string;
  kycDocumentUrl?: string;
  kycStatus: KycStatus;
  kycRejectionReason?: string;
  status: 'offline' | 'available' | 'busy' | 'on_break';
  location?: { lat: number; lng: number; updatedAt: string };
  ratingAvg: number;
  totalTrips: number;
  totalEarnings: number;
  totalRatings: number;
  bankAccount?: { provider: string; accountNumber: string; accountName: string; recipientCode?: string };
}

// ─── Order ────────────────────────────────────────────────────────────────────

export interface Order {
  _id: string;
  userId: string | { _id: string; name: string; phone: string };
  stationId: string | Station;
  riderId?: string | Rider;

  cylinders: CylinderLineItem[];
  orderType: OrderType;

  cylinderSubtotal: number;
  deliveryFee: number;
  totalAmount: number;
  commissionPct: number;
  commissionAmount: number;
  stationPayout: number;
  surgeMultiplier: number;

  loyaltyDiscount: number;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;

  status: OrderStatus;
  statusHistory: Array<{
    status: string;
    triggeredBy: string;
    timestamp: string;
    note?: string;
  }>;

  deliveryAddress: { street: string; city: string; lat: number; lng: number };

  otpCode?: string;
  otpVerifiedAt?: string;

  paymentMethod: PaymentMethod;
  paymentProvider?: string;
  paymentStatus: 'pending' | 'captured' | 'released' | 'refunded';

  riderRating?: number;
  riderRatingComment?: string;
  ratedAt?: string;

  stationRating?: number;
  stationRatingComment?: string;
  stationRatedAt?: string;

  isScheduled: boolean;
  scheduledFor?: string;

  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface SavedAddress {
  _id: string;
  label: string;
  street: string;
  city: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export interface PaymentMethodSaved {
  _id: string;
  type: PaymentMethod;
  provider?: string;
  accountNumber?: string;
  last4?: string;
  isDefault: boolean;
}

export interface User {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  profilePhoto?: string;
  savedAddresses: SavedAddress[];
  paymentMethods: PaymentMethodSaved[];
  totalOrders: number;
  loyaltyPoints: number;
  referralCode?: string;
  referralCount: number;
  ratingAvg: number;
  isVerified: boolean;
}

// ─── Loyalty ──────────────────────────────────────────────────────────────────

export interface LoyaltyTransaction {
  _id: string;
  type: 'earn' | 'redeem' | 'expire' | 'adjustment';
  points: number;
  balanceAfter: number;
  description: string;
  orderId?: { _id: string; cylinders: CylinderLineItem[]; orderType: OrderType; createdAt: string };
  createdAt: string;
}

// ─── Payout ───────────────────────────────────────────────────────────────────

export interface Payout {
  _id: string;
  recipientType: 'rider' | 'station';
  amountGHS: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  orderId?: { _id: string; cylinders: CylinderLineItem[]; orderType: OrderType; createdAt: string };
  createdAt: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  orders: { total: number; today: number };
  stations: { active: number; pending: number };
  riders: { active: number; pendingKYC: number };
  financials: { monthGMV: number; monthCommission: number; avgOrderValue: number };
  users: { newToday: number };
}

export interface PricingConfig {
  deliveryFeeFlat: number;
  surgeMultiplier: number;
  surgeActive: boolean;
  surgeReason?: string;
  priceFreezeActive: boolean;
  minPriceCaps: { size: number; min: number }[];
  maxPriceCaps: { size: number; max: number }[];
}

// ─── Review ───────────────────────────────────────────────────────────────────

export interface StationReview {
  _id: string;
  stationRating: number;
  stationRatingComment?: string;
  stationRatedAt: string;
  userId: { _id: string; name: string };
  cylinders: CylinderLineItem[];
  orderType: OrderType;
}
