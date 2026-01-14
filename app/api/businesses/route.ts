import { getSupabaseClient } from "@/lib/supabase/client";
import type { ApiResponse, Business } from "@/types";

const supabase = getSupabaseClient();

// GET all businesses or a single business by id
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

    // Optional query param to fetch single business
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    let query = supabase.from("businesses").select("*");

    if (id) {
      query = query.eq("id", id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching businesses:", error);
      return Response.json(
        {
          success: false,
          error: error.message || "Failed to fetch businesses",
        },
        { status: 500 }
      );
    }

    const response: ApiResponse<Business[]> = {
      success: true,
      data: data || [],
    };

    return Response.json(response, { status: 200 });
  } catch (err) {
    console.error("Error in GET /businesses:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - create a new business
export async function POST(request: Request): Promise<Response> {
  try {
    const { name } = await request.json();

    if (!name) {
      return Response.json(
        { success: false, error: "Missing business name" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("businesses")
      .insert([{ name }])
      .select()
      .single();

    if (error) {
      console.error("Error creating business:", error);
      return Response.json(
        { success: false, error: error.message || "Failed to create business" },
        { status: 500 }
      );
    }

    const response: ApiResponse<Business> = {
      success: true,
      data,
    };

    return Response.json(response, { status: 201 });
  } catch (err) {
    console.error("Error in POST /businesses:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Make sure this client uses SERVICE ROLE
