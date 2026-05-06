'use client';
import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Star, ArrowLeft, MapPin, Clock } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { useOrderTracking } from '@/hooks/useSocket';
import { Order, OrderStatus } from '@/types';
import { Button, Card, StatusBadge, StepIndicator, BottomSheet } from '@/components/ui';
import { formatCurrency, formatRelativeTime, ORDER_STATUS_LABELS } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STEPS = ['Order Placed', 'Rider Assigned', 'At Station', 'On the Way', 'Delivered'];
const STATUS_STEP: Record<OrderStatus, number> = {
  pending: 0,
  accepted: 1,
  at_station: 2,
  en_route: 3,
  delivered: 4,
  cancelled: 0,
};

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showOTPSheet, setShowOTPSheet] = useState(false);
  const [showRatingSheet, setShowRatingSheet] = useState(false);
  const [otp, setOtp] = useState('');
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id).then((r) => r.data.order as Order),
    refetchInterval: 30000,
  });

  const order = data;

  const handleStatusChange = useCallback((status: string) => {
    queryClient.invalidateQueries({ queryKey: ['order', id] });
    toast(`Order ${ORDER_STATUS_LABELS[status as OrderStatus] || status}`, { icon: '📦' });
    if (status === 'en_route') setShowOTPSheet(true);
    if (status === 'delivered') setShowRatingSheet(true);
  }, [id, queryClient]);

  const handleLocationUpdate = useCallback((loc: { lat: number; lng: number }) => {
    setRiderLocation(loc);
  }, []);

  useOrderTracking(id, handleStatusChange, handleLocationUpdate);

  const handleConfirmDelivery = async () => {
    if (otp.length !== 4) return toast.error('Enter the 4-digit OTP');
    setOtpLoading(true);
    try {
      await ordersApi.confirmDelivery(id, otp);
      setShowOTPSheet(false);
      setShowRatingSheet(true);
      toast.success('Delivery confirmed!');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    setRatingLoading(true);
    try {
      await ordersApi.rate(id, rating, ratingComment);
      setShowRatingSheet(false);
      toast.success('Thank you for your feedback!');
      refetch();
    } catch {
      toast.error('Failed to submit rating');
    } finally {
      setRatingLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-center text-gray-400">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm">Loading order...</p>
        </div>
      </div>
    );
  }

  const rider = typeof order.riderId === 'object' ? order.riderId : null;
  const station = typeof order.stationId === 'object' ? order.stationId : null;
  const currentStep = STATUS_STEP[order.status];

  return (
    <div className="bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-brand-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/user/orders" className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-semibold">Order #{id.slice(-6).toUpperCase()}</h1>
            <p className="text-brand-200 text-xs">{formatRelativeTime(order.createdAt)}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Progress Steps */}
        {order.status !== 'cancelled' && (
          <StepIndicator steps={STEPS} current={currentStep} />
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Map Placeholder — replace with Google Maps component */}
        {['accepted', 'at_station', 'en_route'].includes(order.status) && (
          <Card className="p-0 overflow-hidden">
            <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center relative">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-brand-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Live Map</p>
                <p className="text-xs text-gray-500">
                  {riderLocation
                    ? `Rider at ${riderLocation.lat.toFixed(4)}, ${riderLocation.lng.toFixed(4)}`
                    : 'Waiting for rider location...'}
                </p>
              </div>
              {order.status === 'en_route' && (
                <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-medium animate-pulse">
                  Live
                </div>
              )}
            </div>

            {/* ETA */}
            {order.status === 'en_route' && (
              <div className="px-4 py-3 flex items-center gap-2 border-t border-gray-100">
                <Clock className="w-4 h-4 text-brand-500" />
                <span className="text-sm font-medium text-gray-700">Estimated arrival in ~15 min</span>
              </div>
            )}
          </Card>
        )}

        {/* Rider Card */}
        {rider && (
          <Card>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Your Rider</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
                <span className="text-brand-600 font-bold text-lg">
                  {(rider as any).name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{(rider as any).name}</p>
                <div className="flex items-center gap-1 text-sm text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="font-medium">{(rider as any).ratingAvg?.toFixed(1)}</span>
                  <span className="text-gray-400">· {(rider as any).vehicleType}</span>
                </div>
              </div>
              <a href={`tel:${(rider as any).phone}`}>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
              </a>
            </div>
          </Card>
        )}

        {/* Order Details */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Order Details</h2>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Cylinder', value: `${order.cylinderSize}kg` },
              { label: 'Order Type', value: order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1) },
              { label: 'Station', value: station ? (station as any).name : '—' },
              { label: 'Delivery Address', value: `${order.deliveryAddress.street}, ${order.deliveryAddress.city}` },
              { label: 'Payment', value: `${order.paymentMethod.replace('_', ' ')} · ${order.paymentStatus}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800 text-right max-w-[55%]">{value}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="font-semibold text-gray-700">Total Paid</span>
              <span className="font-bold text-brand-600">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </Card>

        {/* Confirm Delivery Button (only for en_route without OTP sheet) */}
        {order.status === 'en_route' && !order.otpVerifiedAt && (
          <Button className="w-full" onClick={() => setShowOTPSheet(true)}>
            Enter Delivery OTP
          </Button>
        )}

        {/* Status History */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Status History</h2>
          <div className="space-y-3">
            {order.statusHistory.map((event, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-brand-500 rounded-full mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {ORDER_STATUS_LABELS[event.status as OrderStatus] || event.status}
                  </p>
                  <p className="text-xs text-gray-400">{formatRelativeTime(event.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* OTP Confirmation Sheet */}
      <BottomSheet open={showOTPSheet} onClose={() => setShowOTPSheet(false)} title="Confirm Delivery">
        <p className="text-sm text-gray-600 mb-4">
          Ask your rider to enter the OTP code on their screen, or enter it below to confirm you received your gas.
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="0000"
          className="w-full rounded-xl border border-gray-200 px-4 py-4 text-center text-3xl tracking-[1.5em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
        />
        <Button className="w-full" loading={otpLoading} onClick={handleConfirmDelivery}>
          Confirm Delivery
        </Button>
      </BottomSheet>

      {/* Rating Sheet */}
      <BottomSheet open={showRatingSheet} onClose={() => setShowRatingSheet(false)} title="Rate Your Rider">
        <p className="text-sm text-gray-500 mb-4">How was your experience?</p>
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setRating(star)}>
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= rating ? 'text-amber-400 fill-current' : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        <textarea
          value={ratingComment}
          onChange={(e) => setRatingComment(e.target.value)}
          placeholder="Any comments? (optional)"
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4 resize-none"
        />
        <Button className="w-full" loading={ratingLoading} onClick={handleSubmitRating}>
          Submit Rating
        </Button>
        <button
          className="w-full text-center text-sm text-gray-400 mt-3"
          onClick={() => setShowRatingSheet(false)}
        >
          Skip
        </button>
      </BottomSheet>
    </div>
  );
}
