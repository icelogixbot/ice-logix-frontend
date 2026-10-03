'use client';

import React from 'react';
import { triggerHaptic } from '@/lib/telegram';
import { useI18n } from '@/lib/i18n/context';

export type TabType = 'home' | 'calculator' | 'neworder' | 'catalogs' | 'profile';

interface TabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export function BottomTabs({ activeTab, onChange }: TabsProps) {
  const { t } = useI18n();

  const handleTabClick = (tab: TabType) => {
    triggerHaptic('selection');
    onChange(tab);
  };

  return (
    <div className="tab-bar" id="tabBar">
      {/* 1. Главная */}
      <div
        className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
        data-tab="home"
        onClick={() => handleTabClick('home')}
      >
        <span className="tab-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
          </svg>
        </span>
        <span className="tab-label">{t('tab_home', 'Главная')}</span>
      </div>

      {/* 2. Калькулятор */}
      <div
        className={`tab-item ${activeTab === 'calculator' ? 'active' : ''}`}
        data-tab="calculator"
        onClick={() => handleTabClick('calculator')}
      >
        <span className="tab-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" x2="16" y1="6" y2="6" />
            <line x1="8" x2="8" y1="10" y2="10" />
            <line x1="12" x2="12" y1="10" y2="10" />
            <line x1="16" x2="16" y1="10" y2="10" />
            <line x1="8" x2="8" y1="14" y2="14" />
            <line x1="12" x2="12" y1="14" y2="14" />
            <line x1="16" x2="16" y1="14" y2="14" />
            <line x1="8" x2="8" y1="18" y2="18" />
            <line x1="12" x2="12" y1="18" y2="18" />
            <line x1="16" x2="16" y1="18" y2="18" />
          </svg>
        </span>
        <span className="tab-label">{t('tab_calc', 'Калькулятор')}</span>
      </div>

      {/* 3. Заказ (Центральная кнопка CTA) */}
      <div
        className={`tab-item new-order ${activeTab === 'neworder' ? 'active' : ''}`}
        data-tab="neworder"
        onClick={() => handleTabClick('neworder')}
      >
        <span className="tab-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
        </span>
        <span className="tab-label">{t('tab_order', 'Заказ')}</span>
      </div>

      {/* 4. Каталоги */}
      <div
        className={`tab-item ${activeTab === 'catalogs' ? 'active' : ''}`}
        data-tab="catalogs"
        onClick={() => handleTabClick('catalogs')}
      >
        <span className="tab-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </span>
        <span className="tab-label">{t('tab_catalogs', 'Каталоги')}</span>
      </div>

      {/* 5. Профиль */}
      <div
        className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}
        data-tab="profile"
        onClick={() => handleTabClick('profile')}
      >
        <span className="tab-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className="tab-label">{t('tab_profile', 'Профиль')}</span>
      </div>
    </div>
  );
}
