'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { tgUtil } from '@/lib/telegram';

interface FortuneReward {
  text: string;
  type: 'ice' | 'promo' | 'delivery' | 'try_again';
  value: number | string | null;
  color: string;
  weight: number;
}

const REWARDS: FortuneReward[] = [
  { text: '5 ❄️ ICE', type: 'ice', value: 5, color: '#3b82f6', weight: 40 },
  { text: '10 ❄️ ICE', type: 'ice', value: 10, color: '#06b6d4', weight: 25 },
  { text: '20 ❄️ ICE', type: 'ice', value: 20, color: '#8b5cf6', weight: 10 },
  { text: 'Скидка 5%', type: 'promo', value: 'ICE5', color: '#ec4899', weight: 10 },
  { text: 'Скидка 10%', type: 'promo', value: 'ICE10', color: '#f59e0b', weight: 5 },
  { text: 'Доставка 0', type: 'delivery', value: 'FREE', color: '#10b981', weight: 5 },
  { text: 'Повезет завтра', type: 'try_again', value: null, color: '#64748b', weight: 5 },
];

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FortuneWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardWon?: (reward: FortuneReward) => void;
}

export function FortuneWheelModal({ isOpen, onClose, onRewardWon }: FortuneWheelModalProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [wonReward, setWonReward] = useState<FortuneReward | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Check cooldown on mount and when modal opens
  const checkCooldown = useCallback(() => {
    if (typeof window === 'undefined') return 0;
    const lastSpinStr = localStorage.getItem('ice_fortune_last_spin');
    if (!lastSpinStr) return 0;
    const elapsed = Date.now() - parseInt(lastSpinStr, 10);
    return Math.max(0, COOLDOWN_MS - elapsed);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const cd = checkCooldown();
      setCooldownRemaining(cd);
      setWonReward(null);
      setCopied(false);
    }
  }, [isOpen, checkCooldown]);

  // Interval ticker for cooldown countdown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const formatCooldown = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Draw the wheel onto the HTML5 Canvas
  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    const radius = size / 2;
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(rotation);

    const N = REWARDS.length;
    const segmentAngle = (2 * Math.PI) / N;

    for (let i = 0; i < N; i++) {
      const r = REWARDS[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 10, i * segmentAngle, (i + 1) * segmentAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, r.color);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.rotate(i * segmentAngle + segmentAngle / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(r.text, radius - 24, 0);
      ctx.restore();
    }

    ctx.restore();

    // Center decorative pin
    ctx.beginPath();
    ctx.arc(radius, radius, 24, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(radius, radius, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // Indicator pointer arrow at the top
    ctx.beginPath();
    ctx.moveTo(radius - 12, 10);
    ctx.lineTo(radius + 12, 10);
    ctx.lineTo(radius, 28);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (isOpen) {
      drawWheel(currentRotation);
    }
  }, [isOpen, currentRotation, drawWheel]);

  // Spin execution
  const spin = () => {
    if (spinning || cooldownRemaining > 0) return;

    tgUtil.haptic('impact');
    setSpinning(true);
    setWonReward(null);

    // Pick target reward according to weights
    const totalWeight = REWARDS.reduce((sum, r) => sum + r.weight, 0);
    const rand = Math.random() * totalWeight;
    let sum = 0;
    let targetIndex = 0;
    for (let i = 0; i < REWARDS.length; i++) {
      sum += REWARDS[i].weight;
      if (rand <= sum) {
        targetIndex = i;
        break;
      }
    }

    const selectedReward = REWARDS[targetIndex];
    const N = REWARDS.length;
    const segmentAngle = (2 * Math.PI) / N;

    // Arrow is at the top (angle 1.5 * PI = 270 deg)
    const extraRounds = 8; // 8 full spins
    const targetOffset = (1.5 * Math.PI) - (targetIndex + 0.5) * segmentAngle;
    const totalRotation = currentRotation + (extraRounds * 2 * Math.PI) + ((targetOffset - (currentRotation % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI));

    const duration = 4500; // ms
    const startTime = performance.now();
    const startRotation = currentRotation;
    let lastHapticSegment = -1;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newRotation = startRotation + (totalRotation - startRotation) * easeOut;

      setCurrentRotation(newRotation);
      drawWheel(newRotation);

      // Tick haptic on each segment boundary
      const currentSegment = Math.floor((newRotation / segmentAngle) % N);
      if (currentSegment !== lastHapticSegment) {
        lastHapticSegment = currentSegment;
        tgUtil.haptic('selection');
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setWonReward(selectedReward);
        tgUtil.haptic('notification');

        // Set cooldown timestamp
        if (typeof window !== 'undefined') {
          localStorage.setItem('ice_fortune_last_spin', Date.now().toString());
          setCooldownRemaining(COOLDOWN_MS);
        }

        if (onRewardWon) {
          onRewardWon(selectedReward);
        }
      }
    };

    requestAnimationFrame(animate);
  };

  const copyPromo = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      tgUtil.haptic('light');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl p-6 text-center border border-white/15 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-blue-950/95 shadow-2xl overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute -left-16 -top-16 w-44 h-44 rounded-full blur-3xl bg-cyan-500/20 pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-44 h-44 rounded-full blur-3xl bg-purple-500/20 pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {t('fortune_modal_title')}
          </h3>
          {!spinning && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center text-lg transition"
            >
              ✕
            </button>
          )}
        </div>

        <p className="text-xs text-white/60 mb-4">
          {t('fortune_card_desc')}
        </p>

        {/* Canvas Wheel */}
        <div className="relative w-[300px] h-[300px] mx-auto my-2 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="w-[300px] h-[300px] drop-shadow-[0_0_20px_rgba(56,189,248,0.2)]"
          />
        </div>

        {/* Won State Celebration Card */}
        {wonReward && (
          <div className="mt-3 p-4 rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-cyan-950/80 to-blue-900/80 animate-fade-in">
            <div className="text-2xl mb-1">🎉</div>
            <h4 className="text-sm font-bold text-white mb-1">
              {t('fortune_win_title')}
            </h4>
            <p className="text-xs text-cyan-200 font-semibold mb-2">
              {wonReward.type === 'ice' && `${t('fortune_win_ice')} (+${wonReward.value} ❄️)`}
              {wonReward.type === 'promo' && `${t('fortune_win_promo')} ${wonReward.value}`}
              {wonReward.type === 'delivery' && `${t('fortune_win_delivery')} ${wonReward.value}`}
              {wonReward.type === 'try_again' && t('fortune_win_again')}
            </p>

            {wonReward.type !== 'try_again' && typeof wonReward.value === 'string' && (
              <button
                onClick={() => copyPromo(wonReward.value as string)}
                className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md"
              >
                {copied ? t('fortune_btn_copied') : `${t('fortune_copy_code')} (${wonReward.value})`}
              </button>
            )}
          </div>
        )}

        {/* Cooldown or Spin Button */}
        <div className="mt-4 relative z-10">
          {cooldownRemaining > 0 && !spinning ? (
            <div className="py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-xs">
              <span className="block font-medium mb-1">{t('fortune_cooldown')}</span>
              <span className="font-mono text-cyan-400 font-bold text-sm tracking-wider">
                {formatCooldown(cooldownRemaining)}
              </span>
            </div>
          ) : (
            <button
              onClick={spin}
              disabled={spinning}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 ${
                spinning
                  ? 'bg-slate-700/60 text-white/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:shadow-cyan-500/25 shadow-cyan-500/15'
              }`}
            >
              {spinning ? t('fortune_spinning') : t('fortune_spin_btn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
