# Meta (Facebook/Instagram) Developer App Setup

Complete guide to configure your Meta Developer App for Instagram widget integration.

## Prerequisites

- Facebook account
- Access to [Meta for Developers](https://developers.facebook.com)

---

## Part 1: Create Meta App

### Step 1: Go to Meta for Developers

1. Visit [https://developers.facebook.com](https://developers.facebook.com)
2. Click **"My Apps"** in top right
3. Click **"Create App"**

### Step 2: Choose App Type

Select: **"Business"** or **"Consumer"**
- Business: For B2B SaaS (recommended)
- Consumer: For public-facing apps

Click **"Next"**

### Step 3: App Details

- **App Name**: `A4 Addon Instagram Widget` (or your preferred name)
- **App Contact Email**: Your email
- **Business Account**: Select or create one

Click **"Create App"**

---

## Part 2: Configure Instagram Integration

### Step 4: Add Instagram Product

1. In your app dashboard, scroll to **"Add Products"**
2. Find **"Instagram"** and click **"Set Up"**
3. Instagram Basic Display will be added

### Step 5: Create Instagram App

1. Go to **Products** → **Instagram** → **Basic Display**
2. Click **"Create New App"**
3. Display Name: `A4 Addon Widget`
4. Click **"Create App"**

---

## Part 3: Configure OAuth Settings

### Step 6: OAuth Redirect URIs

1. In **Instagram Basic Display** settings
2. Scroll to **"OAuth Redirect URIs"**
3. Add: `https://a4addon.com/api/social/callback/facebook`
4. Click **"Save Changes"**

### Step 7: Get Credentials

1. Go to **Settings** → **Basic**
2. Copy your:
   - **App ID** (e.g., `123456789`)
   - **App Secret** (click "Show" to reveal)

---

## Part 4: Add Environment Variables to Coolify

1. Open **Coolify dashboard**
2. Select your **a4addon** application
3. Go to **Environment Variables**
4. Add these variables:

```env
META_APP_ID=your-app-id-here
META_APP_SECRET=your-app-secret-here
META_REDIRECT_URI=https://a4addon.com/api/social/callback/facebook
ENCRYPTION_KEY=generate-a-random-32-char-string
```

5. **Save** and **redeploy**

---

## Part 5: Test Mode vs Live Mode

### Test Mode (Development)

- App is in **Development Mode** by default
- Only works for:
  - App admins
  - Developers
  - Testers (add in **Roles** section)
- Perfect for testing

### Going Live (Production)

To make your app available to all users:

1. Complete all required fields in **Settings** → **Basic**:
   - Privacy Policy URL
   - Terms of Service URL
   - App Icon
   - Category

2. Go to **App Review** → **Permissions and Features**

3. Request these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`

4. Submit for review with:
   - Video demonstration
   - Step-by-step instructions
   - Use case explanation

5. Wait for Meta approval (typically 1-7 days)

6. Once approved, switch to **Live Mode**

---

## Part 6: Instagram Business vs Personal

### Instagram Business Accounts (Auto-Feed)

**Requirements**:
- Must be **Business** or **Creator** account
- Must be linked to a Facebook Page
- Requires Meta App Review approval

**Features**:
- Automatic feed updates
- Media URL access
- Caption and timestamp data
- No user intervention needed

**Setup**:
1. Convert Instagram to Business/Creator
2. Link to Facebook Page
3. Use OAuth flow in A4 Addon

### Instagram Personal Accounts (Manual Embed)

**Requirements**:
- Public Instagram account
- No approval needed
- Works immediately

**Features**:
- Manual post-by-post addition
- Uses Instagram oEmbed API
- Public posts only
- No auto-sync

**Setup**:
1. Copy public post URLs
2. Paste in A4 Addon widget settings
3. Posts fetched via oEmbed

---

## Part 7: Testing Your Integration

### Test Instagram Business Connection

1. Ensure you have:
   - Instagram Business account
   - Linked Facebook Page
   - Added yourself as **Tester** in Meta App

2. Go to `https://a4addon.com/dashboard/social`
3. Click **"Connect Instagram Business"**
4. Authorize the app
5. Select your Facebook Page
6. Your Instagram feed should load

### Test Instagram Personal Mode

1. Go to widget settings
2. Choose **"Instagram Personal"** mode
3. Paste a public Instagram post URL
4. Post should appear in preview

---

## Troubleshooting

### "Error during authorization"
- Check OAuth Redirect URI is exactly: `https://a4addon.com/api/social/callback/facebook`
- Verify app is not in Live Mode unless approved
- Ensure user is added as Tester

### "No Instagram account found"
- Verify Instagram is converted to Business/Creator
- Check Instagram is linked to Facebook Page
- Ensure Page has Instagram access permission

### "This app is not approved"
- App is in Development Mode - only works for testers
- Submit for App Review or add users as Testers
- Or use Instagram Personal mode instead

### Token Expires
- Instagram Business tokens expire after 60 days
- Use "Reconnect" button to refresh
- Consider automating refresh before expiry

---

## Security Best Practices

✅ **Never share App Secret** - keep it in environment variables only
✅ **Use HTTPS** - required for OAuth
✅ **Validate redirect URIs** - prevent auth hijacking
✅ **Encrypt tokens at rest** - use `ENCRYPTION_KEY`
✅ **Handle token expiry** - implement refresh logic
✅ **Rate limit API calls** - avoid Meta API limits

---

## API Rate Limits

Meta enforces rate limits:
- **200 calls per hour** per user (default)
- **4800 calls per 24 hours** per user
- Cache aggressively to stay within limits

A4 Addon caches widget feeds for 15 minutes by default.

---

## Support

If you encounter issues:
- Check [Meta for Developers Documentation](https://developers.facebook.com/docs)
- Review [Instagram Platform Documentation](https://developers.facebook.com/docs/instagram-api)
- Check Meta App **Error Logs** in dashboard

---

## Summary Checklist

- [ ] Created Meta Developer App
- [ ] Added Instagram product
- [ ] Configured OAuth redirect URI
- [ ] Copied App ID and Secret
- [ ] Added to Coolify environment
- [ ] Tested Instagram Business connection
- [ ] Tested Instagram Personal embeds
- [ ] (Optional) Submitted for App Review
- [ ] App in Live Mode

Your Instagram widget integration is ready! 🎉
