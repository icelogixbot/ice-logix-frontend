'use client';

import React, { useState } from 'react';
import { useWishlist } from '@/lib/wishlist-context';
import { useCart } from '@/lib/cart-context';
import { useI18n } from '@/lib/i18n/context';
import { tgUtil } from '@/lib/telegram';
import { Heart, ShoppingCart, Calculator, Flame, Sparkles, Filter } from 'lucide-react';

export interface CatalogProduct {
  id: string;
  title: string;
  category: 'shoes' | 'clothes' | 'accessories';
  brand: string;
  priceCny: number;
  estimatedPriceByn: number;
  imageUrl: string;
  platform: 'poizon' | '1688' | 'taobao';
  isHit?: boolean;
  discountBadge?: string;
  originalPriceByn?: number;
}

const TRENDING_PRODUCTS: CatalogProduct[] = [
  {
    id: 'prod-1',
    title: 'Nike Dunk Low Retro "Panda" Black White',
    category: 'shoes',
    brand: 'Nike',
    priceCny: 659,
    estimatedPriceByn: 385,
    originalPriceByn: 580,
    imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=80',
    platform: 'poizon',
    isHit: true,
    discountBadge: '-34%',
  },
  {
    id: 'prod-2',
    title: 'New Balance 1906R Silver Metallic White',
    category: 'shoes',
    brand: 'New Balance',
    priceCny: 849,
    estimatedPriceByn: 480,
    originalPriceByn: 720,
    imageUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&auto=format&fit=crop&q=80',
    platform: 'poizon',
    isHit: true,
    discountBadge: '-33%',
  },
  {
    id: 'prod-3',
    title: 'Air Jordan 1 Retro High OG "Lost & Found"',
    category: 'shoes',
    brand: 'Jordan',
    priceCny: 1290,
    estimatedPriceByn: 695,
    originalPriceByn: 990,
    imageUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=80',
    platform: 'poizon',
    isHit: true,
    discountBadge: '-30%',
  },
  {
    id: 'prod-4',
    title: 'Худи Stussy Basic Logo Overdyed Black',
    category: 'clothes',
    brand: 'Stussy',
    priceCny: 420,
    estimatedPriceByn: 260,
    originalPriceByn: 420,
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80',
    platform: 'poizon',
    isHit: true,
    discountBadge: '-38%',
  },
  {
    id: 'prod-5',
    title: 'Свитшот Stone Island с патчем Regular Fit',
    category: 'clothes',
    brand: 'Stone Island',
    priceCny: 890,
    estimatedPriceByn: 510,
    originalPriceByn: 850,
    imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&auto=format&fit=crop&q=80',
    platform: 'poizon',
    isHit: false,
    discountBadge: '-40%',
  },
  {
    id: 'prod-6',
    title: 'Куртка пуховая The North Face 1996 Retro Nuptse',
    category: 'clothes',
    brand: 'TNF',
    priceCny: 1190,
    estimatedPriceByn: 670,
    originalPriceByn: 1150,
    imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=80',
    platform: '1688',
    isHit: true,
    discountBadge: '-42%',
  },
  {
    id: 'prod-7',
    title: 'Шлепанцы Yeezy Slide "Onyx" Black',
    category: 'shoes',
    brand: 'Yeezy',
    priceCny: 490,
    estimatedPriceByn: 295,
    originalPriceByn: 450,
    imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&auto=format&fit=crop&q=80',
    platform: 'poizon',
    isHit: true,
    discountBadge: '-35%',
  },
  {
    id: 'prod-8',
    title: 'Кепка Carhartt WIP Madison Logo Cap',
    category: 'accessories',
    brand: 'Carhartt',
    priceCny: 180,
    estimatedPriceByn: 115,
    originalPriceByn: 190,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&auto=format&fit=crop&q=80',
    platform: 'taobao',
    isHit: false,
    discountBadge: '-39%',
  },
];

interface ProductsCatalogViewProps {
  onSelectProductForCalc: (item: { price: number; url: string; title: string; currency: string }) => void;
  onOpenMarketplacesGuide: () => void;
}

