'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MapPin, Plus, Edit, Trash2, Home, 
  Building, Star, Navigation, Check 
} from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Card, Button, Input, Modal } from '@/components/ui';
import toast from 'react-hot-toast';

interface Address {
  _id: string;
  label: string;
  street: string;
  city: string;
  lat: number;
  lng: number;
  isDefault: boolean;
}

export default function UserAddressesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: '',
    street: '',
    city: '',
    lat: 0,
    lng: 0,
    isDefault: false,
  });

  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => usersApi.getMe().then((r) => r.data.user),
  });

  const addAddressMutation = useMutation({
    mutationFn: (data: any) => usersApi.addAddress(data),
    onSuccess: () => {
      toast.success('Address added successfully');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      usersApi.updateAddress(id, data),
    onSuccess: () => {
      toast.success('Address updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setShowModal(false);
      resetForm();
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteAddress(id),
    onSuccess: () => {
      toast.success('Address deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });

  const addresses: Address[] = userData?.savedAddresses || [];

  const resetForm = () => {
    setAddressForm({
      label: '',
      street: '',
      city: '',
      lat: 0,
      lng: 0,
      isDefault: false,
    });
    setEditingAddress(null);
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    resetForm();
    setShowModal(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      street: address.street,
      city: address.city,
      lat: address.lat,
      lng: address.lng,
      isDefault: address.isDefault,
    });
    setShowModal(true);
  };

  const handleDeleteAddress = (id: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      deleteAddressMutation.mutate(id);
    }
  };

  const handleSetDefault = (id: string) => {
    updateAddressMutation.mutate({
      id,
      data: { isDefault: true }
    });
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAddressForm(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }));
          toast.success('Location captured');
        },
        () => toast.error('Location access denied')
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!addressForm.street || !addressForm.city || !addressForm.label) {
      return toast.error('Please fill all required fields');
    }

    if (!addressForm.lat || !addressForm.lng) {
      return toast.error('Please capture your location');
    }

    if (editingAddress) {
      updateAddressMutation.mutate({
        id: editingAddress._id,
        data: addressForm
      });
    } else {
      addAddressMutation.mutate(addressForm);
    }
  };

  const getAddressIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('home')) return Home;
    if (lower.includes('work') || lower.includes('office')) return Building;
    return MapPin;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Saved Addresses</h1>
            <p className="text-sm text-gray-500">Manage your delivery locations</p>
          </div>
          <Button onClick={handleAddAddress}>
            <Plus className="w-4 h-4 mr-1" />
            Add Address
          </Button>
        </div>
      </div>

      <div className="px-4 py-4">
        {addresses.length > 0 ? (
          <div className="space-y-3">
            {addresses.map((address) => {
              const IconComponent = getAddressIcon(address.label);
              return (
                <Card key={address._id}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-brand-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{address.label}</p>
                        {address.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <Star className="w-3 h-3 fill-current" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {address.street}, {address.city}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {!address.isDefault && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleSetDefault(address._id)}
                            loading={updateAddressMutation.isPending}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditAddress(address)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteAddress(address._id)}
                          loading={deleteAddressMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved addresses</h3>
            <p className="text-gray-500 mb-4">
              Add your frequently used addresses for faster checkout
            </p>
            <Button onClick={handleAddAddress}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Address
            </Button>
          </Card>
        )}
      </div>

      {/* Add/Edit Address Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
      >
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Label *
            </label>
            <Input
              type="text"
              placeholder="e.g., Home, Work, Mom's House"
              value={addressForm.label}
              onChange={(e) => setAddressForm(prev => ({ ...prev, label: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address *
            </label>
            <Input
              type="text"
              placeholder="House number and street name"
              value={addressForm.street}
              onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <Input
              type="text"
              placeholder="City or town"
              value={addressForm.city}
              onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleCurrentLocation}
            >
              <Navigation className="w-4 h-4 mr-2" />
              {addressForm.lat && addressForm.lng ? '✓ Location Captured' : 'Capture Current Location'}
            </Button>
            {addressForm.lat && addressForm.lng && (
              <p className="text-xs text-gray-500 mt-1">
                Coordinates: {addressForm.lat.toFixed(6)}, {addressForm.lng.toFixed(6)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={addressForm.isDefault}
              onChange={(e) => setAddressForm(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              Set as default address
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
              loading={addAddressMutation.isPending || updateAddressMutation.isPending}
            >
              {editingAddress ? 'Update' : 'Save'} Address
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}