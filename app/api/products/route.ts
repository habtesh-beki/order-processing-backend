// src/app/api/products/route.ts
import { getSupabaseClient } from "@/lib/supabase/client";
import { createProduct, getProducts } from "@/lib/repositories/product.repo";

import type { ApiResponse, Product } from "@/types";

const supabase = getSupabaseClient();

// GET all products or a single product by id
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

    // Optional query param to fetch single product
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    const products = await getProducts(businessId, id || undefined);

    const response: ApiResponse<Product[]> = {
      success: true,
      data: products || [],
    };

    return Response.json(response, { status: 200 });
  } catch (err) {
    console.error("Error in GET /products:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - create a new product
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

    const { name, stock, price } = await request.json();

    if (!name || stock == null || price == null) {
      return Response.json(
        { success: false, error: "Missing product fields" },
        { status: 400 }
      );
    }

    const product = await createProduct(businessId, name, stock, price);

    if (!product) {
      return Response.json(
        { success: false, error: "Failed to create product" },
        { status: 500 }
      );
    }

    const response: ApiResponse<Product> = {
      success: true,
      data: product,
    };

    return Response.json(response, { status: 201 });
  } catch (err) {
    console.error("Error in POST /products:", err);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
