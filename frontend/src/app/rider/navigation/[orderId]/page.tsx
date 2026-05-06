'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Navigation, Phone, MapPin, Clock, 
  CheckCircle, Package, AlertCircle 
} from 'lucide-react';
import { ordersApi, ridersApi } from '@/lib/api';
import { Card, Button, Input } from '@/components/ui';
import { formatCylinders, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function RiderNavigationPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const queryClient = useQueryClient();
  const [otpInput, setOtpInput] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId).then((r) => r.data.order),
    refetchInterval: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      ordersApi.updateStatus(orderId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Status updated');
    },
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: (otp: string) => ordersApi.confirmDelivery(orderId, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      toast.success('Delivery confirmed!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    },
  });

  // Update rider location every 30 seconds
  useEffect(() => {
    const updateLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setCurrentLocation(location);
            ridersApi.updateLocation(location.lat, location.lng);
          },
          (error) => console.error('Location error:', error)
        );
      }
    };

    updateLocation(); // Initial update
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="text-center py-8">
          <p className="text-gray-500">Order not found</p>
        </Card>
      </div>
    );
  }

  const order = orderData;
  const station = typeof order.stationId === 'object' ? order.stationId : null;
  const customer = typeof order.userId === 'object' ? order.userId : null;

  const handleStatusUpdate = (status: string, note?: string) => {
    updateStatusMutation.mutate({ status, note });
  };

  const handleConfirmDelivery = () => {
    if (!otpInput || otpInput.length !== 4) {
      return toast.error('Please enter the 4-digit OTP');
    }
    confirmDeliveryMutation.mutate(otpInput);
  };

  const openMaps = (lat: number, lng: number, label: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand-500 text-white px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold mb-2">Navigation</h1>
        <p className="text-brand-100 text-sm">
          Order #{order._id.slice(-8).toUpperCase()}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Order Summary */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-600">Items:</span> {formatCylinders(order.cylinders)} · {order.orderType}</p>
            <p><span className="text-gray-600">Total:</span> {formatCurrency(order.totalAmount)}</p>
            <p><span className="text-gray-600">Payment:</span> {order.paymentMethod}</p>
          </div>
        </Card>

        {/* Current Status Actions */}
        {order.status === 'accepted' && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">Go to Station</h3>
            </div>
            
            {station && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{station.name}</p>
                    <p className="text-sm text-gray-600">{station.address}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => openMaps(station.lat, station.lng, station.name)}
                    className="flex-1"
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Navigate to Station
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => handleStatusUpdate('at_station', 'Arrived at station')}
                    loading={updateStatusMutation.isPending}
                  >
                    I'm Here
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {order.status === 'at_station' && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-gray-900">Collect Cylinders</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Collect the cylinders from the station and confirm when ready to deliver.
            </p>
            
            <Button 
              onClick={() => handleStatusUpdate('en_route', 'Cylinders collected, heading to customer')}
              loading={updateStatusMutation.isPending}
              className="w-full"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Cylinders Collected - Start Delivery
            </Button>
          </Card>
        )}

        {order.status === 'en_route' && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Deliver to Customer</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{order.deliveryAddress.street}</p>
                  <p className="text-sm text-gray-600">{order.deliveryAddress.city}</p>
                </div>
              </div>
              
              <Button 
                onClick={() => openMaps(
                  order.deliveryAddress.lat, 
                  order.deliveryAddress.lng, 
                  'Delivery Address'
                )}
                className="w-full"
              >
                <Navigation className="w-4 h-4 mr-1" />
                Navigate to Customer
              </Button>
            </div>
          </Card>
        )}

        {/* Customer Contact */}
        {customer && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Customer</h3>
              <Button size="sm" variant="secondary">
                <Phone className="w-4 h-4 mr-1" />
                Call
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-blue-600">
                  {customer.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{customer.name}</p>
                <p className="text-sm text-gray-500">{customer.phone}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Delivery Confirmation */}
        {order.status === 'en_route' && (
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-green-900">Confirm Delivery</h3>
            </div>
            
            <p className="text-sm text-green-700 mb-4">
              Ask the customer for their 4-digit delivery code to complete the order.
            </p>
            
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Enter 4-digit OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="text-center text-lg tracking-widest"
              />
              
              <Button 
                onClick={handleConfirmDelivery}
                loading={confirmDeliveryMutation.isPending}
                className="w-full"
                disabled={otpInput.length !== 4}
              >
                Confirm Delivery
              </Button>
            </div>
          </Card>
        )}

        {/* Location Status */}
        {currentLocation && (
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <p className="text-sm text-blue-700">
                Location sharing active • Updated {new Date().toLocaleTimeString()}
              </p>
            </div>
          </Card>
        )}

        {/* Emergency Actions */}
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-900">Need Help?</h3>
          </div>
          <div className="space-y-2">
            <Button variant="danger" size="sm" className="w-full">
              Report Issue
            </Button>
            <Button variant="secondary" size="sm" className="w-full">
              Contact Support
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}