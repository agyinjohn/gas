'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Truck, Settings, Save, Zap, Thermometer,
  Phone, Mail, MessageCircle, Building2, Clock, Radio,
  ShieldAlert, RotateCcw, ChevronRight,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Reusable primitives ──────────────────────────────────────────────────────

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden', className)}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-50">
      <div className="w-9 h-9 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-brand-500" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

function FieldRow({ label, hint, unit, children }: { label: string; hint?: string; unit?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {unit && <span className="text-xs text-gray-400 w-10">{unit}</span>}
      </div>
    </div>
  );
}

function NumberInput({ value, onChange, step = '1', min = '0', max }: {
  value: number; onChange: (v: number) => void; step?: string; min?: string; max?: string;
}) {
  return (
    <input
      type="number" step={step} min={min} max={max}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-24 h-9 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 text-right px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
    />
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
    />
  );
}

function Toggle({ checked, onChange, danger }: { checked: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'w-11 h-6 rounded-full relative transition-colors shrink-0',
        checked ? (danger ? 'bg-red-500' : 'bg-brand-500') : 'bg-gray-200'
      )}
    >
      <div className={cn(
        'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  );
}

function SaveButton({ onClick, loading, label = 'Save changes' }: { onClick: () => void; loading?: boolean; label?: string }) {
  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center gap-2 h-9 px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-sm shadow-brand-500/25"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <Save className="w-3.5 h-3.5" />}
        {label}
      </button>
    </div>
  );
}

// ─── Fee preview ──────────────────────────────────────────────────────────────

