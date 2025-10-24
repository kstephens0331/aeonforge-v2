# AeonForge - Complete Deployment Guide

## Prerequisites

Ensure you have the following CLIs installed and authenticated:
- ✅ Supabase CLI (`supabase`)
- ✅ Vercel CLI (`vercel`)
- ✅ Railway CLI (`railway`)
- ✅ GitHub CLI (`gh`)

---

## Step 1: Nuke and Reset Supabase Database

### Option A: Using Supabase CLI

```bash
# Link to your Supabase project
supabase link --project-ref pkyqrvrxwhlwkxalsbaz

# Reset the database (THIS WILL DELETE ALL DATA!)
supabase db reset

# Push the new schema
supabase db push
```

### Option B: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/pkyqrvrxwhlwkxalsbaz
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the ENTIRE contents of `supabase/init.sql`
5. Click **Run** (This may take 30-60 seconds)
6. Verify no errors in the output

### Verify Database Setup

```sql
-- Run this to verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- content_flags, messages, projects, rag_documents,
-- tasks, token_usage, user_storage, users
```

---

## Step 2: Create Supabase Storage Bucket

### Using Supabase Dashboard:

1. Go to **Storage** → **Create a new bucket**
2. **Bucket name:** `user-files`
3. **Public bucket:** ✅ YES
4. Click **Create bucket**

### Add Storage Policies:

Go to the `user-files` bucket → **Policies** → **New Policy**

**Policy 1: Upload**
```sql
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 2: Read**
```sql
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 3: Delete**
```sql
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Step 3: Configure Google OAuth (Optional)

1. Go to **Authentication** → **Providers** → **Google**
2. **Enable Google provider**
3. Follow instructions to create OAuth credentials at:
   - https://console.cloud.google.com/apis/credentials
4. Add authorized redirect URLs:
   - `https://pkyqrvrxwhlwkxalsbaz.supabase.co/auth/v1/callback`
   - `http://localhost:8787/auth/callback` (for local dev)
5. Save the Client ID and Client Secret in Supabase

---

## Step 4: Set Up Stripe

### Create Products:

1. Go to https://dashboard.stripe.com/test/products
2. Create 4 products:

**Standard Plan:**
- Name: AeonForge Standard
- Price: $15/month recurring
- Copy the Price ID → `STRIPE_PRICE_STANDARD`

**Pro Plan:**
- Name: AeonForge Pro
- Price: $40/month recurring
- Copy the Price ID → `STRIPE_PRICE_PRO`

**Team Plan:**
- Name: AeonForge Team
- Price: $20/month recurring per seat
- Copy the Price ID → `STRIPE_PRICE_TEAM`

**Enterprise Plan:**
- Name: AeonForge Enterprise
- Price: $18/month recurring per seat
- Copy the Price ID → `STRIPE_PRICE_ENTERPRISE`

### Get API Keys:

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** → `STRIPE_SECRET_KEY`

### Set Up Webhook:

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click **Add endpoint**
3. **Endpoint URL:** `https://your-domain.vercel.app/api/stripe/webhook`
4. **Listen to:** Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Set Up Resend Email

1. Go to https://resend.com/
2. Sign up and verify your domain (or use `onboarding@resend.dev` for testing)
3. Go to **API Keys** → **Create API Key**
4. Copy the key → `RESEND_API_KEY`

---

## Step 6: Initialize Git and Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Create .gitignore (already exists)
# Add all files
git add .

# Initial commit
git commit -m "Initial commit: AeonForge v1.0 - Complete AI Assistant Platform"

# Create GitHub repo
gh repo create aeonforge --private --source=. --remote=origin

# Push to GitHub
git push -u origin main
```

---

## Step 7: Deploy to Vercel

```bash
# Login to Vercel (if not already)
vercel login

# Deploy (first time - will ask questions)
vercel

# Answer the prompts:
# Set up and deploy? Yes
# Which scope? Your account
# Link to existing project? No
# Project name? aeonforge-v2
# Directory? ./
# Override settings? No

# This creates a preview deployment
```

### Add Environment Variables to Vercel:

```bash
# Method 1: Using CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste: https://pkyqrvrxwhlwkxalsbaz.supabase.co
# Select: Production, Preview, Development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste your anon key
# Select: Production, Preview, Development

# ... repeat for all env vars (or use Method 2)

# Method 2: Using Vercel Dashboard
vercel open

# Then go to Settings → Environment Variables
# Add all variables from .env.local
```

### Required Environment Variables for Vercel:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET

TOGETHER_API_KEY
TOGETHER_BASE_URL=https://api.together.xyz
TOGETHER_PRIORITY=3

ANTHROPIC_API_KEY
CLAUDE_PRIORITY=1

GEMINI_API_KEY
GEMINI_PRIORITY=2

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STANDARD
STRIPE_PRICE_PRO
STRIPE_PRICE_TEAM
STRIPE_PRICE_ENTERPRISE

RESEND_API_KEY
EMAIL_FROM=AeonForge <noreply@yourdomain.com>

NEXT_PUBLIC_APP_URL=https://your-deployment.vercel.app
NEXT_PUBLIC_ADMIN_EMAIL=your-email@example.com
ALERT_EMAIL=info@stephenscode.dev

# All model configurations from .env.local
CLAUDE_MODEL_GENERAL=claude-3-5-sonnet-20241022
CLAUDE_MODEL_THINKING=claude-3-7-sonnet-20250219
CLAUDE_MODEL_CODER=claude-3-5-sonnet-20241022
# ... etc (copy from .env.local)
```

