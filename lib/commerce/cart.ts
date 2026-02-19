/**
 * Cart System for XOM3 Commerce
 * Supports authenticated (Supabase) and guest (localStorage) carts
 */

import { createClient } from '@supabase/supabase-js';

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  category?: string;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

const GUEST_CART_KEY = 'xom3_guest_cart';

// Guest cart helpers (localStorage)
export function getGuestCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setGuestCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function clearGuestCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_CART_KEY);
}

export function addToGuestCart(item: Omit<CartItem, 'id'>) {
  const items = getGuestCart();
  const existing = items.find(i => i.product_id === item.product_id);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    items.push({ ...item, id: `guest_${Date.now()}_${Math.random().toString(36).slice(2)}` });
  }
  setGuestCart(items);
  return items;
}

export function removeFromGuestCart(productId: string) {
  const items = getGuestCart().filter(i => i.product_id !== productId);
  setGuestCart(items);
  return items;
}

export function updateGuestCartQuantity(productId: string, quantity: number) {
  const items = getGuestCart();
  const item = items.find(i => i.product_id === productId);
  if (item) {
    if (quantity <= 0) {
      return removeFromGuestCart(productId);
    }
    item.quantity = quantity;
  }
  setGuestCart(items);
  return items;
}

export function calculateCartTotals(items: CartItem[]): Cart {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return { items, itemCount, subtotal };
}
