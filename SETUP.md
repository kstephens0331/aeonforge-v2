# AeonForge Setup Guide

## Quick Start

### 1. Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run these scripts **in order**:

   **Step 1:** Run `supabase/schema.sql`
   ```sql
   -- This creates all tables, RLS policies, triggers, and functions
   ```

   **Step 2:** Run `supabase/vector-functions.sql`
   ```sql
   -- This creates the vector similarity search function
   ```

   **Step 3:** Enable pgvector extension
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. Get your credentials from Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (from Service Role section)

### 2. Google OAuth Setup (Optional)

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google
3. Follow the instructions to create OAuth credentials at Google Cloud Console
4. Add authorized redirect URLs:
   - `http://localhost:8787/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

### 3. Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in all required values in `.env.local`

### 4. Install and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit [http://localhost:8787](http://localhost:8787)

## First Steps After Installation

### 1. Create Your First User

The easiest way is through Google OAuth (if configured). Otherwise:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. The user will be automatically added to the `public.users` table via trigger

### 2. Test the Chat

1. Login with your user credentials
2. A default project will be created automatically
3. Start chatting!

### 3. Test Medical Queries

Try asking:
> "What are the latest treatments for type 2 diabetes?"

The system will:
- Detect it's a medical query
- Search PubMed for relevant articles
- Include citations and disclaimers

### 4. Test Coding Queries

Try asking:
> "Write a Python function to find prime numbers"

The system will:
- Route to Claude (best for coding)
- Provide production-quality code with documentation

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
vercel deploy --prod
```

### Deploy Background Jobs to Railway

For scheduled tasks (token resets, etc.):

1. Create a Railway project
2. Add environment variables
3. Deploy

```bash
railway up
```

### Configure Cloudflare

1. Add your Vercel deployment as a CNAME
2. Enable SSL/TLS
3. Configure caching rules

## Testing LLM Providers

### Test Claude

The system will try Claude first (priority 1). Check console logs:
```
Attempting request with claude (priority: 1)
✓ Success with claude
```

### Test Fallback

If Claude fails, it will automatically try Gemini, then Together:
```
Attempting request with claude (priority: 1)
✗ claude failed: Rate limit exceeded
Attempting request with gemini (priority: 2)
✓ Success with gemini
```

### Force a Specific Provider

In `.env.local`:
```bash
FORCE_PROVIDER=gemini
```

## Troubleshooting

### Build Errors

**Issue:** Tailwind CSS errors
```bash
npm install @tailwindcss/postcss
```

**Issue:** TypeScript errors
```bash
npm run type-check
```

### Runtime Errors

**Issue:** "Unauthorized" when accessing `/chat`
- Check if you're logged in
- Verify Supabase JWT is valid
- Check RLS policies in Supabase

**Issue:** "All LLM providers failed"
- Verify API keys in `.env.local`
- Check API key validity
- Review console logs for specific errors

**Issue:** PubMed not returning results
- PubMed API may be rate limited (wait a few minutes)
- Check network connectivity
- Review query keywords

### Database Issues

**Issue:** Vector search not working
```sql
-- Verify pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- If not enabled:
CREATE EXTENSION vector;
```

**Issue:** RLS blocking queries
```sql
-- Temporarily disable RLS for debugging (NOT for production)
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
```

## Monitoring

### Token Usage

Query token usage:
```sql
SELECT
  u.email,
  SUM(tu.tokens_used) as total_tokens,
  u.tokens_used_this_week,
  u.tokens_used_this_month
FROM token_usage tu
JOIN users u ON u.id = tu.user_id
GROUP BY u.email, u.tokens_used_this_week, u.tokens_used_this_month;
```

### Content Flags

Check flagged content:
```sql
SELECT
  cf.*,
  u.email,
  m.content
FROM content_flags cf
JOIN users u ON u.id = cf.user_id
LEFT JOIN messages m ON m.id = cf.message_id
WHERE cf.reviewed = false
ORDER BY cf.created_at DESC;
```

## Advanced Configuration

### Customize Task Routing

Edit [lib/llm/router.ts](lib/llm/router.ts):

```typescript
const TASK_PROVIDER_PREFERENCES: Partial<Record<TaskType, LLMProvider[]>> = {
  coding: ['claude', 'gemini', 'together'], // Your custom order
  medical: ['claude', 'gemini', 'together'],
  // ... etc
};
```

### Adjust Subscription Limits

Edit [types/index.ts](types/index.ts):

```typescript
export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    messages_per_month: 10, // Adjust as needed
    storage_gb: 0.1,
    // ...
  },
  // ... etc
};
```

### Add New Models

1. Add model to `.env.local`:
   ```bash
   CLAUDE_MODEL_CUSTOM=claude-3-5-sonnet-20241022
   ```

2. Use in [lib/llm/providers/claude.ts](lib/llm/providers/claude.ts):
   ```typescript
   const MODEL_MAP: Record<TaskType, string> = {
     custom: process.env.CLAUDE_MODEL_CUSTOM || 'default-model',
     // ...
   };
   ```

## Production Checklist

- [ ] All environment variables configured
- [ ] Database schema deployed
- [ ] pgvector extension enabled
- [ ] RLS policies enabled
- [ ] Google OAuth configured (if using)
- [ ] Email alerts tested (for content moderation)
- [ ] SSL/TLS enabled
- [ ] Rate limiting configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup (Sentry, LogRocket, etc.)
- [ ] Terms of Service and Privacy Policy pages created

## Support

For issues or questions:
- Email: info@stephenscode.dev
- GitHub Issues: [repository-url]/issues

## Next Steps

See [README.md](README.md) for:
- Feature roadmap
- Architecture details
- API documentation
- Contributing guidelines
