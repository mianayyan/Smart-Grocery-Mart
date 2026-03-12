import { create } from 'zustand';
import { CartItem, Product } from '@/types';

interface CartStore {
  items: CartItem[];
  taxRate: number;
  discount: number;
  customerPhone: string;
  paymentMethod: string;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  setCustomerPhone: (phone: string) => void;
  setPaymentMethod: (method: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
  getProfit: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  taxRate: 0,
  discount: 0,
  customerPhone: '',
  paymentMethod: 'cash',

  addItem: (product: Product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { product, quantity: 1 }] };
    });
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    }));
  },

  setDiscount: (discount: number) => set({ discount }),
  setCustomerPhone: (phone: string) => set({ customerPhone: phone }),
  setPaymentMethod: (method: string) => set({ paymentMethod: method }),
  clearCart: () =>
    set({ items: [], discount: 0, customerPhone: '', paymentMethod: 'cash' }),

  getSubtotal: () => {
    return get().items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  },

  getTax: () => {
    return (get().getSubtotal() * get().taxRate) / 100;
  },

  getTotal: () => {
    return get().getSubtotal() + get().getTax() - get().discount;
  },

  getProfit: () => {
    return get().items.reduce(
      (sum, item) =>
        sum +
        (item.product.price - item.product.cost_price) * item.quantity,
      0
    );
  },
}));
