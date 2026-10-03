'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, PricingInput, PricingResult, UserProfile } from '@/lib/api';
import { triggerHaptic } from '@/lib/telegram';
import { SelectedProductForCalc } from '@/app/page';
import { OrderCreateModal } from '@/components/orders/order-create-modal';
import {
  Calculator as CalcIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  PackageCheck
} from 'lucide-react';

interface CalculatorViewProps {
  initialProduct: SelectedProductForCalc | null;
  userProfile: UserProfile | null;
  onOrderCreated: () => void;
}

const CATEGORIES = [
  { id: 'Обувь', label: 'Обувь', icon: '👟', defaultWeight: 1.3 },
  { id: 'Одежда', label: 'Одежда', icon: '👕', defaultWeight: 0.7 },
  { id: 'Аксессуары', label: 'Аксессуары', icon: '🧢', defaultWeight: 0.3 },
  { id: 'Сумки', label: 'Сумки', icon: '🎒', defaultWeight: 1.0 },
  { id: 'Электроника', label: 'Техника', icon: '📱', defaultWeight: 0.6 },
];

const CURRENCIES = [
  { code: 'CNY', symbol: '¥', label: 'Юань (CNY)', country: 'CN' },
  { code: 'EUR', symbol: '€', label: 'Евро (EUR)', country: 'EU' },
  { code: 'USD', symbol: '$', label: 'Доллар (USD)', country: 'EU' },
  { code: 'RUB', symbol: '₽', label: 'Рубль (RUB)', country: 'RU' },
];

const LOCAL_DELIVERY = [
  { id: 'europost', label: 'Европочта (ОПС)', priceLabel: '~4 BYN' },
  { id: 'belpost', label: 'Белпочта', priceLabel: '~6 BYN' },
  { id: 'pickup', label: 'Самовывоз (Минск)', priceLabel: 'Бесплатно' },
];

