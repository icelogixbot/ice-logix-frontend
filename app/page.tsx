'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, UserProfile } from '@/lib/api';
import { getTelegram, getTelegramInitData, triggerHaptic, tgUtil } from '@/lib/telegram';
import { Navbar } from '@/components/ui/navbar';
import { BottomTabs, TabType } from '@/components/ui/tabs';
import { SearchView } from '@/components/search/search-view';
import { CalculatorView } from '@/components/calculator/calculator-view';
import { OrdersView } from '@/components/orders/orders-view';
import { ProfileView } from '@/components/profile/profile-view';
import { StoriesModal } from '@/components/ui/stories-modal';
import { CartSheet } from '@/components/cart/cart-sheet';
import { FortuneWheelModal } from '@/components/gamification/fortune-wheel-modal';
import { ReviewsModal } from '@/components/reviews/reviews-modal';
import { FaqModal } from '@/components/ui/faq-modal';
import { AdminOrdersView } from '@/components/admin/admin-orders-view';
import { WishlistModal } from '@/components/wishlist/wishlist-modal';
import { ProductsCatalogView } from '@/components/catalog/products-catalog-view';
import { MarketplacesGuideModal } from '@/components/catalog/marketplaces-guide-modal';
import { LegitCheckModal } from '@/components/legitcheck/legit-check-modal';
import { AcademyModal } from '@/components/academy/academy-modal';

export interface SelectedProductForCalc {
  price: number;
  url: string;
  title: string;
  currency: string;
}

