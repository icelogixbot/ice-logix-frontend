-- ==============================================================================
-- ICE LOGIX: Referral Program & Bonus Shop (ICE Rewards Shop) Migration
-- Tables: app_settings (extensions), bonus_shop_items, bonus_shop_orders
-- ==============================================================================

-- 1. Добавляем параметры реферальной программы в app_settings
ALTER TABLE public.app_settings
    ADD COLUMN IF NOT EXISTS referral_enabled BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS referral_referrer_percent NUMERIC(5, 2) NOT NULL DEFAULT 7.00,
    ADD COLUMN IF NOT EXISTS referral_referee_percent NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
    ADD COLUMN IF NOT EXISTS referral_first_order_only BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS referral_min_order_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- 2. Добавляем флаг обработки реферального вознаграждения в orders
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS referral_reward_processed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS referral_reward_amount NUMERIC(10, 2) DEFAULT 0.00;

-- 3. Таблица товаров магазина бонусов (bonus_shop_items)
CREATE TABLE IF NOT EXISTS public.bonus_shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'coupons', 'mobile', 'merch', 'gadgets'
    price_ice NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    badge TEXT, -- 'Хит', 'Эксклюзив', 'Подарок', 'Новинка'
    stock INT NOT NULL DEFAULT -1, -- -1 = неограниченно
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_bonus_shop_items_cat ON public.bonus_shop_items(category, is_active);
CREATE INDEX IF NOT EXISTS idx_bonus_shop_items_order ON public.bonus_shop_items(sort_order ASC);

-- 4. Таблица заказов / заявок на обмен бонусов (bonus_shop_orders)
CREATE TABLE IF NOT EXISTS public.bonus_shop_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    item_id UUID REFERENCES public.bonus_shop_items(id) ON DELETE SET NULL,
    item_title TEXT NOT NULL,
    category TEXT NOT NULL,
    price_ice NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    contact_payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- phone, delivery_address, size, promo_code, comment
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'
    operator_id BIGINT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bonus_shop_orders_user ON public.bonus_shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_shop_orders_status ON public.bonus_shop_orders(status);

-- 5. Стартовые товары витрины (Seed Data)
INSERT INTO public.bonus_shop_items (title, description, category, price_ice, image_url, badge, stock, sort_order)
VALUES
    -- Купоны
    ('Купон на скидку 10 BYN', 'Скидка 10 BYN на комиссию вашего следующего заказа', 'coupons', 10.00, './assets/coupons/coupon_10byn.png', 'Популярно', -1, 1),
    ('Купон на скидку 25 BYN', 'Скидка 25 BYN на комиссию любого крупного заказа', 'coupons', 25.00, './assets/coupons/coupon_25byn.png', 'Выгодно', -1, 2),
    ('Бесплатная страховка 2%', '100% покрытие рисков логистики на один любой заказ', 'coupons', 15.00, './assets/coupons/insurance_free.png', 'Хит', -1, 3),

    -- Связь
    ('Пополнение телефона 5 BYN', 'Моментальное пополнение баланса МТС, А1 или Life', 'mobile', 5.00, './assets/mobile/mobile_5byn.png', 'Связь', -1, 4),
    ('Пополнение телефона 10 BYN', 'Пополнение номера телефона любого оператора РБ', 'mobile', 10.00, './assets/mobile/mobile_10byn.png', 'Топ', -1, 5),
    ('Пополнение телефона 20 BYN', 'Пополнение номера телефона любого оператора РБ', 'mobile', 20.00, './assets/mobile/mobile_20byn.png', 'Максимум', -1, 6),

    -- Мерч ICE LOGIX
    ('Фирменный стикерпак ICE LOGIX', 'Набор из 10 голографических водостойких виниловых стикеров', 'merch', 12.00, './assets/merch/stickers.png', 'Эксклюзив', 50, 7),
    ('Фирменные носки ICE LOGIX (Black/Cyan)', 'Плотный премиальный хлопок, усиленная стопа и пятка', 'merch', 18.00, './assets/merch/socks.png', 'Дроп', 30, 8),
    ('Оверсайз футболка ICE LOGIX Heavyweight', 'Плотность 240g, шелкография, фирменная бирка с голограммой', 'merch', 65.00, './assets/merch/tshirt.png', 'Лимитка', 15, 9),
    ('Худи ICE LOGIX Polar Fleece', 'Утеплённый худи свободного кроя с фирменной вышивкой', 'merch', 120.00, './assets/merch/hoodie.png', 'VIP', 10, 10),

    -- Гаджеты и аксессуары
    ('Набор для ухода за кроссовками Crep Style', 'Премиальная щётка, чистящая пена и микрофибра', 'gadgets', 35.00, './assets/gadgets/cleaner.png', 'Полезно', 20, 11),
    ('Силиконовые формодержатели для обуви', 'Защита от заломов носовой части (пара, универсальный размер)', 'gadgets', 14.00, './assets/gadgets/shields.png', 'Мастхэв', 40, 12),
    ('Портативный повербанк ICE Power 10000mAh', 'Компактный внешний аккумулятор с быстрой зарядкой 22.5W', 'gadgets', 75.00, './assets/gadgets/powerbank.png', 'Гаджет', 8, 13)
ON CONFLICT DO NOTHING;

-- 6. RLS (Row Level Security)
ALTER TABLE public.bonus_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read bonus_shop_items" ON public.bonus_shop_items;
CREATE POLICY "Allow read bonus_shop_items" ON public.bonus_shop_items
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin modify bonus_shop_items" ON public.bonus_shop_items;
CREATE POLICY "Allow admin modify bonus_shop_items" ON public.bonus_shop_items
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users insert bonus_shop_orders" ON public.bonus_shop_orders;
CREATE POLICY "Allow users insert bonus_shop_orders" ON public.bonus_shop_orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read bonus_shop_orders" ON public.bonus_shop_orders;
CREATE POLICY "Allow read bonus_shop_orders" ON public.bonus_shop_orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin update bonus_shop_orders" ON public.bonus_shop_orders;
CREATE POLICY "Allow admin update bonus_shop_orders" ON public.bonus_shop_orders
    FOR UPDATE USING (true) WITH CHECK (true);
