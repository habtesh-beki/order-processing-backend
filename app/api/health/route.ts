// app/api/health/route.ts
import { getSupabaseClient } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
