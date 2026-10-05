// ICE LOGIX — Pricing Engine (Vanilla JS, browser-ready)
// Назначение: единый движок расчёта стоимости для Mini App + бот.
// Использует НБРБ API + ShopbyShop тарифы + комиссию + таможню.
// Вшивается в index.html одним <script>; экспортирует window.iceLogixPricing.
// Версия: 2026.05.08.01

(function (global) {
  'use strict';

  // =====================================================================
  // 1. КОНФИГ
  // =====================================================================
  const CONFIG = {
    base_commission_pct: 20,      // % от стоимости товара (Раздел 4 ТЗ)
    min_commission_byn: 9,        // минимум для маленьких заказов
    min_commission_threshold_byn: 60, // если итог ≤ 60 BYN → берём minimum
    delivery_reserve_rate: 0.70,  // 70% резерв международной логистики (Раздел 7 ТЗ, старое 65% отменено)
    firm_packaging_byn: 18.0,     // 18 BYN фирменная упаковка ICE LOGIX (Раздел 8 ТЗ)
    insurance_pct: 2.0,           // 2% ставка страховки "Голубой белки" (Раздел 14 ТЗ)
    legit_check_byn: 15,          // фикс
    currency_buffer_pct: 3,       // буфер на колебания курса
    customs_limit_eur: 200,       // беспошлинный лимит РБ (200€)
    customs_limit_kg: 31,
    customs_duty_pct: 15,         // пошлина РБ (15% от превышения)
    first_order_discount_byn: 15, // скидка на первый заказ
    level_multipliers: {          // множитель комиссии по уровню
      newbie: 1.0,
      shopper: 0.9,   // -10%
      vip: 0.8,       // -20%
    },
  };

  // ShopbyShop тарифы (USD/кг + lead-time дней)
  const SHOPBYSHOP_RATES = {
    'CN-air':  { rate_usd_per_kg: 10, lead_days: [10, 15] },
    'CN-sea':  { rate_usd_per_kg: 4,  lead_days: [30, 45] },
    'PL-road': { rate_usd_per_kg: 8,  lead_days: [5, 10] },
    'EU-road': { rate_usd_per_kg: 8,  lead_days: [5, 10] },
    'RU-road': { rate_usd_per_kg: 7,  lead_days: [3, 7] },
  };

  // Доступные источники
  const COUNTRY_AVAILABILITY = {
    CN: { available: true,  delivery: 'CN-air',  flag: '🇨🇳', label: 'Китай (Poizon, Dewu, Taobao, 1688, Tmall)' },
    PL: { available: true,  delivery: 'PL-road', flag: '🇵🇱', label: 'Польша/ЕС (Zalando, ASOS, About You, H&M, Zara)' },
    EU: { available: true,  delivery: 'EU-road', flag: '🇪🇺', label: 'Европа (через Польшу)' },
    RU: { available: true,  delivery: 'RU-road', flag: '🇷🇺', label: 'Россия (Lamoda, WB, Ozon, Avito, ЦУМ)' },
    US: { available: false, delivery: null, flag: '🇺🇸', label: 'США', soon: true },
    JP: { available: false, delivery: null, flag: '🇯🇵', label: 'Япония', soon: true },
    KR: { available: false, delivery: null, flag: '🇰🇷', label: 'Южная Корея', soon: true },
    AE: { available: false, delivery: null, flag: '🇦🇪', label: 'ОАЭ', soon: true },
    TR: { available: false, delivery: null, flag: '🇹🇷', label: 'Турция', soon: true },
    VN: { available: false, delivery: null, flag: '🇻🇳', label: 'Вьетнам', soon: true },
  };

  // Оценочные веса по категории, кг (если не указан вручную)
  const ESTIMATED_WEIGHT_KG = {
    'Обувь':       1.2,
    'Одежда':      0.7,
    'Аксессуары':  0.4,
    'sneakers':    1.2,
    'clothing':    0.7,
    'accessories': 0.4,
  };

  // Тарифы доставки по РБ
  const LOCAL_DELIVERY_RATES = {
    'europost': {
      label: 'Европочта',
      calc: (w) => 5.00
    },
    'belpost': {
      label: 'Белпочта',
      calc: (w) => 7.00
    },
    'pickup': {
      label: 'Самовывоз (Несвиж)',
      calc: (w) => 0.00
    }
  };

  // Fallback курсы НБРБ на случай оффлайна
  const FALLBACK_RATES = {
    USD_to_BYN: 3.27,
    EUR_to_BYN: 3.59,
    CNY_to_BYN: 0.45,
    RUB_to_BYN: 0.034,
    PLN_to_BYN: 0.83,
    GBP_to_BYN: 4.15,
    JPY_to_BYN: 0.022,
    KRW_to_BYN: 0.0024,
    AED_to_BYN: 0.89,
    VND_to_BYN: 0.00013,
    TRY_to_BYN: 0.094,
  };

  // НБРБ — список аббревиатур валют (используем parammode=2 — стабильнее чем ID)
  const NBRB_CURRENCIES = ['USD', 'EUR', 'CNY', 'RUB', 'PLN', 'GBP', 'JPY', 'KRW', 'AED', 'VND', 'TRY'];

  // =====================================================================
  // 2. КУРСЫ ВАЛЮТ (НБРБ + кэш в localStorage)
  // =====================================================================
  const RATES_CACHE_KEY = 'ice_logix_nbrb_rates_v1';
  const RATES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 час

  async function fetchOneRate(abbr) {
    try {
      const r = await fetch(`https://api.nbrb.by/exrates/rates/${abbr}?parammode=2`, { cache: 'no-store' });
      if (!r.ok) return null;
      const data = await r.json();
      // 1 единица валюты = (Cur_OfficialRate / Cur_Scale) BYN
      const v = data.Cur_OfficialRate / data.Cur_Scale;
      return Number.isFinite(v) ? v : null;
    } catch (_e) { return null; }
  }

  async function getExchangeRates() {
    // Проверяем кэш
    try {
      const raw = localStorage.getItem(RATES_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached.ts && (Date.now() - cached.ts) < RATES_CACHE_TTL_MS) {
          return { ...cached.rates, _source: 'cache', _ts: cached.ts };
        }
      }
    } catch (_e) {}

    // Пытаемся получить свежие
    const results = await Promise.allSettled(NBRB_CURRENCIES.map(c => fetchOneRate(c)));
    const fresh = { ...FALLBACK_RATES };
    let okCount = 0;
    NBRB_CURRENCIES.forEach((code, i) => {
      const v = results[i].status === 'fulfilled' ? results[i].value : null;
      if (v && Number.isFinite(v) && v > 0) {
        fresh[`${code}_to_BYN`] = v;
        okCount++;
      }
    });

    const result = { ...fresh, _source: okCount > 0 ? 'nbrb' : 'fallback', _ts: Date.now() };

    // Сохраняем в кэш только если получили хотя бы что-то живое
    if (okCount > 0) {
      try { localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: fresh })); } catch (_e) {}
    }

    return result;
  }

  function convertToBYN(amount, currency, rates) {
    if (currency === 'BYN') return amount;
    const key = `${currency}_to_BYN`;
    const rate = rates[key];
    if (!rate) {
      // Неподдерживаемая валюта: НЕ возвращаем amount как BYN — это даёт грубо завышенную цену.
      // Логируем и используем USD как наиболее консервативный fallback (большинство магазинов так маркетят).
      try { console.warn(`[iceLogixPricing] Неизвестная валюта "${currency}" — fallback на USD-курс`); } catch (_e) {}
      const fallback = rates['USD_to_BYN'];
      return fallback ? amount * fallback : amount;
    }
    return amount * rate;
  }

  // =====================================================================
  // 3. РАСЧЁТ КОМИССИИ
  // =====================================================================
  function calculateCommission(productCostBYN, level) {
    const base = productCostBYN * (CONFIG.base_commission_pct / 100);
    const mult = CONFIG.level_multipliers[level] ?? 1.0;
    let comm = base * mult;
    // Минимум для маленьких заказов
    if (productCostBYN <= CONFIG.min_commission_threshold_byn) {
      comm = Math.max(comm, CONFIG.min_commission_byn);
    }
    return comm;
  }

  // =====================================================================
  // 4. ТАМОЖЕННАЯ ПОШЛИНА
  // =====================================================================
  function calculateCustomsDuty(productCostBYN, weightKg, rates) {
    const limitBYN = CONFIG.customs_limit_eur * (rates.EUR_to_BYN || FALLBACK_RATES.EUR_to_BYN);
    const exceedsValue = productCostBYN > limitBYN;
    const exceedsWeight = weightKg > CONFIG.customs_limit_kg;
    if (!exceedsValue && !exceedsWeight) return { duty: 0, warning: null };

    let dutyBYN = 0;
    let warning = null;
    if (exceedsValue) {
      const overage = productCostBYN - limitBYN;
      // В РБ пошлина = 15% от превышения лимита + 10 BYN таможенный сбор
      dutyBYN += (overage * (CONFIG.customs_duty_pct / 100)) + 10;
      warning = `⚠️ Превышен лимит беспошлинного ввоза в РБ €${CONFIG.customs_limit_eur} (пошлина 15% от превышения + 10 BYN сбор)`;
    }
    if (exceedsWeight) {
      // По весу — отдельная логика, упрощённо: фикс 5 BYN/кг сверх лимита
      const overKg = weightKg - CONFIG.customs_limit_kg;
      dutyBYN += overKg * 5;
      warning = (warning ? warning + ' ' : '') + `Превышен лимит веса ${CONFIG.customs_limit_kg} кг (+5 BYN/кг)`;
    }
    return { duty: dutyBYN, warning };
  }

  // =====================================================================
  // 5. ОСНОВНАЯ ФУНКЦИЯ РАСЧЁТА
  // =====================================================================
  /**
   * @typedef {Object} PricingInput
   * @property {number} product_price - Цена товара в исходной валюте
   * @property {string} product_currency - 'CNY' | 'USD' | 'EUR' | ...
   * @property {string} source_country - 'CN' | 'RU' | 'PL' | 'EU' | ...
   * @property {string} [delivery_method] - 'air' | 'sea' | 'road'
   * @property {number} [weight_kg] - вес, если 0 → используется оценочный
   * @property {string} category - 'Обувь' | 'Одежда' | 'Аксессуары'
   * @property {boolean} [insurance]
   * @property {boolean} [legit_check]
   * @property {string} [client_level] - 'newbie' | 'shopper' | 'vip'
   * @property {boolean} [is_first_order]
   * @property {boolean} [referral_used]
   * @property {number} [extra_discount_byn] - доп. скидка из промокода
   */

  /**
   * Главная функция расчёта.
   * @param {PricingInput} input
   * @returns {Promise<PricingResult>}
   */
  async function calculatePrice(input) {
    const rates = await getExchangeRates();
    return calculatePriceSync(input, rates);
  }

  function calculatePriceSync(input, rates) {
    const warnings = [];

    // 1. Проверка доступности страны
    const countryInfo = COUNTRY_AVAILABILITY[input.source_country] ?? null;
    if (!countryInfo || !countryInfo.available) {
      return {
        available: false,
        message: countryInfo?.soon
          ? `🕒 ${countryInfo.flag} ${countryInfo.label}: скоро будем доставлять. Сейчас доступны: 🇨🇳 Китай, 🇷🇺 Россия, 🇵🇱🇪🇺 Польша/ЕС.`
          : `❌ Страна "${input.source_country}" не поддерживается`,
        breakdown: zeroBreakdown(),
        total_byn: 0,
        total_ice: 0,
        delivery_days: [0, 0],
        warnings: [countryInfo?.label ?? 'Недоступная страна'],
        meta: { rates, country: input.source_country, ts: new Date().toISOString() },
      };
    }

    // 2. Цена товара в BYN
    const productCostBYN = round2(convertToBYN(input.product_price, input.product_currency, rates));

    // 3. Курсовая надбавка
    const currencyBufferBYN = round2(productCostBYN * (CONFIG.currency_buffer_pct / 100));

    // 4. Вес
    let weightKg = input.weight_kg && input.weight_kg > 0 ? input.weight_kg : 0;
    let weightEstimated = false;
    if (weightKg <= 0) {
      weightKg = ESTIMATED_WEIGHT_KG[input.category] ?? 0.5;
      weightEstimated = true;
      warnings.push(`Вес не указан — использован оценочный (${weightKg} кг для "${input.category}")`);
    }

    // 5. Доставка ShopbyShop
    const route = SHOPBYSHOP_RATES[countryInfo.delivery] ?? { rate_usd_per_kg: 10, lead_days: [10, 15] };
    const deliveryUSD = weightKg * route.rate_usd_per_kg;
    const deliveryBYN = round2(deliveryUSD * (rates.USD_to_BYN || FALLBACK_RATES.USD_to_BYN));
    
    // Прибавляем дни отпуска байеров к срокам доставки, если отпуск активен
    let deliveryDays = [...route.lead_days];
    if (global.buyerVacation && global.buyerVacation.active) {
      const extra = parseInt(global.buyerVacation.days) || 0;
      deliveryDays = deliveryDays.map(d => d + extra);
    }

    // 6. Фирменная упаковка ICE LOGIX (Раздел 8 ТЗ: 18 BYN)
    const packagingBYN = round2(CONFIG.firm_packaging_byn);

    // 7. Комиссия ICE LOGIX (Раздел 4 ТЗ: 20%, минимум 9 BYN, множитель по уровню)
    const commissionBYN = round2(
      calculateCommission(productCostBYN + currencyBufferBYN, input.client_level ?? 'newbie')
    );

    // 8. Резерв доставки (Раздел 7 ТЗ: ровно 70% от оценки)
    const deliveryReserveBYN = round2(deliveryBYN * CONFIG.delivery_reserve_rate);
    const deliveryRemainderEstBYN = round2(deliveryBYN - deliveryReserveBYN);

    // 9. Страховка "Голубой белки" (Раздел 14 ТЗ: 2% от доставки)
    const insuranceBYN = input.insurance ? round2(deliveryBYN * (CONFIG.insurance_pct / 100)) : 0;

    // 10. Legit Check
    const legitCheckBYN = input.legit_check ? CONFIG.legit_check_byn : 0;

    // 11. Таможня
    const customs = calculateCustomsDuty(productCostBYN, weightKg, rates);
    const customsDutyBYN = round2(customs.duty);
    if (customs.warning) warnings.push(customs.warning);

    // 12. Доставка по РБ (Разделы 14-15 ТЗ: самовывоз Несвиж 0 BYN, почта - оплата при получении)
    let localDeliveryBYN = 0;
    if (input.local_delivery_method && LOCAL_DELIVERY_RATES[input.local_delivery_method]) {
      localDeliveryBYN = round2(LOCAL_DELIVERY_RATES[input.local_delivery_method].calc(weightKg));
    }

    // 13. Скидки
    let discountBYN = 0;
    if (input.is_first_order && input.referral_used) {
      discountBYN += CONFIG.first_order_discount_byn;
      warnings.push(`Применена скидка на первый заказ: -${CONFIG.first_order_discount_byn} BYN`);
    }
    if (input.extra_discount_byn && input.extra_discount_byn > 0) {
      discountBYN += input.extra_discount_byn;
    }

    // 14. Расчет 1-го платежа (Разделы 4, 7, 8 ТЗ)
    // Товар + Буфер + Комиссия + Упаковка 18 BYN + Резерв доставки 70% + Допуслуги/Таможня - Скидка
    const firstPaymentSubtotalBYN = round2(
      productCostBYN + currencyBufferBYN + commissionBYN + packagingBYN + deliveryReserveBYN +
      legitCheckBYN + customsDutyBYN - discountBYN
    );
    const balanceToApplyBYN = Math.max(0, input.balance_to_apply_byn || 0);
    const balanceUsedFirstBYN = Math.min(balanceToApplyBYN, Math.max(0, firstPaymentSubtotalBYN));
    const firstPaymentFinalBYN = Math.max(0, round2(firstPaymentSubtotalBYN - balanceUsedFirstBYN));

    // 15. Ориентировочный 2-й платёж (Разделы 13, 14, 15 ТЗ)
    // Остаток доставки (~30%) + Страховка 2% + Доставка по РБ (если указана)
    const secondPaymentEstBYN = round2(deliveryRemainderEstBYN + insuranceBYN + localDeliveryBYN);

    // 16. Общий итог заказа (полная стоимость)
    const totalBYN = Math.max(0, round2(firstPaymentSubtotalBYN + secondPaymentEstBYN));

    return {
      available: true,
      breakdown: {
        product_cost_byn: productCostBYN,
        currency_buffer_byn: currencyBufferBYN,
        packaging_cost_byn: packagingBYN,
        delivery_cost_byn: deliveryBYN,
        delivery_reserve_rate: CONFIG.delivery_reserve_rate,
        delivery_reserve_byn: deliveryReserveBYN,
        delivery_remainder_est_byn: deliveryRemainderEstBYN,
        local_delivery_byn: localDeliveryBYN,
        commission_byn: commissionBYN,
        insurance_byn: insuranceBYN,
        legit_check_byn: legitCheckBYN,
        customs_duty_byn: customsDutyBYN,
        discount_byn: discountBYN,
        first_payment_subtotal_byn: firstPaymentSubtotalBYN,
        balance_used_first_byn: balanceUsedFirstBYN,
        first_payment_byn: firstPaymentFinalBYN,
        second_payment_est_byn: secondPaymentEstBYN,
      },
      first_payment_byn: firstPaymentFinalBYN,
      second_payment_est_byn: secondPaymentEstBYN,
      total_byn: totalBYN,
      total_ice: round2(totalBYN), // 1 BYN = 1 ICE
      delivery_days: deliveryDays,
      meta: {
        rates,
        country: input.source_country,
        weight_kg_used: weightKg,
        weight_estimated: weightEstimated,
        ts: new Date().toISOString(),
      },
      warnings,
    };
  }

  // =====================================================================
  // 5.5. ДВУХЭТАПНЫЕ РАСЧЕТЫ (ПЕРВЫЙ И ВТОРОЙ ПЛАТЕЖ)
  // =====================================================================
  /**
   * Калькуляция первого платежа с поддержкой списания баланса (Разделы 4, 7, 8, 9 ТЗ)
   */
  function calculateFirstPayment(input) {
    const pCost = round2(input.product_cost_byn || 0);
    const comm = round2(input.commission_byn ?? calculateCommission(pCost, input.client_level));
    const pack = round2(input.packaging_byn ?? CONFIG.firm_packaging_byn);
    const srv = round2(input.services_byn || 0);
    const delivEst = round2(input.delivery_estimate_byn || 0);
    const reserveRate = CONFIG.delivery_reserve_rate;
    const reserve = round2(delivEst * reserveRate);
    const subtotal = round2(pCost + comm + pack + srv + reserve);
    const balApply = Math.max(0, round2(input.balance_to_apply_byn || 0));
    const balUsed = Math.min(balApply, subtotal);
    const total = Math.max(0, round2(subtotal - balUsed));

    return {
      product_cost_byn: pCost,
      commission_byn: comm,
      packaging_byn: pack,
      services_byn: srv,
      delivery_estimate_byn: delivEst,
      delivery_reserve_rate: reserveRate,
      delivery_reserve_byn: reserve,
      subtotal_byn: subtotal,
      balance_used_byn: balUsed,
      total_first_payment_byn: total,
    };
  }

  /**
   * Калькуляция второго платежа при поступлении на склад (Разделы 13, 14, 15 ТЗ)
   */
  function calculateSecondPayment(input) {
    const actual = round2(input.actual_shipping_byn || 0);
    const reservePaid = round2(input.delivery_reserve_paid || 0);
    let shippingRemainder = 0;
    let surplusToBalance = 0;

    if (actual >= reservePaid) {
      // Доставка дороже или равна резерву
      shippingRemainder = round2(actual - reservePaid);
    } else {
      // Фактическая доставка дешевле 70% резерва (Пример F ТЗ)
      // Остаток = 0 BYN, излишек возвращается на баланс
      shippingRemainder = 0;
      surplusToBalance = round2(reservePaid - actual);
    }

    const insurance = input.insurance_byn != null
      ? round2(input.insurance_byn)
      : round2(actual * (CONFIG.insurance_pct / 100));
    const minskNesvizh = round2(input.minsk_nesvizh_share_byn || 0);
    const warehouseSrv = round2(input.warehouse_services_byn || 0);
    const adjustments = round2(input.price_adjustments_byn || 0);

    const subtotal = round2(shippingRemainder + insurance + minskNesvizh + warehouseSrv + adjustments);
    const balApply = Math.max(0, round2(input.balance_to_apply_byn || 0));
    const balUsed = Math.min(balApply, subtotal);
    const total = Math.max(0, round2(subtotal - balUsed));

    return {
      actual_shipping_byn: actual,
      delivery_reserve_paid_byn: reservePaid,
      shipping_remainder_byn: shippingRemainder,
      surplus_to_balance_byn: surplusToBalance,
      insurance_byn: insurance,
      minsk_nesvizh_share_byn: minskNesvizh,
      warehouse_services_byn: warehouseSrv,
      price_adjustments_byn: adjustments,
      subtotal_byn: subtotal,
      balance_used_byn: balUsed,
      total_second_payment_byn: total,
    };
  }

  // =====================================================================
  // 6. ФОРМАТТЕРЫ
  // =====================================================================
  function formatBreakdownHTML(result) {
    if (!result.available) {
      return `<div class="bg-orange-500/20 border border-orange-500/50 rounded-xl p-3 text-center">
        <p class="text-orange-400 font-bold text-sm">${escapeHtml(result.message)}</p>
      </div>`;
    }
    const b = result.breakdown;

    const firstRows = [];
    firstRows.push(['📦 Стоимость товара', b.product_cost_byn]);
    if (b.currency_buffer_byn > 0) firstRows.push(['💱 Курсовая надбавка (3%)', b.currency_buffer_byn]);
    firstRows.push(['🤝 Комиссия ICE LOGIX', b.commission_byn]);
    if (b.packaging_cost_byn > 0) firstRows.push(['🎁 Фирменная упаковка ICE LOGIX', b.packaging_cost_byn]);
    if (b.delivery_reserve_byn > 0) firstRows.push([`✈️ Резерв доставки (70% от ${b.delivery_cost_byn.toFixed(2)})`, b.delivery_reserve_byn]);
    if (b.legit_check_byn > 0) firstRows.push(['✅ Legit Check', b.legit_check_byn]);
    if (b.customs_duty_byn > 0) firstRows.push(['🛃 Таможенная пошлина РБ', b.customs_duty_byn]);
    if (b.discount_byn > 0) firstRows.push(['🎁 Скидка', -b.discount_byn]);
    if (b.balance_used_first_byn > 0) firstRows.push(['💳 Списано с баланса', -b.balance_used_first_byn]);

    const firstRowsHtml = firstRows.map(([label, val]) => `
      <div class="flex justify-between text-xs py-1 ${val < 0 ? 'text-green-400 font-semibold' : 'text-white/80'}">
        <span>${label}</span>
        <span class="font-mono">${val >= 0 ? '' : '-'}${Math.abs(val).toFixed(2)} BYN</span>
      </div>`).join('');

    const secondRows = [];
    if (b.delivery_remainder_est_byn > 0) secondRows.push(['✈️ Остаток доставки (~30% факт)', b.delivery_remainder_est_byn]);
    if (b.insurance_byn > 0) secondRows.push(['🛡️ Страховка Голубой белки (2%)', b.insurance_byn]);
    if (b.local_delivery_byn > 0) secondRows.push(['🚚 Доставка по Беларуси', b.local_delivery_byn]);

    const secondRowsHtml = secondRows.length > 0 ? secondRows.map(([label, val]) => `
      <div class="flex justify-between text-xs py-1 text-white/70">
        <span>${label}</span>
        <span class="font-mono">${Math.abs(val).toFixed(2)} BYN</span>
      </div>`).join('') : '';

    const warnsHtml = result.warnings.length > 0
      ? `<div class="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-300 text-xs">
          ${result.warnings.map(w => `• ${escapeHtml(w)}`).join('<br>')}
        </div>`
      : '';

    const firstPay = b.first_payment_byn != null ? b.first_payment_byn : (result.total_byn * 0.70);
    const secondPay = b.second_payment_est_byn != null ? b.second_payment_est_byn : (result.total_byn * 0.30);

    return `
      <div class="bg-white/5 rounded-xl p-3 space-y-3">
        <!-- 1-й платеж -->
        <div class="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
          <div class="flex justify-between items-center mb-2 pb-1 border-b border-cyan-500/20">
            <span class="text-cyan-300 text-xs font-bold uppercase tracking-wider">1-й этап: Оплата при заказе</span>
            <span class="text-cyan-400 font-bold text-sm">${firstPay.toFixed(2)} BYN</span>
          </div>
          ${firstRowsHtml}
        </div>

        <!-- 2-й платеж -->
        <div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div class="flex justify-between items-center mb-2 pb-1 border-b border-amber-500/20">
            <span class="text-amber-300 text-xs font-bold uppercase tracking-wider">2-й этап: Оплата на складе</span>
            <span class="text-amber-400 font-bold text-sm">~${secondPay.toFixed(2)} BYN</span>
          </div>
          ${secondRowsHtml || '<p class="text-[11px] text-white/50">Точный расчет по факту взвешивания</p>'}
        </div>

        <!-- Полный итог -->
        <div class="border-t border-white/20 pt-2 flex justify-between items-baseline">
          <span class="text-white font-bold text-sm">ИТОГО ЗАКАЗ</span>
          <span class="text-white font-bold text-lg">${result.total_byn.toFixed(2)} <span class="text-xs text-white/60">BYN</span></span>
        </div>
        <div class="text-right text-white/50 text-[11px]">
          ${result.total_ice.toFixed(2)} ICE · 1 BYN = 1 ICE
        </div>
        <div class="text-white/60 text-xs">
          ⏱️ Срок доставки: ${result.delivery_days[0]}-${result.delivery_days[1]} рабочих дней
        </div>
        ${warnsHtml}
      </div>`;
  }

  function formatPlain(result) {
    if (!result.available) return result.message;
    const b = result.breakdown;
    const firstPay = b.first_payment_byn != null ? b.first_payment_byn : (result.total_byn * 0.70);
    const secondPay = b.second_payment_est_byn != null ? b.second_payment_est_byn : (result.total_byn * 0.30);

    const lines = [];
    lines.push('💰 Расчёт стоимости заказа ICE LOGIX:', '');
    lines.push('=== 1-Й ЭТАП (К ОПЛАТЕ СЕЙЧАС) ===');
    lines.push(`📦 Цена товара:           ${b.product_cost_byn.toFixed(2)} BYN`);
    if (b.currency_buffer_byn > 0) lines.push(`💱 Курсовая надбавка:      ${b.currency_buffer_byn.toFixed(2)} BYN`);
    lines.push(`🤝 Комиссия ICE LOGIX:     ${b.commission_byn.toFixed(2)} BYN`);
    if (b.packaging_cost_byn > 0) lines.push(`🎁 Фирменная упаковка:     ${b.packaging_cost_byn.toFixed(2)} BYN`);
    if (b.delivery_reserve_byn > 0) lines.push(`✈️ Резерв доставки (70%):  ${b.delivery_reserve_byn.toFixed(2)} BYN`);
    if (b.legit_check_byn > 0) lines.push(`✅ Legit Check:            ${b.legit_check_byn.toFixed(2)} BYN`);
    if (b.customs_duty_byn > 0) lines.push(`🛃 Таможенная пошлина:     ${b.customs_duty_byn.toFixed(2)} BYN`);
    if (b.discount_byn > 0) lines.push(`🎁 Скидка:                -${b.discount_byn.toFixed(2)} BYN`);
    if (b.balance_used_first_byn > 0) lines.push(`💳 Баланс клиента:        -${b.balance_used_first_byn.toFixed(2)} BYN`);
    lines.push(`👉 К ОПЛАТЕ СЕЙЧАС:        ${firstPay.toFixed(2)} BYN`);
    lines.push('');
    lines.push('=== 2-Й ЭТАП (ПРИ ПОЛУЧЕНИИ НА СКЛАДЕ) ===');
    if (b.delivery_remainder_est_byn > 0) lines.push(`✈️ Остаток доставки (~30%): ${b.delivery_remainder_est_byn.toFixed(2)} BYN`);
    if (b.insurance_byn > 0) lines.push(`🛡️ Страховка (2%):          ${b.insurance_byn.toFixed(2)} BYN`);
    if (b.local_delivery_byn > 0) lines.push(`🚚 Доставка по РБ:         ${b.local_delivery_byn.toFixed(2)} BYN`);
    lines.push(`👉 ОРИЕНТИРОВОЧНО 2-Й ЭТАП: ~${secondPay.toFixed(2)} BYN`);
    lines.push('—'.repeat(40));
    lines.push(`💵 ПОЛНЫЙ ИТОГ:            ${result.total_byn.toFixed(2)} BYN`);
    lines.push(`⏱️ Срок: ${result.delivery_days[0]}-${result.delivery_days[1]} дней`);
    if (result.warnings.length > 0) {
      lines.push('', '⚠️ Внимание:');
      result.warnings.forEach(w => lines.push('  • ' + w));
    }
    return lines.join('\n');
  }

  // =====================================================================
  // 7. УТИЛИТЫ
  // =====================================================================
  function round2(n) { return Math.round(n * 100) / 100; }
  function zeroBreakdown() {
    return {
      product_cost_byn: 0, currency_buffer_byn: 0, delivery_cost_byn: 0, local_delivery_byn: 0,
      commission_byn: 0, insurance_byn: 0, legit_check_byn: 0,
      customs_duty_byn: 0, discount_byn: 0,
    };
  }
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  }

  // =====================================================================
  // 7.5. БЫСТРАЯ ОЦЕНКА (для списков/корзины — не делает fetch)
  // =====================================================================
  /**
   * Возвращает примерную итоговую стоимость в BYN — сразу, синхронно.
   * Использует кэш НБРБ из localStorage (если есть) или FALLBACK_RATES.
   * Назначение: списки, кнопки «Купить», корзина — там где не нужна полная разбивка.
   *
   * @param {number} price — цена товара
   * @param {number} weight — вес в кг (1 если не указан)
   * @param {string} currency — валюта цены ('CNY' по умолчанию — типичный кейс Poizon)
   * @param {string} country — страна-источник ('CN' по умолчанию)
   * @returns {number} итог в BYN
   */
  function quickEstimate(price, weight, currency, country) {
    const p = Number(price) || 0;
    if (p <= 0) return 0; // нет цены — нет оценки
    const w = Number(weight) || 1;
    const cur = currency || 'CNY';
    const cn = country || 'CN';

    // Пытаемся получить кэш синхронно; если нет — используем fallback
    let rates = { ...FALLBACK_RATES, _source: 'fallback' };
    try {
      const raw = localStorage.getItem(RATES_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && cached.rates) rates = { ...rates, ...cached.rates };
      }
    } catch (_e) {}

    const result = calculatePriceSync({
      product_price: p,
      product_currency: cur,
      source_country: cn,
      weight_kg: w,
    }, rates);

    if (!result.available) return 0;
    return result.total_byn;
  }

  /**
   * Прогрев кэша курсов — вызвать один раз при загрузке Mini App.
   * Возвращает Promise<rates>, ничего не сломает если упадёт.
   */
  function warmRates() {
    return getExchangeRates().catch(() => null);
  }

  // =====================================================================
  // 8. ЭКСПОРТ
  // =====================================================================
  global.iceLogixPricing = {
    calculatePrice,
    calculatePriceSync,
    calculateFirstPayment,
    calculateSecondPayment,
    getExchangeRates,
    convertToBYN,
    formatBreakdownHTML,
    formatPlain,
    quickEstimate,
    warmRates,
    CONFIG,
    SHOPBYSHOP_RATES,
    LOCAL_DELIVERY_RATES,
    COUNTRY_AVAILABILITY,
    ESTIMATED_WEIGHT_KG,
    FALLBACK_RATES,
    version: '2026.06.01.01',
  };

})(typeof window !== 'undefined' ? window : globalThis);
