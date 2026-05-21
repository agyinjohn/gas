import mongoose, { Document, Schema } from 'mongoose';

export interface IPricingConfig extends Document {
  // Delivery fee (distance-based)
  baseFee: number;            // minimum/floor fee for any delivery (GH₵)
  pricePerKm: number;         // GH₵ charged per km beyond freeKm
  freeKm: number;             // km included in baseFee at no extra charge
  maxDeliveryFee: number;     // cap so far customers aren't overcharged
  // Rider commission
  riderCommissionPct: number; // % deducted from delivery fee before paying rider
  // Surge
  surgeMultiplier: number;
  surgeActive: boolean;
  surgeReason?: string;
  // Caps & freeze
  minPriceCaps: { size: number; min: number }[];
  maxPriceCaps: { size: number; max: number }[];
  priceFreezeActive: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    baseFee:            { type: Number, default: 5,   min: 0 },
    pricePerKm:         { type: Number, default: 2,   min: 0 },
    freeKm:             { type: Number, default: 2,   min: 0 },
    maxDeliveryFee:     { type: Number, default: 50,  min: 0 },
    riderCommissionPct: { type: Number, default: 10,  min: 0, max: 100 },
    surgeMultiplier:    { type: Number, default: 1.0, min: 1.0, max: 5.0 },
    surgeActive:        { type: Boolean, default: false },
    surgeReason:        String,
    minPriceCaps:       [{ size: Number, min: Number }],
    maxPriceCaps:       [{ size: Number, max: Number }],
    priceFreezeActive:  { type: Boolean, default: false },
    updatedBy:          { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

export const PricingConfig = mongoose.model<IPricingConfig>('PricingConfig', PricingConfigSchema);
