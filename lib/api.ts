// API РљР»РёРµРЅС‚ РґР»СЏ РІР·Р°РёРјРѕРґРµР№СЃС‚РІРёСЏ СЃ Go Backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('ice_auth_token', token);
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('ice_auth_token');
  }
  return authToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const initData = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initData || '' : '';
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (initData) {
    headers.set('Authorization', `Bearer ${initData}`);
  }
  if (initData) {
    headers.set('X-Telegram-Init-Data', initData);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await res.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || `API error: ${res.status}`);
    }

    return data as T;
  } catch (err: any) {
    throw new Error(err.message || 'РЎРµС‚РµРІР°СЏ РѕС€РёР±РєР° РїСЂРё РѕР±СЂР°С‰РµРЅРёРё Рє API');
  }
}

// ---------------------------------------------------------------------------
// РўРёРїС‹ РґР°РЅРЅС‹С…
// ---------------------------------------------------------------------------

export interface UserProfile {
  user_id: number;
  username?: string;
  full_name: string;
  role: string;
  client_level: 'newbie' | 'shopper' | 'vip';
  ices_balance: number;
  referral_code?: string;
  referral_count: number;
  referral_bonus: number;
  total_spent: number;
  orders_count: number;
}

export interface PricingInput {
  product_price: number;
  product_currency: string;
  source_country: string;
  delivery_method?: string;
  weight_kg?: number;
  category: string;
  insurance?: boolean;
  legit_check?: boolean;
  client_level?: string;
  local_delivery_method?: string;
  is_first_order?: boolean;
  extra_discount_byn?: number;
}

export interface PricingResult {
  available: boolean;
  message?: string;
  breakdown: {
    product_cost_byn: number;
    currency_buffer_byn: number;
    delivery_cost_byn: number;
    local_delivery_byn: number;
    commission_byn: number;
    insurance_byn: number;
    legit_check_byn: number;
    customs_duty_byn: number;
    discount_byn: number;
  };
  total_byn: number;
  total_ice: number;
  prepayment_amount: number;
  delivery_days_min: number;
  delivery_days_max: number;
  warnings: string[];
}

export interface ProductCard {
  platform: string;
  platform_label: string;
  flag: string;
  title: string;
  url: string;
  price: number;
  currency: string;
  image_url: string;
  in_stock: boolean;
}

export interface SearchResponse {
  ok: boolean;
  total: number;
  results: ProductCard[];
  duration_ms: number;
}

export interface OrderItem {
  title: string;
  size?: string;
  color?: string;
  price_original: number;
  url: string;
  image_url?: string;
}

export interface CreateOrderRequest {
  source_url: string;
  source_country: string;
  product_currency: string;
  product_price: number;
  weight_kg: number;
  category: string;
  title: string;
  items: OrderItem[];
  insurance: boolean;
  legit_check: boolean;
  requires_video_check: boolean;
  local_delivery_method: string;
  delivery_address: string;
  promo_code?: string;
}

export interface OrderListItem {
  id: string;
  status: string;
  source_url: string;
  source_country: string;
  title: string;
  total_byn: number;
  prepayment_amount: number;
  tracking_number_by?: string;
  tracking_number_intl?: string;
  created_at: string;
}

export interface UserCard {
  id: string;
  user_id: number;
  payment_provider: string;
  card_first6: string;
  card_last4: string;
  card_type: string;
  exp_month: number;
  exp_year: number;
  holder_name?: string;
  is_default: boolean;
  status: string;
  created_at: string;
}

export interface PaymentIntent {
  id: string;
  order_id: string;
  user_id: number;
  stage: 'FIRST_PAYMENT' | 'SECOND_PAYMENT' | 'PRICE_DROP_REFUND' | 'PRICE_SURCHARGE' | 'BALANCE_TOPUP';
  amount_byn: number;
  card_id?: string;
  idempotency_key: string;
  status: string;
  created_at: string;
}

export interface OrderReconciliationResult {
  order_id: string;
  user_id: number;
  status: 'MATCHED' | 'PROBLEM_ORDER' | 'REQUIRES_REVIEW' | 'AWAITING_DECISION';
  total_inflow_byn: number;
  payments_paid_byn: number;
  balance_applied_byn: number;
  total_outflow_byn: number;
  actual_product_cost_byn: number;
  actual_shipping_byn: number;
  firm_packaging_byn: number;
  insurance_byn: number;
  minsk_nesvizh_byn: number;
  blue_squirrel_services_byn: number;
  commission_byn: number;
  extra_services_byn: number;
  refunds_total_byn: number;
  balance_credited_byn: number;
  delta_byn: number;
  issues: string[];
  checked_at: string;
}

export interface ReconciliationReport {
  generated_at: string;
  total_orders_checked: number;
  matched_orders: number;
  problem_orders_count: number;
  requires_review_count: number;
  total_inflow_byn: number;
  total_outflow_byn: number;
  total_discrepancy_byn: number;
  problem_orders: OrderReconciliationResult[];
  pending_customer_action: OrderReconciliationResult[];
}

// ---------------------------------------------------------------------------
// РњРµС‚РѕРґС‹ API
// ---------------------------------------------------------------------------

