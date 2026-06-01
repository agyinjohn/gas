import type { AxiosInstance } from 'axios';
import { createApiClient, type ApiClientConfig } from './client';

export function createAuthApi(api: AxiosInstance) {
  return {
    sendOTP: (phone: string, purpose: 'registration' | 'login' | 'forgot_password') =>
      api.post('/api/v1/auth/user/send-otp', { phone, purpose }),

    register: (data: { phone: string; otp: string; name: string; password: string; referralCode?: string }) =>
      api.post('/api/v1/auth/user/register', data),

    login: (phone: string, password: string) =>
      api.post('/api/v1/auth/user/login', { phone, password }),

    setPassword: (data: { phone: string; otp: string; password: string }) =>
      api.post('/api/v1/auth/user/set-password', data),

    resetPassword: (phone: string, otp: string, newPassword: string) =>
      api.post('/api/v1/auth/user/reset-password', { phone, otp, newPassword }),

    addPhone: (phone: string, otp?: string) =>
      api.post('/api/v1/auth/user/add-phone', { phone, otp }),

    verifyOTP: (phone: string, code: string, purpose: string) =>
      api.post('/api/v1/auth/station/verify-otp', { phone, code, purpose }),

    riderRegister: (data: object) =>
      api.post('/api/v1/auth/rider/register', data),

    riderLogin: (phone: string, password: string) =>
      api.post('/api/v1/auth/rider/login', { phone, password }),

    staffLogin: (phone: string, password: string) =>
      api.post('/api/v1/auth/staff/login', { phone, password }),
  };
}

export function createStationsApi(api: AxiosInstance) {
  return {
    getPricing: () => api.get('/api/v1/stations/pricing'),
    getSystemConfig: () => api.get('/api/v1/stations/system-config'),
    getNearby: (lat: number, lng: number, radius = 10, size?: number) =>
      api.get('/api/v1/stations/nearby', { params: { lat, lng, radius, size } }),
    getById: (id: string) => api.get(`/api/v1/stations/${id}`),
    updatePrices: (id: string, data: object) =>
      api.patch(`/api/v1/stations/${id}/prices`, data),
    setStockStatus: (id: string, outOfStock: boolean) =>
      api.patch(`/api/v1/stations/${id}/stock-status`, { outOfStock }),
    updateInventory: (id: string, size: number, isAvailable: boolean) =>
      api.patch(`/api/v1/stations/${id}/inventory`, { size, isAvailable }),
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
    updateOperatingHours: (id: string, data: object) =>
      api.patch(`/api/v1/stations/${id}/settings`, data),
  };
}

export function createOrdersApi(api: AxiosInstance) {
  return {
    create: (data: object) => api.post('/api/v1/orders', data),
    list: (params?: object) => api.get('/api/v1/orders', { params }),
    getById: (id: string) => api.get(`/api/v1/orders/${id}`),
    updateStatus: (id: string, status: string, note?: string) =>
      api.patch(`/api/v1/orders/${id}/status`, { status, note }),
    confirmDelivery: (id: string, otp: string) =>
      api.post(`/api/v1/orders/${id}/confirm-delivery`, { otp }),
    decline: (id: string) => api.post(`/api/v1/orders/${id}/decline`),
    rate: (id: string, rating: number, comment?: string) =>
      api.post(`/api/v1/orders/${id}/rate`, { rating, comment }),
    rateStation: (id: string, rating: number, comment?: string) =>
      api.post(`/api/v1/orders/${id}/rate-station`, { rating, comment }),
    reportIssue: (id: string, category: string, description: string) =>
      api.post(`/api/v1/orders/${id}/report-issue`, { category, description }),
  };
}

