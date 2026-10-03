'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/lib/api';
import { triggerHaptic } from '@/lib/telegram';
import { CurrencyModal } from '@/components/ui/currency-modal';
import { useCart } from '@/lib/cart-context';
import { useWishlist } from '@/lib/wishlist-context';
import { ShoppingBag, Heart } from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
  isLoading: boolean;
  onOpenCart?: () => void;
  onOpenWishlist?: () => void;
}

export function Navbar({ user, isLoading, onOpenCart, onOpenWishlist }: NavbarProps) {
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();

  const levelBadge = {
    newbie: { label: 'Newbie', bg: 'bg-white/10 text-white/70 border-white/20' },
    shopper: { label: 'Shopper (-10%)', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
    vip: { label: 'VIP (-20%)', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  }[user?.client_level || 'newbie'];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#090d16]/80 backdrop-blur-md border-b border-white/10 px-4 py-3 safe-top">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              ❄️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wide text-sm text-white">ICE LOGIX</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${levelBadge.bg}`}>
                  {levelBadge.label}
                </span>
              </div>
              <p className="text-[11px] text-white/40">
                {isLoading ? 'Загрузка...' : user ? `@${user.username || user.full_name}` : 'Гость'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Кнопка Избранного */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenWishlist?.();
              }}
              className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors"
              title="Избранное"
            >
              <Heart className="w-4 h-4 text-pink-400" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md shadow-pink-500/40">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Кнопка Корзины */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenCart?.();
              }}
              className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors"
              title="Корзина"
            >
              <ShoppingBag className="w-4 h-4 text-cyan-400" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md shadow-cyan-500/40">
                  {totalItems}
                </span>
              )}
            </button>


            {/* Кнопка баланса ICE и открытия курсов валют */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsCurrencyModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <span className="text-sm">🧊</span>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {user ? user.ices_balance.toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-white/40 ml-1">ICE</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Модальное окно курсов валют */}
      <CurrencyModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />
    </>
  );
}
