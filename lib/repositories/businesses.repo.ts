import { getSupabaseClient } from "@/lib/supabase/client";
import type { Business } from "@/types";

const supabase = getSupabaseClient();

export async function getBusiness(
  businessId: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error) {
    console.error("Error fetching business:", error);
    return null;
  }

  return data;
}

export async function getBusinesses(): Promise<Business[]> {
  const { data, error } = await supabase.from("businesses").select("*");

  if (error) {
    console.error("Error fetching businesses:", error);
    return [];
  }

  return data || [];
}

export async function createBusiness(name: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .insert([{ name }])
    .select()
    .single();

  if (error) {
    console.error("Error creating business:", error);
    return null;
  }

  return data;
}