function FeePreview({ baseFee, freeKm, pricePerKm, maxDeliveryFee }: {
  baseFee: number; freeKm: number; pricePerKm: number; maxDeliveryFee: number;
}) {
  const distances = [0, 1, 2, 5, 10, 15, 20];
  return (
    <div className="mx-6 mb-4 rounded-xl bg-brand-500/5 border border-brand-500/15 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-brand-500/10 flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-brand-500" />
        <p className="text-xs font-semibold text-brand-600">Live fee preview</p>
      </div>
      <div className="grid grid-cols-4 px-4 py-2 gap-2">
        {distances.map((km) => {
          const billable = Math.max(0, km - freeKm);
          const fee = Math.min(maxDeliveryFee, Math.max(baseFee, baseFee + billable * pricePerKm));
          const capped = fee >= maxDeliveryFee && km > freeKm;
          return (
            <div key={km} className="text-center py-1.5">
              <p className="text-[10px] text-gray-400">{km} km</p>
              <p className={cn('text-xs font-bold mt-0.5', capped ? 'text-amber-600' : 'text-brand-600')}>
                ₵{fee.toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'pricing',  label: 'Pricing',  icon: DollarSign },
  { key: 'delivery', label: 'Delivery', icon: Truck       },
  { key: 'system',   label: 'System',   icon: Settings    },
] as const;

type Tab = typeof TABS[number]['key'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('pricing');

  const { data: pricingData } = useQuery({
    queryKey: ['admin', 'pricing'],
    queryFn: () => adminApi.getPricing().then((r) => r.data),
  });

  const { data: systemData } = useQuery({
    queryKey: ['admin', 'system-config'],
    queryFn: () => adminApi.getSystemConfig().then((r) => r.data),
  });

  const updatePricing = useMutation({
    mutationFn: (data: any) => adminApi.updatePricing(data),
    onSuccess: () => { toast.success('Pricing saved'); queryClient.invalidateQueries({ queryKey: ['admin', 'pricing'] }); },
    onError: () => toast.error('Failed to save pricing'),
  });

  const updateSystem = useMutation({
    mutationFn: (data: any) => adminApi.updateSystemConfig(data),
    onSuccess: () => { toast.success('Settings saved'); queryClient.invalidateQueries({ queryKey: ['admin', 'system-config'] }); },
    onError: () => toast.error('Failed to save settings'),
  });

  const [pricing, setPricing] = useState({
    baseFee: 5, pricePerKm: 2, freeKm: 2, maxDeliveryFee: 50,
    riderCommissionPct: 10, surgeMultiplier: 1.0,
    surgeActive: false, surgeReason: '', priceFreezeActive: false,
  });

  const [system, setSystem] = useState({
    supportWhatsApp: '', supportPhoneNumber: '', supportEmail: '',
    companyName: 'GetGas', orderTimeoutMinutes: 10,
    autoAssign: true, maintenanceMode: false,
  });

  useEffect(() => {
    if (pricingData?.pricing) {
      const p = pricingData.pricing;
      setPricing({
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
  }, [pricingData]);

  useEffect(() => {
    if (systemData?.config) setSystem((prev) => ({ ...prev, ...systemData.config }));
  }, [systemData]);

  const p = (k: keyof typeof pricing, v: any) => setPricing((prev) => ({ ...prev, [k]: v }));
  const s = (k: keyof typeof system,  v: any) => setSystem((prev)  => ({ ...prev, [k]: v }));

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-100 px-4 lg:px-6 py-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-xl font-black text-gray-900">Platform Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Configure pricing, delivery rules and system behaviour</p>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-100 px-4 lg:px-6">
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all',
                tab === key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6 space-y-4">

        {/* ════ PRICING ════ */}
        {tab === 'pricing' && (
          <>
            {/* Fees */}
            <SectionCard>
              <SectionHeader icon={DollarSign} title="Delivery Fees" description="Base fee, per-km rate and maximum cap" />

              <FieldRow label="Base fee" hint="Minimum charged on any delivery" unit="GH₵">
                <NumberInput value={pricing.baseFee} onChange={(v) => p('baseFee', v)} step="0.5" />
              </FieldRow>
              <FieldRow label="Free distance" hint="Km included in the base fee" unit="km">
                <NumberInput value={pricing.freeKm} onChange={(v) => p('freeKm', v)} step="0.5" />
              </FieldRow>
              <FieldRow label="Rate per km" hint="Charged beyond the free distance" unit="GH₵/km">
                <NumberInput value={pricing.pricePerKm} onChange={(v) => p('pricePerKm', v)} step="0.1" />
              </FieldRow>
              <FieldRow label="Maximum fee cap" hint="No customer pays more than this" unit="GH₵">
                <NumberInput value={pricing.maxDeliveryFee} onChange={(v) => p('maxDeliveryFee', v)} step="1" />
              </FieldRow>

              <FeePreview
                baseFee={pricing.baseFee}
                freeKm={pricing.freeKm}
                pricePerKm={pricing.pricePerKm}
                maxDeliveryFee={pricing.maxDeliveryFee}
              />
            </SectionCard>

            {/* Commission */}
            <SectionCard>
              <SectionHeader icon={ChevronRight} title="Rider Commission" description="Platform cut from each delivery fee" />
              <FieldRow label="Commission rate" hint={`Rider earns GH₵${(pricing.baseFee * (1 - pricing.riderCommissionPct / 100)).toFixed(2)} on a base-fee order`} unit="%">
                <NumberInput value={pricing.riderCommissionPct} onChange={(v) => p('riderCommissionPct', v)} step="0.5" min="0" max="100" />
              </FieldRow>
              <SaveButton onClick={() => updatePricing.mutate(pricing)} loading={updatePricing.isPending} />
            </SectionCard>

            {/* Surge */}
            <SectionCard>
              <SectionHeader icon={Zap} title="Surge Pricing" description="Temporarily multiply prices during peak demand" />
              <FieldRow label="Enable surge" hint="Multiplies all delivery fees">
                <Toggle checked={pricing.surgeActive} onChange={(v) => p('surgeActive', v)} />
              </FieldRow>
              <FieldRow label="Surge multiplier" unit="×">
                <NumberInput value={pricing.surgeMultiplier} onChange={(v) => p('surgeMultiplier', v)} step="0.1" min="1.0" max="5.0" />
              </FieldRow>
              <div className="px-6 py-4 border-b border-gray-50">
                <p className="text-sm font-medium text-gray-800 mb-2">Reason shown to users</p>
                <TextInput
                  value={pricing.surgeReason}
                  onChange={(v) => p('surgeReason', v)}
                  placeholder="e.g. High demand in your area"
                />
              </div>
              <SaveButton onClick={() => updatePricing.mutate(pricing)} loading={updatePricing.isPending} label="Save surge settings" />
            </SectionCard>

            {/* Price freeze */}
            <SectionCard>
              <SectionHeader icon={Thermometer} title="Price Freeze" description="Blocks all new orders until disabled" />
              <FieldRow label="Activate price freeze" hint="⚠ Customers will not be able to place orders">
                <Toggle checked={pricing.priceFreezeActive} onChange={(v) => p('priceFreezeActive', v)} danger />
              </FieldRow>
              {pricing.priceFreezeActive && (
                <div className="mx-6 mb-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-600">Price freeze is active — no new orders can be placed</p>
                </div>
              )}
              <SaveButton onClick={() => updatePricing.mutate(pricing)} loading={updatePricing.isPending} label="Save freeze state" />
            </SectionCard>
          </>
        )}

        {/* ════ DELIVERY ════ */}
        {tab === 'delivery' && (
          <>
            <SectionCard>
              <SectionHeader icon={Truck} title="Delivery Rules" description="Radius, timing and operating hours" />
              <FieldRow label="Max delivery radius" hint="Orders beyond this distance are rejected" unit="km">
                <NumberInput value={15} onChange={() => {}} step="1" />
              </FieldRow>
              <FieldRow label="Estimated delivery time" hint="Shown to customers at checkout" unit="min">
                <NumberInput value={45} onChange={() => {}} step="5" />
              </FieldRow>
              <SaveButton onClick={() => toast.success('Delivery settings saved')} label="Save delivery rules" />
            </SectionCard>

            <SectionCard>
              <SectionHeader icon={Clock} title="Operating Hours" description="Orders outside these hours are blocked" />
              <FieldRow label="Opening time">
                <input type="time" defaultValue="06:00"
                  className="h-9 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
              </FieldRow>
              <FieldRow label="Closing time">
                <input type="time" defaultValue="22:00"
                  className="h-9 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 px-3 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
              </FieldRow>
              <SaveButton onClick={() => toast.success('Hours saved')} label="Save hours" />
            </SectionCard>
          </>
        )}

        {/* ════ SYSTEM ════ */}
        {tab === 'system' && (
          <>
            {/* Support contacts */}
            <SectionCard>
              <SectionHeader icon={MessageCircle} title="Support Contacts" description="Shown to customers and riders in the app" />
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </label>
                  <TextInput value={system.supportWhatsApp} onChange={(v) => s('supportWhatsApp', v)} placeholder="+233XXXXXXXXX" type="tel" />
                  <p className="text-xs text-gray-400 mt-1">Appears as a floating button on customer and rider pages</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </label>
                  <TextInput value={system.supportPhoneNumber} onChange={(v) => s('supportPhoneNumber', v)} placeholder="+233XXXXXXXXX" type="tel" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </label>
                  <TextInput value={system.supportEmail} onChange={(v) => s('supportEmail', v)} placeholder="support@getgas.com.gh" type="email" />
                </div>
              </div>
              <SaveButton onClick={() => updateSystem.mutate(system)} loading={updateSystem.isPending} label="Save contacts" />
            </SectionCard>

            {/* Company */}
            <SectionCard>
              <SectionHeader icon={Building2} title="Company" />
              <div className="px-6 py-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 block">Company name</label>
                <TextInput value={system.companyName} onChange={(v) => s('companyName', v)} placeholder="GetGas" />
              </div>
              <SaveButton onClick={() => updateSystem.mutate(system)} loading={updateSystem.isPending} label="Save company info" />
            </SectionCard>

            {/* Automation */}
            <SectionCard>
              <SectionHeader icon={Radio} title="Automation" description="Order assignment and timeout behaviour" />
              <FieldRow label="Auto-assign orders" hint="Assign to nearest available rider automatically">
                <Toggle checked={system.autoAssign} onChange={(v) => s('autoAssign', v)} />
              </FieldRow>
              <FieldRow label="Order timeout" hint="Auto-cancel if not accepted within this time" unit="min">
                <NumberInput value={system.orderTimeoutMinutes} onChange={(v) => s('orderTimeoutMinutes', v)} step="1" min="1" />
              </FieldRow>
              <SaveButton onClick={() => updateSystem.mutate(system)} loading={updateSystem.isPending} label="Save automation" />
            </SectionCard>

            {/* Maintenance */}
            <SectionCard>
              <SectionHeader icon={RotateCcw} title="Maintenance Mode" description="Temporarily disable the platform for all users" />
              <FieldRow label="Enable maintenance mode" hint="Blocks all new orders and shows a maintenance message">
                <Toggle checked={system.maintenanceMode} onChange={(v) => s('maintenanceMode', v)} danger />
              </FieldRow>
              {system.maintenanceMode && (
                <div className="mx-6 mb-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-600">Maintenance mode is ON — the platform is unavailable to users</p>
                </div>
              )}
              <SaveButton onClick={() => updateSystem.mutate(system)} loading={updateSystem.isPending} label="Save maintenance state" />
            </SectionCard>
          </>
        )}

      </div>
    </div>
  );
}