export function ProductsCatalogView({ onSelectProductForCalc, onOpenMarketplacesGuide }: ProductsCatalogViewProps) {
  const { t } = useI18n();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { addItem } = useCart();

  const [activeCategory, setActiveCategory] = useState<'all' | 'shoes' | 'clothes' | 'accessories' | 'hits'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredProducts = TRENDING_PRODUCTS.filter((prod) => {
    const matchesCat =
      activeCategory === 'all'
        ? true
        : activeCategory === 'hits'
        ? prod.isHit
        : prod.category === activeCategory;

    const matchesSearch =
      prod.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      prod.brand.toLowerCase().includes(searchFilter.toLowerCase());

    return matchesCat && matchesSearch;
  });

  const handleAddToCart = (prod: CatalogProduct) => {
    addItem({
      title: prod.title,
      price: prod.priceCny,
      currency: 'CNY',
      image_url: prod.imageUrl,
      url: `https://m.dewu.com/search?keyword=${encodeURIComponent(prod.title)}`,
      weight_kg: prod.category === 'shoes' ? 1.2 : 0.6,
      category: prod.category,
    });
    tgUtil.haptic('selection');
  };

  const handleToCalc = (prod: CatalogProduct) => {
    onSelectProductForCalc({
      price: prod.priceCny,
      url: `https://m.dewu.com/search?keyword=${encodeURIComponent(prod.title)}`,
      title: prod.title,
      currency: 'CNY',
    });
    tgUtil.haptic('selection');
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Banner / Guide trigger */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-blue-950/60 to-indigo-950/70 border border-cyan-500/30 flex items-center justify-between shadow-lg">
        <div className="space-y-1 pr-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
            <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
            Хиты заказов из Китая
          </div>
          <p className="text-[11px] text-white/60">
            Цены под ключ в Беларусь с выкупом и доставкой
          </p>
        </div>

        <button
          onClick={onOpenMarketplacesGuide}
          className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold transition active:scale-95 whitespace-nowrap flex items-center gap-1.5"
        >
          <span>🛍️</span> Площадки
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'Все товары' },
          { id: 'hits', label: '🔥 Хиты' },
          { id: 'shoes', label: '👟 Обувь' },
          { id: 'clothes', label: '👕 Одежда' },
          { id: 'accessories', label: '🧢 Аксессуары' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveCategory(tab.id as any);
              tgUtil.haptic('selection');
            }}
            className={`py-1.5 px-3 rounded-full font-medium transition whitespace-nowrap ${
              activeCategory === tab.id
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Filter Input */}
      <div>
        <input
          type="text"
          placeholder="Поиск по модели или бренду (Nike, Jordan, Stussy...)"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full bg-slate-900/80 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredProducts.map((prod) => {
          const wishlisted = isWishlisted(prod.id);
          return (
            <div
              key={prod.id}
              className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Badge & Heart */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-800 mb-2 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={prod.imageUrl}
                  alt={prod.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {prod.discountBadge && (
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-500 text-white shadow-sm">
                    {prod.discountBadge}
                  </span>
                )}

                {/* Heart Button (Optimistic Wishlist) */}
                <button
                  onClick={() =>
                    toggleWishlist({
                      id: prod.id,
                      title: prod.title,
                      price: prod.priceCny,
                      currency: 'CNY',
                      platform: prod.platform,
                      imageUrl: prod.imageUrl,
                      url: `https://m.dewu.com/search?keyword=${encodeURIComponent(prod.title)}`,
                    })
                  }
                  className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    wishlisted
                      ? 'bg-pink-500 text-white shadow-md'
                      : 'bg-black/60 text-white/70 hover:text-white backdrop-blur-sm'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-white' : ''}`} />
                </button>

                <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-cyan-300 uppercase backdrop-blur-sm">
                  {prod.platform}
                </span>
              </div>

              {/* Title & Brand */}
              <div>
                <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                  {prod.brand}
                </div>
                <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight mt-0.5" title={prod.title}>
                  {prod.title}
                </h4>
              </div>

              {/* Pricing */}
              <div className="pt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-cyan-400">
                    {prod.estimatedPriceByn} BYN
                  </span>
                  {prod.originalPriceByn && (
                    <span className="text-[10px] text-white/40 line-through">
                      {prod.originalPriceByn}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/40">
                  ≈ ¥{prod.priceCny} на Poizon
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <button
                    onClick={() => handleToCalc(prod)}
                    className="py-1.5 px-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
                  >
                    <Calculator className="w-3 h-3" />
                    Расчет
                  </button>

                  <button
                    onClick={() => handleAddToCart(prod)}
                    className="py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95 shadow-md"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Купить
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
