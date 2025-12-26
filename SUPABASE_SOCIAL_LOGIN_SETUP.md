# Supabase Social Login Setup Guide

Quick guide to enable Google, Facebook, and Microsoft login for your customers.

## Overview

Your A4 Addon now has social login pages at:
- **Signup**: `https://a4addon.com/signup`
- **Login**: `https://a4addon.com/login`

To enable social providers, configure OAuth in Supabase:

---

## 1. Google Login (Gmail)

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted
6. Application type: **Web application**
7. Add **Authorized redirect URIs**:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
   ```
8. Copy **Client ID** and **Client Secret**

### Step 2: Configure in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** and enable it
3. Paste **Client ID** (Authorized Client IDs)
4. Paste **Client Secret**
5. Click **Save**

✅ Google login is now active!

---

## 2. Facebook Login

### Step 1: Create Facebook App

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Click **Create App** → **Consumer**
3. Add **Facebook Login** product
4. Go to **Facebook Login** → **Settings**
5. Add **Valid OAuth Redirect URIs**:
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
   ```
6. Copy **App ID** and **App Secret** from **Settings** → **Basic**

### Step 2: Configure in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Facebook** and enable it
3. Paste **Facebook Client ID** (App ID)
4. Paste **Facebook Secret** (App Secret)
5. Click **Save**

✅ Facebook login is now active!

---

## 3. Microsoft Login (Outlook/Azure)

### Step 1: Register Azure App

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name: **A4 Addon**
5. Supported account types: **Multitenant**
6. Redirect URI: **Web**
   ```
   https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
   ```
7. Click **Register**
8. Copy **Application (client) ID**
9. Go to **Certificates & secrets** → **New client secret**
10. Copy the secret **value** (not ID)

### Step 2: Configure in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **Azure** and enable it
3. Paste **Azure Client ID**
4. Paste **Azure Secret**
5. **Azure Tenant URL**: Use `https://login.microsoftonline.com/common` (for personal & work accounts)
6. Click **Save**

✅ Microsoft login is now active!

---

## 4. Email/Password (Already Works!)

Email/password signup and login work out-of-the-box with Supabase.

**Email Verification:**
- By default, Supabase sends verification emails
- Users must verify email before accessing dashboard
- To disable: Supabase → **Authentication** → **Providers** → **Email** → Uncheck "Confirm email"

---

## Testing

### Test Social Login:

1. Visit `https://a4addon.com/signup`
2. Click **"Continue with Google"** (or Facebook/Microsoft)
3. Authenticate with your account
4. You'll be redirected to `/dashboard`

### Test Email/Password:

1. Visit `https://a4addon.com/signup`
2. Enter email and password
3. Check email for verification link
4. Click link, then login at `/login`

---

## Troubleshooting

### "OAuth provider not configured"
- Check provider is enabled in Supabase
- Verify Client ID and Secret are correct
- Ensure redirect URI matches exactly

### "Redirect URI mismatch"
- Supabase redirect URI must be:
  ```
  https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
  ```
- Add this to Google/Facebook/Azure OAuth settings

### Users Can't Access Dashboard
- Check Supabase RLS policies allow authenticated users
- Verify redirect after login goes to `/dashboard`

---

## Quick Start (Skip Social Login for Now)

If you want to launch quickly:

1. **Just use Email/Password** - it works immediately!
2. Social login can be added anytime later
3. Customers can signup at `/signup` with email
4. All widget features work the same

---

## Summary Checklist

- [ ] Created Google OAuth credentials
- [ ] Enabled Google in Supabase
- [ ] Created Facebook app
- [ ] Enabled Facebook in Supabase
- [ ] Registered Azure app
- [ ] Enabled Azure in Supabase
- [ ] Tested signup at `/signup`
- [ ] Tested login at `/login`
- [ ] Verified dashboard access

Your social login is ready! 🎉
