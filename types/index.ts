// Shared TypeScript types

export interface Business {
  id: string
  name: string
  created_at: string
}

export interface Customer {
  id: string
  business_id: string
  name: string
  credit_limit: number
  created_at: string
}

export interface Product {
  id: string
  business_id: string
  name: string
  stock: number
  price: number
  created_at: string
}

export interface CustomerBalance {
  customer_id: string
  business_id: string
  balance: number
  updated_at: string
}

export interface Order {
  id: string
  business_id: string
  customer_id: string
  total_amount: number
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  created_at: string
}

export interface PurchaseRequest {
  customer_id: string
  items: Array<{
    product_id: string
    quantity: number
    unit_price: number
  }>
}

export interface PurchaseResponse {
  success: boolean
  order_id?: string
  total_amount?: number
  customer_balance?: number
  error?: string
}

export interface OverdueCustomer {
  customer_id: string
  customer_name: string
  balance: number
  oldest_order_date: string
  days_since_order: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
