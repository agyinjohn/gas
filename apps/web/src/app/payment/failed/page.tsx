'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { XCircle, CreditCard, Smartphone, AlertCircle } from 'lucide-react';
import { Card, Button } from '@/components/ui';

export default function PaymentFailedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'Unknown error';
  const orderId = searchParams.get('orderId');

  const getFailureReason = (reason: string) => {
    switch (reason.toLowerCase()) {
      case 'insufficient_funds':
        return 'Insufficient funds in your account';
      case 'card_declined':
        return 'Your card was declined by the bank';
      case 'expired_card':
        return 'Your card has expired';
      case 'invalid_pin':
        return 'Invalid PIN entered';
      case 'network_error':
        return 'Network connection error';
      case 'timeout':
        return 'Payment request timed out';
      default:
        return 'Payment could not be processed';
    }
  };

  const handleRetryPayment = () => {
    if (orderId) {
      router.push(`/user/orders/${orderId}?retry=true`);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center py-8">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-4">
          {getFailureReason(reason)}
        </p>

        {orderId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">Order on Hold</p>
            </div>
            <p className="text-xs text-yellow-700">
              Order #{orderId.slice(-8).toUpperCase()} is waiting for payment completion
            </p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-medium text-gray-900">Try these solutions:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Check your card details and try again</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span>Try mobile money instead</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>Ensure you have sufficient balance</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleRetryPayment}
            className="w-full"
          >
            Retry Payment
          </Button>
          <Button 
            variant="secondary"
            onClick={() => router.push('/user/payment-methods')}
            className="w-full"
          >
            Change Payment Method
          </Button>
          <Button 
            variant="secondary"
            onClick={() => router.push('/user')}
            className="w-full"
          >
            Cancel Order
          </Button>
        </div>
      </Card>
    </div>
  );
}