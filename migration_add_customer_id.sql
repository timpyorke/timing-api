-- Migration to add customer_id field to orders table
-- Run this script on your existing database

-- Add customer_id column to orders table
ALTER TABLE orders ADD COLUMN customer_id VARCHAR(100);

-- Create index for better performance on customer_id queries
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Optional: Update existing orders with a placeholder customer_id if needed
-- UPDATE orders SET customer_id = 'guest_' || id WHERE customer_id IS NULL;