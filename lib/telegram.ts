// Интеграция с Telegram WebApp SDK

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          start_param?: string;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        ready: () => void;
        expand: () => void;
        close: () => void;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
          offClick: (fn: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          setText: (text: string) => void;
          onClick: (fn: () => void) => void;
          offClick: (fn: () => void) => void;
        };
      };
    };
  }
}

export function getTelegram() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function getTelegramInitData(): string {
  const tg = getTelegram();
  return tg?.initData || '';
}

export function getTelegramUser() {
  const tg = getTelegram();
  return tg?.initDataUnsafe?.user || null;
}

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification' | 'success' | 'error';

export function triggerHaptic(style: HapticType = 'light') {
  tgUtil.haptic(style);
}


type ButtonHandler = () => void;

interface MainButtonOptions {
  text?: string;
  onClick?: ButtonHandler;
  color?: string;
  textColor?: string;
  isLoading?: boolean;
}

class TelegramManager {
  private _bbHandler: ButtonHandler | null = null;
  private _mbHandler: ButtonHandler | null = null;

  get _tg() {
    return getTelegram();
  }

  haptic(style: HapticType = 'light') {
    const tg = this._tg;
    if (!tg?.HapticFeedback) return;
    try {
      if (style === 'selection') {
        tg.HapticFeedback.selectionChanged();
      } else if (style === 'success' || style === 'error') {
        tg.HapticFeedback.notificationOccurred(style);
      } else if (style === 'notification') {
        tg.HapticFeedback.notificationOccurred('success');
      } else if (style === 'impact') {
        tg.HapticFeedback.impactOccurred('medium');
      } else {
        tg.HapticFeedback.impactOccurred(style as any);
      }
    } catch {}
  }

  setBackButton(handler: ButtonHandler | null) {
    const bb = this._tg?.BackButton;
    if (!bb) return;
    try {
      if (this._bbHandler) bb.offClick(this._bbHandler);
      this._bbHandler = null;
      if (handler) {
        this._bbHandler = handler;
        bb.onClick(handler);
        bb.show();
      } else {
        bb.hide();
      }
    } catch {}
  }

  setMainButton({ text, onClick, color, textColor, isLoading }: MainButtonOptions = {}) {
    const mb = this._tg?.MainButton;
    if (!mb) return;
    try {
      if (this._mbHandler) mb.offClick(this._mbHandler);
      this._mbHandler = null;
      if (!text || !onClick) {
        mb.hide();
        return;
      }
      mb.setText(text);
      if (color) mb.color = color;
      if (textColor) mb.textColor = textColor;
      if (isLoading) mb.showProgress(false);
      else mb.hideProgress();
      this._mbHandler = onClick;
      mb.onClick(onClick);
      mb.enable();
      mb.show();
    } catch {}
  }

  hideMainButton() {
    const mb = this._tg?.MainButton;
    try {
      mb?.hide();
      if (this._mbHandler && mb) mb.offClick(this._mbHandler);
      this._mbHandler = null;
    } catch {}
  }
}

export const tgUtil = new TelegramManager();
