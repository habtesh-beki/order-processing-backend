import { getSupabaseClient } from "@/lib/supabase/client";
import type { CustomerBalance } from "@/types";

const supabase = getSupabaseClient();

/**
 * Get a customer's balance
 */
export async function getCustomerBalance(
  businessId: string,
  customerId: string
): Promise<CustomerBalance | null> {
  const { data, error } = await supabase
    .from("customer_balances")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .single();

  if (error) {
    console.error("Error fetching customer balance:", error);
    return null;
  }

  return data;
}

/**
 * Adjust a customer's balance atomically via RPC
 */
export async function adjustCustomerBalance(
  businessId: string,
  customerId: string,
  amount: number
): Promise<CustomerBalance | null> {
  const { data, error } = await supabase.rpc("adjust_customer_balance", {
    p_business_id: businessId,
    p_customer_id: customerId,
    p_amount: amount,
  });

  if (error) {
    console.error("Error adjusting customer balance:", error);
    return null;
  }

  return data;
}
