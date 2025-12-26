# Payment Gateway Database Setup

SQL scripts for payment gateway functionality.

## Payment Settings Table

```sql
-- Create payment_settings table
CREATE TABLE payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT CHECK (gateway IN ('stripe', 'paypal')) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  test_mode BOOLEAN DEFAULT true,
  public_key TEXT,
  secret_key TEXT,
  webhook_secret TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gateway)
);

-- Enable RLS
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access (admin backend only)
CREATE POLICY "Service role can manage payment settings" ON payment_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE TRIGGER update_payment_settings_updated_at BEFORE UPDATE ON payment_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Customer Purchases Table

```sql
-- Create customer_purchases table
CREATE TABLE customer_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  gateway TEXT CHECK (gateway IN ('stripe', 'paypal')),
  transaction_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')) DEFAULT 'pending',
  customer_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE customer_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own purchases
CREATE POLICY "Users can read own purchases" ON customer_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can manage all purchases
CREATE POLICY "Service role can manage purchases" ON customer_purchases
  FOR ALL USING (auth.role() = 'service_role');

-- Create index on user_id for faster queries
CREATE INDEX idx_customer_purchases_user_id ON customer_purchases(user_id);

-- Create index on transaction_id for webhook lookups
CREATE INDEX idx_customer_purchases_transaction_id ON customer_purchases(transaction_id);

-- Create updated_at trigger
CREATE TRIGGER update_customer_purchases_updated_at BEFORE UPDATE ON customer_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Seed Data (Optional)

Initialize with disabled gateways:

```sql
-- Insert default payment gateway settings
INSERT INTO payment_settings (gateway, is_enabled, test_mode) VALUES
  ('stripe', false, true),
  ('paypal', false, true)
ON CONFLICT (gateway) DO NOTHING;
```

## Running the Setup

1. Open Supabase SQL Editor
2. Run the payment_settings table SQL
3. Run the customer_purchases table SQL
4. Optionally run the seed data SQL
5. Verify tables are created in Table Editor
