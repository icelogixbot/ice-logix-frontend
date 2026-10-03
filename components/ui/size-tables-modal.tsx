'use client';

import React, { useState } from 'react';
import { triggerHaptic } from '@/lib/telegram';
import { X, Ruler, Check } from 'lucide-react';

interface SizeTablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSize?: (size: string) => void;
}

const BRANDS = ['Nike', 'Adidas', 'New Balance', 'Jordan'];

const SHOES_DATA: Record<string, Array<{ eu: string; us: string; uk: string; cm: string }>> = {
  Nike: [
    { eu: '38.5', us: '6.0', uk: '5.5', cm: '24.0 см' },
    { eu: '39', us: '6.5', uk: '6.0', cm: '24.5 см' },
    { eu: '40', us: '7.0', uk: '6.0', cm: '25.0 см' },
    { eu: '40.5', us: '7.5', uk: '6.5', cm: '25.5 см' },
    { eu: '41', us: '8.0', uk: '7.0', cm: '26.0 см' },
    { eu: '42', us: '8.5', uk: '7.5', cm: '26.5 см' },
    { eu: '42.5', us: '9.0', uk: '8.0', cm: '27.0 см' },
    { eu: '43', us: '9.5', uk: '8.5', cm: '27.5 см' },
    { eu: '44', us: '10.0', uk: '9.0', cm: '28.0 см' },
    { eu: '44.5', us: '10.5', uk: '9.5', cm: '28.5 см' },
    { eu: '45', us: '11.0', uk: '10.0', cm: '29.0 см' },
    { eu: '46', us: '12.0', uk: '11.0', cm: '30.0 см' },
  ],
  Adidas: [
    { eu: '38 2/3', us: '6.0', uk: '5.5', cm: '24.0 см' },
    { eu: '39 1/3', us: '6.5', uk: '6.0', cm: '24.5 см' },
    { eu: '40', us: '7.0', uk: '6.5', cm: '25.0 см' },
    { eu: '40 2/3', us: '7.5', uk: '7.0', cm: '25.5 см' },
    { eu: '41 1/3', us: '8.0', uk: '7.5', cm: '26.0 см' },
    { eu: '42', us: '8.5', uk: '8.0', cm: '26.5 см' },
    { eu: '42 2/3', us: '9.0', uk: '8.5', cm: '27.0 см' },
    { eu: '43 1/3', us: '9.5', uk: '9.0', cm: '27.5 см' },
    { eu: '44', us: '10.0', uk: '9.5', cm: '28.0 см' },
    { eu: '44 2/3', us: '10.5', uk: '10.0', cm: '28.5 см' },
    { eu: '45 1/3', us: '11.0', uk: '10.5', cm: '29.0 см' },
  ],
  'New Balance': [
    { eu: '38.5', us: '6.0', uk: '5.5', cm: '24.0 см' },
    { eu: '39.5', us: '6.5', uk: '6.0', cm: '24.5 см' },
    { eu: '40', us: '7.0', uk: '6.5', cm: '25.0 см' },
    { eu: '40.5', us: '7.5', uk: '7.0', cm: '25.5 см' },
    { eu: '41.5', us: '8.0', uk: '7.5', cm: '26.0 см' },
    { eu: '42', us: '8.5', uk: '8.0', cm: '26.5 см' },
    { eu: '42.5', us: '9.0', uk: '8.5', cm: '27.0 см' },
    { eu: '43', us: '9.5', uk: '9.0', cm: '27.5 см' },
    { eu: '44', us: '10.0', uk: '9.5', cm: '28.0 см' },
    { eu: '44.5', us: '10.5', uk: '10.0', cm: '28.5 см' },
    { eu: '45', us: '11.0', uk: '10.5', cm: '29.0 см' },
  ],
  Jordan: [
    { eu: '38.5', us: '6.0', uk: '5.5', cm: '24.0 см' },
    { eu: '40', us: '7.0', uk: '6.0', cm: '25.0 см' },
    { eu: '40.5', us: '7.5', uk: '6.5', cm: '25.5 см' },
    { eu: '41', us: '8.0', uk: '7.0', cm: '26.0 см' },
    { eu: '42', us: '8.5', uk: '7.5', cm: '26.5 см' },
    { eu: '42.5', us: '9.0', uk: '8.0', cm: '27.0 см' },
    { eu: '43', us: '9.5', uk: '8.5', cm: '27.5 см' },
    { eu: '44', us: '10.0', uk: '9.0', cm: '28.0 см' },
    { eu: '44.5', us: '10.5', uk: '9.5', cm: '28.5 см' },
    { eu: '45', us: '11.0', uk: '10.0', cm: '29.0 см' },
  ],
};

