# TrustBadge App — Complete Deployment Guide

## ✅ Step 1: Local Setup (COMPLETED)
- [x] Dependencies installed (`npm install`)
- [x] App tested locally (runs on port 3000)
- [x] `.env` file created
- [x] `.gitignore` added

## 📤 Step 2: Push Updates to GitHub

```bash
cd c:/Users/EL\ PANDAs/Desktop/trust/trustbadge-app
git add .gitignore package-lock.json
git commit -m "chore: add gitignore and dependencies"
git push origin main
```

OR if you want to create a **new personal GitHub repo**:

1. Go to https://github.com/new
2. Create a repository named `trustbadge-app`
3. Copy the new repo URL
4. In your terminal:
```bash
cd c:/Users/EL\ PANDAs/Desktop/trust/trustbadge-app
git remote set-url origin https://github.com/YOUR_USERNAME/trustbadge-app.git
git branch -M main
git push -u origin main
```

## 🚀 Step 3: Deploy to Railway

1. **Sign up/Login to Railway**: https://railway.app
2. **Create new project**:
   - Click "New Project" → "Deploy from GitHub"
   - Connect your GitHub account
   - Select the `trustbadge-app` repository
3. **Add Environment Variables** in Railway Dashboard:
   - Click "Add Variable" and paste these:
   ```
   SHOPIFY_API_KEY=<from Shopify Partner Dashboard>
   SHOPIFY_API_SECRET=<from Shopify Partner Dashboard>
   APP_URL=<will be provided by Railway, e.g., https://trustbadge-xxxxx.railway.app>
   SESSION_SECRET=your-super-secret-random-key-here-min-32-chars-recommended
   PORT=3000
   ```
4. **Get Your Railway URL**:
   - Railway auto-generates a URL like `https://trustbadge-xxxxx.railway.app`
   - Copy this — you'll need it for Shopify

## 🛍️ Step 4: Create Shopify Partner App

1. **Go to https://partners.shopify.com**:
   - Sign up or login (free Partner account)
2. **Create Custom App**:
   - Click "Apps" → "Create app" → "Custom app"
   - Name it: "Trust Badge App"
3. **Set Admin API Permissions**:
   - In "Admin API access scopes", enable:
     - `write_script_tags`
     - `read_script_tags`
4. **Set OAuth Redirect URL**:
   - In "Redirect URLs", add: `https://your-railway-url/auth/callback`
   - (Replace `your-railway-url` with your actual Railway domain)
5. **Copy Credentials**:
   - Copy "Client ID" (= SHOPIFY_API_KEY)
   - Copy "Client secret" (= SHOPIFY_API_SECRET)
   - Paste both into Railway environment variables

## 🔧 Step 5: Test Installation on Test Store

1. **Create a Shopify development store** (free, in Partner Dashboard)
2. **Install your app**:
   - Go to your dev store Admin
   - Search for "Trust Badge App" or visit:
     ```
     https://your-dev-store.myshopify.com/admin/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=write_script_tags,read_script_tags&state=nonce&redirect_uri=https://your-railway-url/auth/callback
     ```
3. **Configure badges**:
   - Dashboard should load at `https://your-railway-url/app`
   - Select badges, customize colors
   - Click "Save to Store"
4. **Verify on storefront**:
   - Go to your store's homepage
   - Should see trust badge bar at bottom with selected badges

## 📊 Step 6: List on Shopify App Store (Optional)

1. **In Shopify Partner Dashboard**:
   - Click "Apps" → Your App → "Distribution" → "Make app public"
2. **Complete Listing Details**:
   - App name, description, logo, pricing ($4.99/month recommended)
   - Privacy policy & support links
3. **Submit for Review**:
   - Takes 1-5 days for Shopify approval
   - Once approved, merchants can find it in Shopify App Store

---

## 💰 Revenue Model

- Charge: $4.99/month per store
- **50 installs** = $250/month
- **200 installs** = $1,000+/month
- Shopify handles all billing automatically

## 🐛 Troubleshooting

**App won't install?**
- Check Railway URL is correct in Shopify redirect
- Verify API Key & Secret are copied exactly
- Check Network tab for CORS/redirect errors

**Badge not showing on store?**
- Verify script tag was injected (Admin → Online Store → Themes → Edit code → `theme.liquid`)
- Check browser console for JS errors
- Verify settings were saved to database

**Railway deployment failing?**
- Check build logs in Railway Dashboard
- Ensure `package.json` and `server.js` are in root folder
- Verify Node version is 18+ with `node --version`
