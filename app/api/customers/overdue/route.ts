import { getSupabaseClient } from "@/lib/supabase/client"
import type { ApiResponse, OverdueCustomer } from "@/types"

const supabase = getSupabaseClient()

export async function GET(request: Request): Promise<Response> {
  try {
    // Get business_id from request headers (in production, from JWT)
    const businessId = request.headers.get("x-business-id") || process.env.NEXT_PUBLIC_DEFAULT_BUSINESS_ID

    if (!businessId) {
      return Response.json({ success: false, error: "Missing business_id" }, { status: 400 })
    }

    // Get query parameters for filtering
    const url = new URL(request.url)
    const daysOverdue = Number.parseInt(url.searchParams.get("days") || "30", 10)

    // Call the get_overdue_customers RPC function
    const { data, error } = await supabase.rpc("get_overdue_customers", {
      p_business_id: businessId,
      p_days_overdue: daysOverdue,
    })

    if (error) {
      console.error("RPC error:", error)
      return Response.json(
        { success: false, error: error.message || "Failed to fetch overdue customers" },
        { status: 500 },
      )
    }

    const response: ApiResponse<OverdueCustomer[]> = {
      success: true,
      data: data || [],
    }

    return Response.json(response, { status: 200 })
  } catch (error) {
    console.error("Error fetching overdue customers:", error)
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