export const api = {
  // РђРІС‚РѕСЂРёР·Р°С†РёСЏ Telegram initData
  authTelegram: (initData: string) =>
    request<{ ok: boolean; token: string; user: UserProfile }>('/api/v1/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),

  // РџСЂРѕС„РёР»СЊ С‚РµРєСѓС‰РµРіРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
  getMe: () => request<{ ok: boolean; user: UserProfile }>('/api/v1/auth/me'),

  // Р Р°СЃС‡РµС‚ СЃС‚РѕРёРјРѕСЃС‚Рё Р·Р°РєР°Р·Р° С‡РµСЂРµР· Go РґРІРёР¶РѕРє
  calculatePrice: (input: PricingInput) =>
    request<PricingResult>('/api/v1/calculate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),


  // РЎРѕР·РґР°РЅРёРµ Р·Р°РєР°Р·Р°
  createOrder: (order: CreateOrderRequest) =>
    request<{ ok: boolean; order_id: string; total_byn: number; prepayment: number }>('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),

  // РЎРїРёСЃРѕРє Р·Р°РєР°Р·РѕРІ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
  getUserOrders: () =>
    request<{ ok: boolean; orders: OrderListItem[] }>('/api/v1/orders'),

  // РџРѕР»СѓС‡РёС‚СЊ РґРµС‚Р°Р»СЊРЅСѓСЋ РёРЅС„РѕСЂРјР°С†РёСЋ Рѕ Р·Р°РєР°Р·Рµ
  getOrderById: (orderId: string) =>
    request<{ ok: boolean; order: any }>(`/api/v1/orders/${orderId}`),

  // РћР±РЅРѕРІРёС‚СЊ СЃС‚Р°С‚СѓСЃ РёР»Рё С‚СЂРµРє-РЅРѕРјРµСЂ Р·Р°РєР°Р·Р° (РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ/РјРµРЅРµРґР¶РµСЂРѕРІ)
  updateOrderStatus: (
    orderId: string,
    payload: { status?: string; tracking_number_by?: string; tracking_number_intl?: string }
  ) =>
    request<{ ok: boolean; order_id: string; status: string }>(`/api/v1/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // РџРѕР»СѓС‡РёС‚СЊ СЃРїРёСЃРѕРє РІСЃРµС… Р·Р°РєР°Р·РѕРІ (РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРІ/РјРµРЅРµРґР¶РµСЂРѕРІ)
  getAdminOrders: () =>
    request<{ ok: boolean; orders: (OrderListItem & { user_name?: string })[] }>('/api/v1/admin/orders'),

  // === РџР»Р°С‚РµР¶РЅС‹Рµ РєР°СЂС‚С‹ (bePaid Mock) ===
  getCards: () =>
    request<{ ok: boolean; cards: UserCard[] }>('/api/v1/cards'),

  addCard: (card: { number: string; exp_month: number; exp_year: number; cvc: string; holder_name: string; is_default?: boolean }) =>
    request<{ ok: boolean; card: UserCard }>('/api/v1/cards', {
      method: 'POST',
      body: JSON.stringify(card),
    }),

  deleteCard: (cardId: string) =>
    request<{ ok: boolean }>(`/api/v1/cards/${cardId}`, {
      method: 'DELETE',
    }),

  setDefaultCard: (cardId: string) =>
    request<{ ok: boolean }>(`/api/v1/cards/${cardId}/set-default`, {
      method: 'POST',
    }),

  // === Р’РЅСѓС‚СЂРµРЅРЅРёР№ Р±Р°Р»Р°РЅСЃ Рё РїР»Р°С‚РµР¶Рё ===
  getBalance: () =>
    request<{ ok: boolean; balance: number; currency: string }>('/api/v1/payments/balance'),

  createPaymentIntent: (data: { order_id: string; stage: string; amount_byn: number; card_id?: string; idempotency_key: string }) =>
    request<{ ok: boolean; intent: PaymentIntent }>('/api/v1/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  executePayment: (data: { intent_id: string; card_id?: string; idempotency_key: string; apply_balance_byn?: number }) =>
    request<{ ok: boolean; payment: any; message: string }>('/api/v1/payments/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // === РћРїРµСЂР°С‚РѕСЂСЃРєРёРµ РґРµР№СЃС‚РІРёСЏ Рё РІС‹РєСѓРї (Р Р°Р·РґРµР»С‹ 11, 13, 25 РўР—) ===
  recordPurchase: (orderId: string, data: {
    pinduoduo_order_id: string;
    price_cny: number;
    service_fee_cny: number;
    actual_paid_cny: number;
    proof_attachment?: string;
  }) =>
    request<{ ok: boolean; purchase_id: string; scenario: string; message: string }>(`/api/v1/operator/orders/${orderId}/purchase`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordActualShipping: (orderId: string, data: {
    actual_weight_kg: number;
    actual_shipping_byn: number;
    tracking_intl?: string;
    source_reference?: string;
  }) =>
    request<{ ok: boolean; shipping_actual_id: string; second_payment: any }>(`/api/v1/operator/orders/${orderId}/actual-shipping`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // === Р¤РёРЅР°РЅСЃРѕРІР°СЏ СЃРІРµСЂРєР° (Р Р°Р·РґРµР»С‹ 30, 39 РўР—) ===
  getReconciliationReport: () =>
    request<ReconciliationReport>('/api/v1/reconciliation/report'),

  reconcileOrder: (orderId: string) =>
    request<OrderReconciliationResult>(`/api/v1/reconciliation/orders/${orderId}/check`, {
      method: 'POST',
    }),

  resolveProblemOrder: (orderId: string, data: { resolution_type: string; comment: string }) =>
    request<{ success: boolean; order_id: string; status: string }>(`/api/v1/reconciliation/orders/${orderId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // === Р¤РёРЅР°РЅСЃРѕРІС‹Рµ СЃРЅРёРјРєРё Рё Р°СѓРґРёС‚ Р·Р°РєР°Р·Р° ===
  getOrderFinancials: (orderId: string) =>
    request<{ ok: boolean; first_payment_snapshot?: any; second_payment_snapshot?: any }>(`/api/v1/orders/${orderId}/financials`),

  getOrderEvents: (orderId: string) =>
    request<{ ok: boolean; events: any[] }>(`/api/v1/orders/${orderId}/events`),
};

