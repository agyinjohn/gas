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

  const { data: systemData, isLoading: systemLoading } = useQuery({
    queryKey: ['admin', 'system-config'],
    queryFn: () => adminApi.getSystemConfig().then((r) => r.data),
  });

  const updatePricingMutation = useMutation({
    mutationFn: (data: any) => adminApi.updatePricing(data),
    onSuccess: () => {
      toast.success('Pricing updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'pricing'] });
    },
  });

  const updateSystemConfigMutation = useMutation({
    mutationFn: (data: any) => adminApi.updateSystemConfig(data),
    onSuccess: () => {
      toast.success('System configuration updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-config'] });
    },
  });

  const [pricingForm, setPricingForm] = useState({
    baseFee: 5,
    pricePerKm: 2,
    freeKm: 2,
    maxDeliveryFee: 50,
    riderCommissionPct: 10,
    surgeMultiplier: 1.0,
    surgeActive: false,
    surgeReason: '',
    priceFreezeActive: false,
  });

  const [systemConfigForm, setSystemConfigForm] = useState({
    supportWhatsApp: '',
    supportPhoneNumber: '',
    supportEmail: '',
    companyName: 'GasGo',
  });

  useEffect(() => {
    if (pricingData?.pricing) {
      const p = pricingData.pricing;
      setPricingForm({
        baseFee:            p.baseFee            ?? 5,
        pricePerKm:         p.pricePerKm         ?? 2,
        freeKm:             p.freeKm             ?? 2,
        maxDeliveryFee:     p.maxDeliveryFee     ?? 50,
        riderCommissionPct: p.riderCommissionPct ?? 10,
        surgeMultiplier:    p.surgeMultiplier    ?? 1.0,
        surgeActive:        p.surgeActive        ?? false,
        surgeReason:        p.surgeReason        ?? '',
        priceFreezeActive:  p.priceFreezeActive  ?? false,
      });
    }
    if (systemData?.config) {
      setSystemConfigForm((prev) => ({ ...prev, ...(systemData.config || {}) }));
    }
  }, [pricingData, systemData]);

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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Fees & Commissions</h2>
              <div className="space-y-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Delivery Fee (floor)</label>
                  <p className="text-xs text-gray-400 mb-2">Minimum fee charged for any delivery, regardless of distance</p>
                  <div className="flex items-center gap-3">
                    <Input type="number" step="0.01" min="0"
                      value={pricingForm.baseFee}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, baseFee: parseFloat(e.target.value) || 0 }))}
                      className="flex-1" />
                    <span className="text-sm text-gray-500 shrink-0">GH₵</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Free Distance</label>
                  <p className="text-xs text-gray-400 mb-2">Km included in the base fee at no extra charge</p>
                  <div className="flex items-center gap-3">
                    <Input type="number" step="0.5" min="0"
                      value={pricingForm.freeKm}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, freeKm: parseFloat(e.target.value) || 0 }))}
                      className="flex-1" />
                    <span className="text-sm text-gray-500 shrink-0">km</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price per km</label>
                  <p className="text-xs text-gray-400 mb-2">Charged per km beyond the free distance</p>
                  <div className="flex items-center gap-3">
                    <Input type="number" step="0.1" min="0"
                      value={pricingForm.pricePerKm}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, pricePerKm: parseFloat(e.target.value) || 0 }))}
                      className="flex-1" />
                    <span className="text-sm text-gray-500 shrink-0">GH₵/km</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Delivery Fee (cap)</label>
                  <p className="text-xs text-gray-400 mb-2">No customer is charged more than this, regardless of distance</p>
                  <div className="flex items-center gap-3">
                    <Input type="number" step="1" min="0"
                      value={pricingForm.maxDeliveryFee}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, maxDeliveryFee: parseFloat(e.target.value) || 0 }))}
                      className="flex-1" />
                    <span className="text-sm text-gray-500 shrink-0">GH₵</span>
                  </div>
                </div>

                {/* Live preview */}
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-xs text-brand-700 space-y-1">
                  <p className="font-semibold mb-1">Fee preview</p>
                  {[0, 1, 2, 5, 10, 15].map((km) => {
                    const billable = Math.max(0, km - pricingForm.freeKm);
                    const fee = Math.min(pricingForm.maxDeliveryFee, Math.max(pricingForm.baseFee, pricingForm.baseFee + billable * pricingForm.pricePerKm));
                    return <p key={km}>{km} km → GH₵{fee.toFixed(2)}</p>;
                  })}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rider Commission</label>
                  <p className="text-xs text-gray-400 mb-2">% deducted from the delivery fee before paying the rider</p>
                  <div className="flex items-center gap-3">
                    <Input type="number" step="0.1" min="0" max="100"
                      value={pricingForm.riderCommissionPct}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, riderCommissionPct: parseFloat(e.target.value) || 0 }))}
                      className="flex-1" />
                    <span className="text-sm text-gray-500 shrink-0">%</span>
                  </div>
                  {pricingForm.baseFee > 0 && (
                    <p className="text-xs text-brand-600 mt-1">
                      Rider earns GH₵{(pricingForm.baseFee * (1 - pricingForm.riderCommissionPct / 100)).toFixed(2)} on a base-fee delivery
                    </p>
                  )}
                </div>

              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Surge Pricing</h2>
              <div className="space-y-4">

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Enable Surge</p>
                    <p className="text-xs text-gray-400">Multiplies all gas prices during peak demand</p>
                  </div>
                  <button
                    onClick={() => setPricingForm(prev => ({ ...prev, surgeActive: !prev.surgeActive }))}
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      pricingForm.surgeActive ? 'bg-brand-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      pricingForm.surgeActive ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surge Multiplier</label>
                  <div className="flex items-center gap-3">
                    <Input type="number" step="0.1" min="1.0" max="5.0"
                      value={pricingForm.surgeMultiplier}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, surgeMultiplier: parseFloat(e.target.value) || 1.0 }))}
                      className="flex-1" />
                    <span className="text-sm text-gray-500 shrink-0">×</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surge Reason <span className="font-normal text-gray-400">(shown to users)</span></label>
                  <Input type="text" placeholder="e.g. High demand in your area"
                    value={pricingForm.surgeReason}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, surgeReason: e.target.value }))}
                    className="w-full" />
                </div>

              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Price Freeze</p>
                  <p className="text-xs text-gray-400 mt-0.5">Blocks all new orders until disabled</p>
                </div>
                <button
                  onClick={() => setPricingForm(prev => ({ ...prev, priceFreezeActive: !prev.priceFreezeActive }))}
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    pricingForm.priceFreezeActive ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    pricingForm.priceFreezeActive ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              {pricingForm.priceFreezeActive && (
                <p className="text-xs text-red-600 mt-2 font-medium">⚠ Price freeze is ON — no new orders can be placed</p>
              )}
            </Card>

            <Button onClick={handleSavePricing} loading={updatePricingMutation.isPending} className="w-full">
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Support Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Number for Support <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="+233XXXXXXXXX"
                    value={systemConfigForm.supportWhatsApp}
                    onChange={(e) => setSystemConfigForm(prev => ({
                      ...prev,
                      supportWhatsApp: e.target.value
                    }))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the WhatsApp business number (e.g., +233XXXXXXXXX). This will appear as a floating button on user and rider home pages.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="+233XXXXXXXXX"
                    value={systemConfigForm.supportPhoneNumber}
                    onChange={(e) => setSystemConfigForm(prev => ({
                      ...prev,
                      supportPhoneNumber: e.target.value
                    }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Email
                  </label>
                  <Input
                    type="email"
                    placeholder="support@gasgo.com"
                    value={systemConfigForm.supportEmail}
                    onChange={(e) => setSystemConfigForm(prev => ({
                      ...prev,
                      supportEmail: e.target.value
                    }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    placeholder="GasGo"
                    value={systemConfigForm.companyName}
                    onChange={(e) => setSystemConfigForm(prev => ({
                      ...prev,
                      companyName: e.target.value
                    }))}
                    className="w-full"
                  />
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Other System Settings</h2>
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

            <Button
              onClick={() => updateSystemConfigMutation.mutate(systemConfigForm)}
              loading={updateSystemConfigMutation.isPending}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              Save System Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}