'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, OrderListItem, UserProfile } from '@/lib/api';
import { triggerHaptic } from '@/lib/telegram';
import {
  Package,
  Search,
  ExternalLink,
  Copy,
  Clock,
  CheckCircle,
  Truck,
  RotateCw,
  AlertCircle
} from 'lucide-react';

interface OrdersViewProps {
  userProfile: UserProfile | null;
  onGoToSearch: () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  created: { label: 'Новый', color: 'bg-white/10 text-white/70 border-white/20', icon: Clock },
  pending_payment: { label: 'Ожидает оплаты', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Clock },
  paid: { label: 'Оплачен', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: CheckCircle },
  purchased: { label: 'Выкуплен', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: CheckCircle },
  warehouse_cn: { label: 'Склад в Китае', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30', icon: Package },
  in_transit: { label: 'В пути в РБ', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', icon: Truck },
  arrived: { label: 'Готов к выдаче', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle },
  completed: { label: 'Завершен', color: 'bg-white/5 text-white/40 border-white/10', icon: CheckCircle },
  cancelled: { label: 'Отменен', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30', icon: AlertCircle },
};

export function OrdersView({ userProfile, onGoToSearch }: OrdersViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery<{ ok: boolean; orders: OrderListItem[] }>({
    queryKey: ['userOrders'],
    queryFn: () => api.getUserOrders(),
    retry: 1,
  });

  const orders = data?.orders || [];

  const handleCopy = (text: string, id: string) => {
    triggerHaptic('light');
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white flex items-center gap-1.5">
            <Package className="w-4 h-4 text-cyan-400" />
            Мои заказы
          </h1>
          <p className="text-[11px] text-white/50">Отслеживание статусов выкупа и доставки</p>
        </div>
        <button
          onClick={() => {
            triggerHaptic('light');
            refetch();
          }}
          disabled={isRefetching}
          className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs text-white/50">Загрузка заказов...</span>
        </div>
      ) : orders.length === 0 ? (
        /* Пустое состояние */
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center space-y-4 my-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">
            📦
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">У вас пока нет заказов</h3>
            <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
              Найдите нужную вещь на Poizon, 1688 или Taobao и рассчитайте её стоимость в калькуляторе
            </p>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onGoToSearch();
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-xl text-xs inline-flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Найти товар</span>
          </button>
        </div>
      ) : (
        /* Список карточек заказов */
        <div className="space-y-3">
          {orders.map((order) => {
            const statusConfig = STATUS_MAP[order.status] || {
              label: order.status,
              color: 'bg-white/10 text-white/70 border-white/20',
              icon: Clock,
            };
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={order.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-3 hover:border-cyan-500/30 transition-all"
              >
                {/* Верхняя строка: ID и Статус */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-mono font-bold text-white/80">
                      № {order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleCopy(order.id, order.id)}
                      className="text-white/40 hover:text-white"
                      title="Скопировать номер заказа"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {copiedId === order.id && (
                      <span className="text-[10px] text-cyan-400">Скопировано!</span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusConfig.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </span>
                </div>

                {/* Название и сумма */}
                <div>
                  <h4 className="text-xs font-medium text-white line-clamp-1">{order.title}</h4>
                  <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-white/5">
                    <span className="text-[11px] text-white/40">
                      {new Date(order.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-cyan-400">
                        {order.total_byn.toFixed(2)} BYN
                      </span>
                      <span className="text-[10px] text-white/40 block">
                        Предоплата: {order.prepayment_amount.toFixed(2)} BYN
                      </span>
                    </div>
                  </div>
                </div>

                {/* Трек-номера */}
                {(order.tracking_number_intl || order.tracking_number_by) && (
                  <div className="bg-black/30 rounded-xl p-2.5 text-[11px] space-y-1.5 border border-white/5">
                    {order.tracking_number_intl && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/40">Международный трек:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-cyan-300 font-medium">
                            {order.tracking_number_intl}
                          </span>
                          <button
                            onClick={() =>
                              handleCopy(order.tracking_number_intl || '', `${order.id}-intl`)
                            }
                            className="text-white/40 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    {order.tracking_number_by && (
                      <div className="flex items-center justify-between">
                        <span className="text-white/40">По Беларуси:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-emerald-300 font-medium">
                            {order.tracking_number_by}
                          </span>
                          <button
                            onClick={() =>
                              handleCopy(order.tracking_number_by || '', `${order.id}-by`)
                            }
                            className="text-white/40 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
