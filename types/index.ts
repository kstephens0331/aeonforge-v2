// Database Types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: SubscriptionTier;
  storage_used_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export interface ProjectSettings {
  shared_memory_enabled: boolean;
  shared_project_ids?: string[];
  custom_system_prompt?: string;
  preferred_model?: string;
}

export interface Message {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: MessageMetadata;
  token_count: number;
  model_used?: string;
  created_at: string;
}

export interface MessageMetadata {
  images?: string[];
  sources?: Source[];
  confidence_score?: number;
  validation_method?: 'single' | 'consensus' | 'rag_verified';
  flagged?: boolean;
  flag_reason?: string;
}

export interface Source {
  type: 'pubmed' | 'rag' | 'web' | 'document';
  title: string;
  url?: string;
  snippet: string;
  relevance_score?: number;
  pubmed_id?: string;
  authors?: string[];
  publication_date?: string;
}

export interface RAGDocument {
  id: string;
  project_id?: string; // null for global documents
  user_id: string;
  title: string;
  content: string;
  embedding: number[];
  metadata: RAGMetadata;
  created_at: string;
}

export interface RAGMetadata {
  source_type: 'upload' | 'web' | 'pubmed' | 'code';
  source_url?: string;
  file_type?: string;
  chunk_index?: number;
  total_chunks?: number;
}

export interface UserStorage {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  compressed_size_bytes?: number;
  storage_url: string;
  thumbnail_url?: string;
  created_at: string;
}

export interface TokenUsage {
  id: string;
  user_id: string;
  project_id?: string;
  tokens_used: number;
  model_used: string;
  provider: LLMProvider;
  cost_usd?: number;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// Subscription Types
export type SubscriptionTier = 'free' | 'standard' | 'pro' | 'team' | 'enterprise';

export interface SubscriptionLimits {
  messages_per_month?: number;
  tokens_per_month?: number;
  tokens_per_week?: number;
  storage_gb: number;
  projects_limit?: number;
  team_seats?: number;
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    messages_per_month: 10,
    storage_gb: 0.1,
    projects_limit: 1,
  },
  standard: {
    tokens_per_month: 2000000,
    tokens_per_week: 500000,
    storage_gb: 1,
    projects_limit: 10,
  },
  pro: {
    storage_gb: 5,
    projects_limit: -1, // unlimited
  },
  team: {
    tokens_per_month: 5000000,
    storage_gb: 10,
    projects_limit: -1,
    team_seats: 2,
  },
  enterprise: {
    storage_gb: 50,
    projects_limit: -1,
    team_seats: 4,
  },
};

// LLM Provider Types
export type LLMProvider = 'claude' | 'gemini' | 'together';

export type TaskType = 'general' | 'coding' | 'medical' | 'thinking' | 'longform' | 'multilingual';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  priority: number;
  taskTypes: TaskType[];
}

export interface LLMRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  taskType?: TaskType;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  tokenCount: number;
  finishReason?: string;
  metadata?: {
    sources?: Source[];
    confidenceScore?: number;
    validationMethod?: string;
  };
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  method: 'single' | 'consensus' | 'rag_verified';
  sources?: Source[];
  flagged?: boolean;
  flagReason?: string;
  corrections?: string;
}

// Chat UI Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: Source[];
  images?: string[];
  isStreaming?: boolean;
  confidence?: number;
}

export interface ChatSession {
  id: string;
  projectId: string;
  messages: ChatMessage[];
  title: string;
  createdAt: Date;
  updatedAt: Date;
}
