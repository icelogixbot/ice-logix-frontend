-- Phase 12: dynamic_texts (editable interface/bot texts) + faq_items (knowledge base)

-- ==== dynamic_texts (key/value editable texts) ====
CREATE TABLE IF NOT EXISTS dynamic_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'Общее',
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE dynamic_texts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for dynamic_texts" ON dynamic_texts FOR ALL USING (true) WITH CHECK (true);

-- ==== faq_items (knowledge base) ====
CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'Общее',
  question text NOT NULL,
  answer text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all actions for faq_items" ON faq_items FOR ALL USING (true) WITH CHECK (true);

-- ==== Seed dynamic_texts ====
INSERT INTO dynamic_texts (key, value, description, category) VALUES
 ('welcome_message', E'Добро пожаловать в ICE LOGIX! 🧊\nМы доставим ваш заказ из-за рубежа быстро и безопасно.', 'Приветственное сообщение бота (/start)', 'Бот'),
 ('order_created', '✅ Ваш заказ принят в работу! Менеджер свяжется с вами в ближайшее время.', 'Сообщение при создании заказа', 'Заказы'),
 ('payment_instructions', '💳 Для оплаты переведите сумму по реквизитам и пришлите чек об оплате.', 'Инструкция по оплате', 'Заказы'),
 ('support_greeting', 'Здравствуйте! Чем можем помочь? Опишите ваш вопрос — менеджер ответит в ближайшее время.', 'Приветствие в поддержке', 'Поддержка')
ON CONFLICT (key) DO NOTHING;

-- ==== Seed faq_items ====
INSERT INTO faq_items (category, question, answer, order_index) VALUES
 ('Доставка', 'Сколько идёт доставка?', 'Средний срок — 14–21 день с момента выкупа товара. Точные сроки зависят от страны и способа доставки.', 1),
 ('Доставка', 'Как отслеживать заказ?', 'Статус заказа отображается в разделе «Мои заказы». Трек-номер появится после отправки посылки со склада.', 2),
 ('Оплата', 'Какие способы оплаты доступны?', 'Принимаем оплату картой, через ЕРИП и криптовалютой. Реквизиты выдаёт менеджер после оформления заказа.', 1),
 ('Оплата', 'Когда нужно оплачивать заказ?', 'Оплата производится после подтверждения наличия и финального расчёта стоимости менеджером.', 2),
 ('Заказы', 'Как оформить заказ?', 'Вставьте ссылку на товар в калькуляторе или отправьте фото. Мы рассчитаем стоимость и оформим заказ.', 1),
 ('Заказы', 'Можно ли вернуть товар?', 'Возврат возможен в соответствии с условиями оферты. По вопросам возврата обращайтесь в поддержку.', 2)
ON CONFLICT DO NOTHING;
