'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n/context';
import { api, OrderListItem } from '@/lib/api';
import { tgUtil } from '@/lib/telegram';

interface AdminOrder extends OrderListItem {
  user_name?: string;
}

interface AdminOrdersViewProps {
  onBackToClient: () => void;
}

const STATUS_OPTIONS = [
  { value: 'created', label: 'Новый' },
  { value: 'pending_payment', label: 'Ожидает оплаты' },
  { value: 'paid', label: 'Оплачен' },
  { value: 'purchased', label: 'Выкуплен' },
  { value: 'warehouse_cn', label: 'Склад в Китае' },
  { value: 'in_transit', label: 'В пути в РБ' },
  { value: 'arrived', label: 'Готов к выдаче' },
  { value: 'completed', label: 'Завершен' },
  { value: 'cancelled', label: 'Отменен' },
];

export function AdminOrdersView({ onBackToClient }: AdminOrdersViewProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [editingOrders, setEditingOrders] = useState<Record<string, { status: string; tracking_intl: string; tracking_by: string }>>({});
  const [successOrders, setSuccessOrders] = useState<Record<string, boolean>>({});

  // Fetch all orders for admin
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      try {
        const res = await api.getAdminOrders();
        return res.orders || [];
      } catch (err) {
        console.warn('Failed to load admin orders, falling back to user orders:', err);
        const res = await api.getUserOrders();
        return (res.orders || []) as AdminOrder[];
      }
    },
  });

  const orders: AdminOrder[] = data || [];

  // Mutation to update order status and tracking
  const updateMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
      trackingIntl,
      trackingBy,
    }: {
      orderId: string;
      status: string;
      trackingIntl: string;
      trackingBy: string;
    }) => {
      return api.updateOrderStatus(orderId, {
        status,
        tracking_number_intl: trackingIntl || undefined,
        tracking_number_by: trackingBy || undefined,
      });
    },
    onSuccess: (_, variables) => {
      tgUtil.haptic('notification');
      setSuccessOrders((prev) => ({ ...prev, [variables.orderId]: true }));
      setTimeout(() => {
        setSuccessOrders((prev) => ({ ...prev, [variables.orderId]: false }));
      }, 2500);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => {
      tgUtil.haptic('impact');
      alert(`Ошибка обновления заказа: ${err.message}`);
    },
  });

  const handleStatusChange = (orderId: string, status: string) => {
    setEditingOrders((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {
          status,
          tracking_intl: orders.find((o) => o.id === orderId)?.tracking_number_intl || '',
          tracking_by: orders.find((o) => o.id === orderId)?.tracking_number_by || '',
        }),
        status,
      },
    }));
  };

  const handleTrackingIntlChange = (orderId: string, val: string) => {
    setEditingOrders((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {
          status: orders.find((o) => o.id === orderId)?.status || 'created',
          tracking_intl: val,
          tracking_by: orders.find((o) => o.id === orderId)?.tracking_number_by || '',
        }),
        tracking_intl: val,
      },
    }));
  };

  const handleTrackingByChange = (orderId: string, val: string) => {
    setEditingOrders((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {
          status: orders.find((o) => o.id === orderId)?.status || 'created',
          tracking_intl: orders.find((o) => o.id === orderId)?.tracking_number_intl || '',
          tracking_by: val,
        }),
        tracking_by: val,
      },
    }));
  };

  const handleSaveOrder = (order: AdminOrder) => {
    const edit = editingOrders[order.id] || {
      status: order.status,
      tracking_intl: order.tracking_number_intl || '',
      tracking_by: order.tracking_number_by || '',
    };

    updateMutation.mutate({
      orderId: order.id,
      status: edit.status,
      trackingIntl: edit.tracking_intl,
      trackingBy: edit.tracking_by,
    });
  };

  // KPI calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_byn || 0), 0);
  const activeOrdersCount = orders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length;
  const completedOrdersCount = orders.filter((o) => o.status === 'completed').length;

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.user_name && o.user_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      selectedStatusFilter === 'all' || o.status === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Top Banner & Exit */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/70 via-slate-900 to-indigo-950/70 border border-red-500/30 flex items-center justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {t('admin_title')}
          </div>
          <p className="text-[10px] text-white/50">{t('admin_subtitle')}</p>
        </div>

        <button
          onClick={onBackToClient}
          className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition active:scale-95"
        >
          {t('admin_exit_btn')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-[10px] text-white/50">{t('admin_stat_revenue')}</div>
          <div className="text-base font-black text-cyan-400">{totalRevenue.toFixed(0)}</div>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-[10px] text-white/50">{t('admin_stat_active')}</div>
          <div className="text-base font-black text-amber-400">{activeOrdersCount}</div>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-[10px] text-white/50">{t('admin_stat_completed')}</div>
          <div className="text-base font-black text-emerald-400">{completedOrdersCount}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder={t('admin_search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900/80 border border-white/15 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => {
            setSelectedStatusFilter('all');
            tgUtil.haptic('selection');
          }}
          className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
            selectedStatusFilter === 'all'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'bg-white/5 hover:bg-white/10 text-white/70'
          }`}
        >
          {t('admin_filter_all')} ({orders.length})
        </button>
        {STATUS_OPTIONS.map((st) => {
          const count = orders.filter((o) => o.status === st.value).length;
          return (
            <button
              key={st.value}
              onClick={() => {
                setSelectedStatusFilter(st.value);
                tgUtil.haptic('selection');
              }}
              className={`px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap ${
                selectedStatusFilter === st.value
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              {st.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-12 text-xs text-cyan-400/60 animate-pulse">
          {t('orders_loading')}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-xs text-white/40">
          Заказов не найдено
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const currentEdit = editingOrders[order.id] || {
              status: order.status,
              tracking_intl: order.tracking_number_intl || '',
              tracking_by: order.tracking_number_by || '',
            };
            const isSaved = successOrders[order.id];

            return (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition space-y-3"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-white/40">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className="text-xs text-white/70 font-semibold mt-0.5">
                      Клиент: {order.user_name || 'Пользователь'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-white">
                      {order.total_byn} BYN
                    </div>
                    <div className="text-[10px] text-cyan-400">
                      Предоплата: {order.prepayment_amount} BYN
                    </div>
                  </div>
                </div>

                {/* Product Title & Link */}
                <div>
                  <a
                    href={order.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-white hover:text-cyan-300 transition line-clamp-2"
                  >
                    🔗 {order.title}
                  </a>
                </div>

                {/* Status Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 block">
                    {t('admin_change_status')}
                  </label>
                  <select
                    value={currentEdit.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tracking numbers inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/50 block mb-0.5">
                      Трек Китай / Intl:
                    </label>
                    <input
                      type="text"
                      placeholder={t('admin_track_intl_placeholder')}
                      value={currentEdit.tracking_intl}
                      onChange={(e) => handleTrackingIntlChange(order.id, e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono placeholder-white/30 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/50 block mb-0.5">
                      Трек РБ (Европочта):
                    </label>
                    <input
                      type="text"
                      placeholder={t('admin_track_by_placeholder')}
                      value={currentEdit.tracking_by}
                      onChange={(e) => handleTrackingByChange(order.id, e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono placeholder-white/30 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Save Button */}
                <div>
                  <button
                    onClick={() => handleSaveOrder(order)}
                    disabled={updateMutation.isPending}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 ${
                      isSaved
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300'
                    }`}
                  >
                    {isSaved ? '✓ ' + t('admin_save_success') : '💾 ' + t('admin_save_btn')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
