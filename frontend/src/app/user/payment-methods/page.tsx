'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, Smartphone, Banknote, Plus, 
  Star, Trash2, Check, Shield 
} from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Card, Button, Input, Modal } from '@/components/ui';
import toast from 'react-hot-toast';

interface PaymentMethod {
  _id: string;
  type: 'mobile_money' | 'card' | 'cash';
  provider?: string;
  accountNumber?: string;
  last4?: string;
  isDefault: boolean;
}

export default function UserPaymentMethodsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    type: 'mobile_money' as 'mobile_money' | 'card' | 'cash',
    provider: '',
    accountNumber: '',
    last4: '',
    isDefault: false,
  });

  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => usersApi.getMe().then((r) => r.data.user),
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: (data: any) => usersApi.addPaymentMethod(data),
    onSuccess: () => {
      toast.success('Payment method added successfully');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setShowModal(false);
      resetForm();
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => usersApi.setDefaultPaymentMethod(id),
    onSuccess: () => {
      toast.success('Default payment method updated');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });

  const deletePaymentMethodMutation = useMutation({
    mutationFn: (id: string) => usersApi.deletePaymentMethod(id),
    onSuccess: () => {
      toast.success('Payment method deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });

  const paymentMethods: PaymentMethod[] = userData?.paymentMethods || [];

  const resetForm = () => {
    setPaymentForm({
      type: 'mobile_money',
      provider: '',
      accountNumber: '',
      last4: '',
      isDefault: false,
    });
  };

  const handleAddPaymentMethod = () => {
    resetForm();
    setShowModal(true);
  };

  const handleDeletePaymentMethod = (id: string) => {
    if (confirm('Are you sure you want to delete this payment method?')) {
      deletePaymentMethodMutation.mutate(id);
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentForm.type === 'mobile_money') {
      if (!paymentForm.provider || !paymentForm.accountNumber) {
        return toast.error('Please fill all required fields');
      }
    } else if (paymentForm.type === 'card') {
      if (!paymentForm.last4) {
        return toast.error('Please enter card details');
      }
    }

    addPaymentMethodMutation.mutate(paymentForm);
  };

  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'mobile_money': return Smartphone;
      case 'card': return CreditCard;
      case 'cash': return Banknote;
      default: return CreditCard;
    }
  };

  const getPaymentLabel = (method: PaymentMethod) => {
    switch (method.type) {
      case 'mobile_money':
        return `${method.provider?.toUpperCase()} - ${method.accountNumber}`;
      case 'card':
        return `Card ending in ${method.last4}`;
      case 'cash':
        return 'Cash on Delivery';
      default:
        return 'Unknown';
    }
  };

  const getProviderColor = (provider?: string) => {
    switch (provider?.toLowerCase()) {
      case 'mtn': return 'bg-yellow-100 text-yellow-700';
      case 'vod': return 'bg-red-100 text-red-700';
      case 'tgo': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Payment Methods</h1>
            <p className="text-sm text-gray-500">Manage how you pay for orders</p>
          </div>
          <Button onClick={handleAddPaymentMethod}>
            <Plus className="w-4 h-4 mr-1" />
            Add Method
          </Button>
        </div>
      </div>

      <div className="px-4 py-4">
        {paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map((method) => {
              const IconComponent = getPaymentIcon(method);
              return (
                <Card key={method._id}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-6 h-6 text-brand-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          {getPaymentLabel(method)}
                        </p>
                        {method.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <Star className="w-3 h-3 fill-current" />
                            Default
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          method.type === 'mobile_money' ? getProviderColor(method.provider) :
                          method.type === 'card' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {method.type === 'mobile_money' ? method.provider?.toUpperCase() :
                           method.type === 'card' ? 'Credit/Debit Card' : 'Cash'}
                        </span>
                        
                        {method.type !== 'cash' && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Shield className="w-3 h-3" />
                            <span>Secured</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetDefault(method._id)}
                          loading={setDefaultMutation.isPending}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeletePaymentMethod(method._id)}
                        loading={deletePaymentMethodMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment methods</h3>
            <p className="text-gray-500 mb-4">
              Add a payment method for faster checkout
            </p>
            <Button onClick={handleAddPaymentMethod}>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </Card>
        )}

        {/* Payment Info */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Secure Payments</h3>
              <p className="text-sm text-blue-700">
                Your payment information is encrypted and secure. We support mobile money, 
                credit/debit cards, and cash on delivery.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Payment Method Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Add Payment Method"
      >
        <form onSubmit={handleSavePaymentMethod} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
                { value: 'card', label: 'Card', icon: CreditCard },
                { value: 'cash', label: 'Cash', icon: Banknote },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentForm(prev => ({ ...prev, type: value as any }))}
                  className={`p-3 border rounded-xl flex flex-col items-center gap-2 transition-colors ${
                    paymentForm.type === value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentForm.type === 'mobile_money' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider *
                </label>
                <select
                  value={paymentForm.provider}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, provider: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Provider</option>
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="vod">Vodafone Cash</option>
                  <option value="tgo">AirtelTigo Money</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <Input
                  type="tel"
                  placeholder="0244123456"
                  value={paymentForm.accountNumber}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                  required
                />
              </div>
            </>
          )}

          {paymentForm.type === 'card' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Last 4 Digits *
              </label>
              <Input
                type="text"
                placeholder="1234"
                maxLength={4}
                value={paymentForm.last4}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, last4: e.target.value }))}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                For identification purposes only. Full card details will be entered during payment.
              </p>
            </div>
          )}

          {paymentForm.type === 'cash' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-sm text-yellow-700">
                Cash on delivery allows you to pay the rider directly when your order arrives.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={paymentForm.isDefault}
              onChange={(e) => setPaymentForm(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              Set as default payment method
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={addPaymentMethodMutation.isPending}
            >
              Add Payment Method
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}