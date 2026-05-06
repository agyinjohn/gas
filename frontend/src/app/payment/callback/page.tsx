'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Button } from '@/components/ui';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    const reference = searchParams.get('reference');
    const orderId = searchParams.get('orderId');

    if (!reference) {
      setStatus('failed');
      return;
    }

    // Verify payment with backend
    const verifyPayment = async () => {
      try {
        const response = await api.get(`/api/v1/payments/verify/${reference}`);
        const paymentData = response.data.payment;

        if (paymentData.status === 'success') {
          setStatus('success');
          // Fetch order details if orderId is provided
          if (orderId) {
            try {
              const orderResponse = await api.get(`/api/v1/orders/${orderId}`);
              setOrderData(orderResponse.data.order);
            } catch (error) {
              console.error('Failed to fetch order:', error);
            }
          }
        } else {
          setStatus('failed');
        }
      } catch (error) {
        console.error('Payment verification failed:', error);
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleContinue = () => {
    if (orderData) {
      router.push(`/user/orders/${orderData._id}`);
    } else {
      router.push('/user/orders');
    }
  };

  const handleRetry = () => {
    router.back();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-8">
          <Loader className="w-12 h-12 text-brand-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment</h1>
          <p className="text-gray-600">Please wait while we confirm your payment...</p>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your payment has been processed successfully. Your order is now being prepared.
          </p>
          
          {orderData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-500 mb-1">Order ID</p>
              <p className="font-mono text-sm font-medium">#{orderData._id?.slice(-8).toUpperCase()}</p>
            </div>
          )}

          <Button onClick={handleContinue} className="w-full">
            View Order Details
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          We couldn't process your payment. Please try again or use a different payment method.
        </p>
        
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleRetry} className="flex-1">
            Try Again
          </Button>
          <Button onClick={() => router.push('/user')} className="flex-1">
            Go Home
          </Button>
        </div>
      </Card>
    </div>
  );
}