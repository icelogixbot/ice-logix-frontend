// ============================================================
// ICE LOGIX: Browser Landing Gate Controller
// Detects Telegram WebApp environment & redirects external web traffic
// ============================================================

(function () {
  'use strict';

  function isTelegramContext() {
    try {
      const params = new URLSearchParams(window.location.search);

      // 1. Developer & Local Preview Mode bypass
      if (params.has('preview') || params.has('dev')) {
        return true;
      }
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return true;
      }

      // 2. Telegram WebApp Environment Checks
      // When inside Telegram, initData is a non-empty signed string
      const tgInitData = window.Telegram?.WebApp?.initData;
      if (typeof tgInitData === 'string' && tgInitData.length > 0) {
        return true;
      }

      // Check Telegram hash parameters (#tgWebAppData=... or #tgWebAppPlatform=...)
      const hash = window.location.hash || '';
      if (hash.includes('tgWebAppData=') || hash.includes('tgWebAppPlatform=')) {
        return true;
      }

      // Check direct launch param from Telegram
      if (params.has('tgWebAppStartParam')) {
        return true;
      }

      // If Telegram.WebApp exists and platform is known (not unknown / web preview)
      const platform = window.Telegram?.WebApp?.platform;
      if (platform && platform !== 'unknown' && platform !== '') {
        // Double check if initData exists or will exist
        if (typeof tgInitData === 'string' && tgInitData.length > 0) {
          return true;
        }
      }

      return false;
    } catch (e) {
      console.warn('[ICE LOGIX Gate] Context check fallback:', e);
      return false;
    }
  }

  const isTelegram = isTelegramContext();
  window.isTelegramEnvironment = isTelegram;

  if (!isTelegram) {
    // Flag document immediately to hide #app and show #browserLandingGate
    document.documentElement.classList.add('is-browser-gate');
    if (document.body) {
      document.body.classList.add('is-browser-gate');
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.classList.add('is-browser-gate');
      });
    }

    // Preserve any incoming deep-link or referral codes
    const urlParams = new URLSearchParams(window.location.search);
    let startParam = urlParams.get('start') || urlParams.get('startapp') || urlParams.get('ref') || '';
    if (startParam && !startParam.startsWith('ref_') && !startParam.startsWith('order_')) {
      startParam = 'ref_' + startParam;
    }

    const botUsername = 'icelogix_bot';
    const tgWebUrl = startParam
      ? `https://t.me/${botUsername}?start=${encodeURIComponent(startParam)}`
      : `https://t.me/${botUsername}`;
    const tgAppUrl = startParam
      ? `tg://resolve?domain=${botUsername}&start=${encodeURIComponent(startParam)}`
      : `tg://resolve?domain=${botUsername}`;

    function setupGateUI() {
      // 1. Hide Splash Screen smoothly
      if (typeof window.dismissSplashScreen === 'function') {
        window.dismissSplashScreen();
      } else {
        const splash = document.getElementById('iceSplashScreen');
        if (splash) {
          splash.style.opacity = '0';
          splash.style.pointerEvents = 'none';
          setTimeout(() => { try { splash.remove(); } catch (e) {} }, 300);
        }
      }

      // 2. Configure Main CTA Button
      const ctaBtn = document.getElementById('gateCtaBtn');
      if (ctaBtn) {
        ctaBtn.href = tgWebUrl;
        ctaBtn.addEventListener('click', function (e) {
          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          if (isMobile) {
            // Attempt protocol launch first, fall back to Web URL
            window.location.href = tgAppUrl;
            setTimeout(function () {
              window.location.href = tgWebUrl;
            }, 800);
            e.preventDefault();
          }
        });
      }

      // 3. Configure Desktop Link
      const desktopBtn = document.getElementById('gateDesktopBtn');
      if (desktopBtn) {
        desktopBtn.href = tgWebUrl;
      }

      // 4. Set QR Code source
      const qrImg = document.getElementById('gateQrCodeImg');
      if (qrImg) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(tgWebUrl)}&color=38bdf8&bgcolor=080d1a&margin=6`;
        qrImg.src = qrUrl;
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupGateUI);
    } else {
      setupGateUI();
    }
  }
})();
