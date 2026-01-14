import { getSupabaseClient } from "@/lib/supabase/client";
import type { Customer, CustomerBalance } from "@/types";

const supabase = getSupabaseClient();

export async function getCustomersByBusiness(
  businessId: string
): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId);

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  return data || [];
}

export async function getCustomerById(
  businessId: string,
  customerId: string
): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", customerId)
    .single();

  if (error) {
    console.error("Error fetching customer:", error);
    return null;
  }

  return data;
}

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

export async function createCustomer(
  businessId: string,
  name: string,
  creditLimit: number
): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .insert([{ business_id: businessId, name, credit_limit: creditLimit }])
    .select()
    .single();

  if (error) {
    console.error("Error creating customer:", error);
    return null;
  }

  // Initialize customer balance
  await supabase
    .from("customer_balances")
    .insert([{ customer_id: data.id, business_id: businessId, balance: 0 }]);

  return data;
}
