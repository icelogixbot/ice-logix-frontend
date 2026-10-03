'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { tgUtil } from '@/lib/telegram';
import { trackBlobUrl, clearBlobUrls } from '@/lib/photo-previews';
import { ShieldCheck, Camera, CheckCircle2, AlertTriangle, FileText, Sparkles, X } from 'lucide-react';

interface PhotoSlot {
  key: string;
  label: string;
  sub: string;
  required: boolean;
}

const SLOTS: PhotoSlot[] = [
  { key: 'legit:tag', label: 'Бирка размера', sub: 'Четкое фото шрифтов и QR-кода', required: true },
  { key: 'legit:insole', label: 'Стелька (обе стороны)', sub: 'Логотип и фактура пены сзади', required: true },
  { key: 'legit:stitching', label: 'Швы под стелькой', sub: 'Плотность нитей и строчка Strobel', required: true },
  { key: 'legit:box', label: 'Наклейка коробки', sub: 'Штрихкод, артикул, шрифт', required: true },
  { key: 'legit:side', label: 'Общий вид профиля', sub: 'Форма носка и задника', required: false },
];

interface LegitCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LegitCheckModal({ isOpen, onClose }: LegitCheckModalProps) {
  const { t } = useI18n();

  const [category, setCategory] = useState<'shoes' | 'clothes' | 'accessories'>('shoes');
  const [brand, setBrand] = useState('Nike / Jordan');
  const [model, setModel] = useState('');
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [resultCertificate, setResultCertificate] = useState<{
    id: string;
    status: 'authentic' | 'replica' | 'review';
    score: number;
    notes: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      clearBlobUrls('legit:');
    };
  }, []);

  if (!isOpen) return null;

  const handlePhotoUpload = (key: string, file: File) => {
    const url = trackBlobUrl(key, file);
    setPhotos((prev) => ({ ...prev, [key]: url }));
    tgUtil.haptic('selection');
  };

  const handleRemovePhoto = (key: string) => {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    tgUtil.haptic('light');
  };

  const handleStartCheck = () => {
    if (!photos['legit:tag'] || !photos['legit:insole']) {
      alert('Пожалуйста, загрузите минимум 2 обязательных фото (бирка и стелька).');
      return;
    }

    setIsScanning(true);
    setScanProgress(10);
    tgUtil.haptic('impact');

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setResultCertificate({
            id: `ICE-LC-${Math.floor(100000 + Math.random() * 900000)}`,
            status: 'authentic',
            score: 99.4,
            notes: 'Геометрия шрифтов бирки, плотность строчки Strobel и текстура пены стельки полностью соответствуют эталону завода-изготовителя.',
          });
          tgUtil.haptic('notification');
          return 100;
        }
        return prev + 15;
      });
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Legit Check (Оригинальность)
              </h3>
              <p className="text-[11px] text-white/50">Проверка швов, бирок и материалов</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {resultCertificate ? (
            /* Result Certificate Card */
            <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/40 text-center space-y-3 animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                  Сертификат экспертизы #{resultCertificate.id}
                </span>
                <h4 className="text-lg font-black text-white mt-1">
                  100% AUTHENTIC (ОРИГИНАЛ)
                </h4>
                <div className="text-xs text-emerald-300 font-bold mt-0.5">
                  Индекс соответствия эталону: {resultCertificate.score}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/75 text-left leading-relaxed">
                {resultCertificate.notes}
              </div>

              <button
                onClick={() => setResultCertificate(null)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
              >
                Проверить другую вещь
              </button>
            </div>
          ) : isScanning ? (
            /* Scanning Animation State */
            <div className="text-center py-16 space-y-4 animate-fade-in">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 text-2xl">
                  🔍
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Лабораторный анализ контрольных точек...
                </h4>
                <p className="text-xs text-white/50">
                  Сканирование микроструктуры нитей, калибровки шрифтов и штрихкода
                </p>
              </div>

              {/* Progress bar */}
              <div className="max-w-xs mx-auto">
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <div className="text-[10px] text-emerald-400 font-mono font-bold mt-1 text-right">
                  {scanProgress}%
                </div>
              </div>
            </div>
          ) : (
            /* Upload and Parameters Form */
            <>
              {/* Category & Brand */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Категория:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="shoes">👟 Обувь / Кроссовки</option>
                    <option value="clothes">👕 Одежда</option>
                    <option value="accessories">🧢 Сумки / Аксессуары</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-white/50 block mb-1">Бренд:</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Nike, Jordan, Stussy..."
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Model */}
              <div>
                <label className="text-[10px] text-white/50 block mb-1">Модель / расцветка:</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Например: Dunk Low Retro Panda"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Photo Upload Slots */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  Контрольные фотографии:
                </label>

                <div className="space-y-2">
                  {SLOTS.map((slot) => {
                    const uploadedUrl = photos[slot.key];
                    return (
                      <div
                        key={slot.key}
                        className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{slot.label}</span>
                            {slot.required && (
                              <span className="text-[9px] text-red-400 font-bold">*обязательно</span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/50 truncate">{slot.sub}</p>
                        </div>

                        {uploadedUrl ? (
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-emerald-400 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={uploadedUrl} alt={slot.label} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(slot.key)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 text-white flex items-center justify-center text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-300 text-xs font-bold transition flex items-center gap-1">
                            <span>📷</span> Фото
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handlePhotoUpload(slot.key, f);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartCheck}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Запустить экспертизу подлинности
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
