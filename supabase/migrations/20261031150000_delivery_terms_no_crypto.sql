-- Единый срок доставки «около месяца» и удаление криптоплатежей (решение владельца 2026-10-31).
-- Только данные: частые вопросы, шаблон поддержки, пустой ключ crypto в реквизитах.
update public.faq_items set answer = 'Обычно доставка занимает около месяца после выкупа товара с площадки.'
 where id = '3313962f-06ba-4abb-8efe-0336c49b4798';
update public.faq_items set answer = 'Сейчас все заказы едут около месяца. Если заказ срочный, напишите в поддержку, подскажем, что можно сделать.'
 where id = '9227e37d-9278-49c9-999b-157633789e1c';
update public.faq_items set answer = 'Перейдите в раздел Профиль → Пополнить баланс и выберите удобный способ оплаты.'
 where id = '4fa44512-5eda-4089-922c-99de211f9fbc';
update public.support_templates set body = 'Доставка из Китая в Беларусь занимает около месяца. Статус заказа видно в приложении в разделе «Заказы».', updated_at = now()
 where title = 'Сроки доставки';
update public.app_settings set payment_requisites = payment_requisites - 'crypto'
 where payment_requisites ? 'crypto';
