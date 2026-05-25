import mongoose, { Document, Schema } from 'mongoose';

export interface IZone extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  city: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ZoneSchema = new Schema<IZone>(
  {
    name:      { type: String, required: true, trim: true },
    city:      { type: String, required: true, trim: true },
    centerLat: { type: Number, required: true },
    centerLng: { type: Number, required: true },
    radiusKm:  { type: Number, required: true, min: 0.5, max: 100 },
    color:     { type: String, default: '#E87722' },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

ZoneSchema.index({ city: 1 });

export const Zone = mongoose.model<IZone>('Zone', ZoneSchema);
