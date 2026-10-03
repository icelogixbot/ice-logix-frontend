'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { tgUtil } from '@/lib/telegram';
import { trackBlobUrl, clearBlobUrls } from '@/lib/photo-previews';

export interface CustomerReview {
  id: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  platform: 'poizon' | '1688' | 'taobao';
  itemTitle: string;
  comment: string;
  photoUrl?: string;
  isVerified: boolean;
}

const INITIAL_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    author: 'Максим К.',
    city: 'Минск',
    rating: 5,
    date: '2 дня назад',
    platform: 'poizon',
    itemTitle: 'Nike Dunk Low Retro White Black (Panda)',
    comment: 'Заказ пришел в Минск за 13 дней через Европочту. Коробка целая, все бирки и пломбы Poizon на месте, QR-код сертификата бьется в приложении Dewu. Спасибо команде ICE LOGIX за выкуп!',
    photoUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=80',
    isVerified: true,
  },
  {
    id: 'rev-2',
    author: 'Алина В.',
    city: 'Гродно',
    rating: 5,
    date: '5 дней назад',
    platform: '1688',
    itemTitle: 'Пуховик оверсайз укороченный',
    comment: 'Выкупали партию курток с фабрики на 1688. Менеджер помог уточнить размерную сетку у китайского продавца, прислали подробные замеры. Качество пуха супер, буду заказывать еще.',
    photoUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=500&auto=format&fit=crop&q=80',
    isVerified: true,
  },
  {
    id: 'rev-3',
    author: 'Артем Д.',
    city: 'Брест',
    rating: 5,
    date: '1 неделя назад',
    platform: 'poizon',
    itemTitle: 'New Balance 1906R Silver Metallic',
    comment: 'Отличный сервис. Оплачивал через ЕРИП без комиссии с карты Беларусбанка. Доставили прямо в пункт выдачи, трек отслеживался на всех этапах.',
    photoUrl: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&auto=format&fit=crop&q=80',
    isVerified: true,
  },
  {
    id: 'rev-4',
    author: 'Евгений С.',
    city: 'Гомель',
    rating: 5,
    date: '2 недели назад',
    platform: 'taobao',
    itemTitle: 'Худи Stussy Basic Logo Black',
    comment: 'Оригинальный худи, плотный хлопок, строчки ровные. Доставка получилась дешевле, чем ожидал. Рекомендую!',
    isVerified: true,
  },
];

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewsModal({ isOpen, onClose }: ReviewsModalProps) {
  const { t } = useI18n();

  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // New review form fields
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [city, setCity] = useState('Минск');
  const [itemTitle, setItemTitle] = useState('');
  const [platform, setPlatform] = useState<'poizon' | '1688' | 'taobao'>('poizon');
  const [comment, setComment] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Clean up blob URLs safely when modal closes
  useEffect(() => {
    return () => {
      clearBlobUrls('review:');
    };
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = trackBlobUrl('review:photo', file);
    setPhotoPreview(url);
    tgUtil.haptic('selection');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    tgUtil.haptic('impact');

    setTimeout(() => {
      const newReview: CustomerReview = {
        id: `rev-${Date.now()}`,
        author: name.trim() || 'Покупатель',
        city: city.trim() || 'Беларусь',
        rating,
        date: 'Только что',
        platform,
        itemTitle: itemTitle.trim() || 'Товар из Китая',
        comment: comment.trim(),
        photoUrl: photoPreview || undefined,
        isVerified: true,
      };

      setReviews((prev) => [newReview, ...prev]);
      setIsSubmitting(false);
      setSubmitSuccess(true);
      tgUtil.haptic('notification');

      setTimeout(() => {
        setSubmitSuccess(false);
        setIsFormOpen(false);
        setComment('');
        setItemTitle('');
        setPhotoPreview(null);
        clearBlobUrls('review:');
      }, 1500);
    }, 600);
  };

  const filteredReviews = filterPlatform === 'all'
    ? reviews
    : reviews.filter((r) => r.platform === filterPlatform);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 sticky top-0 z-20">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              <span>⭐️</span> {t('reviews_title')}
            </h3>
            <p className="text-[11px] text-white/50">
              {t('reviews_subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Action Bar & Stats */}
        <div className="p-4 bg-slate-900/30 border-b border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-black text-amber-400">4.95</div>
            <div className="text-[10px] text-white/60 leading-tight">
              <div className="text-amber-400 font-bold">★★★★★</div>
              <div>380+ отзывов в РБ</div>
            </div>
          </div>

          <button
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              tgUtil.haptic('selection');
            }}
            className="py-2 px-3.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold text-xs transition active:scale-95 flex items-center gap-1.5"
          >
            <span>✍️</span> {isFormOpen ? 'К отзывам' : t('reviews_leave_btn')}
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {isFormOpen ? (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
              <h4 className="text-sm font-bold text-white mb-2">
                {t('reviews_modal_title')}
              </h4>

              {/* Star Rating Selector */}
              <div>
                <label className="text-[11px] text-white/60 block mb-1">
                  {t('reviews_rating_label')}
                </label>
                <div className="flex items-center gap-1 text-2xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => {
                        setRating(star);
                        tgUtil.haptic('selection');
                      }}
                      className={`transition-transform active:scale-125 ${
                        star <= rating ? 'text-amber-400' : 'text-white/20'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Author & City */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    placeholder="Ваше имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Город (Минск...)"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Product and Platform */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Название товара (Nike Dunk, худи...)"
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as any)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="poizon">Poizon</option>
                    <option value="1688">1688</option>
                    <option value="taobao">Taobao</option>
                  </select>
                </div>
              </div>

              {/* Comment */}
              <div>
                <textarea
                  rows={3}
                  placeholder={t('reviews_comment_placeholder')}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  className="w-full bg-slate-800/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="text-[11px] text-white/60 block mb-1">
                  {t('reviews_photo_label')}
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition">
                    <span>📷</span> Выбрать фото
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                  {photoPreview && (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-cyan-400/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              {submitSuccess ? (
                <div className="py-2.5 px-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold text-center">
                  {t('reviews_success')}
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !comment.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  {isSubmitting ? t('reviews_submitting') : t('reviews_submit_btn')}
                </button>
              )}
            </form>
          ) : (
            /* Reviews Feed */
            <>
              {/* Filter chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'Все отзывы' },
                  { id: 'poizon', label: 'Poizon 👟' },
                  { id: '1688', label: '1688 📦' },
                  { id: 'taobao', label: 'Taobao 🛍️' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => {
                      setFilterPlatform(chip.id);
                      tgUtil.haptic('selection');
                    }}
                    className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                      filterPlatform === chip.id
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-white/70'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {filteredReviews.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-xs">
                  {t('reviews_empty')}
                </div>
              ) : (
                filteredReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{rev.author}</span>
                          <span className="text-[10px] text-white/40 font-normal">({rev.city})</span>
                          {rev.isVerified && (
                            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded-full font-semibold">
                              ✓ {t('reviews_verified')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="text-amber-400 text-xs">
                            {'★'.repeat(rev.rating)}
                          </div>
                          <span className="text-[10px] text-white/40">{rev.date}</span>
                        </div>
                      </div>

                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-400/20">
                        {rev.platform}
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-cyan-200/90">
                      {rev.itemTitle}
                    </p>

                    <p className="text-xs text-white/80 leading-relaxed">
                      {rev.comment}
                    </p>

                    {rev.photoUrl && (
                      <div className="pt-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={rev.photoUrl}
                          alt="Customer order"
                          className="h-24 rounded-xl object-cover border border-white/10 hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
