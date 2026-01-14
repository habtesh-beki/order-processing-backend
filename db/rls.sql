-- Row Level Security Policies for multi-tenant isolation

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get current business_id from JWT
CREATE OR REPLACE FUNCTION get_current_business_id() RETURNS UUID AS $$
  SELECT (auth.jwt()->>'business_id')::uuid
$$ LANGUAGE SQL STABLE;

-- Businesses RLS policies
CREATE POLICY businesses_select ON businesses
  FOR SELECT
  USING (id = get_current_business_id());

CREATE POLICY businesses_insert ON businesses
  FOR INSERT
  WITH CHECK (id = get_current_business_id());

-- Customers RLS policies
CREATE POLICY customers_select ON customers
  FOR SELECT
  USING (business_id = get_current_business_id());

CREATE POLICY customers_insert ON customers
  FOR INSERT
  WITH CHECK (business_id = get_current_business_id());

-- Products RLS policies
CREATE POLICY products_select ON products
  FOR SELECT
  USING (business_id = get_current_business_id());

CREATE POLICY products_insert ON products
  FOR INSERT
  WITH CHECK (business_id = get_current_business_id());

CREATE POLICY products_update ON products
  FOR UPDATE
  USING (business_id = get_current_business_id());

-- Customer balances RLS policies
CREATE POLICY customer_balances_select ON customer_balances
  FOR SELECT
  USING (business_id = get_current_business_id());

CREATE POLICY customer_balances_update ON customer_balances
  FOR UPDATE
  USING (business_id = get_current_business_id());

-- Orders RLS policies
CREATE POLICY orders_select ON orders
  FOR SELECT
  USING (business_id = get_current_business_id());

CREATE POLICY orders_insert ON orders
  FOR INSERT
  WITH CHECK (business_id = get_current_business_id());

-- Order items RLS policies
CREATE POLICY order_items_select ON order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE business_id = get_current_business_id()
    )
  );

CREATE POLICY order_items_insert ON order_items
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE business_id = get_current_business_id()
    )
  );
