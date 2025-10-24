-- ============================================================================
-- AeonForge - Complete Database Initialization Script
-- Run this AFTER nuking the database for a fresh start
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'standard', 'pro', 'team', 'enterprise')),
  storage_used_bytes BIGINT DEFAULT 0,
  tokens_used_this_week BIGINT DEFAULT 0,
  tokens_used_this_month BIGINT DEFAULT 0,
  week_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  month_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{"shared_memory_enabled": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  token_count INTEGER DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RAG Documents table
CREATE TABLE IF NOT EXISTS public.rag_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024), -- BAAI/bge-large-en-v1.5 produces 1024-dim embeddings
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Storage table
CREATE TABLE IF NOT EXISTS public.user_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  compressed_size_bytes BIGINT,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token Usage tracking
CREATE TABLE IF NOT EXISTS public.token_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  tokens_used INTEGER NOT NULL,
  model_used TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('claude', 'gemini', 'together')),
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table (for project management)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Content Flags table (for moderation)
CREATE TABLE IF NOT EXISTS public.content_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flag_reason TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON public.users(stripe_subscription_id);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_last_accessed ON public.projects(last_accessed_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- RAG documents indexes
CREATE INDEX IF NOT EXISTS idx_rag_documents_user_id ON public.rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_project_id ON public.rag_documents(project_id);

-- User storage indexes
CREATE INDEX IF NOT EXISTS idx_user_storage_user_id ON public.user_storage(user_id);

-- Token usage indexes
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON public.token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON public.token_usage(created_at DESC);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);

-- Content flags indexes
CREATE INDEX IF NOT EXISTS idx_content_flags_reviewed ON public.content_flags(reviewed, created_at DESC);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_rag_documents_embedding ON public.rag_documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own projects" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = messages.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own projects" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = messages.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- RAG documents policies
CREATE POLICY "Users can view own RAG documents" ON public.rag_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own RAG documents" ON public.rag_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own RAG documents" ON public.rag_documents
  FOR DELETE USING (auth.uid() = user_id);

-- User storage policies
CREATE POLICY "Users can view own files" ON public.user_storage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload own files" ON public.user_storage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON public.user_storage
  FOR DELETE USING (auth.uid() = user_id);

-- Token usage policies
CREATE POLICY "Users can view own token usage" ON public.token_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view tasks in own projects" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tasks in own projects" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reset weekly token counts
CREATE OR REPLACE FUNCTION reset_weekly_tokens()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET
    tokens_used_this_week = 0,
    week_reset_at = NOW()
  WHERE week_reset_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Reset monthly token counts
CREATE OR REPLACE FUNCTION reset_monthly_tokens()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET
    tokens_used_this_month = 0,
    month_reset_at = NOW()
  WHERE month_reset_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Check storage limits
CREATE OR REPLACE FUNCTION check_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_tier TEXT;
  max_storage BIGINT;
  current_storage BIGINT;
BEGIN
  SELECT subscription_tier, storage_used_bytes
  INTO user_tier, current_storage
  FROM public.users
  WHERE id = NEW.user_id;

  max_storage := CASE user_tier
    WHEN 'free' THEN 107374182  -- 0.1 GB
    WHEN 'standard' THEN 1073741824  -- 1 GB
    WHEN 'pro' THEN 5368709120  -- 5 GB
    WHEN 'team' THEN 10737418240  -- 10 GB
    WHEN 'enterprise' THEN 53687091200  -- 50 GB
  END;

  IF current_storage + NEW.file_size_bytes > max_storage THEN
    RAISE EXCEPTION 'Storage limit exceeded for % tier', user_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update user storage count
CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users
    SET storage_used_bytes = storage_used_bytes + NEW.file_size_bytes
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users
    SET storage_used_bytes = storage_used_bytes - OLD.file_size_bytes
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Send welcome email (placeholder - integrate with your email service)
CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  RAISE NOTICE 'New user signed up: %', NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check token limits and log warnings
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

  token_limit := CASE user_tier
    WHEN 'free' THEN 0
    WHEN 'standard' THEN 2000000
    WHEN 'pro' THEN -1  -- unlimited
    WHEN 'team' THEN 5000000
    WHEN 'enterprise' THEN -1  -- unlimited
  END;

  IF token_limit = -1 THEN
    RETURN NEW;
  END IF;

  percentage_used := (tokens_used::NUMERIC / token_limit::NUMERIC) * 100;

  IF percentage_used >= 80 AND percentage_used < 90 THEN
    RAISE NOTICE 'User % at 80%% token limit', NEW.user_id;
  ELSIF percentage_used >= 90 THEN
    RAISE NOTICE 'User % at 90%% token limit', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  project_id uuid,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rag_documents.id,
    rag_documents.user_id,
    rag_documents.project_id,
    rag_documents.title,
    rag_documents.content,
    rag_documents.metadata,
    1 - (rag_documents.embedding <=> query_embedding) AS similarity
  FROM rag_documents
  WHERE 1 - (rag_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY rag_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER check_storage_before_insert
  BEFORE INSERT ON public.user_storage
  FOR EACH ROW EXECUTE FUNCTION check_storage_limit();

CREATE TRIGGER update_storage_after_insert
  AFTER INSERT ON public.user_storage
  FOR EACH ROW EXECUTE FUNCTION update_user_storage();

CREATE TRIGGER update_storage_after_delete
  AFTER DELETE ON public.user_storage
  FOR EACH ROW EXECUTE FUNCTION update_user_storage();

CREATE TRIGGER on_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email();

CREATE TRIGGER check_token_limit_trigger
  AFTER INSERT ON public.token_usage
  FOR EACH ROW
  EXECUTE FUNCTION check_token_limit();

-- ============================================================================
-- STORAGE BUCKET SETUP (Run in Supabase Dashboard → Storage)
-- ============================================================================

-- CREATE BUCKET: user-files (public: true)
-- Then add these policies in the Storage UI:

-- Policy: "Users can upload own files"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: "Users can read own files"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: "Users can delete own files"
-- ON storage.objects FOR DELETE TO authenticated
-- USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- COMPLETE! Database is ready for AeonForge
-- ============================================================================
