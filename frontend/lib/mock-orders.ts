export type OrderStatus = "delivered" | "processing" | "shipped";

export type MockOrder = {
  id: string;
  orderNumber: string;
  name: string;
  price: number;
  /** Display like mockup: Apr 16, 2024 */
  dateLabel: string;
  status: OrderStatus;
  image: string;
  rating: number;
};

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: "o1",
    orderNumber: "20234",
    name: "Arduino UNO R3 Starter Pack",
    price: 580,
    dateLabel: "Apr 16, 2026",
    status: "shipped",
    rating: 5,
    image:
      "https://images.unsplash.com/photo-1516110833967-0b5716ca1387?w=200&h=200&fit=crop",
  },
  {
    id: "o2",
    orderNumber: "20198",
    name: "ESP32 WiFi + BLE Dev Board",
    price: 165,
    dateLabel: "Apr 10, 2026",
    status: "delivered",
    rating: 5,
    image:
      "https://images.unsplash.com/photo-1553406830-ef2513450d76?w=200&h=200&fit=crop",
  },
  {
    id: "o3",
    orderNumber: "20185",
    name: "MG996R Servo Motor",
    price: 78,
    dateLabel: "Apr 8, 2026",
    status: "processing",
    rating: 5,
    image:
      "https://images.unsplash.com/photo-1591808216268-ce0a1b5944f7?w=200&h=200&fit=crop",
  },
];

export function statusLabel(s: OrderStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function statusClass(s: OrderStatus): string {
  switch (s) {
    case "delivered":
      return "bg-emerald-700 text-white ring-emerald-800";
    case "processing":
      return "bg-kofkan-crimson text-white ring-kofkan-crimson";
    case "shipped":
      return "bg-amber-100 text-amber-950 ring-kofkan-gold/60";
    default:
      return "bg-kofkan-gray-soft text-kofkan-text-secondary";
  }
}
