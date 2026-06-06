import axios from 'axios';

const PAYSTACK_BASE = 'https://api.paystack.co';

const paystackHeaders = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
});

export interface InitializePaymentParams {
  email: string;
  amountGHS: number;          // in Ghana Cedis (will be converted to pesewas)
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  mobileNumber?: string;
  provider?: 'mtn' | 'vod' | 'tgo'; // mobile money providers
}

export interface PaystackTransaction {
  reference: string;
  status: 'success' | 'failed' | 'abandoned';
  amount: number;             // in pesewas
  gateway_response: string;
}

/**
 * Initialize a Paystack payment (card or mobile money).
 */
export async function initializePayment(params: InitializePaymentParams): Promise<{
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}> {
  const payload: Record<string, unknown> = {
    email: params.email,
    amount: Math.round(params.amountGHS * 100), // GHS → pesewas
    reference: params.reference,
    callback_url: params.callbackUrl,
    currency: 'GHS',
    metadata: params.metadata || {},
  };

  if (params.mobileNumber && params.provider) {
    payload.channels = ['mobile_money'];
    payload.mobile_money = {
      phone: params.mobileNumber,
      provider: params.provider,
    };
  } else {
    payload.channels = ['card', 'mobile_money', 'bank_transfer'];
  }

  const { data } = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, payload, {
    headers: paystackHeaders(),
  });

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  };
}

/**
 * Verify a payment by reference.
 */
export async function verifyPayment(reference: string): Promise<PaystackTransaction> {
  const { data } = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: paystackHeaders(),
  });

  return {
    reference: data.data.reference,
    status: data.data.status,
    amount: data.data.amount,
    gateway_response: data.data.gateway_response,
  };
}

/**
 * Initiate a transfer (payout) to a station's account.
 */
export async function transferToBeneficiary(params: {
  amountGHS: number;
  recipientCode: string;
  reason: string;
  reference: string;
}): Promise<{ transferCode: string; status: string }> {
  const { data } = await axios.post(
    `${PAYSTACK_BASE}/transfer`,
    {
      source: 'balance',
      amount: Math.round(params.amountGHS * 100),
      recipient: params.recipientCode,
      reason: params.reason,
      reference: params.reference,
    },
    { headers: paystackHeaders() }
  );

  return { transferCode: data.data.transfer_code, status: data.data.status };
}

/**
 * Initiate a refund for a captured payment.
 */
export async function initiateRefund(reference: string, amountGHS?: number): Promise<void> {
  const payload: Record<string, unknown> = { transaction: reference };
  if (amountGHS) payload.amount = Math.round(amountGHS * 100);

  await axios.post(`${PAYSTACK_BASE}/refund`, payload, { headers: paystackHeaders() });
}

// Paystack Ghana mobile money bank codes
const GHANA_MOMO_BANK_CODES: Record<string, string> = {
  mtn: 'MTN',
  vod: 'VOD',
  tgo: 'ATL', // Airtel/Tigo
  airtel: 'ATL',
};

/**
 * Create a Paystack transfer recipient (bank or mobile money).
 * Returns a recipient_code used for transfers.
 */
export async function createTransferRecipient(params: {
  type: 'mobile_money' | 'ghipss';
  name: string;
  accountNumber: string;
  bankCode?: string;
  mobileProvider?: string;
  currency?: string;
}): Promise<string> {
  const payload: Record<string, unknown> = {
    type: params.type === 'mobile_money' ? 'mobile_money' : 'ghipss',
    name: params.name,
    account_number: params.accountNumber,
    currency: params.currency || 'GHS',
  };

  if (params.type === 'mobile_money' && params.mobileProvider) {
    // Paystack Ghana requires uppercase provider codes e.g. "MTN", "VOD", "ATL"
    payload.bank_code = GHANA_MOMO_BANK_CODES[params.mobileProvider.toLowerCase()] ?? params.mobileProvider.toUpperCase();
  } else if (params.bankCode) {
    payload.bank_code = params.bankCode;
  }

  const { data } = await axios.post(`${PAYSTACK_BASE}/transferrecipient`, payload, {
    headers: paystackHeaders(),
  });
  return data.data.recipient_code;
}

/**
 * Generate a unique payment reference.
 */
export function generatePaymentReference(orderId: string): string {
  return `GG-${orderId.slice(-8).toUpperCase()}-${Date.now()}`;
}
