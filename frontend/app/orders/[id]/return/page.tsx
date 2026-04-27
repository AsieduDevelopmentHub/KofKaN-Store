import { OrderReturnRequestClient } from "./OrderReturnRequestClient";

export const metadata = { title: "Request a return · KofKaN Store" };

type Props = { params: Promise<{ id: string }> };

export default async function OrderReturnPage({ params }: Props) {
  const { id } = await params;
  return <OrderReturnRequestClient orderIdParam={id} />;
}
