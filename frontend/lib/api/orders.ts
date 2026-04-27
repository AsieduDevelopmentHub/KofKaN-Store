import { apiFetchBlobAuth, apiFetchJson, apiFetchJsonAuth } from "@/lib/api/client";
import { V1 } from "@/lib/api/v1-paths";

export type OrderRow = {
  id: number;
  user_id: number;
  total_price: number;
  subtotal_amount?: number | null;
  delivery_fee?: number;
  shipping_method?: string | null;
  shipping_region?: string | null;
  shipping_city?: string | null;
  status: string;
  shipping_address?: string | null;
  shipping_provider?: string | null;
  shipping_contact_name?: string | null;
  shipping_contact_phone?: string | null;
  notes?: string | null;
  payment_status?: string;
  paystack_reference?: string | null;
  confirmation_email_sent_at?: string | null;
  created_at: string;
  updated_at: string;
  preview_product_name?: string | null;
  preview_image_url?: string | null;
  line_count?: number;
};

export type OrderLineItem = {
  id: number;
  order_id: number;
  product_id: number;
  variant_id?: number | null;
  variant_name?: string | null;
  variant_detail_snapshot?: string | null;
  quantity: number;
  price_at_purchase: number;
  created_at: string;
  product_name?: string | null;
  product_image_url?: string | null;
};

export type OrderInvoiceSummary = {
  id: number;
  order_id: number;
  invoice_number: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  payment_method?: string | null;
  status: string;
  issued_at: string;
  due_at?: string | null;
  paid_at?: string | null;
  pdf_url?: string | null;
};

export type OrderDetail = OrderRow & {
  items: OrderLineItem[];
  invoice: OrderInvoiceSummary | null;
};

export type OrderCreateBody = {
  shipping_address?: string | null;
  notes?: string | null;
  shipping_method: "pickup" | "delivery";
  shipping_region?: string | null;
  shipping_city?: string | null;
  shipping_provider?: string | null;
  shipping_contact_name?: string | null;
  shipping_contact_phone?: string | null;
};

export type ShippingCityOption = { name: string; fee: number };
export type ShippingRegionOption = {
  slug: string;
  label: string;
  base_fee: number;
  cities: ShippingCityOption[];
};
export type ShippingCourierOption = { name: string; fee_delta: number };
export type ShippingOptions = {
  regions: ShippingRegionOption[];
  couriers: ShippingCourierOption[];
};

export async function ordersList(accessToken: string): Promise<OrderRow[]> {
  return apiFetchJsonAuth<OrderRow[]>(accessToken, V1.orders.list);
}

export async function ordersCreate(accessToken: string, body: OrderCreateBody): Promise<OrderRow> {
  return apiFetchJsonAuth<OrderRow>(accessToken, V1.orders.create, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function ordersShippingOptions(): Promise<ShippingOptions> {
  return apiFetchJson<ShippingOptions>(V1.orders.shippingOptions);
}

export async function ordersDetail(accessToken: string, orderId: number): Promise<OrderDetail> {
  return apiFetchJsonAuth<OrderDetail>(accessToken, V1.orders.detail(orderId));
}

export async function ordersInvoicePdfBlob(accessToken: string, orderId: number): Promise<Blob> {
  return apiFetchBlobAuth(accessToken, V1.orders.invoicePdf(orderId));
}

export function downloadBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
