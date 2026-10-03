'use client';

import React from 'react';
import { Search, Calculator, Package, User } from 'lucide-react';
import { triggerHaptic } from '@/lib/telegram';
import { useI18n } from '@/lib/i18n/context';

export type TabType = 'search' | 'calculator' | 'orders' | 'profile';

interface TabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  ordersCount?: number;
}

export function BottomTabs({ activeTab, onChange, ordersCount = 0 }: TabsProps) {
  const { t } = useI18n();

  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'search', label: t('nav_search', 'Поиск'), icon: Search },
    { id: 'calculator', label: t('nav_calculator', 'Калькулятор'), icon: Calculator },
    { id: 'orders', label: t('nav_orders', 'Заказы'), icon: Package, badge: ordersCount > 0 ? ordersCount : undefined },
    { id: 'profile', label: t('nav_profile', 'Профиль'), icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-lg border-t border-white/10 safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto py-2 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                onChange(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-200 ${
                isActive ? 'text-cyan-400 font-medium' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-cyan-500 text-black font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
