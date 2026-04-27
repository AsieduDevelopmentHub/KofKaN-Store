"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CartAuthModal } from "@/components/cart/CartAuthModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useCatalog } from "@/context/CatalogContext";
import {
  cartAddItem,
  cartDeleteItem,
  cartList,
  cartUpdateItem,
} from "@/lib/api/cartApi";
import { formatGhs, type MockProduct } from "@/lib/mock-data";
import { useCartStore, type CartLine, type AddToCartOptions } from "@/lib/store/useCartStore";

type PendingAdd = {
  productId: string;
  qty: number;
  opts: AddToCartOptions;
};

type CartContextValue = {
  lines: CartLine[];
  addProduct: (productId: string, qty?: number, opts?: AddToCartOptions) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  removeLine: (lineKey: string) => void;
  subtotal: number;
  shipping: number;
  total: number;
  formatTotal: () => string;
  cartSyncing: boolean;
  cartActionError: string | null;
  clearCartActionError: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function makeLineKey(productId: string, variantId?: number | null): string {
  return `${productId}|${variantId ?? ""}`;
}

function mergePendingIntoLines(
  base: CartLine[],
  pending: PendingAdd | null,
  getProduct: (id: string) => MockProduct | undefined
): CartLine[] {
  if (!pending) return base;
  const p = getProduct(pending.productId);
  if (!p) return base;
  const key = makeLineKey(pending.productId, pending.opts.variantId ?? null);
  const i = base.findIndex((l) => l.lineKey === key);
  if (i >= 0) {
    const next = [...base];
    next[i] = { ...next[i], quantity: next[i].quantity + pending.qty };
    return next;
  }
  const unitPrice = p.price + (pending.opts.priceDelta ?? 0);
  return [
    ...base,
    {
      product: p,
      quantity: pending.qty,
      unitPrice,
      variantId: pending.opts.variantId ?? null,
      variantLabel: pending.opts.variantLabel ?? null,
      variantImage: pending.opts.variantImage ?? null,
      lineKey: key,
    },
  ];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, accessToken, loading: authLoading } = useAuth();
  const { getProduct, source } = useCatalog();
  const { showToast } = useToast();
  
  // Zustand State
  const lines = useCartStore((s) => s.lines);
  const setLines = useCartStore((s) => s.setLines);
  const cartSyncing = useCartStore((s) => s.cartSyncing);
  const setCartSyncing = useCartStore((s) => s.setCartSyncing);
  const cartActionError = useCartStore((s) => s.cartActionError);
  const setCartActionError = useCartStore((s) => s.setCartActionError);
  const clearCartActionError = useCartStore((s) => s.clearCartActionError);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  const [cartAuthOpen, setCartAuthOpen] = useState(false);
  const pendingAddRef = useRef<PendingAdd | null>(null);
  const prevHadUserRef = useRef(false);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const getProductRef = useRef(getProduct);
  getProductRef.current = getProduct;
  const syncedUserIdRef = useRef<number | null>(null);

  const addProductInternal = useCallback(
    (productId: string, qty: number, opts: AddToCartOptions) => {
      const product = getProduct(productId);
      if (!product) return;
      const key = makeLineKey(productId, opts.variantId ?? null);
      const currentLines = linesRef.current;
      const i = currentLines.findIndex((l) => l.lineKey === key);
      
      if (i >= 0) {
        const next = [...currentLines];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        setLines(next);
      } else {
        const unitPrice = product.price + (opts.priceDelta ?? 0);
        setLines([
          {
            product,
            quantity: qty,
            unitPrice,
            variantId: opts.variantId ?? null,
            variantLabel: opts.variantLabel ?? null,
            variantImage: opts.variantImage ?? null,
            lineKey: key,
          },
          ...currentLines,
        ]);
      }
    },
    [getProduct, setLines]
  );

  const addProduct = useCallback(
    (productId: string, qty = 1, opts: AddToCartOptions = {}) => {
      if (authLoading) return;
      
      // Always add locally first
      addProductInternal(productId, qty, opts);
      
      if (!user) {
        // Guest mode: just show toast
        showToast("Added to bag (log in to sync)");
        return;
      }

      if (!accessToken) return;
      
      setCartActionError(null);
      if (source === "mock") {
        setCartActionError(
          "We're offline — your cart is saved on this device and will sync when you're back online."
        );
        return;
      }

      const snapshot = linesRef.current;
      const key = makeLineKey(productId, opts.variantId ?? null);
      void (async () => {
        try {
          const row = await cartAddItem(accessToken, {
            product_id: Number(productId),
            quantity: qty,
            variant_id: opts.variantId ?? null,
          });
          setLines(
            linesRef.current.map((l) =>
              l.lineKey === key ? { ...l, serverLineId: row.id } : l
            )
          );
          showToast("Added to bag");
        } catch (e) {
          setLines(snapshot);
          setCartActionError(e instanceof Error ? e.message : "Could not add to bag.");
        }
      })();
    },
    [user, accessToken, authLoading, addProductInternal, source, showToast, setLines, setCartActionError]
  );

  useEffect(() => {
    if (authLoading || !user || !accessToken) {
      syncedUserIdRef.current = null;
      return;
    }
    if (syncedUserIdRef.current === user.id) return;

    let cancelled = false;
    (async () => {
      setCartSyncing(true);
      try {
        const pending = pendingAddRef.current;
        pendingAddRef.current = null;
        
        // Merge guest lines into the server
        const guestLines = linesRef.current.filter(l => !l.serverLineId);
        
        if (guestLines.length > 0 || pending) {
          const merged = mergePendingIntoLines(guestLines, pending, getProductRef.current);
          await Promise.allSettled(
            merged.map((line) =>
              cartAddItem(accessToken, {
                product_id: Number(line.product.id),
                quantity: line.quantity,
                variant_id: line.variantId ?? null,
              })
            )
          );
        }

        if (cancelled) return;
        const server = await cartList(accessToken);
        if (cancelled) return;
        const mapped: CartLine[] = [];
        for (const si of server) {
          const product = getProductRef.current(String(si.product_id));
          if (!product) continue;
          const priceDelta = si.variant_price_delta ?? 0;
          mapped.push({
            product,
            quantity: si.quantity,
            unitPrice: product.price + priceDelta,
            variantId: si.variant_id ?? null,
            variantLabel: si.variant_name ?? null,
            variantImage: si.variant_image_url ?? null,
            lineKey: makeLineKey(String(si.product_id), si.variant_id ?? null),
            serverLineId: si.id,
          });
        }
        setLines(mapped);
        syncedUserIdRef.current = user.id;
      } catch (e) {
        console.warn("[KofKaN] cart sync failed", e);
      } finally {
        if (!cancelled) setCartSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, accessToken, authLoading, setCartSyncing, setLines]);

  useEffect(() => {
    if (authLoading) return;
    if (!user && prevHadUserRef.current) {
      setLines([]);
      pendingAddRef.current = null;
      setCartAuthOpen(false);
      syncedUserIdRef.current = null;
    }
    prevHadUserRef.current = !!user;
  }, [user, authLoading, setLines]);

  const dismissCartAuth = useCallback(() => {
    pendingAddRef.current = null;
    setCartAuthOpen(false);
  }, []);

  const afterCartAuth = useCallback(() => {
    setCartAuthOpen(false);
  }, []);

  const setQuantity = useCallback(
    (lineKey: string, quantity: number) => {
      const cur = linesRef.current.find((l) => l.lineKey === lineKey);
      if (!cur) return;
      if (quantity < 1) {
        if (cur.serverLineId && accessToken) {
          void cartDeleteItem(accessToken, cur.serverLineId).catch((e) =>
            console.warn("[KofKaN] cart delete line failed", e)
          );
        }
        setLines(linesRef.current.filter((l) => l.lineKey !== lineKey));
        return;
      }
      if (cur.serverLineId && accessToken) {
        void cartUpdateItem(accessToken, cur.serverLineId, quantity).catch((e) =>
          console.warn("[KofKaN] cart update failed", e)
        );
      }
      setLines(
        linesRef.current.map((l) => (l.lineKey === lineKey ? { ...l, quantity } : l))
      );
    },
    [accessToken, setLines]
  );

  const removeLine = useCallback(
    (lineKey: string) => {
      const cur = linesRef.current.find((l) => l.lineKey === lineKey);
      if (!cur) return;
      if (cur.serverLineId && accessToken) {
        void cartDeleteItem(accessToken, cur.serverLineId).catch((e) =>
          console.warn("[KofKaN] cart delete line failed", e)
        );
      }
      setLines(linesRef.current.filter((l) => l.lineKey !== lineKey));
    },
    [accessToken, setLines]
  );

  const subtotal = getSubtotal();
  const total = subtotal;

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      addProduct,
      setQuantity,
      removeLine,
      subtotal,
      shipping: 0,
      total,
      formatTotal: () => formatGhs(total),
      cartSyncing,
      cartActionError,
      clearCartActionError,
    }),
    [
      lines,
      addProduct,
      setQuantity,
      removeLine,
      subtotal,
      total,
      cartSyncing,
      cartActionError,
      clearCartActionError,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartAuthModal open={cartAuthOpen} onDismiss={dismissCartAuth} onAuthenticated={afterCartAuth} />
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
