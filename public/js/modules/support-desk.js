/**
 * ICE LOGIX — Operator Support Desk Module
 * Authorized Operator: 6107097715
 * Realtime bidirectional communication with @icelogix_support_bot
 */

(function () {
  'use strict';

  // Config & Security Whitelist
  const AUTHORIZED_OPERATORS = [6107097715];
  const BOT_TOKEN = '8631939179:AAFpMXFgp1JXv084ImFvTkjzlt2CplKar9Q';
  const SUPABASE_URL = 'https://vrvwdagjpttvfvjanbwq.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZydndkYWdqcHR0dmZ2amFuYndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTc4MzgsImV4cCI6MjA5MTIzMzgzOH0.P9GQSW6NLN1BhR66PX-LP4ysZBXFeWIXRYIRvhRjo1c';

  let supabaseClient = null;
  let currentUser = null;
  let activeTab = 'all'; // 'all', 'open', 'in_progress', 'closed'
  let activeTicket = null;
  let ticketsList = [];
  let messagesList = [];
  let realtimeChannel = null;

  // Sound & Haptic Helper
  const haptic = (type = 'light') => {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(type);
      }
    } catch (e) {}
  };

  // Safe HTML Escaping
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
    );

  // Time formatter
  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? timeStr : `${d.getDate()}.${d.getMonth() + 1} ${timeStr}`;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ИНИЦИАЛИЗАЦИЯ И ПРОВЕРКА ДОСТУПА
  // ══════════════════════════════════════════════════════════════════════════

  async function initDesk() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation?.();
    }

    // Проверяем авторизацию
    const tgUser = tg?.initDataUnsafe?.user;
    const urlParams = new URLSearchParams(window.location.search);
    const bypassId = urlParams.get('auth_bypass') || urlParams.get('op');
    const cachedId = localStorage.getItem('ice_operator_id');

    let operatorId = tgUser?.id || (bypassId ? parseInt(bypassId, 10) : null) || (cachedId ? parseInt(cachedId, 10) : null);

    // Если оператор из белого списка
    if (operatorId && AUTHORIZED_OPERATORS.includes(Number(operatorId))) {
      localStorage.setItem('ice_operator_id', String(operatorId));
    } else {
      showAccessDenied(operatorId);
      return;
    }

    currentUser = {
      id: Number(operatorId),
      name: tgUser?.first_name || 'Кирилл (Оператор)',
      username: tgUser?.username || 'admin',
    };

    // Обновляем бейдж оператора в шапке
    const opBadge = document.getElementById('operatorNameBadge');
    if (opBadge) opBadge.textContent = currentUser.name;

    // Инициализация Supabase
    if (window.supabase?.createClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.error('Supabase client library not found');
      return;
    }

    bindEvents();
    await loadTickets();
    setupRealtime();

    // Проверяем параметр url ?ticket=...
    const initialTicketId = urlParams.get('ticket');
    if (initialTicketId) {
      const target = ticketsList.find((t) => t.id === initialTicketId);
      if (target) {
        selectTicket(target);
      }
    }
  }

  function showAccessDenied(userId) {
    const lockScreen = document.getElementById('lockdownScreen');
    const deskMain = document.getElementById('deskContainer');
    const userDetailEl = document.getElementById('lockdownUserDetail');

    if (deskMain) deskMain.style.display = 'none';
    if (lockScreen) {
      lockScreen.style.display = 'flex';
      if (userDetailEl) {
        userDetailEl.textContent = userId
          ? `Ваш Telegram ID: ${userId} (отсутствует в белом списке операторов)`
          : 'Telegram WebApp initData не содержит авторизованного пользователя.';
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ЗАГРУЗКА И ОТОБРАЖЕНИЕ ТИКЕТОВ
  // ══════════════════════════════════════════════════════════════════════════

  async function loadTickets() {
    try {
      const { data, error } = await supabaseClient
        .from('support_tickets')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      ticketsList = data || [];

      updateTabCounters();
      renderTicketsList();
    } catch (err) {
      console.error('Error loading tickets:', err);
    }
  }

  function updateTabCounters() {
    const allCount = ticketsList.length;
    const openCount = ticketsList.filter((t) => t.status === 'open').length;
    const inProgCount = ticketsList.filter((t) => t.status === 'in_progress').length;
    const closedCount = ticketsList.filter((t) => t.status === 'closed').length;

    const bAll = document.getElementById('badgeAll');
    const bOpen = document.getElementById('badgeOpen');
    const bInProg = document.getElementById('badgeInProgress');
    const bClosed = document.getElementById('badgeClosed');

    if (bAll) {
      bAll.textContent = allCount;
      bAll.style.display = allCount > 0 ? 'inline-block' : 'none';
    }
    if (bOpen) {
      bOpen.textContent = openCount;
      bOpen.style.display = openCount > 0 ? 'inline-block' : 'none';
    }
    if (bInProg) {
      bInProg.textContent = inProgCount;
      bInProg.style.display = inProgCount > 0 ? 'inline-block' : 'none';
    }
    if (bClosed) {
      bClosed.textContent = closedCount;
      bClosed.style.display = closedCount > 0 ? 'inline-block' : 'none';
    }
  }

  function renderTicketsList() {
    const listContainer = document.getElementById('ticketsListContainer');
    if (!listContainer) return;

    const searchInput = document.getElementById('ticketSearchInput');
    const q = (searchInput?.value || '').toLowerCase().trim();

    // Фильтрация по текущему табу и поиску
    const filtered = ticketsList.filter((t) => {
      const matchesTab = activeTab === 'all' || t.status === activeTab;
      if (!matchesTab) return false;

      if (!q) return true;
      const name = (t.user_name || '').toLowerCase();
      const handle = (t.user_handle || '').toLowerCase();
      const text = (t.last_message_text || '').toLowerCase();
      return name.includes(q) || handle.includes(q) || text.includes(q);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-box" style="padding: 40px 10px;">
          <div class="empty-state-icon">💬</div>
          <div style="font-size: 13px; font-weight: 700; color: #fff;">Нет диалогов</div>
          <div style="font-size: 11px; margin-top: 4px;">В этой категории пока пусто</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered
      .map((t) => {
        const isSelected = activeTicket && activeTicket.id === t.id;
        const hasUnread = t.unread_by_operator;
        const initial = (t.user_name || 'U').charAt(0).toUpperCase();

        let statusBadge = '';
        if (t.status === 'open') {
          statusBadge = '<span class="ticket-status-pill open">Новое</span>';
        } else if (t.status === 'in_progress') {
          statusBadge = '<span class="ticket-status-pill in_progress">В работе</span>';
        } else {
          statusBadge = '<span class="ticket-status-pill closed">Решено</span>';
        }

        return `
          <div class="ticket-card ${isSelected ? 'selected' : ''}" data-ticket-id="${t.id}">
            <div class="ticket-avatar">
              ${initial}
              ${hasUnread ? '<span class="ticket-badge-unread-pulse"></span>' : ''}
            </div>
            <div class="ticket-content">
              <div class="ticket-card-header">
                <div class="ticket-user-name">
                  <span>${esc(t.user_name || 'Клиент')}</span>
                  ${t.user_handle ? `<span class="ticket-handle-pill">@${esc(t.user_handle)}</span>` : ''}
                </div>
                <span class="ticket-time">${formatTime(t.last_message_at)}</span>
              </div>
              <div class="ticket-preview-row">
                <span class="ticket-preview">${esc(t.last_message_text || 'Обращение создано')}</span>
                ${statusBadge}
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    // Навешиваем клики
    listContainer.querySelectorAll('.ticket-card').forEach((card) => {
      card.addEventListener('click', () => {
        const tid = card.getAttribute('data-ticket-id');
        const target = ticketsList.find((t) => t.id === tid);
        if (target) selectTicket(target);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ВЫБОР ТИКЕТА И ОТКРЫТИЕ ДИАЛОГА
  // ══════════════════════════════════════════════════════════════════════════

  async function selectTicket(ticket) {
    activeTicket = ticket;
    haptic('medium');

    // Подсветка в сайдбаре
    renderTicketsList();

    // Мобильный сдвиг экрана
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) chatPanel.classList.add('active');

    // Скрываем плейсхолдер пустого чата, показываем комнату
    const emptyChat = document.getElementById('chatEmptyState');
    const activeChat = document.getElementById('chatActiveRoom');
    if (emptyChat) emptyChat.style.display = 'none';
    if (activeChat) activeChat.style.display = 'flex';

    // Заполняем шапку чата
    renderChatHeader(ticket);

    // Загружаем досье клиента из базы ICE LOGIX
    loadClientDossier(ticket.user_id);

    // Загружаем сообщения
    await loadMessages(ticket.id);

    // Помечаем тикет как прочитанный оператором
    if (ticket.unread_by_operator) {
      ticket.unread_by_operator = false;
      updateTabCounters();
      await supabaseClient
        .from('support_tickets')
        .update({ unread_by_operator: false })
        .eq('id', ticket.id);
    }
  }

  function renderChatHeader(ticket) {
    const avatarEl = document.getElementById('chatClientAvatar');
    const nameEl = document.getElementById('chatClientName');
    const handleEl = document.getElementById('chatClientHandle');

    if (avatarEl) avatarEl.textContent = (ticket.user_name || 'U').charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = ticket.user_name || 'Клиент';
    if (handleEl) {
      handleEl.textContent = ticket.user_handle ? `@${ticket.user_handle}` : `ID: ${ticket.user_id}`;
    }
  }

  async function loadClientDossier(userId) {
    const chipsEl = document.getElementById('clientDossierChips');
    if (!chipsEl) return;

    chipsEl.innerHTML = '<span class="dossier-chip">Загрузка данных...</span>';

    try {
      // 1. Запрос баланса пользователя
      const { data: userProfile } = await supabaseClient
        .from('users')
        .select('ices_balance, role')
        .eq('user_id', userId)
        .maybeSingle();

      // 2. Запрос количества заказов
      const { data: ordersData } = await supabaseClient
        .from('orders')
        .select('id, status')
        .eq('user_id', userId);

      const balance = userProfile?.ices_balance || 0;
      const ordersCount = ordersData?.length || 0;
      const activeOrdersCount = (ordersData || []).filter(
        (o) => !['COMPLETED', 'RECEIVED', 'DRAFT'].includes(o.status)
      ).length;

      chipsEl.innerHTML = `
        <span class="dossier-chip highlight">Баланс: ${balance} ICE</span>
        <span class="dossier-chip">Всего заказов: ${ordersCount}</span>
        ${activeOrdersCount > 0 ? `<span class="dossier-chip highlight" style="color:#10b981;">В пути: ${activeOrdersCount}</span>` : ''}
      `;
    } catch (e) {
      chipsEl.innerHTML = '<span class="dossier-chip">Клиент ICE LOGIX</span>';
    }
  }

  async function loadMessages(ticketId) {
    try {
      const { data, error } = await supabaseClient
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      messagesList = data || [];
      renderMessages();
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }

  function renderMessages() {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    if (messagesList.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box" style="margin: auto;">
          <div class="empty-state-icon">👋</div>
          <div style="font-size: 13px; font-weight: 700; color: #fff;">Начало диалога</div>
          <div style="font-size: 11px; margin-top: 4px;">Напишите первое сообщение клиенту</div>
        </div>
      `;
      return;
    }

    container.innerHTML = messagesList
      .map((m) => {
        const isOp = m.sender_type === 'operator';
        const isClient = m.sender_type === 'client';
        const bubbleClass = isOp ? 'operator' : 'client';
        const senderName = isOp ? 'Вы (Оператор)' : activeTicket?.user_name || 'Клиент';

        return `
          <div class="chat-bubble ${bubbleClass}">
            <div class="bubble-sender">${esc(senderName)}</div>
            <div class="bubble-text">${esc(m.text)}</div>
            ${m.media_url ? `<div style="margin-top:6px; font-size:11px; color:#38bdf8;">📷 Прикреплено фото (отправлено в Telegram)</div>` : ''}
            <div class="bubble-time">${formatTime(m.created_at)}</div>
          </div>
        `;
      })
      .join('');

    // Скролл вниз
    container.scrollTop = container.scrollHeight;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ОТПРАВКА ОТВЕТА ОПЕРАТОРА
  // ══════════════════════════════════════════════════════════════════════════

  async function sendMessage() {
    const textarea = document.getElementById('chatMessageInput');
    const text = (textarea?.value || '').trim();
    if (!text || !activeTicket) return;

    const sendBtn = document.getElementById('chatSendBtn');
    if (sendBtn) sendBtn.disabled = true;

    haptic('medium');
    textarea.value = '';

    try {
      const nowIso = new Date().toISOString();

      // 1. Добавляем в локальный интерфейс мгновенно для отзывчивости
      const tempMsg = {
        id: 'temp-' + Date.now(),
        ticket_id: activeTicket.id,
        sender_type: 'operator',
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        text: text,
        created_at: nowIso,
      };
      messagesList.push(tempMsg);
      renderMessages();

      // 2. Отправляем клиенту напрямую в Telegram через Bot API
      const tgPayload = {
        chat_id: activeTicket.user_id,
        text: `🎧 <b>Служба заботы ICE LOGIX:</b>\n\n${text}`,
        parse_mode: 'HTML',
      };

      const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tgPayload),
      });

      if (!tgResponse.ok) {
        const errJson = await tgResponse.json().catch(() => ({}));
        console.warn('Telegram Bot API response warning:', errJson);
      }

      // 3. Сохраняем сообщение в Supabase
      await supabaseClient.from('support_messages').insert({
        ticket_id: activeTicket.id,
        sender_type: 'operator',
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        text: text,
        created_at: nowIso,
      });

      // 4. Обновляем статус тикета на 'in_progress'
      activeTicket.status = 'in_progress';
      activeTicket.last_message_text = `Вы: ${text}`;
      activeTicket.last_message_at = nowIso;
      activeTicket.unread_by_client = true;
      activeTicket.unread_by_operator = false;
      activeTicket.operator_id = currentUser.id;

      await supabaseClient
        .from('support_tickets')
        .update({
          status: 'in_progress',
          last_message_text: `Вы: ${text}`,
          last_message_at: nowIso,
          unread_by_client: true,
          unread_by_operator: false,
          operator_id: currentUser.id,
        })
        .eq('id', activeTicket.id);

      updateTabCounters();
      renderTicketsList();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Ошибка отправки сообщения: ' + err.message);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ЗАКРЫТИЕ ТИКЕТА
  // ══════════════════════════════════════════════════════════════════════════

  async function closeTicket() {
    if (!activeTicket) return;
    if (!confirm('Вы уверены, что хотите закрыть это обращение и перенести его в архив?')) return;

    haptic('success');
    try {
      const nowIso = new Date().toISOString();

      // Отправляем вежливое уведомление клиенту в Telegram
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: activeTicket.user_id,
          text: `✅ <b>Ваш вопрос решен!</b>\n\nСпасибо, что обратились в службу заботы ICE LOGIX ❄️\nЕсли у вас возникнет новый вопрос — просто нажмите кнопку <b>«💬 Задать вопрос»</b> ниже.`,
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [[{ text: '💬 Задать вопрос' }]],
            resize_keyboard: true,
            is_persistent: true,
          },
        }),
      }).catch(() => {});

      // Обновляем тикет в базе
      await supabaseClient
        .from('support_tickets')
        .update({
          status: 'closed',
          closed_at: nowIso,
          unread_by_operator: false,
        })
        .eq('id', activeTicket.id);

      activeTicket.status = 'closed';
      activeTicket.closed_at = nowIso;

      alert('Тикет успешно закрыт и перенесен в Архив ✅');

      // Возврат в список на мобилке
      const chatPanel = document.getElementById('chatPanel');
      if (chatPanel) chatPanel.classList.remove('active');

      activeTicket = null;
      document.getElementById('chatEmptyState').style.display = 'flex';
      document.getElementById('chatActiveRoom').style.display = 'none';

      await loadTickets();
    } catch (e) {
      console.error('Error closing ticket:', e);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REALTIME ПОДПИСКА
  // ══════════════════════════════════════════════════════════════════════════

  function setupRealtime() {
    if (!supabaseClient) return;

    realtimeChannel = supabaseClient
      .channel('support-desk-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          loadTickets();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const newMsg = payload.new;
          if (activeTicket && newMsg.ticket_id === activeTicket.id) {
            // Если открыт этот чат и сообщение еще не добавлено
            if (!messagesList.some((m) => m.id === newMsg.id)) {
              messagesList.push(newMsg);
              renderMessages();
              haptic('light');
            }
          }
        }
      )
      .subscribe();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // СОБЫТИЯ И КНОПКИ
  // ══════════════════════════════════════════════════════════════════════════

  function bindEvents() {
    // Табы (Новые / В работе / Архив)
    document.querySelectorAll('.desk-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.desk-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.getAttribute('data-tab');
        haptic('light');
        renderTicketsList();
      });
    });

    // Поиск
    const searchInput = document.getElementById('ticketSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderTicketsList();
      });
    }

    // Кнопка обновления
    const refreshBtn = document.getElementById('deskRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        haptic('light');
        await loadTickets();
        if (activeTicket) await loadMessages(activeTicket.id);
      });
    }

    // Мобильная кнопка «Назад»
    const backBtn = document.getElementById('mobileBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const chatPanel = document.getElementById('chatPanel');
        if (chatPanel) chatPanel.classList.remove('active');
        activeTicket = null;
        renderTicketsList();
      });
    }

    // Отправка сообщения
    const sendBtn = document.getElementById('chatSendBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage);
    }

    // Enter для отправки (Shift+Enter — перенос строки)
    const textarea = document.getElementById('chatMessageInput');
    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    // Быстрые шаблоны
    document.querySelectorAll('.template-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-text');
        if (textarea && text) {
          textarea.value = text;
          textarea.focus();
          haptic('light');
        }
      });
    });

    // Закрыть тикет
    const closeBtn = document.getElementById('chatCloseTicketBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeTicket);
    }

    // Закрыть веб-приложение (на экране блокировки)
    const lockCloseBtn = document.getElementById('lockdownCloseBtn');
    if (lockCloseBtn) {
      lockCloseBtn.addEventListener('click', () => {
        window.Telegram?.WebApp?.close?.();
      });
    }
  }

  // Запуск при готовности DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDesk);
  } else {
    initDesk();
  }
})();