### Deploy to Production:

```bash
# After adding env vars, deploy to production
vercel --prod
```

---

## Step 8: Update Stripe Webhook URL

1. Go back to Stripe → Webhooks
2. Edit your webhook endpoint
3. Update URL to: `https://your-actual-domain.vercel.app/api/stripe/webhook`
4. Save

---

## Step 9: Configure Railway (Optional - for background jobs)

```bash
# Login to Railway
railway login

# Initialize project
railway init

# Create new project
railway up

# Add environment variables
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-key"
# ... add other necessary vars

# Deploy
railway up
```

### Set Up Cron Jobs in Railway:

Create a new service for scheduled tasks:
- Token reset (weekly/monthly)
- Database cleanup
- Usage reports

---

## Step 10: Configure Cloudflare DNS

1. Go to Cloudflare Dashboard
2. Add your domain (e.g., aeonforge.com)
3. Add DNS records pointing to Vercel:
   - Type: CNAME
   - Name: @ (or subdomain)
   - Target: cname.vercel-dns.com
4. Enable SSL/TLS (Full)
5. Enable caching rules

### In Vercel:

1. Go to your project → Settings → Domains
2. Add your custom domain
3. Verify DNS setup

---

## Step 11: Test the Deployment

### Create Test User:

```bash
# Option 1: Sign up via UI
# Go to https://your-domain.com/auth/login
# Click Google Sign-In

# Option 2: Create via Supabase Dashboard
# Authentication → Users → Add User
```

### Test Checklist:

```bash
# Health checks
curl https://your-domain.com/api/chat
# Should return 401 Unauthorized (expected - needs auth)

# Test image generation endpoint
curl https://your-domain.com/api/generate-image
# Should return 401 Unauthorized (expected - needs auth)
```

### Manual UI Testing:

- [ ] Sign up / Login
- [ ] Create a project
- [ ] Send a message
- [ ] Upload an image
- [ ] Generate an image (Pro tier)
- [ ] Voice transcription
- [ ] Text-to-speech
- [ ] View settings page
- [ ] Check usage stats
- [ ] Admin dashboard (if admin)

---

## Step 12: Make First Admin User

```sql
-- In Supabase SQL Editor
UPDATE public.users
SET is_admin = true
WHERE email = 'your-email@example.com';
```

---

## Monitoring and Maintenance

### Supabase Monitoring:

```bash
# Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check active users
SELECT COUNT(*) FROM public.users;

# Check total messages
SELECT COUNT(*) FROM public.messages;
```

### Set Up Alerts:

1. **Vercel:** Enable email alerts for failed deployments
2. **Supabase:** Set up database alerts for high usage
3. **Stripe:** Enable webhook failure notifications
4. **Resend:** Monitor email delivery rates

---

## Rollback Procedure

### If deployment fails:

```bash
# Rollback in Vercel
vercel rollback

# Or redeploy previous commit
git revert HEAD
git push
vercel --prod
```

### If database migration fails:

```bash
# Reset to previous state
supabase db reset

# Reapply old schema
supabase db push
```

---

## Quick Reference Commands

```bash
# Supabase
supabase status
supabase db push
supabase db reset
supabase functions deploy

# Vercel
vercel
vercel --prod
vercel logs
vercel env ls
vercel domains

# Railway
railway status
railway logs
railway variables

# GitHub
gh repo view
gh pr create
gh workflow run
```

---

## Troubleshooting

### Database Connection Issues:

```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@db.pkyqrvrxwhlwkxalsbaz.supabase.co:5432/postgres"
```

### Build Failures:

```bash
# Check build logs
vercel logs

# Test build locally
npm run build

# Type check
npm run type-check
```

### Webhook Issues:

```bash
# Test Stripe webhook locally
stripe listen --forward-to localhost:8787/api/stripe/webhook
```

---

## Success Checklist

- [ ] Database schema deployed successfully
- [ ] Storage bucket created and configured
- [ ] Google OAuth configured (if using)
- [ ] Stripe products and webhooks set up
- [ ] Resend email configured
- [ ] Code pushed to GitHub
- [ ] Deployed to Vercel production
- [ ] Custom domain configured (optional)
- [ ] All environment variables set
- [ ] Test user created and tested
- [ ] Admin user created
- [ ] All features tested in production

---

## Post-Deployment

1. **Monitor Logs:** Check Vercel logs for errors
2. **Test Features:** Run through all major features
3. **Check Emails:** Verify welcome emails are sending
4. **Monitor Costs:** Check Stripe, Supabase, Vercel usage
5. **Set Up Backups:** Configure automated database backups
6. **Documentation:** Update README with production URL

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Check browser console for errors
4. Review this deployment guide
5. Contact: info@stephenscode.dev

---

**Deployment Complete! 🚀**

Your AeonForge platform is now live and ready to serve users!
