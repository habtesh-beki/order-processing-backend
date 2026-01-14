-- PostgreSQL RPC Functions for transactional operations

-- Process purchase with transaction safety and row locking
CREATE OR REPLACE FUNCTION process_purchase(
  p_business_id UUID,
  p_customer_id UUID,
  p_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_total_amount DECIMAL(12, 2) := 0;
  v_current_balance DECIMAL(12, 2);
  v_credit_limit DECIMAL(12, 2);
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_unit_price DECIMAL(12, 2);
  v_product_stock INTEGER;
  v_item_amount DECIMAL(12, 2);
BEGIN
  -- Start transaction (implicit)

  -- Lock customer balance row
  SELECT balance INTO v_current_balance
  FROM customer_balances
  WHERE customer_id = p_customer_id AND business_id = p_business_id
  FOR UPDATE;

  -- Get customer credit limit
  SELECT credit_limit INTO v_credit_limit
  FROM customers
  WHERE id = p_customer_id AND business_id = p_business_id;

  -- Validate customer exists
  IF v_credit_limit IS NULL THEN
    RAISE EXCEPTION 'Customer not found or does not belong to this business';
  END IF;

  -- Process each item in the order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::DECIMAL;

    -- Lock product row
    SELECT stock INTO v_product_stock
    FROM products
    WHERE id = v_product_id AND business_id = p_business_id
    FOR UPDATE;

    -- Validate product exists
    IF v_product_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found or does not belong to this business', v_product_id;
    END IF;

    -- Validate stock
    IF v_product_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
        v_product_id, v_product_stock, v_quantity;
    END IF;

    -- Calculate item amount
    v_item_amount := v_quantity * v_unit_price;
    v_total_amount := v_total_amount + v_item_amount;

    -- Decrement product stock
    UPDATE products
    SET stock = stock - v_quantity
    WHERE id = v_product_id AND business_id = p_business_id;
  END LOOP;

  -- Validate customer credit
  IF (v_current_balance + v_total_amount) > v_credit_limit THEN
    RAISE EXCEPTION 'Purchase exceeds credit limit. Current balance: %, Purchase amount: %, Credit limit: %',
      v_current_balance, v_total_amount, v_credit_limit;
  END IF;

  -- Create order
  INSERT INTO orders (business_id, customer_id, total_amount)
  VALUES (p_business_id, p_customer_id, v_total_amount)
  RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::DECIMAL;

    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_product_id, v_quantity, v_unit_price);
  END LOOP;

  -- Update customer balance
  UPDATE customer_balances
  SET balance = balance + v_total_amount, updated_at = now()
  WHERE customer_id = p_customer_id AND business_id = p_business_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_amount', v_total_amount,
    'customer_balance', (v_current_balance + v_total_amount)
  );

EXCEPTION WHEN OTHERS THEN
  -- Rollback happens automatically on exception
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION get_overdue_customers(
  p_business_id UUID,
  p_days_overdue INTEGER DEFAULT 30
) RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  balance DECIMAL,
  oldest_order_date TIMESTAMP WITH TIME ZONE,
  days_since_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS customer_id,
    c.name AS customer_name,
    cb.balance,
    MIN(o.created_at) AS oldest_order_date,
    EXTRACT(DAY FROM now() - MIN(o.created_at))::INTEGER AS days_since_order
  FROM customers c
  INNER JOIN customer_balances cb ON c.id = cb.customer_id
  INNER JOIN orders o ON c.id = o.customer_id
  WHERE c.business_id = p_business_id
    AND cb.business_id = p_business_id
    AND o.business_id = p_business_id
    AND cb.balance > 0
  GROUP BY c.id, c.name, cb.balance
  HAVING EXTRACT(DAY FROM now() - MIN(o.created_at)) > p_days_overdue;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