export default function HomePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [searchMode, setSearchMode] = useState<'search' | 'catalog'>('search');
  const [selectedProduct, setSelectedProduct] = useState<SelectedProductForCalc | null>(null);

  const [isStoriesOpen, setIsStoriesOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFortuneOpen, setIsFortuneOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isMarketplacesOpen, setIsMarketplacesOpen] = useState(false);
  const [isLegitCheckOpen, setIsLegitCheckOpen] = useState(false);
  const [isAcademyOpen, setIsAcademyOpen] = useState(false);

  // Проверка первого визита для онбординга
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('ice_onboarding_seen');
      if (!seen) {
        setIsStoriesOpen(true);
      }
    }
  }, []);

  const handleCloseStories = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ice_onboarding_seen', 'true');
    }
    setIsStoriesOpen(false);
  };

  // Инициализация Telegram WebApp
  useEffect(() => {
    const tg = getTelegram();
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  // Синхронизация нативной кнопки Telegram BackButton
  useEffect(() => {
    if (isAdminMode) {
      tgUtil.setBackButton(() => {
        triggerHaptic('light');
        setIsAdminMode(false);
      });
    } else if (activeTab !== 'search') {
      tgUtil.setBackButton(() => {
        triggerHaptic('light');
        setActiveTab('search');
      });
    } else {
      tgUtil.setBackButton(null);
    }
    return () => {
      tgUtil.setBackButton(null);
    };
  }, [isAdminMode, activeTab]);

  // Авторизация пользователя через initData или получение профиля
  const { data: userProfile, isLoading: isUserLoading } = useQuery<UserProfile | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      if (typeof window === 'undefined') {
        return null;
      }

      const initData = getTelegramInitData();
      if (initData) {
        try {
          const authRes = await api.authTelegram(initData);
          if (authRes.ok && authRes.user) {
            return authRes.user;
          }
        } catch (err) {
          console.warn('Telegram auth error, fallback to guest:', err);
        }
      }

      // Если вне Telegram или ошибка авторизации — возвращаем тестового/гостевого пользователя
      return {
        user_id: 0,
        username: 'guest_user',
        full_name: 'Пользователь ICE LOGIX',
        role: 'user',
        client_level: 'newbie',
        ices_balance: 0.0,
        referral_count: 0,
        referral_bonus: 0,
        total_spent: 0,
        orders_count: 0,
      };
    },
  });

  const handleSelectProductForCalc = (product: SelectedProductForCalc) => {
    setSelectedProduct(product);
    setActiveTab('calculator');
    triggerHaptic('medium');
  };

  return (
    <main className="min-h-screen bg-[#090d16] text-white flex flex-col justify-between">
      {/* Верхняя навигационная панель */}
      <Navbar
        user={userProfile || null}
        isLoading={isUserLoading}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
      />

      {/* Основной контент экранов */}
      <section className="flex-1 max-w-lg mx-auto w-full px-4 pt-4">
        {isAdminMode ? (
          <AdminOrdersView onBackToClient={() => setIsAdminMode(false)} />
        ) : (
          <>
            {activeTab === 'search' && (
              <div className="space-y-3">
                {/* Переключатель Поиск / Каталог хитов */}
                <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setSearchMode('search');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      searchMode === 'search'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    🔍 Поиск по Китаю
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setSearchMode('catalog');
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      searchMode === 'catalog'
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <span>🔥</span> Каталог хитов
                  </button>
                </div>

                {searchMode === 'search' ? (
                  <SearchView onSelectProductForCalc={handleSelectProductForCalc} />
                ) : (
                  <ProductsCatalogView
                    onSelectProductForCalc={handleSelectProductForCalc}
                    onOpenMarketplacesGuide={() => setIsMarketplacesOpen(true)}
                  />
                )}
              </div>
            )}

            {activeTab === 'calculator' && (
              <CalculatorView
                initialProduct={selectedProduct}
                userProfile={userProfile || null}
                onOrderCreated={() => setActiveTab('orders')}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersView
                userProfile={userProfile || null}
                onGoToSearch={() => setActiveTab('search')}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                userProfile={userProfile || null}
                onOpenFortune={() => setIsFortuneOpen(true)}
                onOpenReviews={() => setIsReviewsOpen(true)}
                onOpenFaq={() => setIsFaqOpen(true)}
                onOpenAdmin={() => setIsAdminMode(true)}
                onOpenWishlist={() => setIsWishlistOpen(true)}
                onOpenLegitCheck={() => setIsLegitCheckOpen(true)}
                onOpenAcademy={() => setIsAcademyOpen(true)}
              />
            )}
          </>
        )}
      </section>

      {/* Нижняя панель табов */}
      {!isAdminMode && (
        <BottomTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          ordersCount={userProfile?.orders_count || 0}
        />
      )}

      {/* Обучающие сторис */}
      <StoriesModal
        isOpen={isStoriesOpen}
        onClose={handleCloseStories}
      />

      {/* Шторка корзины */}
      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={(summary) => {
          handleSelectProductForCalc({
            price: summary.totalPrice,
            url: '',
            title: summary.title,
            currency: 'CNY',
          });
        }}
      />

      {/* Колесо Фортуны */}
      <FortuneWheelModal
        isOpen={isFortuneOpen}
        onClose={() => setIsFortuneOpen(false)}
        onRewardWon={(reward) => {
          if (reward.type === 'ice') {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          }
        }}
      />

      {/* Отзывы клиентов */}
      <ReviewsModal
        isOpen={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
      />

      {/* Часто задаваемые вопросы (FAQ) */}
      <FaqModal
        isOpen={isFaqOpen}
        onClose={() => setIsFaqOpen(false)}
      />

      {/* Модалка Избранного */}
      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        onSelectForCalc={handleSelectProductForCalc}
      />

      {/* Гайд по маркетплейсам */}
      <MarketplacesGuideModal
        isOpen={isMarketplacesOpen}
        onClose={() => setIsMarketplacesOpen(false)}
      />

      {/* Экспертиза Legit Check */}
      <LegitCheckModal
        isOpen={isLegitCheckOpen}
        onClose={() => setIsLegitCheckOpen(false)}
      />

      {/* Академия байера */}
      <AcademyModal
        isOpen={isAcademyOpen}
        onClose={() => setIsAcademyOpen(false)}
      />
    </main>
  );
}


