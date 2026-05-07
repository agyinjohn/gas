import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  type: 'order_placed' | 'rider_assigned' | 'at_station' | 'en_route' | 'delivered' | 'cancelled' | 'payment' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:  { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    type:    { type: String, required: true },
    title:   { type: String, required: true },
    body:    { type: String, required: true },
    read:    { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