export function createRidersApi(api: AxiosInstance) {
  return {
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
}

export function createUsersApi(api: AxiosInstance) {
  return {
    getMe: () => api.get('/api/v1/users/me'),
    updateMe: (data: object) => api.patch('/api/v1/users/me', data),
    addAddress: (data: object) => api.post('/api/v1/users/addresses', data),
    updateAddress: (id: string, data: object) =>
      api.patch(`/api/v1/users/addresses/${id}`, data),
    deleteAddress: (id: string) => api.delete(`/api/v1/users/addresses/${id}`),
    addPaymentMethod: (data: object) => api.post('/api/v1/users/payment-methods', data),
    setDefaultPaymentMethod: (id: string) =>
      api.patch(`/api/v1/users/payment-methods/${id}`, { isDefault: true }),
    deletePaymentMethod: (id: string) => api.delete(`/api/v1/users/payment-methods/${id}`),
    getLoyalty: (page = 1) => api.get('/api/v1/users/loyalty', { params: { page } }),
    getReferral: () => api.get('/api/v1/users/referral'),
  };
}

export function createNotificationsApi(api: AxiosInstance) {
  return {
    list: () => api.get('/api/v1/notifications'),
    readAll: () => api.patch('/api/v1/notifications/read-all'),
    readOne: (id: string) => api.patch(`/api/v1/notifications/${id}/read`),
    updateFcmToken: (token: string) =>
      api.patch('/api/v1/notifications/fcm-token', { token }),
  };
}

export function createPaymentsApi(api: AxiosInstance) {
  return {
    verify: (reference: string) => api.get(`/api/v1/payments/verify/${reference}`),
  };
}

export function createStationAuthApi(api: AxiosInstance) {
  return {
    register: (data: object) => api.post('/api/v1/auth/station/register', data),
    sendOTP: (phone: string) => api.post('/api/v1/auth/station/send-otp', { phone }),
    verifyOTP: (phone: string, code: string, purpose: 'registration' | 'login') =>
      api.post('/api/v1/auth/station/verify-otp', { phone, code, purpose }),
  };
}

export function createAdminAuthApi(api: AxiosInstance) {
  return {
    login: (email: string, password: string) =>
      api.post('/api/v1/auth/admin/login', { phone: email, password }),
  };
}

export function createAdminApi(api: AxiosInstance) {
  return {
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
    getSystemConfig: () => api.get('/api/v1/admin/system-config'),
    updateSystemConfig: (data: object) => api.patch('/api/v1/admin/system-config', data),
    getUsers: (params?: object) => api.get('/api/v1/admin/users', { params }),
    getZones: () => api.get('/api/v1/admin/zones'),
    createZone: (data: object) => api.post('/api/v1/admin/zones', data),
    updateZone: (id: string, data: object) => api.patch(`/api/v1/admin/zones/${id}`, data),
    deleteZone: (id: string) => api.delete(`/api/v1/admin/zones/${id}`),
    assignRiderZone: (riderId: string, zoneId: string | null) =>
      api.patch(`/api/v1/admin/riders/${riderId}/zone`, { zoneId }),
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
export type StationsApi = ReturnType<typeof createStationsApi>;
export type OrdersApi = ReturnType<typeof createOrdersApi>;
export type RidersApi = ReturnType<typeof createRidersApi>;
export type UsersApi = ReturnType<typeof createUsersApi>;
export type NotificationsApi = ReturnType<typeof createNotificationsApi>;
export type PaymentsApi = ReturnType<typeof createPaymentsApi>;
export type StationAuthApi = ReturnType<typeof createStationAuthApi>;
export type AdminAuthApi = ReturnType<typeof createAdminAuthApi>;
export type AdminApi = ReturnType<typeof createAdminApi>;

export interface GetGasClient {
  api: AxiosInstance;
  authApi: AuthApi;
  stationsApi: StationsApi;
  ordersApi: OrdersApi;
  ridersApi: RidersApi;
  usersApi: UsersApi;
  notificationsApi: NotificationsApi;
  paymentsApi: PaymentsApi;
  stationAuthApi: StationAuthApi;
  adminAuthApi: AdminAuthApi;
  adminApi: AdminApi;
}

export function createGetGasClient(config: ApiClientConfig): GetGasClient {
  const api = createApiClient(config);
  return {
    api,
    authApi: createAuthApi(api),
    stationsApi: createStationsApi(api),
    ordersApi: createOrdersApi(api),
    ridersApi: createRidersApi(api),
    usersApi: createUsersApi(api),
    notificationsApi: createNotificationsApi(api),
    paymentsApi: createPaymentsApi(api),
    stationAuthApi: createStationAuthApi(api),
    adminAuthApi: createAdminAuthApi(api),
    adminApi: createAdminApi(api),
  };
}
