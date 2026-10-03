'use client';

import React from 'react';
import { useCart } from '@/lib/cart-context';
import { useI18n } from '@/lib/i18n/context';
import { triggerHaptic } from '@/lib/telegram';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: (cartSummary: { totalPrice: number; totalWeight: number; title: string }) => void;
}

export function CartSheet({ isOpen, onClose, onCheckout }: CartSheetProps) {
  const { items, removeItem, clearCart, totalItems, totalPriceCNY, totalWeightKg } = useCart();
  const { t } = useI18n();

  if (!isOpen) return null;

  const handleCheckout = () => {
    triggerHaptic('medium');
    onCheckout({
      totalPrice: totalPriceCNY,
      totalWeight: Math.round(totalWeightKg * 10) / 10,
      title: `Заказ из корзины (${totalItems} ${totalItems === 1 ? 'товар' : 'товара'})`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0e1422] border border-white/15 w-full max-w-lg rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
        {/* Шапка корзины */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {t('cart', 'Корзина')} ({totalItems})
              </h2>
              <p className="text-[10px] text-white/50">
                Общий вес: {totalWeightKg.toFixed(1)} кг
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {totalItems > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[10px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded-md bg-rose-500/10"
              >
                {t('cart_clear', 'Очистить')}
              </button>
            )}
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
        </div>

        {/* Список товаров */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {items.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-2xl">
                🛒
              </div>
              <p className="text-xs text-white/50">{t('cart_empty', 'Ваша корзина пуста')}</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center space-x-3"
              >
                {item.image_url ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xl shrink-0">
                    📦
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-white/50 mt-0.5">
                    {item.size && <span>Размер: {item.size}</span>}
                    <span>Вес: ~{item.weight_kg} кг</span>
                  </div>
                  <div className="text-xs font-bold font-mono text-cyan-400 mt-1">
                    ¥{item.price}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Подвал с оформлением */}
        {items.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-black/40 space-y-3 safe-bottom">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Сумма товаров:</span>
              <span className="font-bold font-mono text-base text-cyan-400">
                ¥{totalPriceCNY.toFixed(0)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/25"
            >
              <span>{t('cart_checkout', 'Перейти к расчету и оформлению')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
