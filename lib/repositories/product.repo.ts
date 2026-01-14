import { getSupabaseClient } from "@/lib/supabase/client";
import type { ApiResponse, Product } from "@/types";
import type { NextApiResponse } from "next";
// import type { Product } from "@/types";

const supabase = getSupabaseClient();

// export async function getProduct(
//   businessId: string,
//   productId: string
// ): Promise<Product | null> {
//   const { data, error } = await supabase
//     .from("products")
//     .select("*")
//     .eq("business_id", businessId)
//     .eq("id", productId)
//     .single();

//   if (error) {
//     console.error("Error fetching product:", error);
//     return null;
//   }

//   return data;
// }
export async function getProducts(
  businessId: string,
  productId?: string
): Promise<Product[]> {
  let query = supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId);

  if (productId) {
    query = query.eq("id", productId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    throw error;
  }

  return data || [];
}

export async function listProducts(businessId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId);

  if (error) {
    console.error("Error fetching products:", error);
    return [];
  }

  return data || [];
}

export async function createProduct(
  businessId: string,
  name: string,
  stock: number,
  price: number
): Promise<Product | null> {
  // Just handle database operations,
  const { data, error } = await supabase
    .from("products")
    .insert([{ business_id: businessId, name, stock, price }])
    .select()
    .single();

  if (error) {
    console.error("Error creating product:", error);
    return null;
  }

  return data;
}
