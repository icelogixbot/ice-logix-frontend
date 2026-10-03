'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, CreateOrderRequest, PricingResult } from '@/lib/api';
import { triggerHaptic } from '@/lib/telegram';
import { X, Check, Loader2, AlertCircle, Ruler } from 'lucide-react';
import { SizeTablesModal } from '@/components/ui/size-tables-modal';

interface OrderCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: PricingResult;
  initialData: {
    price: number;
    currency: string;
    country: string;
    category: string;
    weightKg: number;
    insurance: boolean;
    legitCheck: boolean;
    localDelivery: string;
    title: string;
    url: string;
  };
  onSuccess: () => void;
}

export function OrderCreateModal({
  isOpen,
  onClose,
  calculation,
  initialData,
  onSuccess,
}: OrderCreateModalProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(initialData.title);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+375 ');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [comment, setComment] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);

  const orderMutation = useMutation({
    mutationFn: (req: CreateOrderRequest) => api.createOrder(req),
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['userOrders'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      onSuccess();
    },
    onError: () => {
      triggerHaptic('error');
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !deliveryAddress.trim()) {
      triggerHaptic('error');
      return;
    }

    const payload: CreateOrderRequest = {
      source_url: initialData.url || 'https://poizon.com',
      source_country: initialData.country,
      product_currency: initialData.currency,
      product_price: initialData.price,
      weight_kg: initialData.weightKg,
      category: initialData.category,
      title: title.trim() || 'Товар с маркетплейса',
      items: [
        {
          title: title.trim() || 'Товар',
          size: size.trim() || undefined,
          color: color.trim() || undefined,
          price_original: initialData.price,
          url: initialData.url || '',
        },
      ],
      insurance: initialData.insurance,
      legit_check: initialData.legitCheck,
      requires_video_check: true,
      local_delivery_method: initialData.localDelivery,
      delivery_address: `${deliveryAddress.trim()} | Получатель: ${fullName.trim()} (${phone.trim()})${
        comment.trim() ? ` | Комментарий: ${comment.trim()}` : ''
      }`,
      promo_code: promoCode.trim() || undefined,
    };

    orderMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-[#0e1422] border border-white/15 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
        {/* Заголовок модалки */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white">Оформление выкупа</h2>
            <p className="text-[11px] text-white/50">Предоплата: {calculation.prepayment_amount.toFixed(2)} BYN</p>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1 rounded-full bg-white/5 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {orderMutation.isError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{orderMutation.error?.message || 'Ошибка оформления заказа'}</span>
            </div>
          )}

          {/* Название / Размер / Цвет */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/70 font-medium block">Параметры товара:</label>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsSizeModalOpen(true);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium"
              >
                <Ruler className="w-3 h-3" />
                <span>Таблица размеров</span>
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Наименование (Nike Dunk Low, Худи...)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Размер (например, 42 EU / M)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Цвет / расцветка"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Данные получателя */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="text-xs text-white/70 font-medium block">Данные получателя:</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="ФИО получателя"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+375 (XX) XXX-XX-XX"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <input
              type="text"
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Адрес доставки или отделение Европочты/Белпочты"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Дополнительно: Промокод и комментарий */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Промокод (если есть)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 uppercase font-mono"
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Пожелания к выкупу / ссылка на доп. фото..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Итог в модалке */}
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-white/60 block">Всего к оплате:</span>
              <span className="text-sm font-bold font-mono text-cyan-300">
                {calculation.total_byn.toFixed(2)} BYN
              </span>
            </div>
            <div className="text-right">
              <span className="text-white/60 block">Предоплата:</span>
              <span className="text-sm font-bold font-mono text-white">
                {calculation.prepayment_amount.toFixed(2)} BYN
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={orderMutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 disabled:opacity-40"
          >
            {orderMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Создаем заказ...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Подтвердить и отправить менеджеру</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Таблица размеров обуви и одежды */}
      <SizeTablesModal
        isOpen={isSizeModalOpen}
        onClose={() => setIsSizeModalOpen(false)}
        onSelectSize={(selectedSize) => {
          setSize(selectedSize);
        }}
      />
    </div>
  );
}
