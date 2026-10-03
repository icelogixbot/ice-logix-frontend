'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/lib/api';
import { triggerHaptic } from '@/lib/telegram';
import {
  User,
  Award,
  Sparkles,
  Users,
  Copy,
  ExternalLink,
  MessageCircleQuestion,
  ShieldAlert,
  Check,
  Globe,
} from 'lucide-react';
import { StoriesModal } from '@/components/ui/stories-modal';
import { useI18n } from '@/lib/i18n/context';

interface ProfileViewProps {
  userProfile: UserProfile | null;
  onOpenFortune?: () => void;
  onOpenReviews?: () => void;
  onOpenFaq?: () => void;
  onOpenAdmin?: () => void;
}

export function ProfileView({
  userProfile,
  onOpenFortune,
  onOpenReviews,
  onOpenFaq,
  onOpenAdmin,
}: ProfileViewProps) {
  const { lang, setLang, t, languages } = useI18n();
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStoriesOpen, setIsStoriesOpen] = useState(false);
  const [adminTapCount, setAdminTapCount] = useState(0);

  const levelInfo = {
    newbie: {
      label: 'Newbie',
      discount: '0%',
      next: 'Shopper (-10%)',
      targetOrders: 5,
      color: 'from-gray-500/20 to-slate-500/10 border-white/20 text-white/80',
    },
    shopper: {
      label: 'Shopper',
      discount: '10%',
      next: 'VIP (-20%)',
      targetOrders: 15,
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300',
    },
    vip: {
      label: 'VIP',
      discount: '20%',
      next: 'Максимальный уровень',
      targetOrders: 15,
      color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300',
    },
  }[userProfile?.client_level || 'newbie'];

  const ordersCount = userProfile?.orders_count || 0;
  const progressPercent = Math.min(100, Math.round((ordersCount / levelInfo.targetOrders) * 100));

  const refCode = userProfile?.referral_code || (userProfile?.user_id ? String(userProfile.user_id) : 'ICE');
  const refLink = `https://t.me/ice_logix_bot?start=ref_${refCode}`;

  const handleCopyRef = () => {
    triggerHaptic('success');
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(refLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Шапка профиля */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-cyan-500/20">
          {userProfile?.full_name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-white leading-tight">
              {userProfile?.full_name || 'Гость'}
            </h2>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border bg-gradient-to-r ${levelInfo.color}`}
            >
              {levelInfo.label}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {userProfile?.username ? `@${userProfile.username}` : `ID: ${userProfile?.user_id || '—'}`}
          </p>
        </div>
      </div>

      {/* Баланс ICE токенов */}
      <div className="bg-gradient-to-r from-cyan-950/60 to-blue-950/40 border border-cyan-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-300 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t('profile_balance_title', 'Бонусный баланс ICE')}
            </span>
            <span className="text-[10px] text-white/50 bg-white/10 px-2 py-0.5 rounded-md">
              {t('profile_balance_rate', '1 ICE = 1 BYN')}
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black font-mono text-cyan-400">
              {userProfile ? userProfile.ices_balance.toFixed(2) : '0.00'}
            </span>
            <span className="text-xs font-bold text-white/60">ICE</span>
          </div>
          <p className="text-[10px] text-white/40 mt-1">
            {t('profile_balance_sub', 'Начисляется кэшбэком за каждый заказ и за заказы приглашенных друзей')}
          </p>
        </div>
        <div className="absolute right-[-10px] bottom-[-20px] text-7xl opacity-10 pointer-events-none">
          🧊
        </div>
      </div>

      {/* Колесо Удачи Баннер */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('impact');
          onOpenFortune?.();
        }}
        className="w-full text-left bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-cyan-950/70 border border-purple-500/40 hover:border-purple-400/60 rounded-2xl p-4 relative overflow-hidden shadow-lg shadow-purple-950/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] group"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🔮</span>
              <h3 className="text-xs font-bold text-white group-hover:text-purple-200 transition">
                {t('fortune_card_title', 'Колесо Удачи')}
              </h3>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse">
                Каждые 24ч
              </span>
            </div>
            <p className="text-[11px] text-white/60 line-clamp-1">
              {t('fortune_card_desc', 'Испытайте удачу раз в 24ч: выигрывайте ICE, скидки и доставку!')}
            </p>
          </div>
          <span className="py-1.5 px-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-md shadow-purple-500/25 transition">
            Вращать
          </span>
        </div>
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-xl bg-purple-500/20 pointer-events-none" />
      </button>

      {/* Уровень лояльности и скидка */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-white font-medium">{t('profile_loyalty_title', 'Программа лояльности')}</span>
          </div>
          <span className="text-xs font-bold text-cyan-400 font-mono">
            {t('profile_loyalty_discount', 'Скидка')} {levelInfo.discount}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-white/50">
            <span>{t('profile_orders_done', 'Выполнено заказов:')} {ordersCount}</span>
            <span>{t('profile_orders_target', 'Цель:')} {levelInfo.targetOrders}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-white/40 text-right mt-1">
            {t('profile_next_status', 'Следующий статус:')} {levelInfo.next}
          </p>
        </div>
      </div>

      {/* Реферальная программа */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center space-x-1.5">
          <Users className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs text-white font-bold">{t('profile_ref_title', 'Приглашай друзей — получай ICE')}</h3>
        </div>
        <p className="text-xs text-white/60 leading-relaxed">
          {t('profile_ref_desc', 'Отправьте ссылку другу: он получит скидку 10 BYN на первый заказ, а вы — 5% бонусами ICE с каждой его покупки.')}
        </p>

        {/* Статистика рефералов */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
            <span className="text-[10px] text-white/40 block">{t('profile_ref_invited', 'Приглашено друзей:')}</span>
            <span className="text-base font-bold font-mono text-white">
              {userProfile?.referral_count || 0}
            </span>
          </div>
          <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
            <span className="text-[10px] text-white/40 block">{t('profile_ref_earned', 'Заработано бонусов:')}</span>
            <span className="text-base font-bold font-mono text-cyan-400">
              {userProfile?.referral_bonus?.toFixed(2) || '0.00'} BYN
            </span>
          </div>
        </div>

        {/* Кнопка копирования ссылки */}
        <button
          onClick={handleCopyRef}
          className={`w-full py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
            copiedLink
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
          }`}
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Ссылка скопирована!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-cyan-400" />
              <span>Скопировать реферальную ссылку</span>
            </>
          )}
        </button>
      </div>

      {/* Переключатель языка интерфейса */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center space-x-1.5 text-xs text-white/70">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold">{t('profile_lang_label', 'Язык интерфейса:')}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`py-2 px-1 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 border transition-all ${
                lang === l.code
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Поддержка и правила */}
      <div className="space-y-1.5 pt-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsStoriesOpen(true);
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>О сервисе и Как делать заказы (Сторис)</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/10">Смотреть</span>
        </button>

        {/* Отзывы клиентов */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenReviews?.();
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm">⭐️</span>
            <span>{t('reviews_title', 'Отзывы клиентов')}</span>
          </div>
          <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded-md bg-amber-500/10">4.95 ★ (380+)</span>
        </button>

        {/* Часто задаваемые вопросы (FAQ) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenFaq?.();
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm">❓</span>
            <span>{t('faq_title', 'Часто задаваемые вопросы')}</span>
          </div>
          <span className="text-[10px] text-white/40">Ответы</span>
        </button>

        {/* Панель менеджера / администратора */}
        {(userProfile?.role === 'admin' || userProfile?.role === 'owner' || adminTapCount >= 5) && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('impact');
              onOpenAdmin?.();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-xs text-red-200 transition-colors shadow-sm"
          >
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="font-bold">{t('admin_btn_profile', 'В панель управления (Менеджер)')}</span>
            </div>
            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-mono">ADMIN</span>
          </button>
        )}

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              const next = adminTapCount + 1;
              setAdminTapCount(next);
              if (next === 5) {
                triggerHaptic('notification');
              } else {
                triggerHaptic('light');
              }
            }}
            className="text-[10px] text-white/30 hover:text-white/60 transition cursor-pointer"
          >
            ICE LOGIX v2.0 • Next.js & Go Edition {adminTapCount >= 5 ? '🔓 [Admin Mode Active]' : ''}
          </button>
        </div>
      </div>

      <StoriesModal
        isOpen={isStoriesOpen}
        onClose={() => setIsStoriesOpen(false)}
      />
    </div>
  );
}
