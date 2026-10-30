// ICE LOGIX: карточка товара Pinduoduo по ссылке через очередь pdd_jobs (kind = product).
// Ноут с эмулятором забирает задачу (tools/pdd_engine), клиент видит живой прогресс
// и промежуточный результат. Возвращает пакет в формате окна выбора варианта (sku-selector.js).
//
//   const bundle = await window.PddProduct.fetch(url, (label, pct, partial) => { … });
//   null  — очередь недоступна (нет функции в базе): вызывающий код идёт старым путём parse_queue;
//   throw — понятная клиенту ошибка (товар распродан, ноут не на связи и т.п.).

(function () {
  'use strict';

  const POLL_MS = 1500;
  const MAX_WAIT_MS = 4 * 60 * 1000;

  // Результат движка → формат старого sku_bundle (product.to_legacy_bundle на ноуте делает то же)
  function toBundle(res) {
    const groups = res.spec_groups || [];
    const visual = groups.find((g) => g.type === 'visual');
    const spec = groups.find((g) => g.type === 'spec');
    return {
      ...res,
      is_sku_bundle: true,
      title_ru: res.title_ru || res.title || 'Товар',
      orig_price_cny: res.price_cny || 0,
      visual_options: visual ? visual.options : [],
      spec_options: spec ? spec.options : [],
      colors: visual ? visual.options : [],
      sizes: spec ? spec.options : [],
      verdict_reason: res.reason || res.verdict_reason || '',
      has_options: groups.length > 0,
      category: res.category || 'Товары из Китая',
      marketplace: 'pinduoduo',
    };
  }

  async function fetchProduct(url, onProgress) {
    const sb = window.supabaseClient;
    if (!sb) return null;
    const say = (label, pct, partial) => {
      if (typeof onProgress === 'function') {
        try { onProgress(label, pct, partial); } catch (_) { /* экран могли закрыть */ }
      }
    };

    const input = { url: String(url) };
    const m = String(url).match(/goods_id=(\d+)/);
    if (m) input.goods_id = m[1];
    const uid = Number(window.userId || (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe
      && window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id)) || null;

    const { data: created, error } = await sb.rpc('pdd_job_create', { p_kind: 'product', p_input: input, p_user_id: uid });
    if (error) {
      if (/too many active jobs/i.test(error.message || '')) {
        throw new Error('У вас уже три товара в работе. Дождитесь их и попробуйте снова.');
      }
      return null; // функции нет или база отвергла — старый путь
    }
    if (!created || !created.id) return null;

    const started = Date.now();
    say(created.cached ? 'Товар уже смотрели недавно, достаём данные' : 'Ставим товар в очередь', 2);
    let lastPartial = null;
    while (Date.now() - started < MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, created.status === 'done' ? 0 : POLL_MS));
      const { data, error: stErr } = await sb.rpc('pdd_job_status', { p_id: created.id, p_token: created.token });
      if (stErr || !data || !data.ok) continue;
      const pr = data.progress || {};
      if (data.status === 'done' && data.result) return toBundle(data.result);
      if (data.status === 'error' || data.status === 'cancelled') {
        throw new Error(data.error || 'Не получилось прочитать товар. Попробуйте ещё раз.');
      }
      if (data.status === 'queued' && !data.worker_online) {
        throw new Error('Сервер чтения товаров сейчас не на связи. Введите цену вручную или попробуйте чуть позже.');
      }
      if (data.status === 'queued') {
        say(data.queue_position > 0 ? `Перед вами в очереди: ${data.queue_position}` : 'Подключаемся к Pinduoduo', 3);
      } else {
        if (data.status === 'partial' && data.result) lastPartial = data.result;
        say(pr.label || 'Открываем товар в Pinduoduo', pr.pct || 5, lastPartial);
      }
    }
    throw new Error('Товар читается слишком долго. Попробуйте ещё раз или введите цену вручную.');
  }

  window.PddProduct = { fetch: fetchProduct, toBundle };
})();
