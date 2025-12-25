# Admin Panel Database Setup

This document provides the SQL scripts needed to set up your Supabase database for the admin panel.

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project or use an existing one
3. Get your credentials from Project Settings > API

## Required Tables

### 1. Subscription Plans Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create subscription_plans table
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read active plans
CREATE POLICY "Anyone can read active plans" ON subscription_plans
  FOR SELECT USING (active = true);

-- Policy: Only admins can insert/update/delete
-- Note: This is a basic policy. In production, you'd check against a proper admin role
CREATE POLICY "Service role can do everything" ON subscription_plans
  FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Optional: User Subscriptions Table

If you want to track which users have which plans:

```sql
-- Create user_subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can manage all
CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Seed Data (Optional)

Add some sample plans:

```sql
INSERT INTO subscription_plans (name, price, features, active) VALUES
  ('Free', 0.00, '["Basic features", "Limited usage", "Community support"]'::jsonb, true),
  ('Pro', 9.99, '["All basic features", "Unlimited usage", "Priority support", "Advanced analytics"]'::jsonb, true),
  ('Enterprise', 29.99, '["All Pro features", "Custom integrations", "Dedicated support", "SLA guarantee", "Team collaboration"]'::jsonb, true);
```

## Authentication Setup

1. **Enable Email Authentication** in Supabase:
   - Go to Authentication > Providers
   - Enable Email provider
   - Configure email templates (optional)

2. **Create Admin User**:
   - Go to Authentication > Users
   - Click "Add user"
   - Enter email and password
   - Make note of this email for your `ADMIN_EMAILS` environment variable

## Environment Configuration

After setting up the database, configure your environment variables in Coolify:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

## Accessing the Admin Panel

1. Deploy your application with the environment variables set
2. Navigate to `https://your-domain.com/admin`
3. Login with your admin email and password
4. You should now see the dashboard with user management and plan CRUD functionality

## Security Notes

- The `SUPABASE_ANON_KEY` is safe to expose on the client side
- Admin access is controlled via the `ADMIN_EMAILS` environment variable
- For production, consider implementing role-based access control (RBAC) in Supabase
- Always use HTTPS in production
- Regularly update your dependencies

## Troubleshooting

**Can't login?**
- Verify your email is in the `ADMIN_EMAILS` environment variable
- Check that the user exists in Supabase Authentication > Users
- Ensure Email authentication is enabled in Supabase

**API calls failing?**
- Check browser console for errors
- Verify Supabase credentials are correct
- Check that RLS policies are properly configured
- Ensure the `subscription_plans` table exists

**Users not showing?**
- The `/api/admin/users` endpoint requires admin authentication
- Check network tab for 401/403 errors
- Verify your token is being sent in the Authorization header
