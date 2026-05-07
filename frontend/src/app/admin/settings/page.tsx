'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, DollarSign, Truck, Clock, Save } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { Card, Button, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pricing' | 'delivery' | 'system'>('pricing');

  const { data: pricingData, isLoading } = useQuery({
    queryKey: ['admin', 'pricing'],
    queryFn: () => adminApi.getPricing().then((r) => r.data),
  });

  const updatePricingMutation = useMutation({
    mutationFn: (data: any) => adminApi.updatePricing(data),
    onSuccess: () => {
      toast.success('Pricing updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'pricing'] });
    },
  });

  const [pricingForm, setPricingForm] = useState({
    basePrices: {
      '6kg': 0,
      '13kg': 0,
      '15kg': 0,
    },
    deliveryFee: 0,
    commissionPct: 0,
    surgeMultiplier: 1.0,
  });

  // Update form when data loads
  useEffect(() => {
    if (pricingData?.pricing) {
      setPricingForm(pricingData.pricing);
    }
  }, [pricingData]);

  const handleSavePricing = () => {
    updatePricingMutation.mutate(pricingForm);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Platform Settings</h1>
        
        {/* Tabs */}
        <div className="flex gap-4">
          {[
            { key: 'pricing', label: 'Pricing', icon: DollarSign },
            { key: 'delivery', label: 'Delivery', icon: Truck },
            { key: 'system', label: 'System', icon: Settings },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {activeTab === 'pricing' && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Base Cylinder Prices</h2>
              <div className="space-y-3">
                {Object.entries(pricingForm.basePrices).map(([size, price]) => (
                  <div key={size} className="flex items-center gap-3">
                    <label className="w-16 text-sm font-medium text-gray-700">
                      {size}:
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPricingForm(prev => ({
                        ...prev,
                        basePrices: {
                          ...prev.basePrices,
                          [size]: parseFloat(e.target.value) || 0
                        }
                      }))}
                      className="flex-1"
                      placeholder="0.00"
                    />
                    <span className="text-sm text-gray-500">GH₵</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Fees & Commission</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="w-32 text-sm font-medium text-gray-700">
                    Delivery Fee:
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pricingForm.deliveryFee}
                    onChange={(e) => setPricingForm(prev => ({
                      ...prev,
                      deliveryFee: parseFloat(e.target.value) || 0
                    }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">GH₵</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="w-32 text-sm font-medium text-gray-700">
                    Commission:
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={pricingForm.commissionPct}
                    onChange={(e) => setPricingForm(prev => ({
                      ...prev,
                      commissionPct: parseFloat(e.target.value) || 0
                    }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="w-32 text-sm font-medium text-gray-700">
                    Surge Multiplier:
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
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500">×</span>
                </div>
              </div>
            </Card>

            <Button
              onClick={handleSavePricing}
              loading={updatePricingMutation.isPending}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Pricing Changes
            </Button>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Delivery Radius
                  </label>
                  <div className="flex items-center gap-3">
                    <Input type="number" defaultValue="15" className="flex-1" />
                    <span className="text-sm text-gray-500">km</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Standard Delivery Time
                  </label>
                  <div className="flex items-center gap-3">
                    <Input type="number" defaultValue="45" className="flex-1" />
                    <span className="text-sm text-gray-500">minutes</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operating Hours
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="time" defaultValue="06:00" />
                    <Input type="time" defaultValue="22:00" />
                  </div>
                </div>
              </div>
            </Card>

            <Button className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Delivery Settings
            </Button>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maintenance Mode
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-600">
                      Enable maintenance mode (blocks new orders)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-assign Orders
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm text-gray-600">
                      Automatically assign orders to nearest available rider
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Timeout
                  </label>
                  <div className="flex items-center gap-3">
                    <Input type="number" defaultValue="10" className="flex-1" />
                    <span className="text-sm text-gray-500">minutes</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-cancel orders if not accepted within this time
                  </p>
                </div>
              </div>
            </Card>

            <Button className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save System Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}