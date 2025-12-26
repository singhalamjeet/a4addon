# Instagram Widget Database Setup

SQL scripts for Instagram/Facebook widget integration.

## Social Connections Table

```sql
-- Create social_connections table
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT CHECK (provider IN ('facebook', 'instagram_business', 'instagram_personal')) NOT NULL,
  page_id TEXT,
  page_name TEXT,
  ig_business_account_id TEXT,
  ig_username TEXT,
  access_token TEXT, -- Will be encrypted
  token_expiry TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own connections
CREATE POLICY "Users can manage own connections" ON social_connections
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Service role can manage all
CREATE POLICY "Service role can manage connections" ON social_connections
  FOR ALL USING (auth.role() = 'service_role');

-- Create index on user_id
CREATE INDEX idx_social_connections_user_id ON social_connections(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON social_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Widgets Table

```sql
-- Create widgets table
CREATE TABLE widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES social_connections(id) ON DELETE SET NULL,
  widget_type TEXT CHECK (widget_type IN ('instagram_business', 'instagram_personal')) NOT NULL,
  name TEXT NOT NULL,
  layout TEXT CHECK (layout IN ('grid', 'carousel', 'masonry')) DEFAULT 'grid',
  post_count INT DEFAULT 6 CHECK (post_count > 0 AND post_count <= 50),
  theme TEXT DEFAULT 'light',
  custom_css TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own widgets
CREATE POLICY "Users can manage own widgets" ON widgets
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Public can read active widgets (for embed)
CREATE POLICY "Public can read active widgets" ON widgets
  FOR SELECT USING (is_active = true);

-- Create index on user_id
CREATE INDEX idx_widgets_user_id ON widgets(user_id);

-- Create index on connection_id
CREATE INDEX idx_widgets_connection_id ON widgets(connection_id);

-- Create updated_at trigger
CREATE TRIGGER update_widgets_updated_at BEFORE UPDATE ON widgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Widget Embeds Table (Personal Instagram)

```sql
-- Create widget_embeds table
CREATE TABLE widget_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID REFERENCES widgets(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  oembed_html TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  author_name TEXT,
  media_type TEXT,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(widget_id, post_url)
);

-- Enable RLS
ALTER TABLE widget_embeds ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage embeds for their widgets
CREATE POLICY "Users can manage own widget embeds" ON widget_embeds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM widgets
      WHERE widgets.id = widget_embeds.widget_id
      AND widgets.user_id = auth.uid()
    )
  );

-- Policy: Public can read embeds for active widgets
CREATE POLICY "Public can read widget embeds" ON widget_embeds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM widgets
      WHERE widgets.id = widget_embeds.widget_id
      AND widgets.is_active = true
    )
  );

-- Create index on widget_id
CREATE INDEX idx_widget_embeds_widget_id ON widget_embeds(widget_id);
```

## Widget Cache Table

```sql
-- Create widget_cache table
CREATE TABLE widget_cache (
  widget_id UUID PRIMARY KEY REFERENCES widgets(id) ON DELETE CASCADE,
  feed_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE widget_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read cache for active widgets
CREATE POLICY "Public can read widget cache" ON widget_cache
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM widgets
      WHERE widgets.id = widget_cache.widget_id
      AND widgets.is_active = true
    )
  );

-- Policy: Service role can manage all cache
CREATE POLICY "Service role can manage cache" ON widget_cache
  FOR ALL USING (auth.role() = 'service_role');
```

## Running the Setup

1. Open Supabase SQL Editor
2. Run each table creation SQL block in order:
   - social_connections
   - widgets
   - widget_embeds
   - widget_cache
3. Verify tables are created in Table Editor

## Notes

- **Token Encryption**: Access tokens in `social_connections` should be encrypted. We'll handle this in the application layer using `crypto` module.
- **Cache Duration**: Widget cache should be refreshed based on user's plan (e.g., every 15 minutes for free, 5 minutes for pro).
- **Plan Limits**: Enforce widget count and post count limits in application logic based on subscription plan.
