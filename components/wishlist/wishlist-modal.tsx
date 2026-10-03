'use client';

import React from 'react';
import { useWishlist } from '@/lib/wishlist-context';
import { useCart } from '@/lib/cart-context';
import { useI18n } from '@/lib/i18n/context';
import { tgUtil } from '@/lib/telegram';
import { Heart, Trash2, ShoppingCart, Calculator, ExternalLink } from 'lucide-react';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForCalc: (item: { price: number; url: string; title: string; currency: string }) => void;
}

export function WishlistModal({ isOpen, onClose, onSelectForCalc }: WishlistModalProps) {
  const { t } = useI18n();
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addItem } = useCart();

  if (!isOpen) return null;

  const handleAddToCart = (item: any) => {
    addItem({
      title: item.title,
      price: item.price,
      currency: item.currency || 'CNY',
      image_url: item.imageUrl || item.image_url,
      url: item.url,
      weight_kg: 1.0,
      category: 'general',
    });
    tgUtil.haptic('selection');
  };

  const handleToCalc = (item: any) => {
    onSelectForCalc({
      price: item.price,
      url: item.url,
      title: item.title,
      currency: item.currency,
    });
    onClose();
    tgUtil.haptic('selection');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Heart className="w-4 h-4 fill-pink-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Избранное ({items.length})
              </h3>
              <p className="text-[11px] text-white/50">Сохраненные товары и кроссовки</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearWishlist}
                className="text-[10px] text-white/40 hover:text-red-400 transition py-1 px-2 rounded-lg bg-white/5"
              >
                Очистить
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto text-pink-400">
                <Heart className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white">В избранном пока пусто</h4>
              <p className="text-xs text-white/50 max-w-xs mx-auto leading-relaxed">
                Нажимайте на сердечко у любых товаров в поиске или каталоге, чтобы сохранить их сюда
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition flex gap-3 group"
              >
                {/* Photo */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-white/10 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as any).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
                    }}
                  />
                  <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1 rounded bg-black/60 text-white uppercase backdrop-blur-sm">
                    {item.platform}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h5 className="text-xs font-bold text-white truncate" title={item.title}>
                      {item.title}
                    </h5>
                    <div className="text-xs font-black text-cyan-400 mt-0.5">
                      ¥ {item.price}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2">
                    <button
                      onClick={() => handleToCalc(item)}
                      className="py-1 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition active:scale-95"
                    >
                      <Calculator className="w-3 h-3" />
                      Расчет BYN
                    </button>

                    <button
                      onClick={() => handleAddToCart(item)}
                      className="py-1 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 transition active:scale-95"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      В корзину
                    </button>

                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center transition ml-auto"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
