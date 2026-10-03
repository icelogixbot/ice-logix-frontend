'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { triggerHaptic } from '@/lib/telegram';
import { X, ChevronLeft, ChevronRight, Sparkles, Check, ArrowRight } from 'lucide-react';

interface StoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Slide {
  emoji: string;
  title: string;
  subtitle: string;
  items?: string[];
  highlight?: string;
  table?: { col1: string; col2: string; col3: string }[];
  ctaText?: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '❄️',
    title: 'Добро пожаловать в ICE LOGIX',
    subtitle: 'Премиальный сервис выкупа и экспресс-доставки оригинальных вещей из Китая и Европы в Беларусь.',
    highlight: 'Более 50+ площадок под ключ без посредников',
  },
  {
    emoji: '🛍️',
    title: 'Как устроен заказ?',
    subtitle: 'Всего три простых шага от выбора вещи до получения в вашем городе:',
    items: [
      '🔍 Находите товар на Poizon, 1688, Taobao или присылаете фото',
      '💰 Мгновенно рассчитываете точную стоимость в BYN под ключ',
      '📦 Мы выкупаем, проверяем на складе и отправляем Европочтой',
    ],
  },
  {
    emoji: '🌍',
    title: 'География выкупа',
    subtitle: 'Прямые логистические маршруты в Минск и все регионы РБ:',
    items: [
      '🇨🇳 Китай (Poizon, Dewu, Taobao, 1688) — Авиа 10-15 дней',
      '🇵🇱 Польша & ЕС (Zalando, ASOS, Vitkac) — 7-12 дней',
      '🇷🇺 Россия (Официальные ритейлеры) — 3-5 дней',
    ],
    highlight: '📍 Доставка в любое отделение Европочты или Белпочты',
  },
  {
    emoji: '💎',
    title: 'Честные прозрачные цены',
    subtitle: 'Никаких скрытых платежей при получении заказа:',
    items: [
      '📦 Стоимость товара конвертируется по курсу без переплат',
      '✈️ Международная доставка фиксируется в калькуляторе',
      '🛡️ 100% страховка груза и осмотр бирок перед отправкой',
    ],
    highlight: 'Предоплата всего 70% • Остаток при получении в РБ',
  },
  {
    emoji: '🧊',
    title: 'Что такое ICE токены?',
    subtitle: 'Внутренняя бонусная программа с реальной выгодой:',
    items: [
      '⚖️ 1 ICE = 1 BYN чистой скидки на заказы',
      '🎁 Автоматический кэшбэк с каждой вашей покупки',
      '👥 Бонусы за друзей — 5% с их покупок пожизненно',
    ],
  },
  {
    emoji: '📈',
    title: 'Программа лояльности',
    subtitle: 'Ваша персональная скидка растет с каждым заказом:',
    table: [
      { col1: '🆕 Newbie', col2: '1–4 заказа', col3: 'Кэшбэк' },
      { col1: '🛍️ Shopper', col2: '5–14 заказов', col3: '−10% комиссия' },
      { col1: '💎 VIP', col2: '15+ заказов', col3: '−20% + приоритет' },
    ],
    ctaText: 'Начать покупки',
  },
];

const SLIDE_DURATION = 5500; // 5.5 сек на слайд

export function StoriesModal({ isOpen, onClose }: StoriesModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);

  const currentSlide = SLIDES[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      triggerHaptic('light');
    } else {
      triggerHaptic('success');
      onClose();
    }
  }, [currentIndex, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      triggerHaptic('light');
    }
  }, [currentIndex]);

  // Таймер переключения сторис
  useEffect(() => {
    if (!isOpen) return;

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    startTimeRef.current = Date.now() - elapsedBeforePauseRef.current;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentProgress = Math.min(100, (elapsed / SLIDE_DURATION) * 100);
      setProgress(currentProgress);

      if (elapsed >= SLIDE_DURATION) {
        clearInterval(interval);
        handleNext();
      }
    }, 50);

    timerRef.current = interval;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentIndex, isPaused, handleNext]);

  const handleTouchStart = () => {
    setIsPaused(true);
    elapsedBeforePauseRef.current = Date.now() - startTimeRef.current;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 sm:p-4 select-none animate-in fade-in">
      <div
        className="relative w-full max-w-md h-full sm:h-[800px] sm:max-h-[92vh] sm:rounded-3xl bg-gradient-to-b from-[#0c182c] via-[#09101d] to-[#060a12] border border-white/10 flex flex-col justify-between overflow-hidden shadow-2xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
      >
        {/* Индикаторы прогресса сторис */}
        <div className="absolute top-4 left-4 right-4 z-30 flex gap-1.5 safe-top">
          {SLIDES.map((_, idx) => {
            let width = '0%';
            if (idx < currentIndex) width = '100%';
            else if (idx === currentIndex) width = `${progress}%`;

            return (
              <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-75 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                  style={{ width }}
                />
              </div>
            );
          })}
        </div>

        {/* Кнопка закрытия */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="absolute top-8 right-4 z-30 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Зоны нажатия влево/вправо */}
        <div
          className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
        />

        {/* Контент слайда */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pt-16 pb-8 space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-3xl shadow-xl shadow-cyan-500/10 animate-bounce duration-1000">
            {currentSlide.emoji}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-white leading-snug">
              {currentSlide.title}
            </h2>
            <p className="text-xs text-white/60 leading-relaxed font-normal">
              {currentSlide.subtitle}
            </p>
          </div>

          {/* Список пунктов */}
          {currentSlide.items && (
            <div className="space-y-2.5 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              {currentSlide.items.map((it, i) => (
                <div key={i} className="text-xs text-white/80 leading-relaxed flex items-start space-x-2">
                  <span className="shrink-0">{it.slice(0, 2)}</span>
                  <span>{it.slice(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Таблица лояльности */}
          {currentSlide.table && (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
              <div className="grid grid-cols-3 bg-white/10 p-2.5 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                <span>Уровень</span>
                <span>Заказов</span>
                <span>Бонус</span>
              </div>
              {currentSlide.table.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-3 p-3 text-xs border-t border-white/5 items-center font-medium"
                >
                  <span className="text-white">{row.col1}</span>
                  <span className="text-white/60 text-center">{row.col2}</span>
                  <span className="text-cyan-300 font-bold text-right">{row.col3}</span>
                </div>
              ))}
            </div>
          )}

          {/* Выделенная плашка */}
          {currentSlide.highlight && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center space-x-2 text-cyan-200 text-xs font-semibold shadow-lg shadow-cyan-500/10">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{currentSlide.highlight}</span>
            </div>
          )}
        </div>

        {/* Нижняя кнопка действия */}
        <div className="relative z-30 p-6 pt-0 safe-bottom">
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl text-sm flex items-center justify-center space-x-2 shadow-xl shadow-cyan-500/30 transition-all active:scale-[0.98]"
          >
            <span>{currentSlide.ctaText || 'Далее'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
