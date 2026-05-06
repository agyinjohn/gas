'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigation, Phone, CheckCircle, ArrowLeft } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { useRiderLocationBroadcast } from '@/hooks/useSocket';
import { Order } from '@/types';
import { Button, Card, StepIndicator } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const DELIVERY_STEPS = ['Go to Station', 'Pick Up Cylinder', 'Deliver to Customer'];
const EXCHANGE_STEPS = ['Go to Customer', 'Collect Old Cylinder', 'Go to Station', 'Deliver New Cylinder'];

const STATUS_ACTIONS: Record<string, { label: string; next: string }> = {
  accepted: { label: 'Arrived at Station', next: 'at_station' },
  at_station: { label: 'Cylinder Picked Up — En Route', next: 'en_route' },
};

export default function RiderOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id).then((r) => r.data.order as Order),
    refetchInterval: 15000,
  });

  const order = data;

  // Broadcast GPS while on active order
  useRiderLocationBroadcast(
    order && ['accepted', 'at_station', 'en_route'].includes(order.status) ? id : null
  );

  const handleStatusUpdate = async () => {
    if (!order) return;
    const action = STATUS_ACTIONS[order.status];
    if (!action) return;

    setLoading(true);
    try {
      await ordersApi.updateStatus(id, action.next);
      toast.success('Status updated!');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpInput.length !== 4) return toast.error('Enter the 4-digit OTP');
    setLoading(true);
    try {
      await ordersApi.confirmDelivery(id, otpInput);
      toast.success('Delivery confirmed! Great job! 🎉');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.push('/rider');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = (lat: number, lng: number) => {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const steps = order.orderType === 'exchange' ? EXCHANGE_STEPS : DELIVERY_STEPS;
  const stepIndex =
    order.status === 'accepted' ? 0
    : order.status === 'at_station' ? 1
    : order.status === 'en_route' ? 2
    : 3;

  const station = typeof order.stationId === 'object' ? order.stationId : null;
  const user = typeof order.userId === 'object' ? order.userId : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-brand-500 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="p-1.5 rounded-xl bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">Active Delivery</h1>
            <p className="text-brand-200 text-xs">Order #{id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="ml-auto">
            <p className="text-xl font-black">{formatCurrency(order.stationPayout * 0.15)}</p>
            <p className="text-brand-200 text-xs text-right">Earning</p>
          </div>
        </div>

        {/* Steps */}
        <StepIndicator steps={steps} current={stepIndex} />
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Current Action */}
        <Card className="border-2 border-brand-200">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">
            Current Step
          </p>
          <p className="font-bold text-gray-900 text-base mb-3">{steps[stepIndex]}</p>

          {/* Navigation Buttons */}
          {order.status === 'accepted' && station && (
            <Button
              variant="secondary"
              className="w-full mb-3"
              onClick={() => openNavigation((station as any).lat, (station as any).lng)}
            >
              <Navigation className="w-4 h-4" />
              Navigate to Station
            </Button>
          )}
          {order.status === 'at_station' && (
            <Button
              variant="secondary"
              className="w-full mb-3"
              onClick={() =>
                openNavigation(order.deliveryAddress.lat, order.deliveryAddress.lng)
              }
            >
              <Navigation className="w-4 h-4" />
              Navigate to Customer
            </Button>
          )}
          {order.status === 'en_route' && (
            <Button
              variant="secondary"
              className="w-full mb-3"
              onClick={() =>
                openNavigation(order.deliveryAddress.lat, order.deliveryAddress.lng)
              }
            >
              <Navigation className="w-4 h-4" />
              Navigate to Customer
            </Button>
          )}

          {/* Status Update Button */}
          {STATUS_ACTIONS[order.status] && (
            <Button className="w-full" loading={loading} onClick={handleStatusUpdate}>
              <CheckCircle className="w-4 h-4" />
              {STATUS_ACTIONS[order.status].label}
            </Button>
          )}

          {/* OTP Confirmation (en_route → delivered) */}
          {order.status === 'en_route' && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Ask customer for OTP to confirm delivery
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter OTP"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-2xl tracking-[1em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
              />
              <Button className="w-full" loading={loading} onClick={handleVerifyOTP}>
                Confirm Delivery
              </Button>
            </div>
          )}
        </Card>

        {/* Order Details */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Order Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Cylinder</span>
              <span className="font-medium">{order.cylinderSize}kg · {order.orderType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Station</span>
              <span className="font-medium">{station ? (station as any).name : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery Address</span>
              <span className="font-medium text-right max-w-[55%]">
                {order.deliveryAddress.street}, {order.deliveryAddress.city}
              </span>
            </div>
          </div>
        </Card>

        {/* Customer Contact */}
        {user && (
          <Card>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Customer</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{(user as any).name}</p>
                <p className="text-sm text-gray-500">{(user as any).phone}</p>
              </div>
              <a href={`tel:${(user as any).phone}`}>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
              </a>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
