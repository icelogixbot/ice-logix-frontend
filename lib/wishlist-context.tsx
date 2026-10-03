'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { tgUtil } from '@/lib/telegram';

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  platform: string;
  imageUrl: string;
  url: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  count: number;
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: string) => void;
  toggleWishlist: (item: WishlistItem) => void;
  isWishlisted: (id: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const STORAGE_KEY = 'ice_wishlist_items_v2';

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setItems(JSON.parse(saved));
        }
      } catch (err) {
        console.error('Failed to load wishlist:', err);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.error('Failed to save wishlist:', err);
      }
    }
  }, [items, isLoaded]);

  const addToWishlist = (item: WishlistItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      tgUtil.haptic('selection');
      return [item, ...prev];
    });
  };

  const removeFromWishlist = (id: string) => {
    tgUtil.haptic('light');
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleWishlist = (item: WishlistItem) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        tgUtil.haptic('light');
        return prev.filter((i) => i.id !== item.id);
      } else {
        tgUtil.haptic('selection');
        return [item, ...prev];
      }
    });
  };

  const isWishlisted = (id: string) => {
    return items.some((i) => i.id === id);
  };

  const clearWishlist = () => {
    tgUtil.haptic('light');
    setItems([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        count: items.length,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isWishlisted,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
