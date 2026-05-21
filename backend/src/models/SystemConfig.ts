import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  supportWhatsApp?: string;  // WhatsApp number for support (e.g., +233XXXXXXXXX)
  supportPhoneNumber?: string;
  supportEmail?: string;
  companyName?: string;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    supportWhatsApp: { type: String, default: null },
    supportPhoneNumber: { type: String, default: null },
    supportEmail: { type: String, default: null },
    companyName: { type: String, default: 'GasGo' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

export const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
