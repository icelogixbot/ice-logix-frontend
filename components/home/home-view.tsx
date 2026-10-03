'use client';

import React, { useState } from 'react';
import { triggerHaptic } from '@/lib/telegram';
import { useI18n } from '@/lib/i18n/context';
import { useWishlist } from '@/lib/wishlist-context';
import { useCart } from '@/lib/cart-context';

interface HomeViewProps {
  onOpenStories: () => void;
  onOpenLegitCheck: () => void;
  onOpenReviews: () => void;
  onOpenFortune: () => void;
  onOpenAcademy: () => void;
  onOpenMarketplacesGuide: () => void;
  onOpenCatalog: () => void;
  onSelectProductForCalc: (product: { price: number; url: string; title: string; currency: string }) => void;
}

export function HomeView({
  onOpenStories,
  onOpenLegitCheck,
  onOpenReviews,
  onOpenFortune,
  onOpenAcademy,
  onOpenMarketplacesGuide,
  onOpenCatalog,
  onSelectProductForCalc,
}: HomeViewProps) {
  const { t } = useI18n();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addItem } = useCart();
  const [activeChip, setActiveChip] = useState<'popular' | 'foryou'>('popular');

  // Курсы валют ICE LOGIX
  const currencies = [
    { flag: '🇨🇳', code: 'CNY', label: '¥1', rate: '0.46' },
    { flag: '🇪🇺', code: 'EUR', label: '€1', rate: '3.55' },
    { flag: '🇷🇺', code: 'RUB', label: '₽1', rate: '0.031' },
    { flag: '🇺🇸', code: 'USD', label: '$1', rate: '3.25' },
    { flag: '🇵🇱', code: 'PLN', label: 'zł1', rate: '0.80' },
    { flag: '🇯🇵', code: 'JPY', label: '¥100', rate: '2.20' },
    { flag: '🇻🇳', code: 'VND', label: '₫1000', rate: '0.13' },
    { flag: '🇦🇪', code: 'AED', label: 'د.إ1', rate: '0.88' },
    { flag: '🇹🇷', code: 'TRY', label: '₺1', rate: '0.096' },
    { flag: '🇰🇷', code: 'KRW', label: '₩1000', rate: '2.40' },
  ];

  // Маркетплейсы
  const marketplaces = [
    { name: 'Poizon', icon: '👟', color: '#22c55e', url: 'https://poizon.com', desc: 'Кроссовки и стритвер' },
    { name: 'Taobao', icon: '🛍️', color: '#fb923c', url: 'https://taobao.com', desc: 'Миллионы брендов' },
    { name: '1688', icon: '📦', color: '#facc15', url: 'https://1688.com', desc: 'Оптовые фабрики' },
    { name: 'Zalando', icon: '🇪🇺', color: '#92400e', url: 'https://zalando.de', desc: 'Европейский ритейл' },
    { name: 'Nike', icon: '✔️', color: '#374151', url: 'https://nike.com', desc: 'Официальные дропы' },
    { name: 'ASOS', icon: '✨', color: '#3b82f6', url: 'https://asos.com', desc: 'Англия и Европа' },
  ];

  // Рекомендованные товары
  const recommendedProducts = [
    {
      id: 'rec_1',
      title: 'Nike Air Jordan 4 Retro "Military Black"',
      brand: 'Jordan',
      priceCny: 1540,
      priceByn: 785,
      imageUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'rec_2',
      title: 'Nike Dunk Low Retro "White Black Panda"',
      brand: 'Nike',
      priceCny: 680,
      priceByn: 365,
      imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'rec_3',
      title: 'New Balance 1906R "Protection Pack"',
      brand: 'New Balance',
      priceCny: 950,
      priceByn: 495,
      imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'rec_4',
      title: 'Stone Island Soft Shell-R Jacket',
      brand: 'Stone Island',
      priceCny: 2850,
      priceByn: 1420,
      imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=400&q=80',
    },
  ];

  return (
    <div className="main-content">
      {/* 1. Currency Tracker */}
      <div className="glass-card mb-5 page-enter" style={{ animationDelay: '0.12s', padding: '12px 16px' }}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
            <span className="text-cyan-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            Биржевой курс ICE LOGIX
          </h3>
          <span className="text-green-400 text-[10px] bg-green-400/20 px-2 py-0.5 rounded-full animate-pulse font-semibold">
            Live
          </span>
        </div>
        <div style={{ overflowX: 'auto', padding: '2px 0', scrollbarWidth: 'none' }}>
          <div style={{ display: 'flex', gap: '6px', width: 'max-content', paddingBottom: '2px' }}>
            {currencies.map((c) => (
              <div
                key={c.code}
                className="rate-tracker-card"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                  {c.flag} {c.code}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>
                  {c.label} ≈ <span style={{ color: '#67e8f9' }}>{c.rate} Br/ICE</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Quick Actions - Story Cards with 3D-style icons */}
      <div className="scroll-hint-container mb-6 page-enter" style={{ animationDelay: '0.15s' }}>
        <div className="scroll-x flex gap-3 overflow-x-auto pb-2" style={{ padding: '4px 0', scrollbarWidth: 'none' }}>
          {/* Гайд */}
          <div
            className="story-card"
            onClick={() => {
              triggerHaptic('light');
              onOpenStories();
            }}
          >
            <div className="story-icon" style={{ background: 'linear-gradient(145deg, rgba(99,202,253,0.2), rgba(59,130,246,0.1))' }}>
              <span style={{ fontSize: '28px' }}>📖</span>
            </div>
            <span className="story-label">Гайд</span>
          </div>

          {/* Легит-чек */}
          <div
            className="story-card"
            onClick={() => {
              triggerHaptic('light');
              onOpenLegitCheck();
            }}
          >
            <div className="story-icon" style={{ background: 'linear-gradient(145deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))' }}>
              <span style={{ fontSize: '28px' }}>🛡️</span>
            </div>
            <span className="story-label">Легит-чек</span>
          </div>

          {/* Колесо удачи / Акции */}
          <div
            className="story-card"
            onClick={() => {
              triggerHaptic('light');
              onOpenFortune();
            }}
          >
            <div className="story-icon" style={{ background: 'linear-gradient(145deg, rgba(248,113,113,0.2), rgba(239,68,68,0.1))' }}>
              <span style={{ fontSize: '28px' }}>🎡</span>
            </div>
            <span className="story-label">Колесо</span>
          </div>

          {/* Отзывы */}
          <div
            className="story-card"
            onClick={() => {
              triggerHaptic('light');
              onOpenReviews();
            }}
          >
            <div className="story-icon" style={{ background: 'linear-gradient(145deg, rgba(251,191,36,0.25), rgba(234,179,8,0.15))' }}>
              <span style={{ fontSize: '28px' }}>⭐</span>
            </div>
            <span className="story-label">Отзывы</span>
          </div>

          {/* Каталог хитов */}
          <div
            className="story-card"
            onClick={() => {
              triggerHaptic('light');
              onOpenCatalog();
            }}
          >
            <div className="story-icon" style={{ background: 'linear-gradient(145deg, rgba(251,146,60,0.2), rgba(234,88,12,0.15))' }}>
              <span style={{ fontSize: '28px' }}>🔥</span>
            </div>
            <span className="story-label">Дропы</span>
          </div>

          {/* Академия */}
          <div
            className="story-card"
            onClick={() => {
              triggerHaptic('light');
              onOpenAcademy();
            }}
          >
            <div className="story-icon" style={{ background: 'linear-gradient(145deg, rgba(139,92,246,0.2), rgba(109,40,217,0.15))' }}>
              <span style={{ fontSize: '28px' }}>🎓</span>
            </div>
            <span className="story-label">Академия</span>
          </div>
        </div>
      </div>

      {/* 3. Promo Banners Carousel */}
      <div className="scroll-hint-container mb-6 page-enter" style={{ animationDelay: '0.2s' }}>
        <div className="scroll-x flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {/* Banner 1: Poizon Authentic */}
          <div
            className="banner-slide flex-shrink-0 cursor-pointer p-4 flex flex-col justify-between"
            style={{
              minWidth: '280px',
              height: '130px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #0f2b48 0%, #1e4976 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            onClick={() => {
              triggerHaptic('selection');
              onOpenMarketplacesGuide();
            }}
          >
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                Poizon Express
              </span>
              <h4 className="text-white font-extrabold text-base mt-2">100% Оригиналы из Китая</h4>
              <p className="text-white/70 text-xs">Двойная экспертиза перед отправкой в РБ</p>
            </div>
            <div className="flex items-center text-xs font-bold text-cyan-300 gap-1">
              <span>Смотреть инструкцию</span>
              <span>→</span>
            </div>
          </div>

          {/* Banner 2: Fast Delivery */}
          <div
            className="banner-slide flex-shrink-0 cursor-pointer p-4 flex flex-col justify-between"
            style={{
              minWidth: '280px',
              height: '130px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
            onClick={() => {
              triggerHaptic('selection');
              onOpenFortune();
            }}
          >
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                Колесо Фортуны
              </span>
              <h4 className="text-white font-extrabold text-base mt-2">Бесплатный спин каждые 24ч</h4>
              <p className="text-white/70 text-xs">Выигрывай скидки до 10% и токены ICE</p>
            </div>
            <div className="flex items-center text-xs font-bold text-amber-300 gap-1">
              <span>Крутить колесо</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Popular Marketplaces Section */}
      <div className="mb-6 page-enter" style={{ animationDelay: '0.25s' }}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <span>🌐</span>
            Площадки
          </h3>
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenMarketplacesGuide();
            }}
            className="text-sm font-semibold flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
          >
            Все
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        <div className="scroll-hint-container">
          <div className="scroll-x flex gap-3 overflow-x-auto pb-2" style={{ padding: '4px 0', scrollbarWidth: 'none' }}>
            {marketplaces.map((mp) => (
              <div
                key={mp.name}
                className="story-card marketplace-story flex-shrink-0"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenMarketplacesGuide();
                }}
              >
                <div
                  className="story-icon"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '26px' }}>{mp.icon}</span>
                </div>
                <span className="story-label">{mp.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Recommended Products Section */}
      <div className="mb-6 page-enter" style={{ animationDelay: '0.3s' }}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <span>✨</span>
            Рекомендуем
          </h3>
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenCatalog();
            }}
            className="text-sm font-semibold flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
          >
            Каталог
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Chips */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            className={`filter-chip ${activeChip === 'popular' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('selection');
              setActiveChip('popular');
            }}
          >
            🔥 Популярные
          </button>
          <button
            className={`filter-chip ${activeChip === 'foryou' ? 'active' : ''}`}
            onClick={() => {
              triggerHaptic('selection');
              setActiveChip('foryou');
            }}
          >
            💎 Для вас
          </button>
        </div>

        {/* 2-column Grid */}
        <div className="grid grid-cols-2 gap-3" id="homeProductsGrid">
          {recommendedProducts.map((prod) => {
            const wished = isWishlisted(prod.id);
            return (
              <div key={prod.id} className="product-card flex flex-col justify-between p-2.5">
                <div className="relative">
                  <img
                    src={prod.imageUrl}
                    alt={prod.title}
                    className="w-full h-36 object-cover rounded-xl mb-2"
                  />
                  {/* Heart button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist({
                        id: prod.id,
                        title: prod.title,
                        price: prod.priceCny,
                        currency: 'CNY',
                        platform: 'dewu',
                        imageUrl: prod.imageUrl,
                        url: `https://m.dewu.com/search?keyword=${encodeURIComponent(prod.title)}`,
                      });
                    }}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                      wished ? 'bg-pink-500 text-white' : 'bg-black/40 text-white/80 hover:bg-black/60'
                    }`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={wished ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>

                <div>
                  <span className="text-[10px] text-cyan-400 font-bold uppercase">{prod.brand}</span>
                  <h4 className="text-white font-bold text-xs line-clamp-2 mt-0.5 leading-tight">
                    {prod.title}
                  </h4>
                  <div className="mt-2 mb-2 flex items-baseline gap-1.5">
                    <span className="text-white font-extrabold text-sm">{prod.priceByn} BYN</span>
                    <span className="text-white/40 text-[10px]">¥{prod.priceCny}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      addItem({
                        title: prod.title,
                        price: prod.priceCny,
                        currency: 'CNY',
                        image_url: prod.imageUrl,
                        url: `https://m.dewu.com/search?keyword=${encodeURIComponent(prod.title)}`,
                        weight_kg: 1.2,
                        category: 'shoes',
                      });
                    }}
                    className="addToCartBtn"
                  >
                    В корзину
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      onSelectProductForCalc({
                        price: prod.priceCny,
                        url: `https://m.dewu.com/search?keyword=${encodeURIComponent(prod.title)}`,
                        title: prod.title,
                        currency: 'CNY',
                      });
                    }}
                    className="buyNowBtn"
                  >
                    Расчёт
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Footer */}
      <div className="app-footer text-center pt-8 pb-10 flex flex-col items-center">
        <img src="/assets/logo.png" className="footer-logo h-10 w-auto opacity-70 mb-4" alt="ICE LOGIX" />
        <p className="text-white/40 text-xs mb-3">Официальный сервис выкупа и логистики ICE LOGIX</p>
        <div className="social-icons flex justify-center gap-3">
          <div className="social-icon p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-cyan-400 cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
