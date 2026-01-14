import { getSupabaseClient } from "@/lib/supabase/client"
import type { Order, OrderItem } from "@/types"

const supabase = getSupabaseClient()

export async function getOrder(businessId: string, orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", orderId)
    .single()

  if (error) {
    console.error("Error fetching order:", error)
    return null
  }

  return data
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase.from("order_items").select("*").eq("order_id", orderId)

  if (error) {
    console.error("Error fetching order items:", error)
    return []
  }

  return data || []
}

export async function listOrders(businessId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching orders:", error)
    return []
  }

  return data || []
}
