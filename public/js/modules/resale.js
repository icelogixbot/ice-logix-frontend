// ============================================================
// ICE LOGIX Module: ICE Resale & Group Delivery
// ============================================================
// ==================== ФАЗА 18: ICE Resale и Совместная доставка ====================

window.publishToResale = async (orderId, orderTitle) => {
  if (typeof tgUtil !== 'undefined' && tgUtil.alert) {
    tgUtil.alert('Раздел "Наличие" (ICE Resale) находится в разработке. Возможность публикации вещей откроется в ближайших обновлениях!');
  } else {
    alert('Раздел "Наличие" (ICE Resale) находится в разработке.');
  }
};

async function renderResale() {
  if (typeof tgUtil !== 'undefined' && tgUtil.haptic) {
    tgUtil.haptic('light');
  }

  return `
    <div class="space-y-4 page-enter">
      <div class="flex items-center gap-3 mb-4 mt-2">
        <button type="button" class="global-back-btn !mb-0" onclick="switchTab('catalogs')" title="Назад">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-bold text-white tracking-wide">ICE Resale</h2>
          <p class="text-[11px] text-white/40">Товары в наличии и совместная доставка</p>
        </div>
      </div>

      <div class="glass-card p-6 text-center flex flex-col items-center relative overflow-hidden my-3 border border-pink-500/25">
        <div class="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-pink-500/10 blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>

        <div class="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 relative" style="background: linear-gradient(135deg, rgba(236,72,153,0.25), rgba(219,39,119,0.12)); border: 1px solid rgba(236,72,153,0.35);">
          <span class="text-4xl text-pink-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          </span>
          <span class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-black shadow-lg">
            ⏳
          </span>
        </div>

        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/40 mb-3 tracking-wider uppercase">
          <span class="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
          Раздел в разработке
        </div>

        <h2 class="text-xl font-black text-white mb-2">ICE Resale <span class="text-pink-400">(Наличие)</span></h2>
        <p class="text-sm text-white/70 max-w-sm leading-relaxed mb-6">
          Сервис покупки и продажи оригинальных вещей между клиентами с минимальной комиссией всего 2% готовится к открытию. Скоро вы сможете продавать свои вещи и покупать товары из наличия с моментальной доставкой!
        </p>

        <div class="w-full space-y-2.5 max-w-sm mb-6 text-left">
          <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/30 text-pink-300 flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-xs font-bold leading-tight">Безопасная сделка</p>
              <p class="text-[11px] text-white/50 mt-0.5">Деньги переводятся продавцу только после подтверждения получения</p>
            </div>
          </div>
          <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                <path d="M12 18V6"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-xs font-bold leading-tight">Минимальная комиссия 2%</p>
              <p class="text-[11px] text-white/50 mt-0.5">Честные и прозрачные условия продажи вещей между пользователями</p>
            </div>
          </div>
          <div class="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white text-xs font-bold leading-tight">Быстрая доставка</p>
              <p class="text-[11px] text-white/50 mt-0.5">Вещи из наличия отправляются в течение 1–2 дней по РБ и РФ</p>
            </div>
          </div>
        </div>

        <button onclick="switchTab('catalogs')" class="btn-primary w-full max-w-sm py-3 rounded-xl text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white transition-all flex items-center justify-center gap-2">
          <span class="ix" style="width:14px;height:14px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></span>
          Вернуться к каталогам
        </button>
      </div>
      ${typeof renderFooter === 'function' ? renderFooter() : ''}
    </div>
  `;
}

// Global Exports
if (typeof renderResale === 'function') window.renderResale = renderResale;
