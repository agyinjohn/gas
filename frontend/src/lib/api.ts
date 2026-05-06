import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gasgo_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('gasgo_token');
      localStorage.removeItem('gasgo_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ─── API helpers ──────────────────────────────────────────────────────────────

export const authApi = {
  sendOTP: (phone: string, purpose: 'registration' | 'login') =>
    api.post('/api/v1/auth/user/send-otp', { phone, purpose }),

  verifyOTP: (phone: string, code: string, purpose: string, name?: string, referralCode?: string) =>
    api.post('/api/v1/auth/user/verify-otp', { phone, code, purpose, name, referralCode }),

  riderRegister: (data: object) =>
    api.post('/api/v1/auth/rider/register', data),

  riderLogin: (phone: string, password: string) =>
    api.post('/api/v1/auth/rider/login', { phone, password }),
};

export const stationsApi = {
  getPricing: () => api.get('/api/v1/stations/pricing'),
  getNearby: (lat: number, lng: number, radius = 10, size?: number) =>
    api.get('/api/v1/stations/nearby', { params: { lat, lng, radius, size } }),

  getById: (id: string) =>
    api.get(`/api/v1/stations/${id}`),

  updatePrices: (id: string, data: object) =>
    api.patch(`/api/v1/stations/${id}/prices`, data),

  updateInventory: (id: string, data: object) =>
    api.patch(`/api/v1/stations/${id}/inventory`, data),

  addExchangeReturn: (id: string, size: number, quantity?: number) =>
    api.post(`/api/v1/stations/${id}/exchange-returns`, { size, quantity }),

  markRefillComplete: (id: string, size: number, quantity?: number) =>
    api.patch(`/api/v1/stations/${id}/refill-complete`, { size, quantity }),

  getOrders: (id: string, status?: string) =>
    api.get(`/api/v1/stations/${id}/orders`, { params: status ? { status } : {} }),

  updateSettings: (id: string, data: object) =>
    api.patch(`/api/v1/stations/${id}/settings`, data),

  getAnalytics: (id: string, period?: 'day' | 'week' | 'month') =>
    api.get(`/api/v1/stations/${id}/analytics`, { params: period ? { period } : {} }),
  getReviews: (id: string, page = 1) =>
    api.get(`/api/v1/stations/${id}/reviews`, { params: { page } }),
};

export const ordersApi = {
  create: (data: object) => api.post('/api/v1/orders', data),  // pass scheduledFor (ISO string) for scheduled delivery
  list: (params?: object) => api.get('/api/v1/orders', { params }),
  getById: (id: string) => api.get(`/api/v1/orders/${id}`),
  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/api/v1/orders/${id}/status`, { status, note }),
  confirmDelivery: (id: string, otp: string) =>
    api.post(`/api/v1/orders/${id}/confirm-delivery`, { otp }),
  decline: (id: string) =>
    api.post(`/api/v1/orders/${id}/decline`),
  rate: (id: string, rating: number, comment?: string) =>
    api.post(`/api/v1/orders/${id}/rate`, { rating, comment }),
  rateStation: (id: string, rating: number, comment?: string) =>
    api.post(`/api/v1/orders/${id}/rate-station`, { rating, comment }),
};

export const ridersApi = {
  getMe: () => api.get('/api/v1/riders/me'),
  setStatus: (status: string) => api.patch('/api/v1/riders/status', { status }),
  updateLocation: (lat: number, lng: number) =>
    api.patch('/api/v1/riders/location', { lat, lng }),
  getDashboard: () => api.get('/api/v1/riders/dashboard'),
  getOrders: (params?: object) => api.get('/api/v1/riders/orders', { params }),
  getPayouts: (params?: object) => api.get('/api/v1/riders/payouts', { params }),
  updateBankAccount: (data: object) => api.patch('/api/v1/riders/bank-account', data),
  updateFcmToken: (token: string) => api.patch('/api/v1/riders/fcm-token', { token }),
};

export const usersApi = {
  getMe: () => api.get('/api/v1/users/me'),
  updateMe: (data: object) => api.patch('/api/v1/users/me', data),

  addAddress: (data: object) => api.post('/api/v1/users/addresses', data),
  updateAddress: (id: string, data: object) => api.patch(`/api/v1/users/addresses/${id}`, data),
  deleteAddress: (id: string) => api.delete(`/api/v1/users/addresses/${id}`),

  addPaymentMethod: (data: object) => api.post('/api/v1/users/payment-methods', data),
  setDefaultPaymentMethod: (id: string) => api.patch(`/api/v1/users/payment-methods/${id}`, { isDefault: true }),
  deletePaymentMethod: (id: string) => api.delete(`/api/v1/users/payment-methods/${id}`),

  getLoyalty: (page = 1) => api.get('/api/v1/users/loyalty', { params: { page } }),
  getReferral: () => api.get('/api/v1/users/referral'),
};

export const stationAuthApi = {
  register: (data: object) =>
    api.post('/api/v1/auth/station/register', data),

  sendOTP: (phone: string) =>
    api.post('/api/v1/auth/station/send-otp', { phone }),

  verifyOTP: (phone: string, code: string, purpose: 'registration' | 'login') =>
    api.post('/api/v1/auth/station/verify-otp', { phone, code, purpose }),
};

export const adminAuthApi = {
  login: (email: string, password: string) =>
    api.post('/api/v1/auth/admin/login', { phone: email, password }),
};

export const adminApi = {
  getMetrics: () => api.get('/api/v1/admin/metrics'),
  getWeeklyTrend: () => api.get('/api/v1/admin/metrics/weekly'),

  getStations: (params?: object) => api.get('/api/v1/admin/stations', { params }),
  createStation: (data: object) => api.post('/api/v1/admin/stations', data),
  updateStationStatus: (id: string, status: string) =>
    api.patch(`/api/v1/admin/stations/${id}/status`, { status }),
  updateStationCommission: (id: string, commissionPct: number) =>
    api.patch(`/api/v1/admin/stations/${id}/commission`, { commissionPct }),
  updateStationLocation: (id: string, lat: number, lng: number) =>
    api.patch(`/api/v1/admin/stations/${id}/location`, { lat, lng }),

  getRiders: (params?: object) => api.get('/api/v1/admin/riders', { params }),
  updateRiderKYC: (id: string, kycStatus: string, reason?: string) =>
    api.patch(`/api/v1/admin/riders/${id}/kyc`, { kycStatus, reason }),
  updateRiderStatus: (id: string, status: string) =>
    api.patch(`/api/v1/admin/riders/${id}/status`, { status }),

  getOrders: (params?: object) => api.get('/api/v1/admin/orders', { params }),
  refundOrder: (id: string) => api.post(`/api/v1/admin/orders/${id}/refund`),
  cancelOrder: (id: string, reason: string) =>
    api.patch(`/api/v1/admin/orders/${id}/cancel`, { reason }),

  getPricing: () => api.get('/api/v1/admin/pricing'),
  updatePricing: (data: object) => api.patch('/api/v1/admin/pricing', data),

  getUsers: (params?: object) => api.get('/api/v1/admin/users', { params }),
};