const CLOTHING_DATA = [
  { intl: 'XS', chest: '82–88 см', waist: '68–74 см', height: '165–170 см' },
  { intl: 'S', chest: '88–96 см', waist: '74–82 см', height: '170–175 см' },
  { intl: 'M', chest: '96–104 см', waist: '82–89 см', height: '175–180 см' },
  { intl: 'L', chest: '104–112 см', waist: '89–97 см', height: '180–185 см' },
  { intl: 'XL', chest: '112–124 см', waist: '97–109 см', height: '185–190 см' },
  { intl: 'XXL', chest: '124–136 см', waist: '109–121 см', height: '190–195 см' },
];

export function SizeTablesModal({ isOpen, onClose, onSelectSize }: SizeTablesModalProps) {
  const [category, setCategory] = useState<'shoes' | 'clothing'>('shoes');
  const [activeBrand, setActiveBrand] = useState('Nike');

  if (!isOpen) return null;

  const currentShoes = SHOES_DATA[activeBrand] || SHOES_DATA.Nike;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="bg-[#0e1422] border border-white/15 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Шапка */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Таблица соответствия размеров</h2>
              <p className="text-[10px] text-white/50">EU, US, UK и сантиметры (Poizon / Dewu)</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1 rounded-full bg-white/5 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Переключатель Обувь / Одежда */}
        <div className="p-3 border-b border-white/5">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCategory('shoes');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                category === 'shoes'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              👟 Обувь
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setCategory('clothing');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                category === 'clothing'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              👕 Одежда
            </button>
          </div>
        </div>

        {/* Выбор бренда для обуви */}
        {category === 'shoes' && (
          <div className="px-3 pt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {BRANDS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setActiveBrand(b);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium border whitespace-nowrap transition-all ${
                  activeBrand === b
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        )}

        {/* Таблица */}
        <div className="p-3 overflow-y-auto flex-1">
          {category === 'shoes' ? (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 bg-white/10 p-2.5 text-[10px] font-bold text-white/50 text-center uppercase tracking-wider">
                <span>EU</span>
                <span>US</span>
                <span>UK</span>
                <span>Стопа (CM)</span>
              </div>
              <div className="divide-y divide-white/5">
                {currentShoes.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectSize) {
                        triggerHaptic('success');
                        onSelectSize(`${item.eu} EU (${item.cm})`);
                        onClose();
                      }
                    }}
                    className={`grid grid-cols-4 p-2.5 text-xs text-center items-center transition-colors ${
                      onSelectSize ? 'hover:bg-cyan-500/10 cursor-pointer active:bg-cyan-500/20' : ''
                    }`}
                  >
                    <span className="font-bold text-cyan-400 font-mono">{item.eu}</span>
                    <span className="text-white/70 font-mono">{item.us}</span>
                    <span className="text-white/70 font-mono">{item.uk}</span>
                    <span className="text-white/90 font-mono">{item.cm}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 bg-white/10 p-2.5 text-[10px] font-bold text-white/50 text-center uppercase tracking-wider">
                <span>Размер</span>
                <span>Грудь</span>
                <span>Талия</span>
                <span>Рост</span>
              </div>
              <div className="divide-y divide-white/5">
                {CLOTHING_DATA.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectSize) {
                        triggerHaptic('success');
                        onSelectSize(item.intl);
                        onClose();
                      }
                    }}
                    className={`grid grid-cols-4 p-2.5 text-xs text-center items-center transition-colors ${
                      onSelectSize ? 'hover:bg-cyan-500/10 cursor-pointer active:bg-cyan-500/20' : ''
                    }`}
                  >
                    <span className="font-bold text-cyan-400 font-mono">{item.intl}</span>
                    <span className="text-white/70 text-[11px]">{item.chest}</span>
                    <span className="text-white/70 text-[11px]">{item.waist}</span>
                    <span className="text-white/90 text-[11px]">{item.height}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {onSelectSize && (
            <p className="text-[10px] text-white/40 text-center mt-2">
              Нажмите на строку нужного размера, чтобы применить его к заказу
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
