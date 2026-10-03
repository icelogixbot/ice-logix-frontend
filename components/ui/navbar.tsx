'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/lib/api';
import { triggerHaptic } from '@/lib/telegram';
import { CurrencyModal } from '@/components/ui/currency-modal';
import { useCart } from '@/lib/cart-context';
import { useWishlist } from '@/lib/wishlist-context';

interface NavbarProps {
  user: UserProfile | null;
  isLoading: boolean;
  onOpenCart?: () => void;
  onOpenWishlist?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onLogoClick?: () => void;
  onAvatarClick?: () => void;
}

export function Navbar({
  user,
  isLoading,
  onOpenCart,
  onOpenWishlist,
  onOpenNotifications,
  onOpenSettings,
  onLogoClick,
  onAvatarClick,
}: NavbarProps) {
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();

  const handleAvatarClick = () => {
    triggerHaptic('light');
    if (onAvatarClick) onAvatarClick();
  };

  const handleLogoClick = () => {
    triggerHaptic('selection');
    if (onLogoClick) onLogoClick();
  };

  return (
    <>
      <div className="app-header">
        {/* LEFT: Balance + avatar */}
        <div className="header-left">
          <div className="user-card" id="userCard">
            <div className="user-avatar" id="avatar" onClick={handleAvatarClick} title="Профиль">
              {user?.full_name ? user.full_name[0].toUpperCase() : '❄️'}
            </div>
            <div
              className="balance-island cursor-pointer"
              id="balanceIsland"
              onClick={() => {
                triggerHaptic('light');
                setIsCurrencyModalOpen(true);
              }}
              title="Биржевой баланс ICE"
            >
              <div className="balance-amount">
                <span id="headerBalance">
                  {user ? Math.floor(user.ices_balance) : '0'}
                </span>
                <span className="balance-icon" aria-hidden="true" title="ICE Валюта">
                  <img
                    src="/assets/icl_currency_icon.png"
                    alt="ICL"
                    className="w-full h-full object-contain"
                  />
                </span>
              </div>
              <button
                type="button"
                className="balance-add"
                id="addBalanceBtn"
                title="Пополнить баланс"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHaptic('selection');
                  setIsCurrencyModalOpen(true);
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* SPACER 1 */}
        <div className="header-spacer"></div>

        {/* CENTER: Action buttons */}
        <div className="header-center">
          {/* Wishlist */}
          <button
            type="button"
            className="icon-btn relative"
            title="Избранное"
            onClick={() => {
              triggerHaptic('light');
              onOpenWishlist?.();
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={wishlistCount > 0 ? '#f43f5e' : 'none'}
              stroke={wishlistCount > 0 ? '#f43f5e' : 'currentColor'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {wishlistCount > 0 && (
              <span
                id="wishlistBadge"
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center bg-rose-500 text-white"
              >
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart */}
          <button
            type="button"
            className="icon-btn relative"
            title="Корзина"
            onClick={() => {
              triggerHaptic('light');
              onOpenCart?.();
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {totalItems > 0 && (
              <span
                id="cartBadge"
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center bg-cyan-400 text-black font-extrabold"
              >
                {totalItems}
              </span>
            )}
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="icon-btn relative"
            id="notificationsBtn"
            title="Уведомления"
            onClick={() => {
              triggerHaptic('light');
              onOpenNotifications?.();
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          {/* Settings */}
          <button
            type="button"
            className="icon-btn"
            id="settingsBtn"
            title="Настройки"
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings?.();
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* SPACER 2 */}
        <div className="header-spacer"></div>

        {/* RIGHT: Logo */}
        <div className="header-right">
          <img
            id="logoImg"
            className="logo-img cursor-pointer"
            src="/assets/logo.png"
            alt="ICE LOGIX"
            onClick={handleLogoClick}
          />
        </div>
      </div>

      <CurrencyModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />
    </>
  );
}
