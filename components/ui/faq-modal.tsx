'use client';

import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { tgUtil } from '@/lib/telegram';

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FaqModal({ isOpen, onClose }: FaqModalProps) {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    { q: t('faq_q1'), a: t('faq_a1') },
    { q: t('faq_q2'), a: t('faq_a2') },
    { q: t('faq_q3'), a: t('faq_a3') },
    { q: t('faq_q4'), a: t('faq_a4') },
    { q: t('faq_q5'), a: t('faq_a5') },
  ];

  const handleToggle = (index: number) => {
    tgUtil.haptic('selection');
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    tgUtil.haptic('impact');
    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink('https://t.me/ice_logix_support');
      } else {
        window.open('https://t.me/ice_logix_support', '_blank');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 sticky top-0 z-20">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <span>❓</span> {t('faq_title')}
            </h3>
            <p className="text-[11px] text-white/50">
              {t('faq_subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Accordion List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {faqs.map((item, index) => {
            const isOpenItem = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => handleToggle(index)}
                  className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-bold text-white hover:text-cyan-300 transition"
                >
                  <span className="flex-1">{item.q}</span>
                  <span className={`text-cyan-400 text-sm transition-transform duration-200 ${isOpenItem ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {isOpenItem && (
                  <div className="px-3.5 pb-3.5 text-xs text-white/75 leading-relaxed border-t border-white/5 whitespace-pre-line animate-fade-in">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Support Button */}
        <div className="p-4 border-t border-white/10 bg-slate-900/40">
          <button
            onClick={handleContactSupport}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
          >
            <span>💬</span> {t('faq_support_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
