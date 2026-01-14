import type { ApiResponse } from "@/types";
import {
  getCustomerBalance,
  adjustCustomerBalance,
} from "@/lib/repositories/customerBalance.repo";

export async function GET(request: Request): Promise<Response> {
  const businessId =
    request.headers.get("x-business-id") ||
    process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID;

  if (!businessId) {
    return Response.json(
      { success: false, error: "Missing business_id" },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const customerId = url.searchParams.get("customer_id");

  if (!customerId) {
    return Response.json(
      { success: false, error: "Missing customer_id" },
      { status: 400 }
    );
  }

  const data = await getCustomerBalance(businessId, customerId);

  return Response.json({ success: true, data }, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const businessId =
    request.headers.get("x-business-id") ||
    process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID;

  if (!businessId) {
    return Response.json(
      { success: false, error: "Missing business_id" },
      { status: 400 }
    );
  }

  const { customer_id, amount } = await request.json();

  if (!customer_id || amount === undefined) {
    return Response.json(
      { success: false, error: "Missing customer_id or amount" },
      { status: 400 }
    );
  }

  const data = await adjustCustomerBalance(businessId, customer_id, amount);

  if (!data) {
    return Response.json(
      { success: false, error: "Failed to adjust balance" },
      { status: 500 }
    );
  }

  return Response.json({ success: true, data }, { status: 200 });
}
