'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, UserProfile } from '@/lib/api';
import { getTelegram, getTelegramInitData, triggerHaptic, tgUtil } from '@/lib/telegram';
import { Navbar } from '@/components/ui/navbar';
import { BottomTabs, TabType } from '@/components/ui/tabs';
import { HomeView } from '@/components/home/home-view';
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
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedProduct, setSelectedProduct] = useState<SelectedProductForCalc | null>(null);

  // Модальные окна
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
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);

  // Онбординг при первом открытии
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
    } else if (isOrdersModalOpen) {
      tgUtil.setBackButton(() => {
        triggerHaptic('light');
        setIsOrdersModalOpen(false);
      });
    } else if (activeTab !== 'home') {
      tgUtil.setBackButton(() => {
        triggerHaptic('light');
        setActiveTab('home');
      });
    } else {
      tgUtil.setBackButton(null);
    }
    return () => {
      tgUtil.setBackButton(null);
    };
  }, [isAdminMode, isOrdersModalOpen, activeTab]);

  // Загрузка / авторизация профиля
  const { data: userProfile, isLoading: isUserLoading } = useQuery<UserProfile | null>({
    queryKey: ['currentUser'],
    queryFn: async () => {
      if (typeof window === 'undefined') return null;
      const initData = getTelegramInitData();

      if (initData) {
        try {
          const authRes = await api.authTelegram(initData);
          if (authRes.ok && authRes.user) {
            return authRes.user;
          }
        } catch {
          // fallback to me
        }
      }

      try {
        const meRes = await api.getMe();
        if (meRes.ok && meRes.user) {
          return meRes.user;
        }
      } catch {
        // demo profile
      }

      const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      return {
        user_id: tgUser?.id || 7770001,
        username: tgUser?.username || 'ice_shopper',
        full_name: [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' ') || 'Покупатель ICE',
        role: 'user',
        client_level: 'shopper',
        ices_balance: 15.5,
        referral_code: 'ICE' + (tgUser?.id || 777),
        referral_count: 2,
        referral_bonus: 20.0,
        total_spent: 850.0,
        orders_count: 3,
      };
    },
    staleTime: 60 * 1000,
  });

  return (
    <div id="app" className="min-h-screen text-white relative">
      {/* ═══════════════════════════════════════════════════════════════════════
           HEADER ISLAND - Floating navigation with balance widget
           ═══════════════════════════════════════════════════════════════════════ */}
      <Navbar
        user={userProfile || null}
        isLoading={isUserLoading}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onOpenNotifications={() => setIsStoriesOpen(true)}
        onOpenSettings={() => setIsFaqOpen(true)}
        onLogoClick={() => setActiveTab('home')}
        onAvatarClick={() => setActiveTab('profile')}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
           MAIN CONTENT AREA
           ═══════════════════════════════════════════════════════════════════════ */}
      {isAdminMode ? (
        <div className="main-content">
          <div className="max-w-2xl mx-auto px-4">
            <button
              onClick={() => setIsAdminMode(false)}
              className="mb-4 text-xs font-bold text-cyan-400 flex items-center gap-1"
            >
              ← Назад в профиль
            </button>
            <AdminOrdersView onBackToClient={() => setIsAdminMode(false)} />
          </div>
        </div>
      ) : activeTab === 'home' ? (
        <HomeView
          onOpenStories={() => setIsStoriesOpen(true)}
          onOpenLegitCheck={() => setIsLegitCheckOpen(true)}
          onOpenReviews={() => setIsReviewsOpen(true)}
          onOpenFortune={() => setIsFortuneOpen(true)}
          onOpenAcademy={() => setIsAcademyOpen(true)}
          onOpenMarketplacesGuide={() => setIsMarketplacesOpen(true)}
          onOpenCatalog={() => setActiveTab('catalogs')}
          onSelectProductForCalc={(prod) => {
            setSelectedProduct(prod);
            setActiveTab('calculator');
          }}
        />
      ) : activeTab === 'calculator' ? (
        <div className="main-content">
          <div className="max-w-lg mx-auto px-2">
            <CalculatorView
              initialProduct={selectedProduct}
              userProfile={userProfile || null}
              onOrderCreated={() => setActiveTab('profile')}
            />
          </div>
        </div>
      ) : activeTab === 'neworder' ? (
        <div className="main-content">
          <div className="max-w-lg mx-auto px-2">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-extrabold text-white tracking-tight">Поиск и Заказ</h2>
              <p className="text-white/60 text-xs mt-1">
                Вставьте ссылку с Poizon/Taobao/1688, загрузите фото или введите название
              </p>
            </div>
            <SearchView
              onSelectProductForCalc={(prod) => {
                setSelectedProduct(prod);
                setActiveTab('calculator');
              }}
            />
          </div>
        </div>
      ) : activeTab === 'catalogs' ? (
        <div className="main-content">
          <div className="max-w-lg mx-auto px-2">
            <ProductsCatalogView
              onOpenMarketplacesGuide={() => setIsMarketplacesOpen(true)}
              onSelectProductForCalc={(prod) => {
                setSelectedProduct(prod);
                setActiveTab('calculator');
              }}
            />
          </div>
        </div>
      ) : activeTab === 'profile' ? (
        <div className="main-content">
          <div className="max-w-lg mx-auto px-2">
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
          </div>
        </div>
      ) : null}

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB BAR ISLAND - Floating bottom navigation
           ═══════════════════════════════════════════════════════════════════════ */}
      {!isAdminMode && (
        <BottomTabs
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           МОДАЛЬНЫЕ ОКНА
           ═══════════════════════════════════════════════════════════════════════ */}
      <StoriesModal isOpen={isStoriesOpen} onClose={handleCloseStories} />
      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={(summary) => {
          setSelectedProduct({
            price: summary.totalPrice,
            url: '',
            title: summary.title,
            currency: 'CNY',
          });
          setActiveTab('calculator');
        }}
      />
      <FortuneWheelModal isOpen={isFortuneOpen} onClose={() => setIsFortuneOpen(false)} />
      <ReviewsModal isOpen={isReviewsOpen} onClose={() => setIsReviewsOpen(false)} />
      <FaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} />
      <MarketplacesGuideModal isOpen={isMarketplacesOpen} onClose={() => setIsMarketplacesOpen(false)} />
      <LegitCheckModal isOpen={isLegitCheckOpen} onClose={() => setIsLegitCheckOpen(false)} />
      <AcademyModal isOpen={isAcademyOpen} onClose={() => setIsAcademyOpen(false)} />
      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        onSelectForCalc={(prod) => {
          setSelectedProduct(prod);
          setActiveTab('calculator');
        }}
      />
    </div>
  );
}
