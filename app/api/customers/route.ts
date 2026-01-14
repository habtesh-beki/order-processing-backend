import { getSupabaseClient } from "@/lib/supabase/client";
import type { ApiResponse, Customer } from "@/types";
import {
  getCustomersByBusiness,
  getCustomerById,
} from "@/lib/repositories/customer.repo";
const supabase = getSupabaseClient();

export async function GET(request: Request): Promise<Response> {
  try {
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
    const customerId = url.searchParams.get("id");

    let data: Customer[] | Customer | null = null;

    if (customerId) {
      data = await getCustomerById(businessId, customerId);
    } else {
      data = await getCustomersByBusiness(businessId);
    }

    const response: ApiResponse<Customer | Customer[] | null> = {
      success: true,
      data: data || null,
    };

    return Response.json(response, { status: 200 });
  } catch (err) {
    console.error("Error in GET /customers:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - create a new customer
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const businessId =
      request.headers.get("x-business-id") ||
      process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID;

    if (!businessId) {
      return Response.json(
        { success: false, error: "Missing business_id" },
        { status: 400 }
      );
    }

    const { name, credit_limit } = await request.json();

    if (!name || credit_limit === undefined) {
      return Response.json(
        { success: false, error: "Missing name or credit_limit" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          business_id: businessId,
          name,
          credit_limit,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      return Response.json(
        {
          success: false,
          error: error.message || "Failed to create customer",
        },
        { status: 500 }
      );
    }

    // Optional: initialize customer balance
    await supabase.from("customer_balances").insert([
      {
        customer_id: data.id,
        business_id: businessId,
        balance: 0,
      },
    ]);

    const response: ApiResponse<Customer> = {
      success: true,
      data,
    };

    return Response.json(response, { status: 201 });
  } catch (err) {
    console.error("Error in POST /customers:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
