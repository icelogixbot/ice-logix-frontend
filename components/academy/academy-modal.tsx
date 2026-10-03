'use client';

import React, { useState } from 'react';
import { tgUtil } from '@/lib/telegram';
import { GraduationCap, BookOpen, Clock, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  readTime: string;
  category: string;
  icon: string;
  summary: string;
  content: string[];
}

const LESSONS: Lesson[] = [
  {
    id: 'lesson-1',
    title: 'Почему на Poizon кроссовки дешевле на 40–60%, чем в Минске?',
    readTime: '2 мин',
    category: 'Экономия',
    icon: '💰',
    summary: 'Как устроен внутренний рынок Китая и почему в Беларуси огромные наценки.',
    content: [
      '1. Отсутствие европейских посредников: товар закупается напрямую у официальных дистрибьюторов в Азии.',
      '2. Конкуренция десятков тысяч проверенных продавцов на одной платформе сбивает цену до минимума.',
      '3. Оптовая логистика ICE LOGIX: консолидация грузов на нашем складе в Китае позволяет снизить стоимость доставки за пару кроссовок до минимума.',
      '4. В Беларуси в розничных магазинах в цену закладывается аренда ТЦ, растаможка коммерческих партий и наценка 100-200%.',
    ],
  },
  {
    id: 'lesson-2',
    title: 'Как выбрать идеальный размер обуви и не ошибиться?',
    readTime: '3 мин',
    category: 'Размеры',
    icon: '👟',
    summary: 'Пошаговый алгоритм замера стопы и особенности сеток Nike, Adidas, New Balance.',
    content: [
      '1. Главное правило: ориентируйтесь ТОЛЬКО на сантиметры (CM / JP / CHN), а не на EU или RU размеры.',
      '2. Как правильно измерить: встаньте пяткой к стене на лист бумаги, отметьте крайнюю точку самого длинного пальца и измерьте линейкой.',
      '3. Nike / Jordan обычно идут размер в размер (TTS). Если стопа широкая — берите на 0.5 размера больше.',
      '4. New Balance (серии 1906R, 2002R, 9060) очень мягкие и садятся идеально по длине стельки.',
      '5. В нашем приложении есть встроенная «Таблица размеров» во всех модалках оформления.',
    ],
  },
  {
    id: 'lesson-3',
    title: 'Как устроена проверка подлинности в лаборатории Poizon?',
    readTime: '2 мин',
    category: 'Legit Check',
    icon: '🔬',
    summary: 'Двойной контроль качества, защитные пломбы и индивидуальный QR-сертификат.',
    content: [
      '1. Товар от продавца сначала поступает в официальный сортировочный центр Poizon.',
      '2. Эксперты сканируют микроструктуру материалов под ультрафиолетом, плотность швов и вес с точностью до десятых грамма.',
      '3. При успешном прохождении вещь пломбируется фирменным номерным замком (Cable Tie) с чипом.',
      '4. В коробку вкладывается номерной сертификат Dewu, который считывается камерой любого смартфона.',
    ],
  },
  {
    id: 'lesson-4',
    title: 'Таможенные лимиты в Беларуси: как заказывать без пошлин?',
    readTime: '2 мин',
    category: 'Таможня',
    icon: '📦',
    summary: 'Нормы беспошлинного ввоза для физических лиц на 2026 год.',
    content: [
      '1. Беспошлинный лимит для посылок на одного получателя составляет 200 евро и 31 кг веса на одно отправление.',
      '2. Если ваш заказ превышает 200 евро, логистический отдел ICE LOGIX может безопасно разделить заказ на несколько посылок на разных членов семьи.',
      '3. 98% индивидуальных заказов обуви и одежды полностью вписываются в беспошлинный лимит.',
    ],
  },
];

interface AcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AcademyModal({ isOpen, onClose }: AcademyModalProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Академия байера
              </h3>
              <p className="text-[11px] text-white/50">Гайды и советы по выгодным покупкам</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedLesson ? (
            /* Lesson Detail View */
            <div className="space-y-4 animate-fade-in">
              <button
                onClick={() => {
                  setSelectedLesson(null);
                  tgUtil.haptic('selection');
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
              >
                ← Все уроки
              </button>

              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedLesson.icon}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    {selectedLesson.category} • {selectedLesson.readTime}
                  </span>
                </div>

                <h4 className="text-base font-bold text-white leading-snug">
                  {selectedLesson.title}
                </h4>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3 text-xs text-white/80 leading-relaxed">
                {selectedLesson.content.map((paragraph, idx) => (
                  <p key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">▫️</span>
                    <span>{paragraph}</span>
                  </p>
                ))}
              </div>

              <button
                onClick={() => {
                  setSelectedLesson(null);
                  tgUtil.haptic('light');
                }}
                className="w-full py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs transition active:scale-95 shadow-md"
              >
                Понятно, вернуться к списку
              </button>
            </div>
          ) : (
            /* Lessons List */
            LESSONS.map((lesson) => (
              <div
                key={lesson.id}
                onClick={() => {
                  setSelectedLesson(lesson);
                  tgUtil.haptic('selection');
                }}
                className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-cyan-400/40 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{lesson.icon}</span>
                    <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-400/20">
                      {lesson.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {lesson.readTime}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white group-hover:text-cyan-200 transition">
                  {lesson.title}
                </h4>

                <p className="text-[11px] text-white/60 line-clamp-2">
                  {lesson.summary}
                </p>

                <div className="flex items-center justify-end text-[10px] text-cyan-400 font-bold pt-1">
                  <span>Читать урок</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
