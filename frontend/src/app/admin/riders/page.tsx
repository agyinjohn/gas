'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, CheckCircle, XCircle, Eye, Filter, Search } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { Card, Button, Badge, Input, Skeleton } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminRidersPage() {
  const queryClient = useQueryClient();
  const [kycFilter, setKycFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'riders', kycFilter, searchTerm],
    queryFn: () => adminApi.getRiders({ 
      kycStatus: kycFilter || undefined,
      search: searchTerm || undefined 
    }).then((r) => r.data),
  });

  const kycMutation = useMutation({
    mutationFn: ({ id, kycStatus, reason }: { id: string; kycStatus: string; reason?: string }) =>
      adminApi.updateRiderKYC(id, kycStatus, reason),
    onSuccess: () => {
      toast.success('KYC status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateRiderStatus(id, status),
    onSuccess: () => {
      toast.success('Rider status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'riders'] });
    },
  });

  const riders = data?.riders || [];

  return (
    <div className="px-4 lg:px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Rider Management</h1>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, phone, vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* KYC Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['pending', 'approved', 'rejected', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setKycFilter(status === 'all' ? '' : status)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                (status === 'all' ? '' : status) === kycFilter
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : riders.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No riders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {riders.map((rider: any) => (
              <RiderCard
                key={rider._id}
                rider={rider}
                onUpdateKYC={(kycStatus, reason) => 
                  kycMutation.mutate({ id: rider._id, kycStatus, reason })
                }
                onUpdateStatus={(status) => 
                  statusMutation.mutate({ id: rider._id, status })
                }
                loading={kycMutation.isPending || statusMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RiderCard({ 
  rider, 
  onUpdateKYC, 
  onUpdateStatus, 
  loading 
}: { 
  rider: any; 
  onUpdateKYC: (kycStatus: string, reason?: string) => void; 
  onUpdateStatus: (status: string) => void; 
  loading: boolean; 
}) {
  const [showDetails, setShowDetails] = useState(false);

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="font-bold text-purple-600 text-lg">
              {rider.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{rider.name}</p>
            <p className="text-sm text-gray-500">{rider.phone}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getKYCStatusColor(rider.kycStatus)}>
            KYC: {rider.kycStatus}
          </Badge>
          <Badge className={getStatusColor(rider.status)}>
            {rider.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500">Vehicle</p>
          <p className="font-medium">{rider.vehicleType}</p>
          <p className="text-xs text-gray-400">{rider.vehiclePlate}</p>
        </div>
        <div>
          <p className="text-gray-500">Performance</p>
          <p className="font-medium">{rider.totalTrips || 0} trips</p>
          <p className="text-xs text-gray-400">
            ⭐ {rider.ratingAvg?.toFixed(1) || 'N/A'} rating
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500">National ID</p>
              <p className="font-medium">{rider.nationalId}</p>
            </div>
            <div>
              <p className="text-gray-500">Joined</p>
              <p className="font-medium">
                {new Date(rider.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Bank Account</p>
              <p className="font-medium">
                {rider.bankAccount?.accountNumber || 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Earnings</p>
              <p className="font-medium">
                GH₵{rider.totalEarnings?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KYC Document */}
      {rider.kycDocumentUrl && (
        <div className="mb-4">
          <a
            href={rider.kycDocumentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <Eye className="w-4 h-4" />
            View KYC Document
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </Button>

        {rider.kycStatus === 'pending' && (
          <>
            <Button
              size="sm"
              className="flex-1"
              loading={loading}
              onClick={() => onUpdateKYC('approved')}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Approve KYC
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onUpdateKYC('rejected', 'Document not valid')}
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Reject
            </Button>
          </>
        )}

        {rider.kycStatus === 'approved' && rider.status === 'active' && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => onUpdateStatus('suspended')}
          >
            Suspend
          </Button>
        )}

        {rider.status === 'suspended' && (
          <Button
            size="sm"
            onClick={() => onUpdateStatus('active')}
          >
            Reinstate
          </Button>
        )}
      </div>

      {rider.kycRejectionReason && (
        <div className="mt-3 p-2 bg-red-50 rounded text-xs">
          <p className="font-medium text-red-700">Rejection Reason:</p>
          <p className="text-red-600">{rider.kycRejectionReason}</p>
        </div>
      )}
    </Card>
  );
}