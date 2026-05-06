'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Minus, AlertTriangle, ArrowLeft } from 'lucide-react';
import { stationsApi } from '@/lib/api';
import { Station, CylinderListing, CylinderSize } from '@/types';
import { Button, Card, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

const STATION_ID = typeof window !== 'undefined' ? localStorage.getItem('gasgo_station_id') || '' : '';

export default function StationInventoryPage() {
  const queryClient = useQueryClient();
  const [editingSize, setEditingSize] = useState<CylinderSize | null>(null);
  const [fillPrice, setFillPrice] = useState('');
  const [exchangePrice, setExchangePrice] = useState('');
  const [stockDelta, setStockDelta] = useState<Record<number, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['station', STATION_ID],
    queryFn: () => stationsApi.getById(STATION_ID).then((r) => r.data.station as Station),
  });

  const priceMutation = useMutation({
    mutationFn: ({ size, fill, exchange }: { size: number; fill: number; exchange: number }) =>
      stationsApi.updatePrices(STATION_ID, {
        size,
        fillPrice: fill,
        exchangePrice: exchange,
      }),
    onSuccess: () => {
      toast.success('Prices updated successfully');
      setEditingSize(null);
      queryClient.invalidateQueries({ queryKey: ['station', STATION_ID] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update prices');
    },
  });

  const inventoryMutation = useMutation({
    mutationFn: ({ size, stockCount }: { size: number; stockCount: number }) =>
      stationsApi.updateInventory(STATION_ID, { size, stockCount }),
    onSuccess: () => {
      toast.success('Inventory updated');
      queryClient.invalidateQueries({ queryKey: ['station', STATION_ID] });
    },
    onError: () => toast.error('Failed to update inventory'),
  });

  const station = data;
  const listings = station?.cylinderListings || [];

  const handleStartEdit = (listing: CylinderListing) => {
    setEditingSize(listing.size as CylinderSize);
    setFillPrice(listing.fillPrice.toString());
    setExchangePrice(listing.exchangePrice.toString());
  };

  const handleSavePrices = () => {
    const fill = parseFloat(fillPrice);
    const exchange = parseFloat(exchangePrice);
    if (isNaN(fill) || isNaN(exchange)) return toast.error('Invalid price values');
    if (exchange > fill) return toast.error('Exchange price must be ≤ fill price');
    priceMutation.mutate({ size: editingSize!, fill, exchange });
  };

  const handleAdjustStock = (size: number, current: number) => {
    const delta = stockDelta[size] || 0;
    const newCount = Math.max(0, current + delta);
    inventoryMutation.mutate({ size, stockCount: newCount });
    setStockDelta((prev) => ({ ...prev, [size]: 0 }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10 flex items-center gap-3">
        <Link href="/station" className="p-1.5 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-base font-semibold text-gray-900">Inventory & Pricing</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {listings.map((listing) => {
          const isLowStock =
            listing.stockCount <= (listing.lowStockThreshold || 5) && listing.stockCount > 0;
          const isOut = listing.stockCount === 0;
          const delta = stockDelta[listing.size] || 0;

          return (
            <Card key={listing.size} className={isOut ? 'border-red-200' : ''}>
              {/* Size Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-lg font-black text-orange-500">{listing.size}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{listing.size}kg Cylinder</p>
                    <p className="text-xs text-gray-500">{listing.brand}</p>
                  </div>
                </div>
                {isOut ? (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                    <AlertTriangle className="w-3 h-3" /> Low Stock
                  </span>
                ) : (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    In Stock
                  </span>
                )}
              </div>

              {/* Prices */}
              {editingSize === listing.size ? (
                <div className="space-y-3 mb-3">
                  <Input
                    label="Fill Price (GH₵)"
                    type="number"
                    value={fillPrice}
                    onChange={(e) => setFillPrice(e.target.value)}
                    min="0"
                    step="0.50"
                  />
                  <Input
                    label="Exchange Price (GH₵)"
                    type="number"
                    value={exchangePrice}
                    onChange={(e) => setExchangePrice(e.target.value)}
                    min="0"
                    step="0.50"
                    hint="Must be ≤ fill price"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingSize(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      loading={priceMutation.isPending}
                      onClick={handleSavePrices}
                    >
                      Save Prices
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Fill Price</p>
                    <p className="font-bold text-gray-900">{formatCurrency(listing.fillPrice)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">Exchange Price</p>
                    <p className="font-bold text-gray-900">{formatCurrency(listing.exchangePrice)}</p>
                  </div>
                </div>
              )}

              {editingSize !== listing.size && (
                <button
                  onClick={() => handleStartEdit(listing)}
                  className="w-full text-center text-xs font-semibold text-brand-600 bg-brand-50 py-2 rounded-xl hover:bg-brand-100 transition-colors mb-3"
                >
                  Edit Prices
                </button>
              )}

              {/* Stock Adjuster */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Stock Count</p>
                  <p className="text-xl font-black text-gray-900">{listing.stockCount}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStockDelta((p) => ({ ...p, [listing.size]: (p[listing.size] || 0) - 1 }))}
                    className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <Minus className="w-4 h-4 text-gray-700" />
                  </button>
                  <div className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-center">
                    <p className="text-sm text-gray-500">Adjustment</p>
                    <p className={`font-bold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {delta > 0 ? '+' : ''}{delta}
                    </p>
                  </div>
                  <button
                    onClick={() => setStockDelta((p) => ({ ...p, [listing.size]: (p[listing.size] || 0) + 1 }))}
                    className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
                {delta !== 0 && (
                  <Button
                    className="w-full mt-2"
                    size="sm"
                    loading={inventoryMutation.isPending}
                    onClick={() => handleAdjustStock(listing.size, listing.stockCount)}
                  >
                    Update Stock → {Math.max(0, listing.stockCount + delta)}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
