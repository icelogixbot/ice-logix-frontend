'use client';

import React from 'react';
import { triggerHaptic } from '@/lib/telegram';
import { X, DollarSign, CreditCard, ShieldAlert, Sparkles, Building2, Smartphone } from 'lucide-react';

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RATES = [
  { flag: '🇨🇳', name: 'Китайский юань', pair: '1 CNY', byn: '~0.465 BYN' },
  { flag: '🇪🇺', name: 'Евро', pair: '1 EUR', byn: '~3.55 BYN' },
  { flag: '🇺🇸', name: 'Доллар США', pair: '1 USD', byn: '~3.25 BYN' },
  { flag: '🇷🇺', name: 'Российский рубль', pair: '100 RUB', byn: '~3.55 BYN' },
];

export function CurrencyModal({ isOpen, onClose }: CurrencyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-[#0e1422] border border-white/15 w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5">
        {/* Шапка */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Курсы валют и Оплата</h2>
              <p className="text-[10px] text-white/50">Расчетный курс выкупа заказов</p>
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

        {/* Контент */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Сетка курсов */}
          <div className="space-y-1.5">
            <p className="text-xs text-white/60 font-medium">Актуальные курсы конвертации:</p>
            <div className="grid grid-cols-2 gap-2">
              {RATES.map((r) => (
                <div
                  key={r.pair}
                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="text-base">{r.flag}</span>
                    <span className="text-xs font-semibold text-white">{r.pair}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-300">{r.byn}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Способы оплаты */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <p className="text-xs text-white/60 font-medium">Способы оплаты в Беларуси:</p>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start space-x-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-white">ЕРИП (Расчет)</h4>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Без комиссии из любого банка Беларуси (Альфа, МТБанк, Беларусбанк и др.).
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start space-x-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-white">Белкарт / Visa / Mastercard</h4>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Онлайн-оплата картой через безопасный шлюз bePaid.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start space-x-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-white">USDT (Криптовалюта)</h4>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    TRC-20 перевод для международных и крупных заказов.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Информационная плашка */}
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-cyan-200/90 leading-relaxed">
              Курс фиксируется в момент внесения предоплаты 70%. Колебания валют в процессе доставки не влияют на остаток к оплате.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
