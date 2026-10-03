'use client';

import React, { useState } from 'react';
import { tgUtil } from '@/lib/telegram';
import { useI18n } from '@/lib/i18n/context';
import { ExternalLink, Copy, Check, ShoppingBag, ShieldCheck, Factory, Sparkles } from 'lucide-react';

interface MarketplaceInfo {
  id: string;
  name: string;
  nativeName: string;
  badge: string;
  badgeColor: string;
  icon: string;
  url: string;
  downloadUrl?: string;
  description: string;
  howToCopy: string;
  features: string[];
}

const MARKETPLACES: MarketplaceInfo[] = [
  {
    id: 'poizon',
    name: 'Poizon (Dewu)',
    nativeName: '得物',
    badge: '100% Оригинал',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
    icon: '👟',
    url: 'https://m.dewu.com',
    downloadUrl: 'https://m.dewu.com/download',
    description: 'Главный маркетплейс оригинальных кроссовок, стритвира и люкса в Азии. Каждая вещь проходит строгую лабораторную экспертизу (Legit Check) с RFID-чипом и номерным сертификатом.',
    howToCopy: 'В карточке товара нажмите стрелочку «Поделиться» (Share) ➔ выберите «Скопировать ссылку» (Copy link) и вставьте её в наш Калькулятор.',
    features: ['Сертификат подлинности', 'Двойная проверка на брак', 'Цены на 40-60% ниже розницы в РБ'],
  },
  {
    id: '1688',
    name: '1688 (Alibaba Group)',
    nativeName: '阿里巴巴',
    badge: 'Цены от фабрик',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    icon: '🏭',
    url: 'https://m.1688.com',
    description: 'Крупнейшая внутренняя оптовая платформа Китая напрямую от заводов-изготовителей. Идеально для пуховиков, базовой одежды, сумок и аксессуаров без переплаты за розничные наценки.',
    howToCopy: 'Нажмите кнопку «Поделиться» в приложении 1688 или скопируйте URL адрес из браузера.',
    features: ['Себестоимость от производителя', 'Выкуп от 1 единицы', 'Огромный выбор фабричных реплик 1:1'],
  },
  {
    id: 'taobao',
    name: 'Taobao',
    nativeName: '淘宝',
    badge: 'Огромный выбор',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    icon: '🛍️',
    url: 'https://m.taobao.com',
    description: 'Самый популярный розничный маркетплейс Китая. Миллионы продавцов, редкие дропы уличных брендов (Stussy, Supreme, Trapstar, Corteiz), кастомы и лимитированные коллекции.',
    howToCopy: 'Нажмите значок поделиться в карточке товара Taobao ➔ «Copy Link» и вставьте в ICE LOGIX.',
    features: ['Любые редкие бренды', 'Встроенный поиск по фото', 'Быстрая доставка по Китаю (1-2 дня)'],
  },
  {
    id: 'weidian',
    name: 'Weidian',
    nativeName: '微店',
    badge: 'Сникер-бары',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    icon: '✨',
    url: 'https://weidian.com',
    description: 'Платформа закрытых витрин и независимых китайских сникер-мастеров. Известна лучшими партиями кроссовок премиального качества (LW, PK, GX, OG батчи).',
    howToCopy: 'Скопируйте ссылку на карточку товара Weidian и вставьте в Калькулятор выкупа.',
    features: ['Элитные партии обуви', 'Закрытые каталоги продавцов', 'Редкие расцветки'],
  },
];

interface MarketplacesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForCalc?: () => void;
}

export function MarketplacesGuideModal({ isOpen, onClose, onSelectForCalc }: MarketplacesGuideModalProps) {
  const { t } = useI18n();
  const [selectedMp, setSelectedMp] = useState<MarketplaceInfo>(MARKETPLACES[0]);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCopyUrl = (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      tgUtil.haptic('selection');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Где заказывать (Площадки)
              </h3>
              <p className="text-[11px] text-white/50">Гайд по маркетплейсам Китая</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Platform Selection Tabs */}
        <div className="p-3 bg-slate-900/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs">
          {MARKETPLACES.map((mp) => (
            <button
              key={mp.id}
              onClick={() => {
                setSelectedMp(mp);
                tgUtil.haptic('selection');
              }}
              className={`py-2 px-3 rounded-xl font-bold flex items-center gap-1.5 transition whitespace-nowrap border ${
                selectedMp.id === mp.id
                  ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-sm'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <span>{mp.icon}</span>
              <span>{mp.name}</span>
            </button>
          ))}
        </div>

        {/* Platform Details Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Card Banner */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedMp.icon}</span>
                <div>
                  <h4 className="text-base font-black text-white">{selectedMp.name}</h4>
                  <span className="text-[10px] text-white/40">{selectedMp.nativeName}</span>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedMp.badgeColor}`}>
                {selectedMp.badge}
              </span>
            </div>

            <p className="text-xs text-white/75 leading-relaxed pt-1">
              {selectedMp.description}
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Преимущества покупки на {selectedMp.name}:
            </h5>
            <div className="grid grid-cols-1 gap-1.5">
              {selectedMp.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-cyan-200 bg-cyan-950/40 border border-cyan-800/30 p-2.5 rounded-xl">
                  <span className="text-cyan-400 font-bold">✓</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How to Order Guide */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
            <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>📋</span> Как скопировать ссылку для заказа:
            </h5>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              {selectedMp.howToCopy}
            </p>
          </div>

          {/* External Links */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <a
              href={selectedMp.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => tgUtil.haptic('light')}
              className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              Открыть сайт
            </a>

            <button
              onClick={() => handleCopyUrl(selectedMp.url)}
              className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Скопировано!' : 'Скопировать URL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
