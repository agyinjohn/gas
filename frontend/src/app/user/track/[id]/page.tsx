'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  MapPin, Phone, Clock, Package, 
  Navigation, User, CheckCircle 
} from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { getSocket } from '@/hooks/useSocket';
import { Card, Button, Badge } from '@/components/ui';
import { formatCurrency, formatRelativeTime, formatCylinders } from '@/lib/utils';

export default function TrackOrderPage() {
  const params = useParams();
  const orderId = params.id as string;
  const queryClient = useQueryClient();
  const [riderLocation, setRiderLocation] = useState<{lat: number; lng: number} | null>(null);

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getById(orderId).then((r) => r.data.order),
    refetchInterval: 30000,
  });

  // Listen for real-time rider location updates
  useEffect(() => {
    if (!orderData || !['accepted', 'at_station', 'en_route'].includes(orderData.status)) {
      return;
    }

    const socket = getSocket();
    
    // Join order room for updates
    socket.emit('join:order', orderId);
    
    // Listen for rider location updates
    socket.on('rider:location:update', (location: {lat: number; lng: number}) => {
      setRiderLocation(location);
    });

    // Listen for order status updates
    socket.on('order:status:update', (status: string) => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    });

    return () => {
      socket.off('rider:location:update');
      socket.off('order:status:update');
      socket.emit('leave:order', orderId);
    };
  }, [orderId, orderData?.status, queryClient]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading order details...</p>
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
  const rider = typeof order.riderId === 'object' ? order.riderId : null;
  const station = typeof order.stationId === 'object' ? order.stationId : null;

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { 
          label: 'Order Placed', 
          description: 'Looking for available rider',
          color: 'bg-yellow-100 text-yellow-700',
          icon: Clock 
        };
      case 'accepted':
        return { 
          label: 'Rider Assigned', 
          description: 'Rider is heading to station',
          color: 'bg-blue-100 text-blue-700',
          icon: User 
        };
      case 'at_station':
        return { 
          label: 'At Station', 
          description: 'Collecting your cylinders',
          color: 'bg-purple-100 text-purple-700',
          icon: Package 
        };
      case 'en_route':
        return { 
          label: 'On the Way', 
          description: 'Rider is coming to you',
          color: 'bg-orange-100 text-orange-700',
          icon: Navigation 
        };
      case 'delivered':
        return { 
          label: 'Delivered', 
          description: 'Order completed successfully',
          color: 'bg-green-100 text-green-700',
          icon: CheckCircle 
        };
      default:
        return { 
          label: status, 
          description: '',
          color: 'bg-gray-100 text-gray-700',
          icon: Clock 
        };
    }
  };

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Track Order</h1>
        <p className="text-sm text-gray-500 font-mono">
          #{order._id.slice(-8).toUpperCase()}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Current Status */}
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusInfo.color}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{statusInfo.label}</h2>
              <p className="text-sm text-gray-600">{statusInfo.description}</p>
            </div>
          </div>
          
          <Badge className={statusInfo.color}>
            {order.status.replace('_', ' ')}
          </Badge>
        </Card>

        {/* Rider Info */}
        {rider && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Your Rider</h3>
              <Button size="sm" variant="secondary">
                <Phone className="w-4 h-4 mr-1" />
                Call
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-purple-600 text-lg">
                  {rider.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{rider.name}</p>
                <p className="text-sm text-gray-500">{rider.vehicleType} • {rider.phone}</p>
                {rider.ratingAvg && (
                  <p className="text-sm text-gray-500">⭐ {rider.ratingAvg.toFixed(1)} rating</p>
                )}
              </div>
            </div>

            {riderLocation && order.status === 'en_route' && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  📍 Rider location updated {new Date().toLocaleTimeString()}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* OTP for Delivery Confirmation */}
        {order.status === 'en_route' && order.otpCode && (
          <Card className="bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Delivery Code</h3>
            <div className="text-center">
              <p className="text-3xl font-black text-green-700 tracking-wider mb-2">
                {order.otpCode}
              </p>
              <p className="text-sm text-green-600">
                Share this code with the rider to confirm delivery
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}