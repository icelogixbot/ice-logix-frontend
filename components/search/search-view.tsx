'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ProductCard } from '@/lib/api';
import { triggerHaptic } from '@/lib/telegram';
import { trackBlobUrl, clearBlobUrls, compressImage } from '@/lib/photo-previews';
import {
  Search,
  Camera,
  Link as LinkIcon,
  Loader2,
  ArrowRight,
  Upload,
  X,
  SlidersHorizontal,
  Check,
  Sparkles
} from 'lucide-react';

interface SearchViewProps {
  onSelectProductForCalc: (product: { price: number; url: string; title: string; currency: string }) => void;
}

const PLATFORMS = [
  { id: 'dewu', label: 'Poizon', flag: '🇨🇳' },
  { id: 'pdd', label: 'Pinduoduo', flag: '🇨🇳' },
  { id: 'taobao', label: 'Taobao', flag: '🇨🇳' },
  { id: '1688', label: '1688', flag: '🇨🇳' },
];

export function SearchView({ onSelectProductForCalc }: SearchViewProps) {
  const [mode, setMode] = useState<'text' | 'photo' | 'link'>('text');
  const [query, setQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['dewu', 'pdd', '1688', 'taobao']);

  // Состояния для поиска по фото
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoHint, setPhotoHint] = useState('');
  const [authenticity, setAuthenticity] = useState<'all' | 'original' | 'replica'>('all');
  const [condition, setCondition] = useState<'all' | 'new' | 'used'>('all');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Очистка Blob-ссылок при размонтировании (memory hygiene)
  useEffect(() => {
    return () => {
      clearBlobUrls('search:photo');
    };
  }, []);

  // Поиск по тексту
  const searchMutation = useMutation({
    mutationFn: () => api.searchProducts(query, selectedPlatforms),
    onSuccess: () => triggerHaptic('light'),
  });

  // Поиск по фото
  const photoSearchMutation = useMutation({
    mutationFn: async () => {
      if (!photoFile) throw new Error('Выберите фото');
      const base64 = await compressImage(photoFile, 1200, 0.85);
      return api.searchByImage({
        imageBase64: base64,
        descriptionHint: photoHint.trim() || undefined,
        authenticity,
        condition,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        platforms: selectedPlatforms,
      });
    },
    onSuccess: () => triggerHaptic('success'),
  });

  // Парсинг ссылки
  const parseLinkMutation = useMutation({
    mutationFn: () => api.parseLink(urlInput),
    onSuccess: (data) => {
      triggerHaptic('success');
      if (data.card) {
        onSelectProductForCalc({
          price: data.card.price,
          url: data.card.url,
          title: data.card.title || 'Товар по ссылке',
          currency: data.card.currency || 'CNY',
        });
      }
    },
  });

  const togglePlatform = (id: string) => {
    triggerHaptic('light');
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((p) => p !== id) : prev) : [...prev, id]
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const previewUrl = trackBlobUrl('search:photo', file);
      setPhotoPreview(previewUrl);
      triggerHaptic('light');
    }
  };

  const handleRemovePhoto = () => {
    clearBlobUrls('search:photo');
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    triggerHaptic('light');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    searchMutation.mutate();
  };

  const handlePhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;
    photoSearchMutation.mutate();
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    parseLinkMutation.mutate();
  };

  const displayedResults =
    mode === 'photo'
      ? photoSearchMutation.data?.results || []
      : searchMutation.data?.results || [];

  const isSearching = searchMutation.isPending || photoSearchMutation.isPending;

  return (
    <div className="space-y-4 pb-28">
      {/* 3 режима поиска: Текст / Фото / Ссылка */}
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setMode('text');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            mode === 'text'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>По тексту</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setMode('photo');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            mode === 'photo'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>По фото</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setMode('link');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            mode === 'link'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>По ссылке</span>
        </button>
      </div>

      {/* Выбор маркетплейсов */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
        {PLATFORMS.map((p) => {
          const isSelected = selectedPlatforms.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlatform(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              <span>{p.flag}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* РЕЖИМ 1: Поиск по тексту */}
      {mode === 'text' && (
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название, артикул (Nike Dunk, Stone Island...)"
            className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 transition-colors pr-11"
          />
          <button
            type="submit"
            disabled={searchMutation.isPending || !query.trim()}
            className="absolute right-2 top-2 p-2 text-cyan-400 hover:text-cyan-300 disabled:opacity-30"
          >
            {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </form>
      )}

      {/* РЕЖИМ 2: Поиск по фото */}
      {mode === 'photo' && (
        <form onSubmit={handlePhotoSubmit} className="space-y-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            className="hidden"
          />

          {!photoPreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-cyan-500/40 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/5 flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Загрузить фото или скриншот</p>
                <p className="text-[10px] text-white/40 mt-0.5">Poizon, Pinterest, бирки или вещь целиком</p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/15 p-2 flex items-center space-x-3">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Превью" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{photoFile?.name}</p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {photoFile ? `${(photoFile.size / 1024).toFixed(0)} КБ` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Дополнительная подсказка к фото */}
          <input
            type="text"
            value={photoHint}
            onChange={(e) => setPhotoHint(e.target.value)}
            placeholder="Уточнение (например: черная, размер 42, оригинал)"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
          />

          {/* Кнопка фильтров */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowFilters(!showFilters);
              }}
              className="text-[11px] text-cyan-400 flex items-center space-x-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{showFilters ? 'Скрыть фильтры' : 'Фильтры поиска (качество, цена)'}</span>
            </button>
          </div>

          {/* Панель фильтров */}
          {showFilters && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2.5 text-xs animate-in fade-in">
              <div>
                <label className="text-white/60 text-[11px] block mb-1">Категория подлинности:</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['all', 'original', 'replica'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAuthenticity(t)}
                      className={`py-1 rounded-lg text-[10px] font-medium border ${
                        authenticity === t
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                          : 'bg-white/5 border-white/10 text-white/50'
                      }`}
                    >
                      {t === 'all' ? 'Все' : t === 'original' ? 'Оригинал' : 'Реплика 1:1'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/60 text-[11px] block mb-1">Максимальная цена (¥ Юани):</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Без ограничений"
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Кнопка запуска поиска по фото */}
          <button
            type="submit"
            disabled={!photoFile || photoSearchMutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 disabled:opacity-40 shadow-lg shadow-cyan-500/20"
          >
            {photoSearchMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ищем соответствия в Китае...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Найти товар по фото</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* РЕЖИМ 3: Парсинг ссылки */}
      {mode === 'link' && (
        <form onSubmit={handleLinkSubmit} className="space-y-3">
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
            <p className="text-xs text-white/70">
              Вставьте ссылку на товар с Poizon (Dewu), 1688, Taobao или PDD:
            </p>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={parseLinkMutation.isPending || !urlInput.trim()}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 disabled:opacity-40 shadow-lg shadow-cyan-500/20"
          >
            {parseLinkMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Парсим страницу товара...</span>
              </>
            ) : (
              <>
                <span>Распознать цену и перейти к заказу</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Статистика результатов */}
      {displayedResults.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-white/40 px-1 pt-1">
          <span>Найдено предложений: {displayedResults.length}</span>
          <span>⚡ Goroutines API</span>
        </div>
      )}

      {/* Сетка карточек товаров */}
      <div className="grid grid-cols-2 gap-2.5">
        {displayedResults.map((item, idx) => (
          <ProductCardItem
            key={`${item.platform}-${idx}`}
            card={item}
            onSelect={() =>
              onSelectProductForCalc({
                price: item.price,
                url: item.url,
                title: item.title,
                currency: item.currency,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function ProductCardItem({ card, onSelect }: { card: ProductCard; onSelect: () => void }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
      <div>
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-white/5 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image_url || '/placeholder.png'}
            alt={card.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <span className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-md text-[9px] px-1.5 py-0.5 rounded text-white/90">
            {card.flag} {card.platform_label}
          </span>
        </div>
        <p className="text-xs text-white font-medium line-clamp-2 mb-1">{card.title}</p>
      </div>

      <div className="pt-2 border-t border-white/5 mt-1 flex items-center justify-between">
        <span className="text-sm font-bold font-mono text-cyan-400">
          ¥{card.price.toFixed(0)}
        </span>
        <button
          onClick={onSelect}
          className="text-[10px] bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 px-2.5 py-1 rounded-lg font-medium transition-colors"
        >
          В заказ
        </button>
      </div>
    </div>
  );
}
