import { createClient } from '@supabase/supabase-js';
import { RAGDocument, Source } from '@/types';
import { generateEmbedding } from './embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function retrieveRelevantDocuments(
  query: string,
  projectId?: string,
  userId?: string,
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<Source[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Build the query
    let dbQuery = supabase
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: similarityThreshold,
        match_count: limit,
      });

    // Add filters for project-specific or user-specific documents
    if (projectId) {
      dbQuery = dbQuery.eq('project_id', projectId);
    } else if (userId) {
      // Include both user's documents and global documents
      dbQuery = dbQuery.or(`user_id.eq.${userId},project_id.is.null`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error('RAG retrieval error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((doc: any) => ({
      type: 'rag' as const,
      title: doc.title,
      snippet: doc.content.substring(0, 200) + '...',
      relevance_score: doc.similarity,
      url: doc.metadata?.source_url,
    }));
  } catch (error: any) {
    console.error('RAG retrieval error:', error);
    return [];
  }
}

export async function addDocumentToRAG(
  userId: string,
  title: string,
  content: string,
  metadata: any = {},
  projectId?: string
): Promise<string> {
  try {
    const embedding = await generateEmbedding(content);

    const { data, error } = await supabase
      .from('rag_documents')
      .insert({
        user_id: userId,
        project_id: projectId || null,
        title,
        content,
        embedding,
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id;
  } catch (error: any) {
    console.error('Error adding document to RAG:', error);
    throw new Error(`Failed to add document: ${error.message}`);
  }
}

export async function deleteDocument(documentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('rag_documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

export async function searchDocuments(
  userId: string,
  searchTerm: string,
  projectId?: string
): Promise<RAGDocument[]> {
  let query = supabase
    .from('rag_documents')
    .select('*')
    .eq('user_id', userId)
    .ilike('title', `%${searchTerm}%`);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Document search error:', error);
    return [];
  }

  return data || [];
}

export async function getDocumentCount(userId: string, projectId?: string): Promise<number> {
  let query = supabase
    .from('rag_documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Document count error:', error);
    return 0;
  }

  return count || 0;
}
