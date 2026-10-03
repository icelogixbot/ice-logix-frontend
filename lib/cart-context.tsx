'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { triggerHaptic } from '@/lib/telegram';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  url: string;
  image_url?: string;
  size?: string;
  color?: string;
  weight_kg: number;
  category: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPriceCNY: number;
  totalWeightKg: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('ice_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveItems = (newItems: CartItem[]) => {
    setItems(newItems);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ice_cart', JSON.stringify(newItems));
    }
  };

  const addItem = (item: Omit<CartItem, 'id'>) => {
    const newItem: CartItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
    const next = [...items, newItem];
    saveItems(next);
    triggerHaptic('success');
  };

  const removeItem = (id: string) => {
    const next = items.filter((it) => it.id !== id);
    saveItems(next);
    triggerHaptic('light');
  };

  const clearCart = () => {
    saveItems([]);
    triggerHaptic('light');
  };

  const totalItems = items.length;
  const totalPriceCNY = items.reduce((acc, it) => acc + (it.currency === 'CNY' ? it.price : it.price * 7.2), 0);
  const totalWeightKg = items.reduce((acc, it) => acc + (it.weight_kg || 1.0), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        totalItems,
        totalPriceCNY,
        totalWeightKg,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      items: [],
      addItem: () => {},
      removeItem: () => {},
      clearCart: () => {},
      totalItems: 0,
      totalPriceCNY: 0,
      totalWeightKg: 0,
    };
  }
  return ctx;
}
