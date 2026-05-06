'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Store, User, Phone } from 'lucide-react';
import { stationAuthApi } from '@/lib/api';
import { Card, Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';

export default function StationRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    stationName: '',
    address: '',
    city: '',
    lat: 0,
    lng: 0,
  });
  const [otp, setOtp] = useState('');

  const handleLocationSelect = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }));
          toast.success('Location captured');
        },
        () => toast.error('Location access denied')
      );
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng) {
      return toast.error('Please select your location');
    }
    
    setLoading(true);
    try {
      await stationAuthApi.register(formData);
      setStep(2);
      toast.success('Registration submitted! Verify your phone.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await stationAuthApi.verifyOTP(formData.phone, otp, 'registration');
      localStorage.setItem('gasgo_token', response.data.token);
      localStorage.setItem('gasgo_user', JSON.stringify(response.data.user));
      localStorage.setItem('gasgo_station_id', response.data.station.id);
      toast.success('Registration complete! Awaiting admin approval.');
      router.push('/station');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <Phone className="w-12 h-12 text-brand-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900">Verify Phone</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter the OTP sent to {formData.phone}
            </p>
          </div>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="text-center text-lg tracking-widest"
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Verify & Complete Registration
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <Store className="w-12 h-12 text-brand-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Register Station</h1>
          <p className="text-sm text-gray-500 mt-1">
            Join GasGo as a station partner
          </p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Owner Name
              </label>
              <Input
                type="text"
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+233244123456"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Store className="w-4 h-4 inline mr-1" />
                Station Name
              </label>
              <Input
                type="text"
                placeholder="Your gas station name"
                value={formData.stationName}
                onChange={(e) => setFormData(prev => ({ ...prev, stationName: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <Input
                type="text"
                placeholder="Street address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <Input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleLocationSelect}
              >
                {formData.lat && formData.lng ? '✓ Location Captured' : 'Capture Current Location'}
              </Button>
            </div>
          </div>
          
          <Button type="submit" className="w-full" loading={loading}>
            Register Station
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            By registering, you agree to our terms and conditions.
            Your station will be reviewed by our admin team.
          </p>
        </form>
      </Card>
    </div>
  );
}