import { getSupabaseClient } from "@/lib/supabase/client";
import type { PurchaseRequest } from "@/types";

const supabase = getSupabaseClient();

export async function POST(request: Request): Promise<Response> {
  try {
    const body: PurchaseRequest = await request.json();
    const { customer_id, items } = body;

    // Get business_id from request headers (in production, from JWT)
    const businessId =
      request.headers.get("x-business-id") ||
      process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID;

    if (!businessId) {
      return Response.json(
        { success: false, error: "Missing business_id" },
        { status: 400 }
      );
    }

    // Validate request
    if (!customer_id) {
      return Response.json(
        { success: false, error: "customer_id is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json(
        {
          success: false,
          error: "items array is required and must not be empty",
        },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.unit_price === undefined) {
        return Response.json(
          {
            success: false,
            error: "Each item must have product_id, quantity, and unit_price",
          },
          { status: 400 }
        );
      }

      if (item.quantity <= 0) {
        return Response.json(
          { success: false, error: "Quantity must be greater than 0" },
          { status: 400 }
        );
      }

      if (item.unit_price < 0) {
        return Response.json(
          { success: false, error: "unit_price cannot be negative" },
          { status: 400 }
        );
      }
    }

    // Call the process_purchase RPC function
    const { data, error } = await supabase.rpc("process_purchase", {
      p_business_id: businessId,
      p_customer_id: customer_id,
      p_items: items,
    });

    if (error) {
      console.error("RPC error:", error);
      return Response.json(
        {
          success: false,
          error: error.message || "Failed to process purchase",
        },
        { status: 400 }
      );
    }

    if (!data.success) {
      return Response.json(
        { success: false, error: data.error || "Purchase failed" },
        { status: 400 }
      );
    }

    return Response.json({ success: true, data: data }, { status: 201 });
  } catch (error) {
    console.error("Error processing purchase:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
