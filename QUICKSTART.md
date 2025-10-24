# AeonForge - Quick Start Guide

## 🚀 Deploy in 10 Minutes

### Prerequisites
```bash
# Check you have these installed:
supabase --version
vercel --version
gh --version
npm --version
```

---

## 1️⃣ Reset Database (2 min)

```bash
# Option A: Supabase Dashboard
# 1. Go to SQL Editor
# 2. Paste contents of supabase/init.sql
# 3. Click Run

# Option B: CLI
supabase link --project-ref pkyqrvrxwhlwkxalsbaz
supabase db reset
```

---

## 2️⃣ Create Storage Bucket (1 min)

1. Supabase Dashboard → **Storage**
2. **Create bucket:** `user-files` (public: YES)
3. Add 3 policies from `DEPLOYMENT.md` (upload, read, delete)

---

## 3️⃣ Set Up Stripe (3 min)

```bash
# Create 4 products in Stripe Dashboard
# Copy price IDs to .env.local:

STRIPE_PRICE_STANDARD=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_TEAM=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx

# Create webhook endpoint (will update URL after deployment)
```

---

## 4️⃣ Get Resend API Key (1 min)

```bash
# Go to resend.com
# Create account
# Get API key → RESEND_API_KEY
```

---

## 5️⃣ Deploy to Vercel (3 min)

```bash
# Make sure .env.local is filled out
npm run build  # Test build

# Deploy
vercel

# Add environment variables in Vercel Dashboard
vercel open
# Settings → Environment Variables → Paste all from .env.local

# Deploy to production
vercel --prod
```

---

## 6️⃣ Final Steps

### Update Stripe Webhook URL
```
https://your-domain.vercel.app/api/stripe/webhook
```

### Create Admin User
```sql
-- In Supabase SQL Editor
UPDATE public.users
SET is_admin = true
WHERE email = 'your-email@example.com';
```

### Test It
```
https://your-domain.vercel.app
```

---

## ✅ Deployment Checklist

- [ ] Database reset with `init.sql`
- [ ] Storage bucket `user-files` created
- [ ] Storage policies added (3 policies)
- [ ] Google OAuth configured (optional)
- [ ] Stripe products created (4 products)
- [ ] Stripe webhook created
- [ ] Resend API key obtained
- [ ] `.env.local` filled out completely
- [ ] Build test passed (`npm run build`)
- [ ] Deployed to Vercel
- [ ] Environment variables added to Vercel
- [ ] Production deployment successful
- [ ] Stripe webhook URL updated
- [ ] Admin user created
- [ ] Test signup/login works
- [ ] Test chat works

---

## 🔧 Essential Commands

```bash
# Local Development
npm run dev                    # Start dev server on :8787
npm run build                  # Test production build
npm run type-check             # Check TypeScript

# Supabase
supabase status                # Check connection
supabase db push               # Push schema changes
supabase db reset              # Reset database
supabase functions deploy      # Deploy edge functions

# Vercel
vercel                         # Deploy preview
vercel --prod                  # Deploy production
vercel logs                    # View logs
vercel env ls                  # List env vars
vercel env pull                # Download env vars

# Git
gh repo view                   # View repo
gh pr create                   # Create pull request
```

---

## 📊 Monitor Your Deployment

### Check Logs
```bash
vercel logs --follow
```

### Check Database
```sql
-- Active users
SELECT COUNT(*) FROM public.users;

-- Total messages
SELECT COUNT(*) FROM public.messages;

-- Storage usage
SELECT
  email,
  subscription_tier,
  pg_size_pretty(storage_used_bytes) as storage
FROM public.users
ORDER BY storage_used_bytes DESC
LIMIT 10;
```

### Check Stripe
- Dashboard → Customers
- Dashboard → Subscriptions
- Dashboard → Webhooks (check for errors)

---

## 🐛 Quick Troubleshooting

### Build Fails
```bash
npm run type-check          # Find TypeScript errors
npm run build 2>&1 | less   # Read full error log
```

### Database Connection Issues
```bash
# Test connection
supabase db branch list

# Or manually
psql "postgresql://postgres:[PASSWORD]@db.pkyqrvrxwhlwkxalsbaz.supabase.co:5432/postgres"
```

### Webhook Not Working
```bash
# Test locally
stripe listen --forward-to localhost:8787/api/stripe/webhook

# Check Stripe Dashboard → Webhooks → Recent Events
```

### Email Not Sending
```bash
# Check Resend Dashboard → Logs
# Verify EMAIL_FROM domain is verified
# Check RESEND_API_KEY is correct
```

---

## 📞 Get Help

- **Documentation:** See `DEPLOYMENT.md` for detailed guide
- **Issues:** Check Vercel logs first
- **Support:** info@stephenscode.dev

---

## 🎉 You're Live!

Visit your deployment:
```
https://your-domain.vercel.app
```

**Next Steps:**
1. Test all features thoroughly
2. Set up custom domain (optional)
3. Enable monitoring/alerts
4. Configure backups
5. Invite beta testers!

---

**Built with ❤️ using Next.js, Supabase, and Claude**
