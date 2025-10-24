-- Add Stripe fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Create index for faster Stripe lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON public.users(stripe_subscription_id);

-- Create storage bucket for user files (run this in Supabase Storage UI or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-files', 'user-files', true);

-- Update storage policies for user-files bucket
-- These should be created in Supabase Dashboard → Storage → user-files → Policies

-- Allow authenticated users to upload files
-- CREATE POLICY "Users can upload own files"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read own files
-- CREATE POLICY "Users can read own files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete own files
-- CREATE POLICY "Users can delete own files"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add admin column for admin dashboard access
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Function to send welcome email when user signs up (integrate with your email service)
CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- This would integrate with your email service
  -- For now, just log it
  RAISE NOTICE 'New user signed up: %', NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to send welcome email
DROP TRIGGER IF EXISTS on_user_created ON public.users;
CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email();

-- Function to check and warn about token limits
CREATE OR REPLACE FUNCTION check_token_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_tier TEXT;
  token_limit BIGINT;
  tokens_used BIGINT;
  percentage_used NUMERIC;
BEGIN
  SELECT subscription_tier, tokens_used_this_month
  INTO user_tier, tokens_used
  FROM public.users
  WHERE id = NEW.user_id;

  -- Get token limit based on tier
  token_limit := CASE user_tier
    WHEN 'free' THEN 0
    WHEN 'standard' THEN 2000000
    WHEN 'pro' THEN -1  -- unlimited
    WHEN 'team' THEN 5000000
    WHEN 'enterprise' THEN -1  -- unlimited
  END;

  -- Skip check for unlimited tiers
  IF token_limit = -1 THEN
    RETURN NEW;
  END IF;

  -- Calculate percentage
  percentage_used := (tokens_used::NUMERIC / token_limit::NUMERIC) * 100;

  -- Log warning at 80% and 90%
  IF percentage_used >= 80 AND percentage_used < 90 THEN
    RAISE NOTICE 'User % at 80%% token limit', NEW.user_id;
  ELSIF percentage_used >= 90 THEN
    RAISE NOTICE 'User % at 90%% token limit', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check token limits
DROP TRIGGER IF EXISTS check_token_limit_trigger ON public.token_usage;
CREATE TRIGGER check_token_limit_trigger
  AFTER INSERT ON public.token_usage
  FOR EACH ROW
  EXECUTE FUNCTION check_token_limit();

-- Add reviewed_by column reference
ALTER TABLE public.content_flags
DROP CONSTRAINT IF EXISTS content_flags_reviewed_by_fkey,
ADD CONSTRAINT content_flags_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;
