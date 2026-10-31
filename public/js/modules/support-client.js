// ============================================================
// ICE LOGIX · поддержка со стороны клиента
// Вся переписка с поддержкой идёт в боте @icelogix_support_bot (support_bot.py).
// openSupport({ orderId }) открывает бот сразу с вопросом по заказу — оператор увидит заказ.
// renderMyTickets() — блок «Ваши обращения» (support_tickets, клиент видит только свои по RLS).
// ============================================================
(function () {
  'use strict';

  const BOT = 'icelogix_support_bot';
  const HOURS = 'каждый день с 10:00 до 22:00';
  const HOURS_SHORT = '10:00–22:00';

  function openSupport(opts) {
    const o = opts || {};
    const payload = o.orderId ? `order_${o.orderId}` : 'app';
    const url = `https://t.me/${BOT}?start=${encodeURIComponent(payload)}`;
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, '_blank', 'noopener');
  }

  function ticketState(t) {
    if (t.status === 'closed') return { text: 'Закрыто', tone: '' };
    if (t.last_sender === 'operator') return { text: 'Есть ответ', tone: 'ok' };
    return { text: 'Ждёт ответа', tone: 'warn' };
  }

  // Последние обращения клиента; пустая строка, если обращений нет или клиент не вошёл
  async function renderMyTickets() {
    const U = window.UI;
    if (!window.supabaseClient || !window.userId) return '';
    try {
      const { data } = await window.supabaseClient.from('support_tickets')
        .select('id, number, status, subject, last_sender, last_message_at, order_id')
        .eq('user_id', window.userId).order('last_message_at', { ascending: false }).limit(3);
      if (!data || !data.length) return '';
      return `
        <div class="rd-section"><h2>Ваши обращения</h2></div>
        <div class="rd-card rd-list">${data.map((t) => {
          const st = ticketState(t);
          const date = t.last_message_at ? new Date(t.last_message_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '';
          return `<div class="rd-row" role="button" tabindex="0" data-support-ticket="${U.esc(t.order_id || '')}">
            <span class="rd-ico">${U.icon(t.order_id ? 'box' : 'message', 22)}</span>
            <span class="rd-row-body">
              <span class="rd-row-title">№ ${t.number} <span class="rd-status${st.tone ? ' ' + st.tone : ''}">${st.text}</span></span>
              <span class="rd-row-text">${U.esc(t.subject || 'Вопрос в поддержку')}${date ? ` · ${date}` : ''}</span>
            </span>
            ${U.icon('chevR', 22, { cls: 'rd-chev' })}
          </div>`;
        }).join('')}</div>`;
    } catch (_) {
      return '';
    }
  }

  // Нажатие на обращение открывает переписку в боте (по заказу — сразу с ним)
  document.addEventListener('click', (e) => {
    const row = e.target.closest('[data-support-ticket]');
    if (row) openSupport({ orderId: row.dataset.supportTicket || null });
  });

  window.openSupport = openSupport;
  window.renderMyTickets = renderMyTickets;
  window.SUPPORT_HOURS = HOURS;
  window.SUPPORT_HOURS_SHORT = HOURS_SHORT;
})();
