'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Plus, Package, MapPin } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import { Card, Button, Badge } from '@/components/ui';
import { formatCurrency, formatCylinders } from '@/lib/utils';
import Link from 'next/link';

export default function UserScheduledOrdersPage() {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['user', 'orders', 'scheduled'],
    queryFn: () => ordersApi.list({ 
      status: 'scheduled',
      limit: 50 
    }).then((r) => r.data.orders),
  });

  const scheduledOrders = ordersData || [];

  const getTimeUntilDelivery = (scheduledFor: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than 1 hour';
    if (diffHours < 24) return `${diffHours} hours`;
    const diffDays = Math.ceil(diffHours / 24);
    return `${diffDays} days`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Scheduled Orders</h1>
            <p className="text-sm text-gray-500">Manage your upcoming deliveries</p>
          </div>
          <Link href="/user/checkout">
            <Button>
              <Plus className="w-4 h-4 mr-1" />
              Schedule Order
            </Button>
          </Link>
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : scheduledOrders.length === 0 ? (
          <Card className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No scheduled orders</h3>
            <p className="text-gray-500 mb-4">
              Schedule your gas deliveries in advance for convenience
            </p>
            <Link href="/user/checkout">
              <Button>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Your First Order
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {scheduledOrders.map((order: any) => (
              <Card key={order._id}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">
                      {formatCylinders(order.cylinders)} · {order.orderType}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      #{order._id.slice(-6).toUpperCase()}
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">
                    Scheduled
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(order.scheduledFor).toLocaleString()} 
                      ({getTimeUntilDelivery(order.scheduledFor)})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{order.deliveryAddress?.street}, {order.deliveryAddress?.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>Station: {order.stationId?.name}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-brand-600">
                    {formatCurrency(order.totalAmount)}
                  </p>
                  <Link href={`/user/orders/${order._id}`}>
                    <Button size="sm" variant="secondary">
                      View Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}