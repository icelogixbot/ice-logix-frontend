// API Клиент для взаимодействия с Go Backend

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
    throw new Error(err.message || 'Сетевая ошибка при обращении к API');
  }
}

// ---------------------------------------------------------------------------
// Типы данных
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

// ---------------------------------------------------------------------------
// Методы API
// ---------------------------------------------------------------------------

export const api = {
  // Авторизация Telegram initData
  authTelegram: (initData: string) =>
    request<{ ok: boolean; token: string; user: UserProfile }>('/api/v1/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),

  // Профиль текущего пользователя
  getMe: () => request<{ ok: boolean; user: UserProfile }>('/api/v1/auth/me'),

  // Расчет стоимости заказа через Go движок
  calculatePrice: (input: PricingInput) =>
    request<PricingResult>('/api/v1/calculate', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Параллельный поиск товаров по китайским площадкам
  searchProducts: (query: string, platforms: string[] = ['dewu', 'pdd', '1688', 'taobao']) =>
    request<SearchResponse>('/api/v1/scraper/search', {
      method: 'POST',
      body: JSON.stringify({ query, platforms }),
    }),

  // Парсинг цены из ссылки
  parseLink: (url: string) =>
    request<{ ok: boolean; card: ProductCard }>('/api/v1/scraper/parse-link', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  // Поиск товаров по фотографии (AI Vision / Scraper)
  searchByImage: async (payload: {
    imageBase64: string;
    descriptionHint?: string;
    authenticity?: 'all' | 'original' | 'replica';
    condition?: 'all' | 'new' | 'used';
    maxPrice?: number;
    platforms?: string[];
  }) => {
    return request<SearchResponse>('/api/v1/scraper/search-by-image', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(async (err) => {
      console.warn('Scraper image endpoint fallback:', err);
      return request<SearchResponse>('/api/v1/scraper/search', {
        method: 'POST',
        body: JSON.stringify({
          query: payload.descriptionHint || 'кроссовки',
          platforms: payload.platforms || ['dewu', 'pdd', 'taobao'],
        }),
      });
    });
  },

  // Создание заказа
  createOrder: (order: CreateOrderRequest) =>
    request<{ ok: boolean; order_id: string; total_byn: number; prepayment: number }>('/api/v1/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),

  // Список заказов пользователя
  getUserOrders: () =>
    request<{ ok: boolean; orders: OrderListItem[] }>('/api/v1/orders'),

  // Получить детальную информацию о заказе
  getOrderById: (orderId: string) =>
    request<{ ok: boolean; order: any }>(`/api/v1/orders/${orderId}`),

  // Обновить статус или трек-номер заказа (для администраторов/менеджеров)
  updateOrderStatus: (
    orderId: string,
    payload: { status?: string; tracking_number_by?: string; tracking_number_intl?: string }
  ) =>
    request<{ ok: boolean; order_id: string; status: string }>(`/api/v1/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Получить список всех заказов (для администраторов/менеджеров)
  getAdminOrders: () =>
    request<{ ok: boolean; orders: (OrderListItem & { user_name?: string })[] }>('/api/v1/admin/orders'),

  // === Платежные карты (bePaid Mock) ===
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

  // === Внутренний баланс и платежи ===
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

  // === Финансовые снимки и аудит заказа ===
  getOrderFinancials: (orderId: string) =>
    request<{ ok: boolean; first_payment_snapshot?: any; second_payment_snapshot?: any }>(`/api/v1/orders/${orderId}/financials`),

  getOrderEvents: (orderId: string) =>
    request<{ ok: boolean; events: any[] }>(`/api/v1/orders/${orderId}/events`),
};