export function CalculatorView({
  initialProduct,
  userProfile,
  onOrderCreated,
}: CalculatorViewProps) {
  const [price, setPrice] = useState<string>(initialProduct ? String(initialProduct.price) : '');
  const [currency, setCurrency] = useState<string>(initialProduct?.currency || 'CNY');
  const [sourceCountry, setSourceCountry] = useState<string>('CN');
  const [category, setCategory] = useState<string>('Обувь');
  const [weightKg, setWeightKg] = useState<number>(1.3);
  const [insurance, setInsurance] = useState<boolean>(true);
  const [legitCheck, setLegitCheck] = useState<boolean>(true);
  const [localDelivery, setLocalDelivery] = useState<string>('europost');
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);

  // Обновление параметров, если выбран товар из поиска
  useEffect(() => {
    if (initialProduct) {
      setPrice(String(initialProduct.price));
      if (initialProduct.currency) {
        setCurrency(initialProduct.currency);
      }
    }
  }, [initialProduct]);

  // Запрос расчета стоимости в Go backend
  const calcMutation = useMutation({
    mutationFn: (input: PricingInput) => api.calculatePrice(input),
    onSuccess: () => triggerHaptic('light'),
  });

  // Автоматический перерасчет при изменении ключевых полей
  useEffect(() => {
    const numPrice = parseFloat(price);
    if (!isNaN(numPrice) && numPrice > 0) {
      const timer = setTimeout(() => {
        calcMutation.mutate({
          product_price: numPrice,
          product_currency: currency,
          source_country: sourceCountry,
          category,
          weight_kg: weightKg,
          insurance,
          legit_check: legitCheck,
          client_level: userProfile?.client_level || 'newbie',
          local_delivery_method: localDelivery,
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [price, currency, sourceCountry, category, weightKg, insurance, legitCheck, localDelivery, userProfile]);

  const handleCategorySelect = (catId: string, defWeight: number) => {
    triggerHaptic('light');
    setCategory(catId);
    setWeightKg(defWeight);
  };

  const calculationResult: PricingResult | undefined = calcMutation.data;

  return (
    <div className="space-y-4 pb-28">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-1.5">
            <CalcIcon className="w-4 h-4 text-cyan-400" />
            Калькулятор доставки
          </h1>
          <p className="text-[11px] text-white/50">Точный расчет под ключ в Беларусь (BYN)</p>
        </div>
        {userProfile?.client_level && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            Скидка {userProfile.client_level === 'vip' ? '20%' : userProfile.client_level === 'shopper' ? '10%' : '0%'}
          </span>
        )}
      </div>

      {/* Выбор валюты и ввод цены */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-3">
        <label className="text-xs text-white/70 font-medium block">
          Цена товара на площадке:
        </label>
        <div className="flex gap-2">
          {/* Селектор валюты */}
          <div className="relative min-w-[105px]">
            <select
              value={currency}
              onChange={(e) => {
                const cur = e.target.value;
                setCurrency(cur);
                const found = CURRENCIES.find((c) => c.code === cur);
                if (found) setSourceCountry(found.country);
                triggerHaptic('light');
              }}
              className="w-full appearance-none bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#090d16] text-white">
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3.5 text-white/40 pointer-events-none" />
          </div>

          {/* Ввод стоимости */}
          <div className="relative flex-1">
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-base font-mono font-bold text-white placeholder-white/20 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {initialProduct && (
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs text-cyan-300">
            <span className="truncate max-w-[200px]">{initialProduct.title}</span>
            <span className="font-mono font-bold">¥{initialProduct.price}</span>
          </div>
        )}
      </div>

      {/* Категории товаров */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/70 font-medium block">Категория товара:</label>
        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id, cat.defaultWeight)}
                className={`py-2 px-2 rounded-xl border text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/10'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Вес и Дополнительные опции */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-3">
        {/* Вес */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/70">Расчетный вес:</span>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="30"
              value={weightKg}
              onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0.1)}
              className="w-16 bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-xs text-right font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
            />
            <span className="text-xs text-white/50">кг</span>
          </div>
        </div>

        {/* Переключатель: Страховка */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setInsurance(!insurance);
          }}
          className="flex items-center justify-between cursor-pointer py-1 border-t border-white/5"
        >
          <div className="flex items-center space-x-2">
            <ShieldCheck className={`w-4 h-4 ${insurance ? 'text-cyan-400' : 'text-white/30'}`} />
            <div>
              <p className="text-xs text-white font-medium">Страховка груза 100%</p>
              <p className="text-[10px] text-white/40">Компенсация при утере или повреждении</p>
            </div>
          </div>
          <div
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
              insurance ? 'bg-cyan-500' : 'bg-white/15'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                insurance ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Переключатель: Legit Check */}
        <div
          onClick={() => {
            triggerHaptic('light');
            setLegitCheck(!legitCheck);
          }}
          className="flex items-center justify-between cursor-pointer py-1 border-t border-white/5"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className={`w-4 h-4 ${legitCheck ? 'text-cyan-400' : 'text-white/30'}`} />
            <div>
              <p className="text-xs text-white font-medium">Legit Check (Оригинальность)</p>
              <p className="text-[10px] text-white/40">Осмотр бирок, швов и сертификата</p>
            </div>
          </div>
          <div
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
              legitCheck ? 'bg-cyan-500' : 'bg-white/15'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                legitCheck ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Доставка по Беларуси */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/70 font-medium block">Доставка по Беларуси:</label>
        <div className="grid grid-cols-3 gap-1.5">
          {LOCAL_DELIVERY.map((del) => {
            const isSelected = localDelivery === del.id;
            return (
              <button
                key={del.id}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setLocalDelivery(del.id);
                }}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-white/60'
                }`}
              >
                <p className="text-[11px] font-medium leading-tight">{del.label}</p>
                <p className="text-[9px] text-white/40 mt-0.5">{del.priceLabel}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Карточка итогов расчета */}
      {calcMutation.isPending ? (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs text-white/60">Считаем по курсу Нацбанка...</span>
        </div>
      ) : calculationResult ? (
        <div className="rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-cyan-500/30 p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div>
              <p className="text-[11px] text-white/50">Итого под ключ:</p>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-black font-mono text-cyan-400">
                  {calculationResult.total_byn.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-white/70">BYN</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/50">Предоплата 70%:</p>
              <span className="text-sm font-bold font-mono text-white">
                {calculationResult.prepayment_amount.toFixed(2)} BYN
              </span>
            </div>
          </div>

          {/* Сроки и бонусы */}
          <div className="flex items-center justify-between text-xs text-white/70">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-cyan-400" />
              {calculationResult.delivery_days_min}–{calculationResult.delivery_days_max} дней
            </span>
            <span className="flex items-center gap-1 text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              +{calculationResult.total_ice.toFixed(0)} ICE кэшбэк
            </span>
          </div>

          {/* Раскрывающийся список детализации */}
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between text-[11px] text-white/40 hover:text-white/70 py-1"
          >
            <span>Детализация расчета</span>
            {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showBreakdown && (
            <div className="bg-black/30 rounded-xl p-2.5 space-y-1.5 text-[11px] text-white/70 border border-white/5">
              <div className="flex justify-between">
                <span>Стоимость товара:</span>
                <span className="font-mono">{calculationResult.breakdown.product_cost_byn.toFixed(2)} BYN</span>
              </div>
              <div className="flex justify-between">
                <span>Международная доставка:</span>
                <span className="font-mono">{calculationResult.breakdown.delivery_cost_byn.toFixed(2)} BYN</span>
              </div>
              <div className="flex justify-between">
                <span>Комиссия сервиса:</span>
                <span className="font-mono">{calculationResult.breakdown.commission_byn.toFixed(2)} BYN</span>
              </div>
              {calculationResult.breakdown.insurance_byn > 0 && (
                <div className="flex justify-between text-cyan-400/90">
                  <span>Страховка:</span>
                  <span className="font-mono">+{calculationResult.breakdown.insurance_byn.toFixed(2)} BYN</span>
                </div>
              )}
              {calculationResult.breakdown.legit_check_byn > 0 && (
                <div className="flex justify-between text-cyan-400/90">
                  <span>Legit Check:</span>
                  <span className="font-mono">+{calculationResult.breakdown.legit_check_byn.toFixed(2)} BYN</span>
                </div>
              )}
              {calculationResult.breakdown.discount_byn > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Скидка клиента:</span>
                  <span className="font-mono">-{calculationResult.breakdown.discount_byn.toFixed(2)} BYN</span>
                </div>
              )}
            </div>
          )}

          {/* Кнопка оформления заказа */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setIsOrderModalOpen(true);
            }}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/25 transition-all"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Оформить заказ на выкуп</span>
          </button>
        </div>
      ) : null}

      {/* Модальное окно оформления */}
      {isOrderModalOpen && calculationResult && (
        <OrderCreateModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          calculation={calculationResult}
          initialData={{
            price: parseFloat(price) || 0,
            currency,
            country: sourceCountry,
            category,
            weightKg,
            insurance,
            legitCheck,
            localDelivery,
            title: initialProduct?.title || 'Товар из каталога',
            url: initialProduct?.url || '',
          }}
          onSuccess={() => {
            setIsOrderModalOpen(false);
            onOrderCreated();
          }}
        />
      )}
    </div>
  );
}
