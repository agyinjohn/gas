'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, AlertTriangle, Pause, Play, 
  TrendingUp, Settings, Save 
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { Card, Button, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminPricingPage() {
  const queryClient = useQueryClient();
  const [pricingForm, setPricingForm] = useState({
    deliveryFeeFlat: 5,
    surgeMultiplier: 1.0,
    surgeActive: false,
    surgeReason: '',
    priceFreezeActive: false,
  });

  const { data: pricingData, isLoading } = useQuery({
    queryKey: ['admin', 'pricing'],
    queryFn: () => adminApi.getPricing().then((r) => r.data.pricing),
  });

  const updatePricingMutation = useMutation({
    mutationFn: (data: any) => adminApi.updatePricing(data),
    onSuccess: () => {
      toast.success('Pricing updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'pricing'] });
    },
  });

  React.useEffect(() => {
    if (pricingData) {
      setPricingForm({
        deliveryFeeFlat: pricingData.deliveryFeeFlat || 5,
        surgeMultiplier: pricingData.surgeMultiplier || 1.0,
        surgeActive: pricingData.surgeActive || false,
        surgeReason: pricingData.surgeReason || '',
        priceFreezeActive: pricingData.priceFreezeActive || false,
      });
    }
  }, [pricingData]);

  const handleSave = () => {
    updatePricingMutation.mutate(pricingForm);
  };

  const toggleSurge = () => {
    const newSurgeActive = !pricingForm.surgeActive;
    setPricingForm(prev => ({ 
      ...prev, 
      surgeActive: newSurgeActive,
      surgeReason: newSurgeActive ? 'High demand period' : ''
    }));
  };

  const toggleFreeze = () => {
    setPricingForm(prev => ({ ...prev, priceFreezeActive: !prev.priceFreezeActive }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Platform Pricing Controls</h1>
        <p className="text-sm text-gray-500">Manage delivery fees, surge pricing, and price controls</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Emergency Controls */}
        <div className="grid grid-cols-2 gap-3">
          <Card className={`${pricingForm.surgeActive ? 'bg-orange-50 border-orange-200' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Surge Pricing</h3>
              <Button
                size="sm"
                onClick={toggleSurge}
                className={pricingForm.surgeActive ? 'bg-orange-500' : 'bg-green-500'}
              >
                {pricingForm.surgeActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {pricingForm.surgeActive ? 'Disable' : 'Enable'}
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              {pricingForm.surgeActive ? 'Active' : 'Inactive'} • {pricingForm.surgeMultiplier}x multiplier
            </p>
          </Card>

          <Card className={`${pricingForm.priceFreezeActive ? 'bg-red-50 border-red-200' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Price Freeze</h3>
              <Button
                size="sm"
                variant={pricingForm.priceFreezeActive ? 'danger' : 'secondary'}
                onClick={toggleFreeze}
              >
                <AlertTriangle className="w-4 h-4" />
                {pricingForm.priceFreezeActive ? 'Lift Freeze' : 'Freeze Orders'}
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              {pricingForm.priceFreezeActive ? 'Orders paused' : 'Orders active'}
            </p>
          </Card>
        </div>

        {/* Delivery Fee */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Base Delivery Fee</h3>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              step="0.50"
              min="0"
              value={pricingForm.deliveryFeeFlat}
              onChange={(e) => setPricingForm(prev => ({ 
                ...prev, 
                deliveryFeeFlat: parseFloat(e.target.value) || 0 
              }))}
              className="w-32"
            />
            <span className="text-sm text-gray-500">GH₵ (scaled by cylinder count)</span>
          </div>
        </Card>

        {/* Surge Controls */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Surge Pricing Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surge Multiplier
              </label>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={pricingForm.surgeMultiplier}
                onChange={(e) => setPricingForm(prev => ({ 
                  ...prev, 
                  surgeMultiplier: parseFloat(e.target.value) || 1.0 
                }))}
                className="w-32"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surge Reason
              </label>
              <Input
                type="text"
                placeholder="e.g., High demand, Weather conditions"
                value={pricingForm.surgeReason}
                onChange={(e) => setPricingForm(prev => ({ 
                  ...prev, 
                  surgeReason: e.target.value 
                }))}
              />
            </div>
          </div>
        </Card>

        <Button
          onClick={handleSave}
          loading={updatePricingMutation.isPending}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          Save All Changes
        </Button>
      </div>
    </div>
  );
}