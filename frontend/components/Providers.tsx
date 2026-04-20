"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { login, register, type AuthResponse, type AuthUser } from "@/lib/api/auth";
import { addToCart, fetchCart, removeCartItem, type CartLine, updateCartItem } from "@/lib/api/cart";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  cart: CartLine[];
  cartTotal: number;
  loginUser: (payload: { email: string; password: string }) => Promise<void>;
  registerUser: (payload: { email: string; full_name: string; password: string }) => Promise<void>;
  applyAuth: (auth: AuthResponse) => void;
  logout: () => void;
  refreshCart: () => Promise<void>;
  addItem: (productId: number) => Promise<void>;
  updateItem: (cartItemId: number, quantity: number) => Promise<void>;
  removeItem: (cartItemId: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function persistSession(auth: AuthResponse) {
  localStorage.setItem("kofkan_token", auth.access_token);
  localStorage.setItem("kofkan_user", JSON.stringify(auth.user));
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);

  useEffect(() => {
    const savedToken = localStorage.getItem("kofkan_token");
    const savedUser = localStorage.getItem("kofkan_user");
    if (savedToken) {
      setToken(savedToken);
    }
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as AuthUser);
      } catch {
        setUser(null);
      }
    }
  }, []);

  const refreshCart = async () => {
    if (!token) {
      setCart([]);
      return;
    }
    try {
      const lines = await fetchCart(token);
      setCart(lines);
    } catch {
      setCart([]);
    }
  };

  useEffect(() => {
    void refreshCart();
  }, [token]);

  const loginUser = async (payload: { email: string; password: string }) => {
    const auth = await login(payload);
    persistSession(auth);
    setToken(auth.access_token);
    setUser(auth.user);
  };

  const registerUser = async (payload: { email: string; full_name: string; password: string }) => {
    const auth = await register(payload);
    persistSession(auth);
    setToken(auth.access_token);
    setUser(auth.user);
  };

  const logout = () => {
    localStorage.removeItem("kofkan_token");
    localStorage.removeItem("kofkan_user");
    setToken(null);
    setUser(null);
    setCart([]);
  };

  const applyAuth = (auth: AuthResponse) => {
    persistSession(auth);
    setToken(auth.access_token);
    setUser(auth.user);
  };

  const addItem = async (productId: number) => {
    if (!token) {
      throw new Error("Please login first");
    }
    const lines = await addToCart(token, { product_id: productId, quantity: 1 });
    setCart(lines);
  };

  const updateItem = async (cartItemId: number, quantity: number) => {
    if (!token) {
      return;
    }
    const lines = await updateCartItem(token, cartItemId, quantity);
    setCart(lines);
  };

  const removeItem = async (cartItemId: number) => {
    if (!token) {
      return;
    }
    const lines = await removeCartItem(token, cartItemId);
    setCart(lines);
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.line_total, 0), [cart]);

  const value: AuthContextValue = {
    token,
    user,
    cart,
    cartTotal,
    loginUser,
    registerUser,
    applyAuth,
    logout,
    refreshCart,
    addItem,
    updateItem,
    removeItem
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAppSession must be used inside Providers");
  }
  return ctx;
}
