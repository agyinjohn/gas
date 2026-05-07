'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, TrendingUp, Save, AlertCircle, 
  Info, BarChart3, History 
} from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { Card, Button, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATION_ID = typeof window !== 'undefined' ? localStorage.getItem('GetGas_station_id') || '' : '';

export default function StationPricingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pricing' | 'history'>('pricing');
  const [pricingForm, setPricingForm] = useState({
    '3kg': { fillPrice: 0, exchangePrice: 0 },
    '6kg': { fillPrice: 0, exchangePrice: 0 },
    '12kg': { fillPrice: 0, exchangePrice: 0 },
  });

  const { data: stationData, isLoading } = useQuery({
    queryKey: ['station', 'details', STATION_ID],
    queryFn: () => stationsApi.getById(STATION_ID).then((r) => r.data.station),
    enabled: !!STATION_ID,
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ size, fillPrice, exchangePrice }: { 
      size: number; 
      fillPrice: number; 
      exchangePrice: number; 
    }) => stationsApi.updatePrices(STATION_ID, { size, fillPrice, exchangePrice }),
    onSuccess: () => {
      toast.success('Prices updated successfully');
      queryClient.invalidateQueries({ queryKey: ['station', 'details'] });
    },
  });

  // Initialize form with current prices
  React.useEffect(() => {
    if (stationData?.cylinderListings) {
      const newPricing: any = {};
      stationData.cylinderListings.forEach((listing: any) => {
        newPricing[`${listing.size}kg`] = {
          fillPrice: listing.fillPrice || 0,
          exchangePrice: listing.exchangePrice || 0,
        };
      });
      setPricingForm(newPricing);
    }
  }, [stationData]);

  const handlePriceUpdate = (size: string, field: 'fillPrice' | 'exchangePrice', value: string) => {
    const numValue = parseFloat(value) || 0;
    setPricingForm(prev => ({
      ...prev,
      [size]: {
        ...prev[size as keyof typeof prev],
        [field]: numValue,
      },
    }));
  };

  const handleSavePrices = async (size: string) => {
    const sizeNum = parseInt(size.replace('kg', ''));
    const prices = pricingForm[size as keyof typeof pricingForm];
    
    if (prices.exchangePrice > prices.fillPrice) {
      return toast.error('Exchange price cannot be higher than fill price');
    }

    if (prices.fillPrice <= 0) {
      return toast.error('Fill price must be greater than 0');
    }

    await updatePriceMutation.mutateAsync({
      size: sizeNum,
      fillPrice: prices.fillPrice,
      exchangePrice: prices.exchangePrice,
    });
  };

  const getCurrentListing = (size: string) => {
    const sizeNum = parseInt(size.replace('kg', ''));
    return stationData?.cylinderListings?.find((l: any) => l.size === sizeNum);
  };

  const hasChanges = (size: string) => {
    const current = getCurrentListing(size);
    const form = pricingForm[size as keyof typeof pricingForm];
    if (!current) return false;
    
    return current.fillPrice !== form.fillPrice || current.exchangePrice !== form.exchangePrice;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Pricing Management</h1>
        
        {/* Tabs */}
        <div className="flex gap-4">
          {[
            { key: 'pricing', label: 'Set Prices', icon: DollarSign },
            { key: 'history', label: 'Price History', icon: History },
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
            {/* Pricing Guidelines */}
            <Card className="bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">Pricing Guidelines</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Fill price: For new cylinder purchases</li>
                    <li>• Exchange price: For empty cylinder exchanges (must be ≤ fill price)</li>
                    <li>• Competitive pricing helps attract more customers</li>
                    <li>• Price changes are logged and can be viewed in history</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Cylinder Pricing */}
            <div className="space-y-4">
              {Object.entries(pricingForm).map(([size, prices]) => {
                const currentListing = getCurrentListing(size);
                const changed = hasChanges(size);
                
                return (
                  <Card key={size}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                          <span className="font-bold text-brand-600">{size}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{size} Cylinder</h3>
                          <p className="text-sm text-gray-500">
                            Stock: {currentListing?.stockCount || 0} available
                          </p>
                        </div>
                      </div>
                      
                      {changed && (
                        <Button
                          onClick={() => handleSavePrices(size)}
                          loading={updatePriceMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fill Price (GH₵)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={prices.fillPrice}
                          onChange={(e) => handlePriceUpdate(size, 'fillPrice', e.target.value)}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Current: {formatCurrency(currentListing?.fillPrice || 0)}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Exchange Price (GH₵)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={prices.fillPrice}
                          value={prices.exchangePrice}
                          onChange={(e) => handlePriceUpdate(size, 'exchangePrice', e.target.value)}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Current: {formatCurrency(currentListing?.exchangePrice || 0)}
                        </p>
                      </div>
                    </div>

                    {prices.exchangePrice > prices.fillPrice && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <p className="text-sm text-red-700">
                            Exchange price cannot be higher than fill price
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Profit Margin Indicator */}
                    {prices.fillPrice > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Exchange Discount:</span>
                          <span className="font-medium">
                            {formatCurrency(prices.fillPrice - prices.exchangePrice)} 
                            ({((1 - prices.exchangePrice / prices.fillPrice) * 100).toFixed(1)}% off)
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Market Insights */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Market Insights</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Avg Market Price (6kg)</p>
                  <p className="font-bold text-lg">GH₵ 45.00</p>
                  <p className="text-xs text-green-600">↓ 2% from last week</p>
                </div>
                <div>
                  <p className="text-gray-500">Your Position</p>
                  <p className="font-bold text-lg">Competitive</p>
                  <p className="text-xs text-blue-600">Within market range</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Price Change History */}
            {stationData?.priceChangeLog?.length > 0 ? (
              <div className="space-y-3">
                {stationData.priceChangeLog
                  .slice()
                  .reverse()
                  .slice(0, 20)
                  .map((change: any, index: number) => (
                    <Card key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="font-bold text-gray-600 text-sm">
                              {change.size}kg
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {change.size}kg Cylinder Price Update
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(change.changedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 mb-1">Fill Price</p>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">
                              {formatCurrency(change.oldFillPrice)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(change.newFillPrice)}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              change.newFillPrice > change.oldFillPrice
                                ? 'bg-red-100 text-red-600'
                                : change.newFillPrice < change.oldFillPrice
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {change.newFillPrice > change.oldFillPrice ? '↑' :
                               change.newFillPrice < change.oldFillPrice ? '↓' : '='}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-gray-500 mb-1">Exchange Price</p>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">
                              {formatCurrency(change.oldExchangePrice)}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(change.newExchangePrice)}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              change.newExchangePrice > change.oldExchangePrice
                                ? 'bg-red-100 text-red-600'
                                : change.newExchangePrice < change.oldExchangePrice
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {change.newExchangePrice > change.oldExchangePrice ? '↑' :
                               change.newExchangePrice < change.oldExchangePrice ? '↓' : '='}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No price changes yet</p>
                <p className="text-sm text-gray-400">
                  Price change history will appear here when you update your prices
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}