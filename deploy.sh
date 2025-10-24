#!/bin/bash

# ============================================================================
# AeonForge - Quick Deployment Script
# ============================================================================

echo "🚀 AeonForge Deployment Script"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if required CLIs are installed
echo "Checking required CLIs..."

command -v supabase >/dev/null 2>&1 || { print_error "Supabase CLI not installed. Install from https://supabase.com/docs/guides/cli"; exit 1; }
command -v vercel >/dev/null 2>&1 || { print_error "Vercel CLI not installed. Run: npm i -g vercel"; exit 1; }
command -v gh >/dev/null 2>&1 || { print_error "GitHub CLI not installed. Install from https://cli.github.com/"; exit 1; }

print_status "All required CLIs are installed"
echo ""

# Step 1: Git Setup
echo "📦 Step 1: Git Setup"
echo "--------------------"

if [ ! -d ".git" ]; then
    print_warning "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit: AeonForge v1.0"
    print_status "Git initialized and initial commit created"
else
    print_status "Git repository already initialized"
fi

echo ""
read -p "Push to GitHub? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter GitHub repository name (default: aeonforge): " repo_name
    repo_name=${repo_name:-aeonforge}

    gh repo create $repo_name --private --source=. --remote=origin --push
    print_status "Code pushed to GitHub"
fi

echo ""

# Step 2: Supabase Setup
echo "🗄️  Step 2: Supabase Database Setup"
echo "-----------------------------------"

read -p "Nuke and reset Supabase database? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_warning "This will DELETE ALL existing data!"
    read -p "Are you absolutely sure? (type 'yes' to confirm): " confirm

    if [ "$confirm" == "yes" ]; then
        print_warning "Linking to Supabase project..."
        supabase link --project-ref pkyqrvrxwhlwkxalsbaz

        print_warning "Resetting database..."
        supabase db reset

        print_status "Database reset complete"

        print_warning "Pushing new schema..."
        # Copy init.sql to migrations folder
        mkdir -p supabase/migrations
        cp supabase/init.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_init.sql
        supabase db push

        print_status "Database schema deployed"
    else
        print_error "Database reset cancelled"
    fi
fi

echo ""
print_warning "IMPORTANT: Create storage bucket manually in Supabase Dashboard"
echo "  1. Go to Storage → Create bucket 'user-files' (public)"
echo "  2. Add the 3 storage policies from DEPLOYMENT.md"
echo ""
read -p "Press enter when storage bucket is created..."

echo ""

# Step 3: Environment Variables
echo "🔐 Step 3: Environment Variables Check"
echo "--------------------------------------"

if [ ! -f ".env.local" ]; then
    print_error ".env.local not found!"
    echo "Copy .env.example to .env.local and fill in your values"
    exit 1
fi

print_status ".env.local exists"
print_warning "Make sure all API keys are set correctly"

echo ""

# Step 4: Build Test
echo "🔨 Step 4: Build Test"
echo "--------------------"

print_warning "Running production build test..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Build successful"
else
    print_error "Build failed! Fix errors before deploying"
    exit 1
fi

echo ""

# Step 5: Vercel Deployment
echo "☁️  Step 5: Vercel Deployment"
echo "----------------------------"

read -p "Deploy to Vercel? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deploying to Vercel..."

    # First deployment (preview)
    vercel

    echo ""
    print_status "Preview deployment complete"
    print_warning "Now add environment variables to Vercel Dashboard"
    print_warning "Go to: vercel.com → Your Project → Settings → Environment Variables"
    echo ""
    echo "Required variables:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - ANTHROPIC_API_KEY"
    echo "  - GEMINI_API_KEY"
    echo "  - TOGETHER_API_KEY"
    echo "  - STRIPE_SECRET_KEY"
    echo "  - STRIPE_WEBHOOK_SECRET"
    echo "  - STRIPE_PRICE_* (4 variables)"
    echo "  - RESEND_API_KEY"
    echo "  - NEXT_PUBLIC_APP_URL"
    echo "  - NEXT_PUBLIC_ADMIN_EMAIL"
    echo "  + All model configuration variables"
    echo ""
    read -p "Press enter when all environment variables are added to Vercel..."

    echo ""
    print_warning "Deploying to production..."
    vercel --prod

    print_status "Production deployment complete!"

    # Get deployment URL
    DEPLOYMENT_URL=$(vercel ls --prod | grep -oP 'https://[^\s]+' | head -1)
    print_status "Deployment URL: $DEPLOYMENT_URL"
fi

echo ""

# Step 6: Post-Deployment Tasks
echo "✅ Step 6: Post-Deployment Checklist"
echo "------------------------------------"

echo ""
echo "Manual tasks to complete:"
echo ""
echo "1. [ ] Update Stripe webhook URL to your production domain"
echo "2. [ ] Test Google OAuth redirect URLs"
echo "3. [ ] Create your first admin user in Supabase:"
echo "       UPDATE public.users SET is_admin = true WHERE email = 'your-email@example.com';"
echo "4. [ ] Test all features in production:"
echo "       - Sign up / Login"
echo "       - Send messages"
echo "       - Upload images"
echo "       - Generate images (Pro tier)"
echo "       - Voice features"
echo "       - Admin dashboard"
echo "5. [ ] Configure custom domain in Vercel (optional)"
echo "6. [ ] Set up monitoring and alerts"
echo "7. [ ] Create database backup schedule"
echo ""

print_status "Deployment script complete!"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
echo "🐛 For troubleshooting, check Vercel logs: vercel logs"
echo "📧 Support: info@stephenscode.dev"
echo ""
echo "🎉 Your AeonForge platform is ready to go live!"
