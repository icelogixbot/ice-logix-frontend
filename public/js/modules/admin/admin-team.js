// ============================================================
// ICE LOGIX · Админ-панель: Сотрудники
// Список команды и выдача ролей. Роли меняет только владелец, через сервер (admin_set_role),
// после повторного ввода код-пароля. Админ видит список, но менять ничего не может.
// Роль «Поддержка» выдаётся в окне поддержки (support_set_operator), здесь она только видна.
// ============================================================
(function () {
  'use strict';

  const ROLES = {
    owner: { text: 'Владелец', hint: 'Всё, включая роли сотрудников и ручную правку баланса' },
    admin: { text: 'Админ', hint: 'Заказы, оплаты, клиенты, обращения, витрина. Роли не выдаёт' },
    support: { text: 'Поддержка', hint: 'Только окно поддержки клиентов' },
  };
  const STAFF = ['owner', 'admin', 'support'];

  let iAmOwner = false;
  let staff = [];
  let searchTimer = null;

  const U = () => window.UI;
  const esc = (s) => U().esc(s);
  const nick = (u) => String(u.username || '').replace(/^@+/, '');
  const nameOf = (u) => u.full_name || (nick(u) ? '@' + nick(u) : 'ID ' + u.user_id);
  const initial = (u) => (nameOf(u).replace('@', '').trim().charAt(0) || '?').toUpperCase();

  function personRow(u, opts) {
    const o = opts || {};
    const I = U().icon;
    const role = ROLES[u.role];
    const sub = [nick(u) ? '@' + esc(nick(u)) : '', 'ID ' + esc(u.user_id)].filter(Boolean).join(' · ');
    const clickable = !!o.clickable;
    return `
      <div class="rd-row${clickable ? '' : ' ad-static'}" ${clickable ? `role="button" tabindex="0" data-person="${esc(u.user_id)}"` : ''}>
        <span class="ad-ava" aria-hidden="true">${esc(initial(u))}</span>
        <span class="rd-row-body">
          <span class="rd-row-title">${esc(nameOf(u))}${o.me ? '<span class="rd-badge">Это вы</span>' : ''}</span>
          <span class="rd-row-text">${sub}</span>
        </span>
        ${role ? `<span class="rd-status${u.role === 'owner' ? ' ok' : ''}">${role.text}</span>` : ''}
        ${clickable ? I('chevR', 22, { cls: 'rd-chev' }) : ''}
      </div>`;
  }

  function teamHtml() {
    if (!staff.length) return `<div class="rd-card">${U().empty({ icon: 'users', title: 'Пока никого', text: 'Добавьте первого сотрудника через поиск ниже.' })}</div>`;
    return `<div class="rd-card rd-list">${staff.map((u) => personRow(u, {
      me: String(u.user_id) === String(userId),
      clickable: iAmOwner && String(u.user_id) !== String(userId),
    })).join('')}</div>`;
  }

  async function renderAdminTeam() {
    const I = U().icon;
    return `
      <div class="rd-screen page-enter ad-screen">
        <div class="rd-head">
          <button type="button" class="rd-back" onclick="window.goBackGlobal()" aria-label="Назад">${I('chevL', 22)}</button>
          <div class="rd-head-txt"><h1 class="rd-head-title">Сотрудники</h1><p class="rd-head-sub">Кто работает в админке и что может</p></div>
        </div>

        <div class="rd-card rd-list">
          ${STAFF.map((k) => `
            <div class="rd-row ad-static">
              <span class="rd-ico">${I(k === 'owner' ? 'crown' : k === 'admin' ? 'shield' : 'message', 22)}</span>
              <span class="rd-row-body"><span class="rd-row-title">${ROLES[k].text}</span><span class="rd-row-text">${ROLES[k].hint}</span></span>
            </div>`).join('')}
        </div>

        <div class="rd-section"><h2>Команда</h2><span class="rd-pill" id="adTeamCount" hidden></span></div>
        <div id="adTeamList"><div class="rd-card ad-skel rd-shimmer"></div></div>

        <div id="adTeamAdd" hidden>
          <div class="rd-section"><h2>Добавить сотрудника</h2></div>
          <p class="rd-sub" style="margin:0 0 12px">Попросите человека один раз открыть приложение, затем найдите его по имени, @нику или Telegram ID.</p>
          <div class="rd-field">${I('search', 20)}<input type="search" id="adTeamSearch" placeholder="Имя, @ник или ID" autocomplete="off" enterkeyhint="search"></div>
          <div id="adTeamResults" style="margin-top:12px"></div>
        </div>
        <p class="ad-updated" id="adTeamNote" hidden>Выдавать и снимать роли может только владелец.</p>
      </div>`;
  }

  async function loadStaff() {
    const { data, error } = await supabaseClient.from('users')
      .select('user_id, full_name, username, role, created_at').in('role', STAFF)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const order = { owner: 0, admin: 1, support: 2 };
    staff = (data || []).sort((a, b) => order[a.role] - order[b.role]);
  }

  function paintStaff() {
    const box = document.getElementById('adTeamList');
    if (!box) return;
    box.innerHTML = teamHtml();
    const cnt = document.getElementById('adTeamCount');
    if (cnt) { cnt.textContent = String(staff.length); cnt.hidden = !staff.length; }
    box.querySelectorAll('[data-person]').forEach((row) => {
      row.onclick = () => openRoleSheet(staff.find((u) => String(u.user_id) === row.dataset.person));
    });
  }

  // Поиск людей, которым можно выдать роль
  async function search(q) {
    const box = document.getElementById('adTeamResults');
    if (!box) return;
    const clean = q.replace(/[,()*%\\]/g, ' ').replace(/^@/, '').trim();
    if (clean.length < 2) { box.innerHTML = ''; return; }
    let req = supabaseClient.from('users').select('user_id, full_name, username, role, created_at');
    req = /^\d{4,}$/.test(clean)
      ? req.eq('user_id', clean)
      : req.or(`full_name.ilike.%${clean}%,username.ilike.%${clean}%`);
    const { data, error } = await req.order('created_at', { ascending: false }).limit(10);
    if (!document.getElementById('adTeamResults')) return;
    if (error) { box.innerHTML = `<p class="rd-sub">Не получилось найти. Попробуйте ещё раз.</p>`; return; }
    const found = (data || []).filter((u) => !STAFF.includes(u.role));
    if (!found.length) {
      box.innerHTML = `<div class="rd-card">${U().empty({ icon: 'search', title: 'Никого не нашли', text: 'Проверьте написание. Если человек ещё не открывал приложение, его нет в базе.' })}</div>`;
      return;
    }
    box.innerHTML = `<div class="rd-card rd-list">${found.map((u) => personRow(u, { clickable: true })).join('')}</div>`;
    box.querySelectorAll('[data-person]').forEach((row) => {
      row.onclick = () => openRoleSheet(found.find((u) => String(u.user_id) === row.dataset.person));
    });
  }

  function openRoleSheet(person) {
    if (!person) return;
    const UI = U();
    const I = UI.icon;
    const isStaff = STAFF.includes(person.role);
    const options = [
      ['admin', 'shield', 'Сделать админом', ROLES.admin.hint],
      ['owner', 'crown', 'Сделать владельцем', 'Полный доступ. Снять роль владельца сможет только другой владелец'],
    ].filter(([r]) => r !== person.role);
    if (isStaff) options.push(['user', 'x', 'Убрать доступ', 'Станет обычным клиентом, админ-панель пропадёт']);
    UI.sheet({
      title: esc(nameOf(person)),
      html: `
        <p class="rd-sub" style="margin-top:0">${isStaff ? 'Сейчас: ' + (ROLES[person.role] || {}).text : 'Сейчас: клиент'} · ID ${esc(person.user_id)}</p>
        <div class="rd-card rd-list" style="margin-top:14px">${options.map(([r, ico, t, s]) => `
          <div class="rd-row" role="button" tabindex="0" data-role="${r}">
            <span class="rd-ico">${I(ico, 22)}</span>
            <span class="rd-row-body"><span class="rd-row-title">${t}</span><span class="rd-row-text">${s}</span></span>
          </div>`).join('')}</div>`,
      onOpen: (wrap, close) => {
        wrap.querySelectorAll('[data-role]').forEach((row) => {
          row.onclick = async () => { close(); await setRole(person, row.dataset.role); };
        });
      },
    });
  }

  async function setRole(person, role) {
    const UI = U();
    // Смена роли — с повторным код-паролем, как вход в админку
    if (window.AppLock && typeof window.AppLock.verifyFlow === 'function') {
      const ok = await window.AppLock.verifyFlow(role === 'user' ? 'Снять роль сотрудника' : 'Выдать роль сотруднику');
      if (ok !== true) { if (ok === 'not_enabled') UI.toast('Сначала включите код-пароль в настройках', 'bad'); return; }
    }
    const { data, error } = await supabaseClient.rpc('admin_set_role', { p_user: Number(person.user_id), p_role: role });
    if (error) { UI.toast(error.message || 'Не получилось поменять роль', 'bad'); return; }
    if (window.tgUtil && tgUtil.haptic) tgUtil.haptic('success');
    UI.toast(role === 'user' ? 'Доступ снят' : `${nameOf(person)}: ${ROLES[data && data.role || role].text.toLowerCase()}`);
    const input = document.getElementById('adTeamSearch');
    if (input) input.value = '';
    const res = document.getElementById('adTeamResults');
    if (res) res.innerHTML = '';
    try { await loadStaff(); paintStaff(); } catch (_) {}
  }

  async function attachAdminTeamHandlers() {
    try {
      const [{ data: owner }] = await Promise.all([supabaseClient.rpc('app_is_owner'), loadStaff()]);
      iAmOwner = owner === true;
    } catch (e) {
      const box = document.getElementById('adTeamList');
      if (box) box.innerHTML = `<div class="rd-card">${U().empty({ icon: 'alert', title: 'Не получилось загрузить', text: 'Проверьте интернет и откройте экран ещё раз.' })}</div>`;
      return;
    }
    paintStaff();
    const add = document.getElementById('adTeamAdd');
    const note = document.getElementById('adTeamNote');
    if (add) add.hidden = !iAmOwner;
    if (note) note.hidden = iAmOwner;
    const input = document.getElementById('adTeamSearch');
    if (input) {
      input.oninput = () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => search(input.value), 300);
      };
    }
  }

  window.renderAdminTeam = renderAdminTeam;
  window.attachAdminTeamHandlers = attachAdminTeamHandlers;
})();
