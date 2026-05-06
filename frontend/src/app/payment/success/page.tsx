'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Clock } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-6">
          Your payment was successful and your gas delivery is being prepared.
        </p>

        {orderId && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Order Number</p>
            <p className="font-mono text-lg font-bold text-brand-600">
              #{orderId.slice(-8).toUpperCase()}
            </p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Package className="w-5 h-5 text-brand-500" />
            <span>Station is preparing your cylinders</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Clock className="w-5 h-5 text-brand-500" />
            <span>You'll be notified when a rider is assigned</span>
          </div>
        </div>

        <div className="space-y-3">
          {orderId && (
            <Button 
              onClick={() => router.push(`/user/orders/${orderId}`)}
              className="w-full"
            >
              Track Your Order
            </Button>
          )}
          <Button 
            variant="secondary"
            onClick={() => router.push('/user')}
            className="w-full"
          >
            Continue Shopping
          </Button>
        </div>
      </Card>
    </div>
  );
}